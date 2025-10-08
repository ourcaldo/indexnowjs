import { NextRequest, NextResponse } from 'next/server'
import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { validatePaymentRequest, checkRateLimit, sanitizeInput, generateRequestId } from '../shared/validation'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

const midtransClient = require('midtrans-client')

class MidtransSnapHandler extends BasePaymentHandler {
  private gateway: any
  private snapClient: any

  getPaymentMethodSlug(): string {
    return 'midtrans_snap'
  }

  async processPayment(): Promise<PaymentResult> {
    await this.loadGatewayConfig()
    
    const amount = this.calculateAmount()
    let finalAmount = amount.finalAmount
    
    if (amount.originalCurrency === 'USD') {
      const { convertUsdToIdr } = await import('@/lib/utils/currency-converter')
      finalAmount = await convertUsdToIdr(amount.finalAmount)
    }

    const orderId = await this.createPendingTransaction(this.gateway.id, {
      payment_gateway_type: 'midtrans_snap',
      converted_amount: finalAmount,
      converted_currency: 'IDR'
    })

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: finalAmount
      },
      credit_card: {
        secure: true
      },
      item_details: [{
        id: this.packageData.id,
        price: finalAmount,
        quantity: 1,
        name: `${this.packageData.name} - ${this.paymentData.billing_period}`,
        category: "subscription"
      }],
      customer_details: {
        first_name: this.paymentData.customer_info.first_name,
        last_name: this.paymentData.customer_info.last_name,
        email: this.paymentData.customer_info.email,
        phone: this.paymentData.customer_info.phone || ''
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/plans-billing/orders/${orderId}`,
        error: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/plans-billing?payment=error`
      }
    }

    const transaction = await this.snapClient.createTransaction(parameter)

    await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: this.paymentData.user.id,
        operation: 'update_midtrans_snap_transaction',
        reason: 'Updating transaction with Midtrans Snap response data',
        source: 'app/api/v1/billing/channels/midtrans-snap/route.ts',
        metadata: { orderId, transactionToken: transaction.token }
      },
      {
        table: 'indb_payment_transactions',
        operationType: 'update'
      },
      async () => {
        const { error } = await supabaseAdmin
          .from('indb_payment_transactions')
          .update({
            gateway_transaction_id: transaction.token,
            gateway_response: {
              token: transaction.token,
              redirect_url: transaction.redirect_url,
              snap_parameter: parameter
            }
          })
          .eq('id', orderId)

        if (error) throw error
        return { success: true }
      }
    )

    return {
      success: true,
      data: {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        client_key: this.gateway.api_credentials.client_key,
        environment: this.gateway.configuration.environment,
        order_id: orderId
      }
    }
  }

  private async loadGatewayConfig(): Promise<void> {
    const gateway = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: this.paymentData.user.id,
        operation: 'load_midtrans_snap_gateway_config',
        reason: 'Loading payment gateway configuration for Midtrans Snap transaction',
        source: 'app/api/v1/billing/channels/midtrans-snap/route.ts',
        metadata: { gatewaySlug: 'midtrans_snap' }
      },
      {
        table: 'indb_payment_gateways',
        operationType: 'select'
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_gateways')
          .select('*')
          .eq('slug', 'midtrans_snap')
          .eq('is_active', true)
          .single()

        if (error || !data) {
          throw new Error('Midtrans Snap gateway not configured')
        }

        return data
      }
    )

    this.gateway = gateway
    this.snapClient = new midtransClient.Snap({
      isProduction: gateway.configuration.environment === 'production',
      serverKey: gateway.api_credentials.server_key,
      clientKey: gateway.api_credentials.client_key
    })
  }
}

export const POST = authenticatedApiWrapper(async (request: NextRequest, user) => {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  logger.info({ message: `🚀 [Midtrans Snap ${requestId}] Payment request initiated` }, 'Info')

  const rateLimitResult = checkRateLimit(`user:${user.id}:midtrans_snap`, 10, 15 * 60 * 1000)
  if (!rateLimitResult.allowed) {
    logger.warn({ message: `⚠️ [Midtrans Snap ${requestId}] Rate limit exceeded for user: ${user.id}` }, 'Warning')
    throw new Error('Too many payment attempts. Please try again later.')
  }

  const validation = await validatePaymentRequest(request)
  if (!validation.success) {
    logger.error({ error: validation.errors instanceof Error ? validation.errors.message : String(validation.errors) }, `❌ [Midtrans Snap ${requestId}] Validation failed:`)
    throw new Error('Invalid payment data')
  }

  const sanitizedData = sanitizeInput(validation.data)
  
  const paymentData: PaymentData = {
    package_id: sanitizedData.package_id,
    billing_period: sanitizedData.billing_period,
    customer_info: sanitizedData.customer_info,
    user
  }

  logger.info({ data: [`package: ${sanitizedData.package_id}`] }, `✅ [Midtrans Snap ${requestId}] Processing payment for user: ${user.id}`)
  
  const handler = new MidtransSnapHandler(paymentData)
  const result = await handler.execute()
  
  const duration = Date.now() - startTime
  logger.info({ message: `🎉 [Midtrans Snap ${requestId}] Payment processed successfully in ${duration}ms` }, 'Info')
  
  if (result.headers.get('content-type')?.includes('application/json')) {
    const body = await result.json()
    body.request_id = requestId
    body.processing_time_ms = duration
    return formatSuccess(body, requestId, 201)
  }
  
  return formatSuccess({ success: true }, requestId, 201)
})

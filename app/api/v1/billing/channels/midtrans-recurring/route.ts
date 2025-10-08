import { NextRequest, NextResponse } from 'next/server'
import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { validatePaymentRequest, checkRateLimit, sanitizeInput, generateRequestId } from '../shared/validation'
import { supabaseAdmin } from '@/lib/database'
import { PaymentServiceFactory } from '@/lib/services/payments'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

class MidtransRecurringHandler extends BasePaymentHandler {
  private gateway: any
  private midtransService: any
  private tokenId: string

  constructor(paymentData: PaymentData, tokenId: string) {
    super(paymentData)
    this.tokenId = tokenId
  }

  getPaymentMethodSlug(): string {
    return 'midtrans_recurring'
  }

  async processPayment(): Promise<PaymentResult> {
    await this.loadGatewayConfig()
    
    const amount = this.calculateAmount()
    
    const orderId = await this.createPendingTransaction(this.gateway.id, {
      payment_gateway_type: 'midtrans_recurring',
      token_id: this.tokenId
    })

    this.midtransService = PaymentServiceFactory.createMidtransService('recurring', {
      server_key: this.gateway.api_credentials.server_key,
      client_key: this.gateway.api_credentials.client_key,
      environment: this.gateway.configuration.environment,
      merchant_id: this.gateway.api_credentials.merchant_id
    })

    const chargeTransaction = await this.midtransService.createChargeTransaction({
      order_id: orderId,
      amount_usd: amount.finalAmount,
      token_id: this.tokenId,
      customer_details: {
        first_name: this.paymentData.customer_info.first_name,
        last_name: this.paymentData.customer_info.last_name,
        email: this.paymentData.customer_info.email,
        phone: this.paymentData.customer_info.phone,
      },
      item_details: {
        name: this.packageData.name,
        description: this.packageData.description,
      },
    })

    if ((chargeTransaction as any).redirect_url) {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: this.paymentData.user.id,
          operation: 'update_transaction_pending_3ds',
          reason: 'Updating transaction status to pending 3DS authentication',
          source: 'app/api/v1/billing/channels/midtrans-recurring/route.ts',
          metadata: { orderId, transactionId: chargeTransaction.transaction_id }
        },
        {
          table: 'indb_payment_transactions',
          operationType: 'update'
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_payment_transactions')
            .update({
              transaction_status: 'pending_3ds',
              gateway_transaction_id: chargeTransaction.transaction_id,
              gateway_response: chargeTransaction,
              metadata: {
                ...this.getTransactionMetadata(),
                requires_3ds: true
              }
            })
            .eq('id', orderId)

          if (error) throw error
          return { success: true }
        }
      )

      return {
        success: true,
        requires_redirect: true,
        redirect_url: (chargeTransaction as any).redirect_url,
        data: {
          order_id: orderId,
          transaction_id: chargeTransaction.transaction_id,
          requires_3ds: true
        }
      }
    }

    if (chargeTransaction.transaction_status === 'capture' || chargeTransaction.transaction_status === 'settlement') {
      const savedTokenId = chargeTransaction.saved_token_id

      if (!savedTokenId) {
        throw new Error('Card token was not saved from transaction')
      }

      const subscription = await this.midtransService.createSubscription(amount.finalAmount, {
        name: `${this.packageData.name}_${this.paymentData.billing_period}`.toUpperCase(),
        token: savedTokenId,
        schedule: {
          interval: 1,
          interval_unit: this.paymentData.billing_period === 'monthly' ? 'month' : 'month',
          max_interval: this.paymentData.billing_period === 'monthly' ? 12 : 1,
          start_time: new Date(Date.now() + (this.paymentData.billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
        },
        customer_details: {
          first_name: this.paymentData.customer_info.first_name,
          last_name: this.paymentData.customer_info.last_name,
          email: this.paymentData.customer_info.email,
          phone: this.paymentData.customer_info.phone,
        },
        metadata: {
          user_id: this.paymentData.user.id,
          package_id: this.paymentData.package_id,
          billing_period: this.paymentData.billing_period,
          order_id: orderId,
        },
      })

      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: this.paymentData.user.id,
          operation: 'complete_recurring_transaction',
          reason: 'Updating transaction to completed status with subscription details',
          source: 'app/api/v1/billing/channels/midtrans-recurring/route.ts',
          metadata: { orderId, transactionId: chargeTransaction.transaction_id, subscriptionId: subscription.id }
        },
        {
          table: 'indb_payment_transactions',
          operationType: 'update'
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_payment_transactions')
            .update({
              transaction_status: 'completed',
              gateway_transaction_id: chargeTransaction.transaction_id,
              gateway_response: {
                charge: chargeTransaction,
                subscription: subscription
              },
              metadata: {
                ...this.getTransactionMetadata(),
                subscription_id: subscription.id,
                saved_token_id: savedTokenId,
                masked_card: chargeTransaction.masked_card
              }
            })
            .eq('id', orderId)

          if (error) throw error
          return { success: true }
        }
      )

      await this.updateUserSubscription(subscription, amount.finalAmount)

      return {
        success: true,
        data: {
          order_id: orderId,
          transaction_id: chargeTransaction.transaction_id,
          subscription_id: subscription.id,
          redirect_url: `/dashboard/settings/plans-billing/orders/${orderId}`
        }
      }
    }

    throw new Error(`Charge transaction failed: ${chargeTransaction.status_message}`)
  }

  private async loadGatewayConfig(): Promise<void> {
    const gateway = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: this.paymentData.user.id,
        operation: 'load_midtrans_recurring_gateway_config',
        reason: 'Loading payment gateway configuration for Midtrans recurring transaction',
        source: 'app/api/v1/billing/channels/midtrans-recurring/route.ts',
        metadata: { gatewaySlug: 'midtrans' }
      },
      {
        table: 'indb_payment_gateways',
        operationType: 'select'
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_gateways')
          .select('*')
          .eq('slug', 'midtrans')
          .eq('is_active', true)
          .single()

        if (error || !data) {
          throw new Error('Midtrans recurring gateway not configured')
        }

        return data
      }
    )

    this.gateway = gateway
  }

  private getTransactionMetadata() {
    return {
      order_id: this.paymentData.user.id,
      customer_info: this.paymentData.customer_info,
      package_details: {
        id: this.packageData.id,
        name: this.packageData.name,
        price: this.calculateAmount().finalAmount
      },
      billing_period: this.paymentData.billing_period,
      processing_method: 'recurring'
    }
  }

  private async updateUserSubscription(subscription: any, amount: number): Promise<void> {
    await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: this.paymentData.user.id,
        operation: 'update_user_subscription',
        reason: 'Updating user subscription after successful recurring payment',
        source: 'app/api/v1/billing/channels/midtrans-recurring/route.ts',
        metadata: { subscriptionId: subscription.id, packageId: this.paymentData.package_id, amount, billingPeriod: this.paymentData.billing_period }
      },
      {
        table: 'indb_auth_user_profiles',
        operationType: 'update'
      },
      async () => {
        const { error } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .update({
            package_id: this.paymentData.package_id,
            subscribed_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + (this.paymentData.billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('user_id', this.paymentData.user.id)

        if (error) throw error
        return { success: true }
      }
    )
  }
}

export const POST = authenticatedApiWrapper(async (request: NextRequest, user) => {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  logger.info({ message: `🚀 [Midtrans Recurring ${requestId}] Payment request initiated` }, 'Info')

  const rateLimitResult = checkRateLimit(`user:${user.id}:midtrans_recurring`, 10, 15 * 60 * 1000)
  if (!rateLimitResult.allowed) {
    logger.warn({ message: `⚠️ [Midtrans Recurring ${requestId}] Rate limit exceeded for user: ${user.id}` }, 'Warning')
    throw new Error('Too many payment attempts. Please try again later.')
  }

  const body = await request.json()
  const { token_id, ...restBody } = body

  if (!token_id) {
    logger.error({ error: `Missing token_id` }, `❌ [Midtrans Recurring ${requestId}]`)
    throw new Error('Valid card token is required')
  }

  const validation = await validatePaymentRequest(request)
  if (!validation.success) {
    logger.error({ error: validation.errors instanceof Error ? validation.errors.message : String(validation.errors) }, `❌ [Midtrans Recurring ${requestId}] Validation failed:`)
    throw new Error('Invalid payment data')
  }

  const sanitizedData = sanitizeInput(restBody)
  
  const paymentData: PaymentData = {
    package_id: sanitizedData.package_id,
    billing_period: sanitizedData.billing_period,
    customer_info: sanitizedData.customer_info,
    user
  }

  logger.info({ data: [`package: ${sanitizedData.package_id}`] }, `✅ [Midtrans Recurring ${requestId}] Processing payment for user: ${user.id}`)
  
  const handler = new MidtransRecurringHandler(paymentData, token_id)
  const result = await handler.execute()
  
  const duration = Date.now() - startTime
  logger.info({ message: `🎉 [Midtrans Recurring ${requestId}] Payment processed successfully in ${duration}ms` }, 'Info')
  
  if (result.headers.get('content-type')?.includes('application/json')) {
    const body = await result.json()
    body.request_id = requestId
    body.processing_time_ms = duration
    return formatSuccess(body, requestId, 201)
  }
  
  return formatSuccess({ success: true }, requestId, 201)
})

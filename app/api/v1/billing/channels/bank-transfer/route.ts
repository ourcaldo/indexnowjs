import { NextRequest, NextResponse } from 'next/server'
import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { validatePaymentRequest, checkRateLimit, sanitizeInput, generateRequestId } from '../shared/validation'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

class BankTransferHandler extends BasePaymentHandler {
  private gateway: any

  getPaymentMethodSlug(): string {
    return 'bank_transfer'
  }

  async processPayment(): Promise<PaymentResult> {
    await this.loadGatewayConfig()
    
    const amount = this.calculateAmount()
    
    const orderId = await this.createPendingTransaction(this.gateway.id, {
      payment_gateway_type: 'bank_transfer',
      bank_details: this.gateway.configuration
    })

    await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: this.paymentData.user.id,
        operation: 'update_bank_transfer_transaction',
        source: 'billing/channels/bank-transfer',
        reason: 'Updating transaction with bank transfer payment instructions',
        metadata: {
          orderId,
          amount: amount.finalAmount,
          currency: amount.currency,
          gateway: 'bank_transfer',
          endpoint: '/api/v1/billing/channels/bank-transfer'
        }
      },
      { 
        table: 'indb_payment_transactions', 
        operationType: 'update',
        data: {
          gateway_response: {
            order_id: orderId,
            bank_name: this.gateway.configuration.bank_name,
            account_name: this.gateway.configuration.account_name,
            account_number: this.gateway.configuration.account_number,
            amount: amount.finalAmount,
            currency: amount.currency,
            instructions: `Please transfer ${amount.finalAmount} ${amount.currency} to the account above and upload payment proof.`
          }
        }
      },
      async () => {
        const { error } = await supabaseAdmin
          .from('indb_payment_transactions')
          .update({
            gateway_response: {
              order_id: orderId,
              bank_name: this.gateway.configuration.bank_name,
              account_name: this.gateway.configuration.account_name,
              account_number: this.gateway.configuration.account_number,
              amount: amount.finalAmount,
              currency: amount.currency,
              instructions: `Please transfer ${amount.finalAmount} ${amount.currency} to the account above and upload payment proof.`
            }
          })
          .eq('id', orderId)

        if (error) throw new Error(`Failed to update transaction: ${error.message}`)
        return true
      }
    )

    return {
      success: true,
      requires_redirect: true,
      redirect_url: `/dashboard/settings/plans-billing/order/${orderId}`,
      data: {
        order_id: orderId,
        bank_details: {
          bank_name: this.gateway.configuration.bank_name,
          account_name: this.gateway.configuration.account_name,
          account_number: this.gateway.configuration.account_number,
          amount: amount.finalAmount,
          currency: amount.currency
        }
      }
    }
  }

  private async loadGatewayConfig(): Promise<void> {
    this.gateway = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'load_bank_transfer_gateway_config',
        source: 'billing/channels/bank-transfer',
        reason: 'Loading bank transfer gateway configuration for payment processing',
        metadata: {
          gatewaySlug: 'bank_transfer',
          endpoint: '/api/v1/billing/channels/bank-transfer'
        }
      },
      { table: 'indb_payment_gateways', operationType: 'select' },
      async () => {
        const { data: gateway, error } = await supabaseAdmin
          .from('indb_payment_gateways')
          .select('*')
          .eq('slug', 'bank_transfer')
          .eq('is_active', true)
          .single()

        if (error || !gateway) {
          throw new Error('Bank transfer gateway not configured')
        }

        return gateway
      }
    )
  }
}

export const POST = authenticatedApiWrapper(async (request: NextRequest, user) => {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  logger.info({ message: `🚀 [Bank Transfer ${requestId}] Payment request initiated` }, 'Info')

  const rateLimitResult = checkRateLimit(`user:${user.id}:bank_transfer`, 10, 15 * 60 * 1000)
  if (!rateLimitResult.allowed) {
    logger.warn({ message: `⚠️ [Bank Transfer ${requestId}] Rate limit exceeded for user: ${user.id}` }, 'Warning')
    throw new Error('Too many payment attempts. Please try again later.')
  }

  const validation = await validatePaymentRequest(request)
  if (!validation.success) {
    logger.error({ error: validation.errors instanceof Error ? validation.errors.message : String(validation.errors) }, `❌ [Bank Transfer ${requestId}] Validation failed:`)
    throw new Error('Invalid payment data')
  }

  const sanitizedData = sanitizeInput(validation.data)
  
  const paymentData: PaymentData = {
    package_id: sanitizedData.package_id,
    billing_period: sanitizedData.billing_period,
    customer_info: sanitizedData.customer_info,
    user
  }

  logger.info({ data: [`package: ${sanitizedData.package_id}`] }, `✅ [Bank Transfer ${requestId}] Processing payment for user: ${user.id}`)
  
  const handler = new BankTransferHandler(paymentData)
  const result = await handler.execute()
  
  const duration = Date.now() - startTime
  logger.info({ message: `🎉 [Bank Transfer ${requestId}] Payment processed successfully in ${duration}ms` }, 'Info')
  
  if (result.headers.get('content-type')?.includes('application/json')) {
    const body = await result.json()
    body.request_id = requestId
    body.processing_time_ms = duration
    return formatSuccess(body, requestId, 201)
  }
  
  return formatSuccess({ success: true }, requestId, 201)
})

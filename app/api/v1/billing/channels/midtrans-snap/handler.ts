import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { supabaseAdmin } from '@/lib/database'
import { emailService } from '@/lib/email/emailService'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'

const midtransClient = require('midtrans-client')

export default class MidtransSnapHandler extends BasePaymentHandler {
  private gateway: any
  private snapClient: any

  getPaymentMethodSlug(): string {
    return 'midtrans_snap'
  }

  async processPayment(): Promise<PaymentResult> {
    // Get gateway configuration
    await this.loadGatewayConfig()
    
    // Calculate amount and convert to IDR if needed
    const amount = this.calculateAmount()
    let finalAmount = amount.finalAmount
    
    if (amount.originalCurrency === 'USD') {
      const { convertUsdToIdr } = await import('@/lib/utils/currency-converter')
      finalAmount = await convertUsdToIdr(amount.finalAmount)
    }

    // Create transaction record BEFORE Midtrans API call and get database-generated ID
    const transactionId = await this.createPendingTransaction(this.gateway.id, {
      payment_gateway_type: 'midtrans_snap',
      converted_amount: finalAmount,
      converted_currency: 'IDR'
    })

    // Create Snap transaction
    const parameter = {
      transaction_details: {
        order_id: transactionId,
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
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/plans-billing/order/${transactionId}`,
        error: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/plans-billing?payment=error&order_id=${transactionId}`
      }
    }

    const transaction = await this.snapClient.createTransaction(parameter)

    // Update transaction with Midtrans response using secure operation
    await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'midtrans_snap_update_transaction',
        source: 'billing/channels/midtrans-snap',
        reason: 'Payment handler updating transaction with Midtrans SNAP response',
        metadata: {
          transactionId,
          gatewayId: this.gateway.id,
          token: transaction.token,
          finalAmount,
          currency: 'IDR'
        }
      },
      { table: 'indb_payment_transactions', operationType: 'update' },
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
          .eq('id', transactionId)

        if (error) throw new Error(`Failed to update transaction: ${error.message}`)
        return true
      }
    )

    // Note: Order confirmation email with payment details will be sent via webhook
    // when payment method is selected (bank_transfer, cstore, etc.)
    // This ensures we include VA numbers, store codes, and expiry times
    logger.info({ message: '📧 [Midtrans SNAP] Order confirmation email will be sent via webhook notification with payment details' }, 'Info')

    return {
      success: true,
      data: {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        client_key: this.gateway.api_credentials.client_key,
        environment: this.gateway.configuration.environment,
        order_id: transactionId
      }
    }
  }

  private async loadGatewayConfig(): Promise<void> {
    this.gateway = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'midtrans_snap_load_gateway_config',
        source: 'billing/channels/midtrans-snap',
        reason: 'Payment handler loading Midtrans SNAP gateway configuration',
        metadata: {
          gatewaySlug: 'midtrans_snap'
        }
      },
      { table: 'indb_payment_gateways', operationType: 'select' },
      async () => {
        const { data: gateway, error } = await supabaseAdmin
          .from('indb_payment_gateways')
          .select('*')
          .eq('slug', 'midtrans_snap')
          .eq('is_active', true)
          .single()

        if (error || !gateway) {
          throw new Error('Midtrans Snap gateway not configured')
        }

        return gateway
      }
    )

    this.snapClient = new midtransClient.Snap({
      isProduction: this.gateway.configuration.environment === 'production',
      serverKey: this.gateway.api_credentials.server_key,
      clientKey: this.gateway.api_credentials.client_key
    })
  }
}
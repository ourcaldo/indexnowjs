import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { emailService } from '@/lib/email/emailService'
import { logger } from '@/lib/monitoring/error-handling'

export default class BankTransferHandler extends BasePaymentHandler {
  private gateway: any

  getPaymentMethodSlug(): string {
    return 'bank_transfer'
  }

  async processPayment(): Promise<PaymentResult> {
    // Get gateway configuration
    await this.loadGatewayConfig()
    
    // Calculate amount
    const amount = this.calculateAmount()
    
    // Create transaction record and get database-generated ID
    const transactionId = await this.createPendingTransaction(this.gateway.id, {
      payment_gateway_type: 'bank_transfer',
      bank_details: this.gateway.configuration
    })

    // Update transaction with bank transfer instructions using secure operation
    await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'bank_transfer_update_transaction_instructions',
        source: 'billing/channels/bank-transfer',
        reason: 'Payment handler updating bank transfer transaction with payment instructions',
        metadata: {
          transactionId,
          gatewayId: this.gateway.id,
          amount: amount.finalAmount,
          currency: amount.currency,
          bankName: this.gateway.configuration.bank_name
        }
      },
      { table: 'indb_payment_transactions', operationType: 'update' },
      async () => {
        const { error } = await supabaseAdmin
          .from('indb_payment_transactions')
          .update({
            gateway_response: {
              order_id: transactionId,
              bank_name: this.gateway.configuration.bank_name,
              account_name: this.gateway.configuration.account_name,
              account_number: this.gateway.configuration.account_number,
              amount: amount.finalAmount,
              currency: amount.currency,
              instructions: `Please transfer ${amount.finalAmount} ${amount.currency} to the account above and upload payment proof.`
            }
          })
          .eq('id', transactionId)

        if (error) throw new Error(`Failed to update transaction: ${error.message}`)
        return true
      }
    )

    // Send order confirmation email
    try {
      await emailService.sendBillingConfirmation(this.paymentData.customer_info.email, {
        customerName: `${this.paymentData.customer_info.first_name} ${this.paymentData.customer_info.last_name}`.trim(),
        orderId: transactionId,
        packageName: this.packageData.name,
        billingPeriod: this.paymentData.billing_period,
        amount: `${amount.currency} ${amount.finalAmount}`,
        paymentMethod: 'Bank Transfer',
        bankName: this.gateway.configuration.bank_name,
        accountName: this.gateway.configuration.account_name,
        accountNumber: this.gateway.configuration.account_number,
        orderDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      })
      logger.info({ message: '✅ [Bank Transfer] Order confirmation email sent successfully' }, 'Info')
    } catch (emailError) {
      logger.error({ error: emailError instanceof Error ? emailError.message : String(emailError) }, '⚠️ [Bank Transfer] Failed to send order confirmation email:')
    }

    return {
      success: true,
      requires_redirect: true,
      redirect_url: `/dashboard/settings/plans-billing/order/${transactionId}`,
      data: {
        order_id: transactionId,
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
        operation: 'bank_transfer_load_gateway_config',
        source: 'billing/channels/bank-transfer',
        reason: 'Payment handler loading bank transfer gateway configuration',
        metadata: {
          gatewaySlug: 'bank_transfer'
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
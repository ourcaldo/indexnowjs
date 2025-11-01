/**
 * Payment Processor - Main Payment Orchestrator
 * Handles payment routing, validation, and transaction management
 */

import { PaymentGateway, PaymentRequest, PaymentResponse } from './PaymentGateway'
import { PaymentValidator } from './PaymentValidator'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '../../security/SecureServiceRoleWrapper'

export interface ProcessPaymentRequest {
  user_id: string
  package_id: string
  billing_period: 'monthly' | 'yearly'
  payment_method: string
  customer_info: any
  token_id?: string
}

export interface ProcessPaymentResponse {
  success: boolean
  transaction_id?: string
  order_id?: string
  redirect_url?: string
  requires_redirect?: boolean
  message?: string
  error?: string
}

export class PaymentProcessor {
  private gateways: Map<string, PaymentGateway> = new Map()
  private validator: PaymentValidator

  constructor() {
    this.validator = new PaymentValidator()
  }

  /**
   * Register a payment gateway
   */
  registerGateway(name: string, gateway: PaymentGateway): void {
    this.gateways.set(name, gateway)
  }

  /**
   * Get registered gateway
   */
  getGateway(name: string): PaymentGateway | undefined {
    return this.gateways.get(name)
  }

  /**
   * Process payment through appropriate gateway
   */
  async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
    try {
      // Validate request
      const validationResult = this.validator.validatePaymentRequest(request)
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error
        }
      }

      // Get package details
      const packageData = await this.getPackageDetails(request.package_id)
      if (!packageData) {
        return {
          success: false,
          error: 'Invalid package selected'
        }
      }

      // Calculate amount
      const amount = this.calculateAmount(packageData, request.billing_period)

      // Generate unique order ID
      const orderId = this.generateOrderId(request.user_id, request.payment_method)

      // Create transaction record
      const transaction = await this.createTransactionRecord({
        user_id: request.user_id,
        order_id: orderId,
        package_id: request.package_id,
        amount_usd: amount,
        billing_period: request.billing_period,
        payment_method: request.payment_method,
        customer_info: request.customer_info
      })

      if (!transaction) {
        return {
          success: false,
          error: 'Failed to create transaction record'
        }
      }

      // Determine gateway based on payment method
      const gatewayName = this.getGatewayName(request.payment_method)
      const gateway = this.getGateway(gatewayName)

      if (!gateway) {
        await this.updateTransactionStatus(transaction.id, 'failed', 'Gateway not available')
        return {
          success: false,
          error: 'Payment gateway not available'
        }
      }

      // Prepare payment request
      const paymentRequest: PaymentRequest = {
        order_id: orderId,
        amount_usd: amount,
        currency: packageData.currency,
        customer_details: {
          first_name: request.customer_info.first_name,
          last_name: request.customer_info.last_name,
          email: request.customer_info.email,
          phone: request.customer_info.phone
        },
        item_details: {
          name: `${packageData.name} - ${request.billing_period}`,
          description: packageData.description
        },
        metadata: {
          user_id: request.user_id,
          package_id: request.package_id,
          billing_period: request.billing_period,
          token_id: request.token_id
        }
      }

      // Process payment through gateway
      const paymentResult = await gateway.processPayment(paymentRequest)

      // Update transaction with result
      await this.updateTransactionWithResult(transaction.id, paymentResult)

      return {
        success: true,
        transaction_id: paymentResult.transaction_id,
        order_id: orderId,
        redirect_url: paymentResult.redirect_url,
        requires_redirect: paymentResult.requires_redirect,
        message: 'Payment processed successfully'
      }

    } catch (error: any) {
      console.error('Payment processing error:', error)
      return {
        success: false,
        error: 'Payment processing failed'
      }
    }
  }

  /**
   * Get package details from database
   */
  private async getPackageDetails(packageId: string): Promise<any> {
    try {
      const packageData = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_payment_package_details',
          reason: 'Payment processor retrieving package details for payment processing',
          source: 'PaymentProcessor.getPackageDetails',
          metadata: {
            packageId,
            operation: 'select_active_package'
          }
        },
        { table: 'indb_payment_packages', operationType: 'select' },
        async () => {
          const { data: packageData, error } = await supabaseAdmin
            .from('indb_payment_packages')
            .select('*')
            .eq('id', packageId)
            .eq('is_active', true)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          return packageData;
        }
      );

      return packageData;
    } catch (error) {
      console.error('Error fetching package details:', error)
      return null
    }
  }

  /**
   * Calculate payment amount based on package and billing period
   */
  private calculateAmount(packageData: any, billingPeriod: string): number {
    // Use flat USD pricing structure (Paddle handles currency conversion)
    if (packageData.pricing_tiers?.[billingPeriod]) {
      const tierData = packageData.pricing_tiers[billingPeriod]
      return tierData.promo_price || tierData.regular_price
    }
    
    // If no pricing_tiers found, throw error
    throw new Error(`No pricing found for ${billingPeriod} billing period`)
  }

  /**
   * Generate unique order ID
   */
  private generateOrderId(userId: string, paymentMethod: string): string {
    const timestamp = Date.now()
    const method = paymentMethod.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4)
    const userPrefix = userId.substring(0, 8)
    return `${method}_${userPrefix}_${timestamp}`
  }

  /**
   * Create transaction record in database
   */
  private async createTransactionRecord(data: any): Promise<any> {
    try {
      const transaction = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'create_payment_transaction',
          reason: 'Payment processor creating new payment transaction record',
          source: 'PaymentProcessor.createTransactionRecord',
          metadata: {
            userId: data.user_id,
            packageId: data.package_id,
            orderId: data.order_id,
            amount: data.amount_usd,
            paymentMethod: data.payment_method,
            billingPeriod: data.billing_period
          }
        },
        { 
          table: 'indb_payment_transactions', 
          operationType: 'insert',
          data: {
            ...data,
            status: 'pending',
            payment_status: 'pending'
          }
        },
        async () => {
          const { data: transaction, error } = await supabaseAdmin
            .from('indb_payment_transactions')
            .insert({
              ...data,
              status: 'pending',
              payment_status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) {
            throw error;
          }

          return transaction;
        }
      );

      return transaction;
    } catch (error) {
      console.error('Error creating transaction record:', error)
      return null
    }
  }

  /**
   * Update transaction status
   */
  private async updateTransactionStatus(
    transactionId: string, 
    status: string, 
    errorMessage?: string
  ): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'update_payment_transaction_status',
          reason: 'Payment processor updating transaction status during payment flow',
          source: 'PaymentProcessor.updateTransactionStatus',
          metadata: {
            transactionId,
            newStatus: status,
            hasError: !!errorMessage,
            errorMessage: errorMessage || null
          }
        },
        { 
          table: 'indb_payment_transactions', 
          operationType: 'update',
          data: { status, error_message: errorMessage }
        },
        async () => {
          await supabaseAdmin
            .from('indb_payment_transactions')
            .update({
              status,
              error_message: errorMessage,
              updated_at: new Date().toISOString()
            })
            .eq('id', transactionId);

          return true;
        }
      );
    } catch (error) {
      console.error('Error updating transaction status:', error)
    }
  }

  /**
   * Update transaction with payment result
   */
  private async updateTransactionWithResult(
    transactionId: string, 
    result: PaymentResponse
  ): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'update_payment_transaction_with_gateway_result',
          reason: 'Payment processor updating transaction with gateway payment result and status',
          source: 'PaymentProcessor.updateTransactionWithResult',
          metadata: {
            transactionId,
            gatewayTransactionId: result.transaction_id,
            paymentStatus: result.status,
            mappedStatus: this.mapPaymentStatus(result.status),
            hasGatewayResponse: !!result
          }
        },
        { 
          table: 'indb_payment_transactions', 
          operationType: 'update',
          whereConditions: { id: transactionId },
          data: {
            transaction_id: result.transaction_id,
            status: this.mapPaymentStatus(result.status),
            payment_status: result.status,
            gateway_response: result,
            updated_at: new Date().toISOString()
          }
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_payment_transactions')
            .update({
              transaction_id: result.transaction_id,
              status: this.mapPaymentStatus(result.status),
              payment_status: result.status,
              gateway_response: result,
              updated_at: new Date().toISOString()
            })
            .eq('id', transactionId)

          if (error) {
            throw new Error(`Failed to update transaction with result: ${error.message}`)
          }

          return { success: true }
        }
      )
    } catch (error) {
      console.error('Error updating transaction with result:', error)
    }
  }

  /**
   * Map payment status to internal status
   */
  private mapPaymentStatus(paymentStatus: string): string {
    switch (paymentStatus) {
      case 'capture':
      case 'settlement':
        return 'completed'
      case 'pending':
        return 'pending'
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'failure':
        return 'failed'
      default:
        return 'pending'
    }
  }

  /**
   * Determine gateway name from payment method
   */
  private getGatewayName(paymentMethod: string): string {
    if (paymentMethod.includes('midtrans')) {
      return 'midtrans'
    }
    
    // Add more gateway mappings as needed
    return 'midtrans' // Default fallback
  }
}
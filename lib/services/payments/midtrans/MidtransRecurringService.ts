/**
 * Midtrans Recurring Service - Subscription Payments
 * Handles recurring payment processing and subscription management
 */

import { PaymentGateway, PaymentRequest, SubscriptionRequest, SubscriptionResponse } from '../core/PaymentGateway'
import { MidtransApiClient } from './MidtransApiClient'
import { convertUsdToIdr } from '@/lib/utils/currency-converter'

export class MidtransRecurringService extends PaymentGateway {
  private apiClient: MidtransApiClient

  constructor(config: any) {
    super(config, 'midtrans_recurring')
    this.apiClient = new MidtransApiClient(config)
  }

  /**
   * Process initial payment for recurring subscription
   */
  async processPayment(request: PaymentRequest): Promise<any> {
    try {
      // Convert USD to IDR
      const idrAmount = await convertUsdToIdr(request.amount_usd)
      const grossAmount = Math.round(idrAmount)

      // Create initial charge to get saved token
      const chargeRequest = {
        payment_type: 'credit_card',
        transaction_details: {
          order_id: request.order_id,
          gross_amount: grossAmount,
        },
        credit_card: {
          token_id: request.metadata?.token_id,
          save_token_id: true, // Important for recurring payments
          authentication: true
        },
        item_details: [
          {
            id: 'subscription_setup',
            price: grossAmount,
            quantity: 1,
            name: request.item_details.name,
          }
        ],
        customer_details: request.customer_details
      }

      const chargeResponse = await this.apiClient.createCharge(chargeRequest)

      // If charge is successful, return the saved token for subscription creation
      return {
        transaction_id: chargeResponse.transaction_id,
        order_id: chargeResponse.order_id,
        status: chargeResponse.transaction_status,
        saved_token_id: chargeResponse.saved_token_id,
        metadata: chargeResponse
      }

    } catch (error: any) {
      throw new Error(`Recurring payment setup failed: ${error.message}`)
    }
  }

  /**
   * Create charge transaction for recurring payments
   * This method is used by the handler to create the initial charge
   */
  async createChargeTransaction(params: {
    order_id: string
    amount_usd: number
    token_id: string
    customer_details: any
    item_details: any
  }): Promise<any> {
    try {
      // Convert USD to IDR
      const idrAmount = await convertUsdToIdr(params.amount_usd)
      const grossAmount = Math.round(idrAmount)

      // Create charge request
      const chargeRequest = {
        payment_type: 'credit_card',
        transaction_details: {
          order_id: params.order_id,
          gross_amount: grossAmount,
        },
        credit_card: {
          token_id: params.token_id,
          save_token_id: true,
          authentication: true,
          callback_type: "js_event"
        },
        item_details: [
          {
            id: 'recurring_payment_item',
            price: grossAmount,
            quantity: 1,
            name: params.item_details.name,
            description: params.item_details.description,
          }
        ],
        customer_details: {
          ...params.customer_details,
          billing_address: {
            first_name: params.customer_details.first_name,
            last_name: params.customer_details.last_name,
            email: params.customer_details.email,
            phone: params.customer_details.phone || '',
            address: "Jakarta",
            city: "Jakarta",
            postal_code: "12190",
            country_code: "IDN"
          }
        }
      }

      const response = await this.apiClient.createCharge(chargeRequest)

      return {
        transaction_id: response.transaction_id,
        order_id: response.order_id,
        status: response.transaction_status,
        redirect_url: response.redirect_url,
        requires_redirect: !!response.redirect_url,
        saved_token_id: response.saved_token_id,
        transaction_status: response.transaction_status,
        status_message: response.status_message,
        metadata: response
      }

    } catch (error: any) {
      throw new Error(`Charge transaction failed: ${error.message}`)
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<any> {
    try {
      const response = await this.apiClient.getTransactionStatus(transactionId)

      return {
        transaction_id: response.transaction_id,
        order_id: response.order_id,
        transaction_status: response.transaction_status,
        saved_token_id: response.saved_token_id,
        masked_card: response.masked_card,
        metadata: response
      }

    } catch (error: any) {
      throw new Error(`Failed to get transaction status: ${error.message}`)
    }
  }

  /**
   * Create recurring subscription with direct amount and options
   * Used by the MidtransRecurringHandler
   */
  async createSubscriptionWithAmount(amount: number, options: any): Promise<any> {
    try {
      // Convert USD to IDR
      const idrAmount = await convertUsdToIdr(amount)

      // Calculate start time
      const startTime = options.schedule?.start_time || new Date(Date.now() + 2 * 60 * 1000)
      // Only apply minimum if no explicit start_time was provided
      const actualStartTime = options.schedule?.start_time ? startTime : new Date(Date.now() + 60 * 1000)

      const subscriptionRequest = {
        name: options.name,
        amount: Math.round(idrAmount).toString(),
        currency: 'IDR',
        payment_type: 'credit_card',
        token: options.token,
        schedule: {
          interval: options.schedule?.interval || 1,
          interval_unit: options.schedule?.interval_unit || 'month',
          max_interval: options.schedule?.max_interval || 12,
          start_time: this.formatMidtransDateTime(actualStartTime),
        },
        retry_schedule: {
          interval: 1,
          interval_unit: 'day',
          max_interval: 3,
        },
        metadata: options.metadata,
        customer_details: options.customer_details,
      }

      const response = await this.apiClient.createSubscription(subscriptionRequest)

      return {
        id: response.id,
        status: response.status,
        next_execution_at: response.schedule?.next_execution_at,
        metadata: response
      }

    } catch (error: any) {
      throw new Error(`Subscription creation failed: ${error.message}`)
    }
  }

  /**
   * Create recurring subscription
   */
  async createSubscription(request: SubscriptionRequest): Promise<SubscriptionResponse> {
    try {
      // Convert USD to IDR
      const idrAmount = await convertUsdToIdr(request.amount_usd)

      // Calculate start time
      const startTime = request.start_date || new Date(Date.now() + 2 * 60 * 1000)
      const minStartTime = new Date(Date.now() + 60 * 1000)
      const actualStartTime = startTime < minStartTime ? minStartTime : startTime

      const subscriptionRequest = {
        name: request.name,
        amount: Math.round(idrAmount).toString(),
        currency: 'IDR',
        payment_type: 'credit_card',
        token: request.saved_token,
        schedule: {
          interval: 1,
          interval_unit: request.billing_period === 'monthly' ? 'month' : 'month',
          max_interval: request.billing_period === 'monthly' ? 12 : 1,
          start_time: this.formatMidtransDateTime(actualStartTime),
        },
        retry_schedule: {
          interval: 1,
          interval_unit: 'day',
          max_interval: 3,
        },
        metadata: request.metadata,
        customer_details: request.customer_details,
      }

      const response = await this.apiClient.createSubscription(subscriptionRequest)

      return {
        subscription_id: response.id,
        status: response.status,
        next_billing_date: response.schedule?.next_execution_at,
        metadata: response
      }

    } catch (error: any) {
      throw new Error(`Subscription creation failed: ${error.message}`)
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionResponse> {
    try {
      const response = await this.apiClient.getSubscription(subscriptionId)

      return {
        subscription_id: response.id,
        status: response.status,
        next_billing_date: response.schedule?.next_execution_at,
        metadata: response
      }

    } catch (error: any) {
      throw new Error(`Failed to get subscription status: ${error.message}`)
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.apiClient.disableSubscription(subscriptionId)
      
      return {
        success: true,
        message: response.status_message || 'Subscription cancelled successfully'
      }

    } catch (error: any) {
      throw new Error(`Failed to cancel subscription: ${error.message}`)
    }
  }

  /**
   * Enable subscription
   */
  async enableSubscription(subscriptionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.apiClient.enableSubscription(subscriptionId)
      
      return {
        success: true,
        message: response.status_message || 'Subscription enabled successfully'
      }

    } catch (error: any) {
      throw new Error(`Failed to enable subscription: ${error.message}`)
    }
  }

  /**
   * Format date for Midtrans API (Indonesia timezone)
   */
  private formatMidtransDateTime(date: Date): string {
    const jakartaTime = new Date(date.getTime() + (7 * 60 * 60 * 1000))
    
    const year = jakartaTime.getUTCFullYear()
    const month = String(jakartaTime.getUTCMonth() + 1).padStart(2, '0')
    const day = String(jakartaTime.getUTCDate()).padStart(2, '0')
    const hours = String(jakartaTime.getUTCHours()).padStart(2, '0')
    const minutes = String(jakartaTime.getUTCMinutes()).padStart(2, '0')
    const seconds = String(jakartaTime.getUTCSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} +0700`
  }

  // Not implemented for recurring service - these are handled by the snap service
  async getPaymentStatus(): Promise<any> {
    throw new Error('Use Snap service for one-time payment status')
  }

  async validateWebhook(): Promise<boolean> {
    throw new Error('Use Snap service for webhook validation')
  }

  async processWebhook(): Promise<any> {
    throw new Error('Use Snap service for webhook processing')
  }
}
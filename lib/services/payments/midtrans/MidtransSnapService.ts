/**
 * Midtrans Snap Service - One-time Payments
 * Handles Snap payment processing for single transactions
 */

import { PaymentGateway, PaymentRequest, PaymentResponse } from '../core/PaymentGateway'
import { MidtransApiClient } from './MidtransApiClient'
import { convertUsdToIdr } from '@/lib/utils/currency-converter'
import crypto from 'crypto'

export class MidtransSnapService extends PaymentGateway {
  private apiClient: MidtransApiClient

  constructor(config: any) {
    super(config, 'midtrans_snap')
    this.apiClient = new MidtransApiClient(config)
  }

  /**
   * Process one-time payment using Snap
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Convert USD to IDR
      const idrAmount = await convertUsdToIdr(request.amount_usd)
      const grossAmount = Math.round(idrAmount)

      // Prepare charge request
      const chargeRequest = {
        payment_type: 'credit_card',
        transaction_details: {
          order_id: request.order_id,
          gross_amount: grossAmount,
        },
        credit_card: {
          token_id: request.metadata?.token_id,
          save_token_id: true,
          authentication: true,
          callback_type: "js_event"
        },
        item_details: [
          {
            id: 'payment_item',
            price: grossAmount,
            quantity: 1,
            name: request.item_details.name,
          }
        ],
        customer_details: {
          ...request.customer_details,
          billing_address: {
            first_name: request.customer_details.first_name,
            last_name: request.customer_details.last_name,
            email: request.customer_details.email,
            phone: request.customer_details.phone || '',
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
        metadata: response
      }

    } catch (error: any) {
      throw new Error(`Snap payment processing failed: ${error.message}`)
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    try {
      const response = await this.apiClient.getTransactionStatus(transactionId)

      return {
        transaction_id: response.transaction_id,
        order_id: response.order_id,
        status: response.transaction_status,
        saved_token_id: response.saved_token_id,
        metadata: response
      }

    } catch (error: any) {
      throw new Error(`Failed to get payment status: ${error.message}`)
    }
  }

  /**
   * Validate webhook signature
   */
  async validateWebhook(payload: any, signature: string): Promise<boolean> {
    try {
      const serverKey = this.config.server_key
      const orderId = payload.order_id
      const statusCode = payload.status_code
      const grossAmount = payload.gross_amount
      
      const expectedSignature = crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest('hex')

      return signature === expectedSignature

    } catch (error) {
      return false
    }
  }

  /**
   * Process webhook notification
   */
  async processWebhook(payload: any): Promise<{ order_id: string; status: string; data: any }> {
    return {
      order_id: payload.order_id,
      status: payload.transaction_status,
      data: payload
    }
  }

  // Not implemented for Snap service
  async createSubscription(): Promise<any> {
    throw new Error('Subscriptions not supported by Snap service')
  }

  async getSubscriptionStatus(): Promise<any> {
    throw new Error('Subscriptions not supported by Snap service')
  }

  async cancelSubscription(): Promise<any> {
    throw new Error('Subscriptions not supported by Snap service')
  }
}
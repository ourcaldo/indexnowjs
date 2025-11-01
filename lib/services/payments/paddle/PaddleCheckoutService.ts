/**
 * Paddle Checkout Service
 * Handles transaction creation for backend-initiated payments
 * 
 * Note: Frontend checkouts are handled by Paddle.js (PaddleProvider)
 * This service is for backend transaction operations
 */

import { PaddleService } from './PaddleService'
import { TransactionStatus } from '@paddle/paddle-node-sdk'

export interface TransactionRequest {
  items: Array<{
    priceId: string
    quantity: number
  }>
  customerEmail: string
  userId: string
  packageSlug: string
  billingPeriod: 'monthly' | 'annual'
}

export class PaddleCheckoutService {
  /**
   * Create a transaction (for backend-initiated payments)
   * Note: Most checkouts should use Paddle.js on frontend
   */
  static async createTransaction(request: TransactionRequest) {
    const paddle = await PaddleService.getInstance()

    // Create transaction via Paddle API
    const transaction = await paddle.transactions.create({
      items: request.items,
      customer: {
        email: request.customerEmail,
      },
      customData: {
        userId: request.userId,
        packageSlug: request.packageSlug,
        billingPeriod: request.billingPeriod,
      },
    })

    return transaction
  }

  /**
   * Get transaction details
   */
  static async getTransaction(transactionId: string) {
    const paddle = await PaddleService.getInstance()
    const transaction = await paddle.transactions.get(transactionId)
    return transaction
  }

  /**
   * List transactions
   */
  static async listTransactions(filters?: {
    customerId?: string[]
    subscriptionId?: string[]
    status?: TransactionStatus[]
  }) {
    const paddle = await PaddleService.getInstance()
    const transactions = await paddle.transactions.list(filters)
    return transactions
  }
}

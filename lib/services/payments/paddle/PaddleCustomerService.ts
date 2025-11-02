/**
 * Paddle Customer Service
 * Handles customer operations and customer portal access
 */

import { PaddleService } from './PaddleService'

export class PaddleCustomerService {
  /**
   * Get customer details from Paddle
   */
  static async getCustomer(customerId: string) {
    const paddle = await PaddleService.getInstance()
    const customer = await paddle.customers.get(customerId)
    return customer
  }

  /**
   * Get customer authentication token for portal access
   * Returns URL for customer to manage their subscription
   * 
   * Note: Paddle manages customer portal automatically
   * Customers can access via email links or direct portal URL
   */
  static async getCustomerPortalUrl(customerId: string): Promise<string> {
    // Paddle automatically provides customer portal access
    // The URL is available from the subscription management page
    // Return the standard Paddle portal URL with customer ID
    const gateway = await PaddleService.getGatewayConfig()
    const environment = gateway?.configuration?.environment || 'sandbox'
    const baseUrl = environment === 'production' 
      ? 'https://customer-portal.paddle.com'
      : 'https://sandbox-customer-portal.paddle.com'
    
    return `${baseUrl}/customers/${customerId}`
  }

  /**
   * Update customer details
   */
  static async updateCustomer(
    customerId: string,
    updates: {
      email?: string
      name?: string
    }
  ) {
    const paddle = await PaddleService.getInstance()

    const customer = await paddle.customers.update(customerId, updates)

    return customer
  }

  /**
   * List all transactions for a customer
   */
  static async getCustomerTransactions(customerId: string) {
    const paddle = await PaddleService.getInstance()

    const transactions = await paddle.transactions.list({
      customerId: [customerId],
    })

    return transactions
  }
}

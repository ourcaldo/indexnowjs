/**
 * Midtrans API Client - HTTP Client Abstraction
 * Handles all direct API communication with Midtrans
 */

export interface MidtransConfig {
  merchant_id: string
  client_key: string
  server_key: string
  environment: 'sandbox' | 'production'
}

export class MidtransApiClient {
  private config: MidtransConfig
  private baseUrl: string

  constructor(config: MidtransConfig) {
    this.config = config
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.midtrans.com' 
      : 'https://api.sandbox.midtrans.com'
  }

  /**
   * Generate Basic Auth header for Midtrans API
   */
  private getAuthHeader(): string {
    const credentials = `${this.config.server_key}:`
    const encoded = Buffer.from(credentials).toString('base64')
    return `Basic ${encoded}`
  }

  /**
   * Make HTTP request to Midtrans API
   */
  async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PATCH' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }

    if (body && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(`Midtrans API Error: ${response.status} - ${JSON.stringify(result)}`)
    }

    return result
  }

  /**
   * Create charge transaction
   */
  async createCharge(payload: any): Promise<any> {
    return this.makeRequest('/v2/charge', 'POST', payload)
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<any> {
    return this.makeRequest(`/v2/${transactionId}/status`, 'GET')
  }

  /**
   * Create subscription
   */
  async createSubscription(payload: any): Promise<any> {
    return this.makeRequest('/v1/subscriptions', 'POST', payload)
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    return this.makeRequest(`/v1/subscriptions/${subscriptionId}`, 'GET')
  }

  /**
   * Update subscription
   */
  async updateSubscription(subscriptionId: string, updates: any): Promise<any> {
    return this.makeRequest(`/v1/subscriptions/${subscriptionId}`, 'PATCH', updates)
  }

  /**
   * Disable subscription
   */
  async disableSubscription(subscriptionId: string): Promise<any> {
    return this.makeRequest(`/v1/subscriptions/${subscriptionId}/disable`, 'POST')
  }

  /**
   * Enable subscription
   */
  async enableSubscription(subscriptionId: string): Promise<any> {
    return this.makeRequest(`/v1/subscriptions/${subscriptionId}/enable`, 'POST')
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<any> {
    return this.makeRequest(`/v1/subscriptions/${subscriptionId}/cancel`, 'POST')
  }

  /**
   * Get configuration
   */
  getConfig(): MidtransConfig {
    return this.config
  }
}
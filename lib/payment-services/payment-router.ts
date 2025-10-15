/**
 * Payment Router Service
 * Frontend service for making API calls to the backend payment system
 * Used by React components to process payments through unified API
 */

import { BILLING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export interface CustomerInfo {
  first_name: string
  last_name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country: string
  description?: string
}

export interface PaymentRequest {
  package_id: string
  billing_period: string
  payment_method: string
  customer_info: CustomerInfo
  token_id?: string // For credit card payments
}

export interface PaymentResponse {
  success: boolean
  data?: any
  message?: string
  requires_redirect?: boolean
  redirect_url?: string
}

export class PaymentRouter {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  /**
   * Process payment through unified backend API
   * Routes to appropriate payment channel based on payment_method
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await fetch(BILLING_ENDPOINTS.PAYMENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(request),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Payment API error: ${response.status}`)
      }

      const result = await response.json()
      
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Fetch available payment gateways
   */
  async getPaymentGateways(): Promise<any[]> {
    try {
      const response = await fetch(BILLING_ENDPOINTS.PAYMENT_GATEWAYS, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch payment gateways: ${response.status}`)
      }

      const data = await response.json()
      return data.gateways || []
    } catch (error) {
      console.error('Error fetching payment gateways:', error)
      throw error
    }
  }

  /**
   * Fetch package details
   */
  async getPackage(packageId: string): Promise<any> {
    try {
      const response = await fetch(BILLING_ENDPOINTS.PACKAGES, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch packages: ${response.status}`)
      }

      const data = await response.json()
      const selectedPackage = data.packages?.find((pkg: any) => pkg.id === packageId)
      
      if (!selectedPackage) {
        throw new Error('Package not found')
      }

      return selectedPackage
    } catch (error) {
      console.error('Error fetching package:', error)
      throw error
    }
  }
}
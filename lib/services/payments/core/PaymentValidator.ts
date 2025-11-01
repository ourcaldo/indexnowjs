/**
 * Payment Validator Service
 * Handles validation of payment requests and data
 */

export interface ValidationResult {
  valid: boolean
  error?: string
  details?: Record<string, string>
}

export class PaymentValidator {
  
  /**
   * Validate payment request
   */
  validatePaymentRequest(request: any): ValidationResult {
    const errors: Record<string, string> = {}

    // Check required fields
    if (!request.user_id) {
      errors.user_id = 'User ID is required'
    }

    if (!request.package_id) {
      errors.package_id = 'Package ID is required'
    }

    if (!request.billing_period) {
      errors.billing_period = 'Billing period is required'
    } else if (!['monthly', 'yearly'].includes(request.billing_period)) {
      errors.billing_period = 'Billing period must be monthly or yearly'
    }

    if (!request.payment_method) {
      errors.payment_method = 'Payment method is required'
    }

    if (!request.customer_info) {
      errors.customer_info = 'Customer information is required'
    } else {
      const customerErrors = this.validateCustomerInfo(request.customer_info)
      if (!customerErrors.valid) {
        Object.assign(errors, customerErrors.details)
      }
    }

    // Validate token for credit card payments
    if (request.payment_method?.includes('card') && !request.token_id) {
      errors.token_id = 'Payment token is required for card payments'
    }

    if (Object.keys(errors).length > 0) {
      return {
        valid: false,
        error: 'Validation failed',
        details: errors
      }
    }

    return { valid: true }
  }

  /**
   * Validate customer information
   */
  validateCustomerInfo(customerInfo: any): ValidationResult {
    const errors: Record<string, string> = {}

    if (!customerInfo.first_name) {
      errors.first_name = 'First name is required'
    }

    if (!customerInfo.last_name) {
      errors.last_name = 'Last name is required'
    }

    if (!customerInfo.email) {
      errors.email = 'Email is required'
    } else if (!this.isValidEmail(customerInfo.email)) {
      errors.email = 'Invalid email format'
    }

    if (customerInfo.phone && !this.isValidPhone(customerInfo.phone)) {
      errors.phone = 'Invalid phone number format'
    }

    if (Object.keys(errors).length > 0) {
      return {
        valid: false,
        error: 'Customer validation failed',
        details: errors
      }
    }

    return { valid: true }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate phone number format
   */
  private isValidPhone(phone: string): boolean {
    // Basic phone validation - accepts numbers, spaces, hyphens, parentheses, plus sign
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
    return phoneRegex.test(cleanPhone)
  }

  /**
   * Validate amount
   */
  validateAmount(amount: number): ValidationResult {
    if (amount <= 0) {
      return {
        valid: false,
        error: 'Amount must be greater than zero'
      }
    }

    const minimum = 0.50

    if (amount < minimum) {
      return {
        valid: false,
        error: `Amount must be at least $${minimum} USD`
      }
    }

    return { valid: true }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: any, signature: string, secret: string): boolean {
    try {
      const crypto = require('crypto')
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex')

      return signature === expectedSignature
    } catch (error) {
      console.error('Webhook signature validation error:', error)
      return false
    }
  }
}
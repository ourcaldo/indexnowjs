import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { logger } from '@/lib/monitoring/error-handling'

export interface PaymentData {
  package_id: string
  billing_period: string
  customer_info: CustomerInfo
  user: any
  is_trial?: boolean
}

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

export interface PaymentResult {
  success: boolean
  data?: any
  message?: string
  requires_redirect?: boolean
  redirect_url?: string
}

export abstract class BasePaymentHandler {
  protected packageData: any
  protected userData: any

  constructor(protected paymentData: PaymentData) {}

  // Common validation logic
  async validatePackage(): Promise<void> {
    const { data: packageData, error } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('id', this.paymentData.package_id)
      .eq('is_active', true)
      .single()

    if (error || !packageData) {
      throw new Error('Package not found or inactive')
    }

    this.packageData = packageData
  }

  // Common transaction creation BEFORE payment processing
  async createPendingTransaction(gatewayId: string, additionalData: any = {}): Promise<string> {
    const amount = this.calculateAmount()

    const { data: transaction, error: dbError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .insert({
        user_id: this.paymentData.user.id,
        package_id: this.paymentData.package_id,
        gateway_id: gatewayId,
        transaction_type: 'payment',
        transaction_status: 'pending',
        amount: amount.finalAmount,
        currency: amount.currency,
        payment_method: this.getPaymentMethodSlug(),
        billing_period: this.paymentData.billing_period,
        metadata: {
          original_amount: amount.originalAmount,
          original_currency: amount.originalCurrency,
          customer_info: this.paymentData.customer_info,
          user_id: this.paymentData.user.id,
          user_email: this.paymentData.user.email,
          package_id: this.paymentData.package_id,
          billing_period: this.paymentData.billing_period,
          created_at: new Date().toISOString(),
          payment_type: this.paymentData.is_trial ? 'trial_payment' : 'regular_payment',
          ...additionalData
        }
      })
      .select('id')
      .single()

    if (dbError || !transaction) {
      throw new Error('Failed to create transaction record')
    }

    return transaction.id
  }

  // Common amount calculation
  calculateAmount(): { originalAmount: number; finalAmount: number; currency: string; originalCurrency: string } {
    const { getUserCurrency } = require('@/lib/utils/currency-utils')
    const userCurrency = getUserCurrency(this.paymentData.customer_info.country)

    let amount = 0
    const { billing_period } = this.paymentData

    // New pricing structure
    if (this.packageData.pricing_tiers?.[billing_period]?.[userCurrency]) {
      const currencyTier = this.packageData.pricing_tiers[billing_period][userCurrency]
      amount = currencyTier.promo_price || currencyTier.regular_price
    } else {
      amount = this.packageData.price || 0
    }

    if (amount === 0 && !this.paymentData.is_trial) {
      throw new Error('Unable to calculate package amount - no pricing found')
    }

    // For trial payments, keep original amount for subscription, but individual handlers will use $1 for charge
    const finalAmount = amount

    return {
      originalAmount: amount,
      originalCurrency: userCurrency,
      finalAmount: finalAmount,
      currency: userCurrency
    }
  }

  // Abstract methods each payment channel must implement
  abstract getPaymentMethodSlug(): string
  abstract processPayment(): Promise<PaymentResult>

  // Main execution flow
  async execute(): Promise<NextResponse> {
    try {
      await this.validatePackage()
      const result = await this.processPayment()

      return NextResponse.json({
        success: result.success,
        data: result.data,
        message: result.message,
        requires_redirect: result.requires_redirect,
        redirect_url: result.redirect_url
      })

    } catch (error: any) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, `[${this.getPaymentMethodSlug()}] Error:`)
      return NextResponse.json(
        { 
          success: false, 
          message: error.message || 'Payment processing failed'
        },
        { status: 500 }
      )
    }
  }
}
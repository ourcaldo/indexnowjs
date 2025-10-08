/**
 * Billing Cycle Service
 * Handles billing cycle calculations, renewals, and subscription management
 */

import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '../../security/SecureServiceRoleWrapper'

export interface BillingCycle {
  user_id: string
  package_id: string
  current_period_start: Date
  current_period_end: Date
  next_billing_date: Date
  billing_period: 'monthly' | 'annual'
  amount: number
  currency: string
  is_active: boolean
}

export class BillingCycleService {

  /**
   * Calculate next billing date based on current period and billing period
   */
  calculateNextBillingDate(currentDate: Date, billingPeriod: 'monthly' | 'annual'): Date {
    const nextDate = new Date(currentDate)
    
    if (billingPeriod === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1)
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1)
    }
    
    return nextDate
  }

  /**
   * Calculate billing amount from pricing tiers
   */
  calculateBillingAmountFromTiers(pricingTiers: any, billingPeriod: 'monthly' | 'annual'): number {
    const currency = 'IDR' // Should be determined from user location
    
    if (pricingTiers?.[billingPeriod]?.[currency]) {
      const currencyTier = pricingTiers[billingPeriod][currency]
      return currencyTier.promo_price || currencyTier.regular_price
    }
    
    return 0 // Default if no pricing found
  }

  /**
   * Get user's current billing cycle
   */
  async getCurrentBillingCycle(userId: string): Promise<BillingCycle | null> {
    try {
      const profile = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: userId,
          operation: 'get_user_billing_cycle_info',
          reason: 'Retrieving user billing cycle and package information for billing calculations',
          source: 'services/payments/billing/BillingCycleService',
          metadata: {
            target_user_id: userId,
            operation_type: 'billing_cycle_lookup'
          }
        },
        {
          table: 'indb_auth_user_profiles',
          operationType: 'select',
          columns: ['*'],
          whereConditions: { user_id: userId }
        },
        async () => {
          const { data: profile, error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select(`
              *,
              package:indb_payment_packages(
                id,
                name,

                currency,
                billing_period,
                pricing_tiers
              )
            `)
            .eq('user_id', userId)
            .single()

          if (error) {
            throw new Error(`Failed to get user billing cycle: ${error.message}`)
          }

          return profile
        }
      )

      if (!profile || !profile.package) {
        return null
      }

      const currentDate = new Date()
      const subscribedAt = new Date(profile.subscribed_at)
      const expiresAt = profile.expires_at ? new Date(profile.expires_at) : null

      return {
        user_id: userId,
        package_id: profile.package_id,
        current_period_start: subscribedAt,
        current_period_end: expiresAt || this.calculateNextBillingDate(subscribedAt, profile.package.billing_period),
        next_billing_date: this.calculateNextBillingDate(subscribedAt, profile.package.billing_period),
        billing_period: profile.package.billing_period,
        amount: this.calculateBillingAmountFromTiers(profile.package.pricing_tiers, profile.package.billing_period),
        currency: profile.package.currency,
        is_active: !expiresAt || expiresAt > currentDate
      }

    } catch (error) {
      console.error('Error getting billing cycle:', error)
      return null
    }
  }

  /**
   * Update user's billing cycle after successful payment
   */
  async updateBillingCycle(
    userId: string, 
    packageId: string, 
    billingPeriod: 'monthly' | 'annual'
  ): Promise<boolean> {
    try {
      const currentDate = new Date()
      const nextBillingDate = this.calculateNextBillingDate(currentDate, billingPeriod)

      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: userId,
          operation: 'update_user_billing_cycle_after_payment',
          reason: 'Updating user billing cycle after successful payment processing',
          source: 'services/payments/billing/BillingCycleService',
          metadata: {
            target_user_id: userId,
            package_id: packageId,
            billing_period: billingPeriod,
            next_billing_date: nextBillingDate.toISOString(),
            operation_type: 'billing_cycle_update'
          }
        },
        {
          table: 'indb_auth_user_profiles',
          operationType: 'update',
          whereConditions: { user_id: userId },
          data: {
            package_id: packageId,
            subscribed_at: currentDate.toISOString(),
            expires_at: nextBillingDate.toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .update({
              package_id: packageId,
              subscribed_at: currentDate.toISOString(),
              expires_at: nextBillingDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)

          if (error) {
            throw new Error(`Failed to update billing cycle: ${error.message}`)
          }

          return { success: true }
        }
      )

      return true

    } catch (error) {
      console.error('Error updating billing cycle:', error)
      return false
    }
  }

  /**
   * Get users with upcoming renewals (next 3 days)
   */
  async getUpcomingRenewals(daysAhead: number = 3): Promise<BillingCycle[]> {
    try {
      const currentDate = new Date()
      const futureDate = new Date()
      futureDate.setDate(currentDate.getDate() + daysAhead)

      const profiles = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_upcoming_billing_renewals',
          reason: 'Retrieving user profiles with upcoming billing renewals for automated billing processing',
          source: 'services/payments/billing/BillingCycleService',
          metadata: {
            days_ahead: daysAhead,
            current_date: currentDate.toISOString(),
            future_date: futureDate.toISOString(),
            operation_type: 'billing_renewal_lookup'
          }
        },
        {
          table: 'indb_auth_user_profiles',
          operationType: 'select',
          columns: ['*'],
          whereConditions: { 
            expires_at_gte: currentDate.toISOString(),
            expires_at_lte: futureDate.toISOString()
          }
        },
        async () => {
          const { data: profiles, error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select(`
              *,
              package:indb_payment_packages(
                id,
                name,

                currency,
                billing_period
              )
            `)
            .gte('expires_at', currentDate.toISOString())
            .lte('expires_at', futureDate.toISOString())
            .not('package_id', 'is', null)

          if (error) {
            throw new Error(`Failed to get upcoming renewals: ${error.message}`)
          }

          return profiles || []
        }
      )

      if (!profiles) {
        return []
      }

      return profiles.map(profile => ({
        user_id: profile.user_id,
        package_id: profile.package_id,
        current_period_start: new Date(profile.subscribed_at),
        current_period_end: new Date(profile.expires_at),
        next_billing_date: new Date(profile.expires_at),
        billing_period: profile.package.billing_period,
        amount: this.calculateBillingAmountFromTiers(profile.package.pricing_tiers, profile.package.billing_period),
        currency: profile.package.currency,
        is_active: true
      }))

    } catch (error) {
      console.error('Error getting upcoming renewals:', error)
      return []
    }
  }

  /**
   * Get expired subscriptions
   */
  async getExpiredSubscriptions(): Promise<BillingCycle[]> {
    try {
      const currentDate = new Date()

      const profiles = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_expired_subscriptions',
          reason: 'Retrieving user profiles with expired subscriptions for automated subscription management',
          source: 'services/payments/billing/BillingCycleService',
          metadata: {
            current_date: currentDate.toISOString(),
            operation_type: 'expired_subscription_lookup'
          }
        },
        {
          table: 'indb_auth_user_profiles',
          operationType: 'select',
          columns: ['*'],
          whereConditions: { 
            expires_at_lt: currentDate.toISOString()
          }
        },
        async () => {
          const { data: profiles, error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select(`
              *,
              package:indb_payment_packages(
                id,
                name,

                currency,
                billing_period
              )
            `)
            .lt('expires_at', currentDate.toISOString())
            .not('package_id', 'is', null)

          if (error) {
            throw new Error(`Failed to get expired subscriptions: ${error.message}`)
          }

          return profiles || []
        }
      )

      if (!profiles) {
        return []
      }

      return profiles.map(profile => ({
        user_id: profile.user_id,
        package_id: profile.package_id,
        current_period_start: new Date(profile.subscribed_at),
        current_period_end: new Date(profile.expires_at),
        next_billing_date: new Date(profile.expires_at),
        billing_period: profile.package.billing_period,
        amount: this.calculateBillingAmountFromTiers(profile.package.pricing_tiers, profile.package.billing_period),
        currency: profile.package.currency,
        is_active: false
      }))

    } catch (error) {
      console.error('Error getting expired subscriptions:', error)
      return []
    }
  }

  /**
   * Suspend expired subscriptions
   */
  async suspendExpiredSubscriptions(): Promise<number> {
    try {
      const currentDate = new Date()

      // Get the free package ID
      const freePackage = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_free_package_for_suspension',
          reason: 'Retrieving free package ID for automatic suspension of expired subscriptions',
          source: 'services/payments/billing/BillingCycleService',
          metadata: {
            operation_type: 'package_lookup'
          }
        },
        {
          table: 'indb_payment_packages',
          operationType: 'select',
          columns: ['id'],
          whereConditions: { slug: 'free', is_active: true }
        },
        async () => {
          const { data: freePackage, error } = await supabaseAdmin
            .from('indb_payment_packages')
            .select('id')
            .eq('slug', 'free')
            .eq('is_active', true)
            .single()

          if (error) {
            throw new Error(`Failed to get free package: ${error.message}`)
          }

          return freePackage
        }
      )

      if (!freePackage) {
        console.error('Free package not found')
        return 0
      }

      // Update expired subscriptions to free package
      const updatedProfiles = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'suspend_expired_subscriptions_to_free',
          reason: 'Updating expired subscriptions to free package for automated suspension',
          source: 'services/payments/billing/BillingCycleService',
          metadata: {
            free_package_id: freePackage.id,
            current_date: currentDate.toISOString(),
            operation_type: 'bulk_subscription_suspension'
          }
        },
        {
          table: 'indb_auth_user_profiles',
          operationType: 'update',
          whereConditions: { 
            expires_at_lt: currentDate.toISOString()
          },
          data: {
            package_id: freePackage.id,
            expires_at: null,
            updated_at: new Date().toISOString()
          }
        },
        async () => {
          const { data: updatedProfiles, error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .update({
              package_id: freePackage.id,
              expires_at: null,
              updated_at: new Date().toISOString()
            })
            .lt('expires_at', currentDate.toISOString())
            .not('package_id', 'eq', freePackage.id)
            .select('user_id')

          if (error) {
            throw new Error(`Failed to suspend expired subscriptions: ${error.message}`)
          }

          return updatedProfiles
        }
      )

      return updatedProfiles?.length || 0

    } catch (error) {
      console.error('Error suspending expired subscriptions:', error)
      return 0
    }
  }
}
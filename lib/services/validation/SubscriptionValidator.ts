/**
 * Subscription Validation Service
 * Validates if a user has an active package/subscription before performing restricted actions
 * Used by: keyword creation, domain creation, job creation, rank tracking
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'

export interface SubscriptionValidationResult {
  isValid: boolean
  error?: string
  errorCode?: 'NO_PACKAGE' | 'SUBSCRIPTION_EXPIRED' | 'TRIAL_EXPIRED' | 'DATABASE_ERROR'
}

export class SubscriptionValidator {
  /**
   * Validates if a user has an active subscription/package
   * Checks:
   * 1. User has a package_id (not null)
   * 2. If expires_at exists, it must be in the future
   * 3. Trial status if applicable
   */
  static async validateActiveSubscription(
    supabase: SupabaseClient,
    userId: string,
    requestMetadata?: {
      ipAddress?: string
      userAgent?: string
      endpoint?: string
      operation?: string
    }
  ): Promise<SubscriptionValidationResult> {
    try {
      const userProfile = await SecureServiceRoleWrapper.executeWithUserSession(
        supabase,
        {
          userId,
          operation: requestMetadata?.operation || 'validate_subscription',
          source: 'subscription-validator',
          reason: 'Validating user has active package/subscription for restricted operation',
          metadata: {
            endpoint: requestMetadata?.endpoint || 'unknown',
            validationType: 'subscription_check'
          },
          ipAddress: requestMetadata?.ipAddress,
          userAgent: requestMetadata?.userAgent
        },
        { table: 'indb_auth_user_profiles', operationType: 'select' },
        async (db) => {
          const { data, error } = await db
            .from('indb_auth_user_profiles')
            .select('package_id, expires_at, trial_status, subscribed_at')
            .eq('user_id', userId)
            .single()
          
          return { data, error }
        }
      )

      if (userProfile.error || !userProfile.data) {
        return {
          isValid: false,
          error: 'Unable to verify subscription status. Please contact support.',
          errorCode: 'DATABASE_ERROR'
        }
      }

      const profile = userProfile.data

      if (!profile.package_id) {
        return {
          isValid: false,
          error: 'You need an active subscription to perform this action. Please subscribe to a plan to continue.',
          errorCode: 'NO_PACKAGE'
        }
      }

      if (profile.expires_at) {
        const expirationDate = new Date(profile.expires_at)
        const now = new Date()

        if (expirationDate < now) {
          return {
            isValid: false,
            error: 'Your subscription has expired. Please renew your subscription to continue.',
            errorCode: 'SUBSCRIPTION_EXPIRED'
          }
        }
      }

      if (profile.trial_status === 'expired') {
        if (!profile.package_id || !profile.subscribed_at) {
          return {
            isValid: false,
            error: 'Your trial has expired. Please subscribe to a plan to continue.',
            errorCode: 'TRIAL_EXPIRED'
          }
        }
      }

      return {
        isValid: true
      }

    } catch (error) {
      return {
        isValid: false,
        error: 'An error occurred while validating your subscription. Please try again.',
        errorCode: 'DATABASE_ERROR'
      }
    }
  }

  /**
   * Helper method to check if error is subscription-related
   */
  static isSubscriptionError(errorCode?: string): boolean {
    return ['NO_PACKAGE', 'SUBSCRIPTION_EXPIRED', 'TRIAL_EXPIRED'].includes(errorCode || '')
  }
}

import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const GET = authenticatedApiWrapper(async (request, auth) => {
  try {
    const userProfile = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_user_trial_status',
        source: 'auth/user/trial-status',
        reason: 'User fetching their own trial status information',
        metadata: { endpoint: '/api/v1/auth/user/trial-status', method: 'GET' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_auth_user_profiles', operationType: 'select', columns: ['trial_status', 'trial_started_at', 'trial_ends_at', 'auto_billing_enabled', 'package_id', 'subscribed_at', 'expires_at'] },
      async (db) => {
        const { data, error } = await db
          .from('indb_auth_user_profiles')
          .select('trial_status, trial_started_at, trial_ends_at, auto_billing_enabled, package_id, subscribed_at, expires_at')
          .single()
        if (error) throw error
        return data
      }
    )

    const now = new Date()
    const response: any = {
      has_trial: userProfile.trial_status !== 'none',
      trial_status: userProfile.trial_status || 'none',
      auto_billing_enabled: userProfile.auto_billing_enabled || false
    }

    if (userProfile.trial_status === 'active' && userProfile.trial_ends_at) {
      const trialEndTime = new Date(userProfile.trial_ends_at)
      const timeDiff = trialEndTime.getTime() - now.getTime()
      
      response.trial_started_at = userProfile.trial_started_at
      response.trial_ends_at = userProfile.trial_ends_at
      response.days_remaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)))
      response.hours_remaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60)))
    }

    if (userProfile.package_id) {
      try {
        const packageInfo = await SecureServiceRoleWrapper.executeWithUserSession(
          auth.supabase,
          {
            userId: auth.userId,
            operation: 'get_trial_package_info',
            source: 'auth/user/trial-status',
            reason: 'User fetching trial package information for their account',
            metadata: { packageId: userProfile.package_id },
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
            userAgent: request.headers.get('user-agent')
          },
          { table: 'indb_payment_packages', operationType: 'select', columns: ['*'] },
          async (db) => {
            const { data, error } = await db
              .from('indb_payment_packages')
              .select('*')
              .eq('id', userProfile.package_id)
              .single()
            if (error && error.code !== 'PGRST116') throw error
            return data
          }
        )
        if (packageInfo) response.trial_package = packageInfo
      } catch (error) {}
    }

    if (response.auto_billing_enabled) {
      try {
        const subscription = await SecureServiceRoleWrapper.executeWithUserSession(
          auth.supabase,
          {
            userId: auth.userId,
            operation: 'get_active_subscription_info',
            source: 'auth/user/trial-status',
            reason: 'User fetching active subscription information for trial auto-billing details',
            metadata: { autoBillingEnabled: response.auto_billing_enabled },
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
            userAgent: request.headers.get('user-agent')
          },
          { table: 'indb_payment_subscriptions', operationType: 'select', columns: ['current_period_end', 'status', 'metadata'] },
          async (db) => {
            const { data, error} = await db
              .from('indb_payment_subscriptions')
              .select('current_period_end, status, metadata')
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (error && error.code !== 'PGRST116') throw error
            return data
          }
        )
        if (subscription) {
          response.next_billing_date = subscription.current_period_end
          response.subscription_info = { status: subscription.status, metadata: subscription.metadata }
        }
      } catch (error) {}
    }

    return formatSuccess({ data: response })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.MEDIUM, userId: auth.userId, endpoint: '/api/v1/auth/user/trial-status', method: 'GET', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

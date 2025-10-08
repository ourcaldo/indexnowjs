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
        operation: 'get_user_trial_eligibility_profile',
        source: 'auth/user/trial-eligibility',
        reason: 'User checking trial eligibility status and usage history',
        metadata: { endpoint: '/api/v1/auth/user/trial-eligibility', method: 'GET' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_auth_user_profiles', operationType: 'select', columns: ['has_used_trial', 'trial_used_at', 'package_id', 'subscribed_at', 'expires_at'] },
      async (db) => {
        const { data, error } = await db
          .from('indb_auth_user_profiles')
          .select('has_used_trial, trial_used_at, package_id, subscribed_at, expires_at')
          .single()
        if (error) throw new Error('Unable to verify account eligibility')
        return data
      }
    )

    if (userProfile.has_used_trial) {
      return formatSuccess({
        eligible: false,
        reason: 'already_used',
        trial_used_at: userProfile.trial_used_at,
        message: `Free trial already used on ${new Date(userProfile.trial_used_at).toLocaleDateString()}`
      })
    }

    let packages = []
    try {
      packages = await SecureServiceRoleWrapper.executeWithUserSession(
        auth.supabase,
        {
          userId: auth.userId,
          operation: 'get_available_trial_packages',
          source: 'auth/user/trial-eligibility',
          reason: 'User fetching available trial packages for eligibility check',
          metadata: { eligible: true },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_payment_packages', operationType: 'select', columns: ['*'] },
        async (db) => {
          const { data, error } = await db
            .from('indb_payment_packages')
            .select('*')
            .eq('free_trial_enabled', true)
            .eq('is_active', true)
            .order('sort_order')
          if (error) throw error
          return data || []
        }
      )
    } catch (error) {
      packages = []
    }

    return formatSuccess({
      eligible: true,
      available_packages: packages || [],
      message: 'You are eligible for a 3-day free trial'
    })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.MEDIUM, userId: auth.userId, endpoint: '/api/v1/auth/user/trial-eligibility', method: 'GET', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

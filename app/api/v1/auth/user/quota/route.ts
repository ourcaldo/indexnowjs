import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const GET = authenticatedApiWrapper(async (request, auth) => {
  try {
    const quotaData = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_user_quota_summary',
        source: 'auth/user/quota',
        reason: 'User retrieving their own quota information for dashboard display',
        metadata: { endpoint: '/api/v1/auth/user/quota', method: 'GET' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'user_quota_summary', operationType: 'select' },
      async (db) => {
        const { data: quotaData, error: quotaError } = await db
          .from('user_quota_summary')
          .select('*')
          .eq('user_id', auth.userId)
          .single()

        if (quotaError) throw new Error('Failed to fetch quota data')
        return quotaData
      }
    )

    const dailyQuotaUsed = quotaData?.total_quota_used || 0
    const dailyQuotaLimit = quotaData?.daily_quota_limit || 50
    const isUnlimited = quotaData?.is_unlimited === true
    const packageName = quotaData?.package_name || 'Free'
    const serviceAccountCount = quotaData?.service_account_count || 0
    
    const remainingQuota = isUnlimited ? -1 : Math.max(0, dailyQuotaLimit - dailyQuotaUsed)
    const quotaExhausted = !isUnlimited && dailyQuotaUsed >= dailyQuotaLimit

    return formatSuccess({ 
      quota: {
        daily_quota_used: dailyQuotaUsed,
        daily_quota_limit: dailyQuotaLimit,
        is_unlimited: isUnlimited,
        quota_exhausted: quotaExhausted,
        daily_limit_reached: quotaExhausted,
        package_name: packageName,
        remaining_quota: remainingQuota,
        total_quota_used: dailyQuotaUsed,
        total_quota_limit: quotaData?.total_quota_limit || 0,
        service_account_count: serviceAccountCount
      }
    })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/auth/user/quota', method: 'GET', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

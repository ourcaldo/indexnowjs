import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const GET = authenticatedApiWrapper(async (request, auth) => {
  try {
    const usageData = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_keyword_usage_with_profile',
        source: 'rank-tracking/keyword-usage',
        reason: 'User retrieving their keyword usage and limits for dashboard display',
        metadata: { endpoint: '/api/v1/rank-tracking/keyword-usage', method: 'GET' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_keyword_usage', operationType: 'select' },
      async (db) => {
        const { data: keywordUsage, error: usageError } = await db
          .from('indb_keyword_usage')
          .select('keywords_used, keywords_limit, period_start, period_end')
          .eq('user_id', auth.userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (usageError && usageError.code !== 'PGRST116') {
          throw new Error('Failed to fetch keyword usage data')
        }

        const { data: profile, error: profileError } = await db
          .from('indb_auth_user_profiles')
          .select(`
            package:indb_payment_packages(
              quota_limits
            )
          `)
          .eq('user_id', auth.userId)
          .single()

        if (profileError) {
          throw new Error('Failed to fetch user profile')
        }

        return { keywordUsage, profile }
      }
    )

    const { keywordUsage, profile } = usageData
    const keywordsLimit = (profile?.package as any)?.quota_limits?.keywords_limit || 0

    if (!keywordUsage) {
      return formatSuccess({
        keywords_used: 0,
        keywords_limit: keywordsLimit,
        is_unlimited: keywordsLimit === -1,
        remaining_quota: keywordsLimit === -1 ? -1 : keywordsLimit,
        period_start: null,
        period_end: null
      })
    }

    const keywordsUsed = keywordUsage.keywords_used || 0
    const isUnlimited = keywordsLimit === -1
    const remainingQuota = isUnlimited ? -1 : Math.max(0, keywordsLimit - keywordsUsed)

    return formatSuccess({
      keywords_used: keywordsUsed,
      keywords_limit: keywordsLimit,
      is_unlimited: isUnlimited,
      remaining_quota: remainingQuota,
      period_start: keywordUsage.period_start,
      period_end: keywordUsage.period_end
    })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/rank-tracking/keyword-usage', method: 'GET', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

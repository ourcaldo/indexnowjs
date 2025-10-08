import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, publicApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { RankTracker } from '@/lib/rank-tracking'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

const checkRankSchema = z.object({
  keyword_id: z.string().uuid('Invalid keyword ID')
})

export const POST = authenticatedApiWrapper(async (request, auth) => {
  try {
    const body = await request.json()
    const validation = checkRankSchema.safeParse(body)
    if (!validation.success) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        validation.error.issues[0].message,
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const { keyword_id } = validation.data
    const rankTracker = new RankTracker()
    const keywordData = await rankTracker.getKeywordWithDetails(keyword_id, auth.userId)
    
    if (!keywordData) {
      const notFoundError = await ErrorHandlingService.createError(
        ErrorType.NOT_FOUND,
        'Keyword not found or access denied',
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 404 }
      )
      return formatError(notFoundError)
    }

    const { APIKeyManager } = await import('@/lib/rank-tracking')
    const apiKeyManager = new APIKeyManager()
    const availableQuota = await apiKeyManager.getAvailableQuota()
    
    if (availableQuota < 100) {
      const quotaError = await ErrorHandlingService.createError(
        ErrorType.QUOTA_EXCEEDED,
        `Insufficient quota: ${availableQuota} remaining. Need 100 quota per request. Contact admin.`,
        {
          severity: ErrorSeverity.MEDIUM,
          userId: auth.userId,
          statusCode: 429,
          metadata: { available: availableQuota, required: 100, resetInfo: 'Quota resets daily' }
        }
      )
      return formatError(quotaError)
    }

    await rankTracker.trackKeyword(keywordData)

    const { updatedRanking, updatedKeyword } = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_updated_keyword_ranking',
        source: 'rank-tracking/check-rank',
        reason: 'User fetching updated keyword and ranking data after manual rank check',
        metadata: { keywordId: keyword_id },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_keyword_rankings', operationType: 'select' },
      async (db) => {
        const { data: ranking } = await db
          .from('indb_keyword_rankings')
          .select('*')
          .eq('keyword_id', keyword_id)
          .single()

        const { data: keyword } = await db
          .from('indb_keyword_keywords')
          .select(`
            *,
            domain:indb_keyword_domains(domain_name, display_name),
            country:indb_keyword_countries(name, iso2_code),
            rankings:indb_keyword_rankings(position, url, check_date)
          `)
          .eq('id', keyword_id)
          .single()

        return { updatedRanking: ranking || null, updatedKeyword: keyword || null }
      }
    )

    return formatSuccess({
      data: {
        keyword: updatedKeyword || null,
        ranking: updatedRanking || null,
        quotaRemaining: availableQuota - 1
      },
      message: 'Rank check completed successfully'
    })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.EXTERNAL_API,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint: '/api/v1/rank-tracking/check-rank',
        method: 'POST',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }
})

export const GET = authenticatedApiWrapper(async (request, auth) => {
  try {
    const integration = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'check_rank_tracker_config',
        source: 'rank-tracking/check-rank',
        reason: 'User checking if rank tracker API is configured and quota availability',
        metadata: { serviceName: 'custom_tracker' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_site_integration', operationType: 'select' },
      async (db) => {
        const { data, error } = await db
          .from('indb_site_integration')
          .select('api_quota_limit, api_quota_used, quota_reset_date, is_active')
          .eq('service_name', 'custom_tracker')
          .single()
        
        if (error) throw error
        return data
      }
    )

    if (!integration) {
      return formatSuccess({
        configured: false,
        message: 'IndexNow Rank Tracker API not configured. Please contact admin to configure API integration.'
      })
    }

    const availableQuota = integration.api_quota_limit - integration.api_quota_used
    
    return formatSuccess({
      configured: true,
      quotaInfo: {
        limit: integration.api_quota_limit,
        used: integration.api_quota_used,
        available: Math.max(0, availableQuota),
        resetDate: integration.quota_reset_date,
        isActive: integration.is_active
      }
    })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      {
        severity: ErrorSeverity.MEDIUM,
        userId: auth.userId,
        endpoint: '/api/v1/rank-tracking/check-rank',
        method: 'GET',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }
})

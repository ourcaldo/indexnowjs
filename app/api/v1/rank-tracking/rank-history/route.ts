import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

const getRankHistorySchema = z.object({
  domain_id: z.string().uuid().optional(),
  device_type: z.string().optional(),
  country_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().min(1).default(100)
})

export const GET = authenticatedApiWrapper(async (request, auth) => {
  try {
    const url = new URL(request.url)
    const queryParams = {
      domain_id: url.searchParams.get('domain_id') || undefined,
      device_type: url.searchParams.get('device_type') || undefined,
      country_id: url.searchParams.get('country_id') || undefined,
      start_date: url.searchParams.get('start_date') || undefined,
      end_date: url.searchParams.get('end_date') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '100')
    }

    const validation = getRankHistorySchema.safeParse(queryParams)
    if (!validation.success) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        validation.error.issues[0].message,
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const { domain_id, device_type, country_id, start_date, end_date, limit } = validation.data

    const endDate = end_date || new Date().toISOString().split('T')[0]
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const rankHistory = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_rank_history',
        source: 'rank-tracking/rank-history',
        reason: 'User retrieving their rank history data for analytics',
        metadata: { endpoint: '/api/v1/rank-tracking/rank-history', method: 'GET', filters: { domain_id, device_type, country_id }, dateRange: { startDate, endDate } },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_keyword_rank_history', operationType: 'select' },
      async (db) => {
        let query = db
          .from('indb_keyword_rank_history')
          .select(`
            id, keyword_id, position, url, search_volume, difficulty_score, check_date, device_type, country_id, created_at, updated_at,
            indb_keyword_keywords!inner (
              id, keyword, device_type, user_id, domain_id, country_id, tags, is_active, last_check_date, created_at, updated_at,
              indb_keyword_domains!inner (id, domain_name, display_name, verification_status)
            ),
            indb_keyword_countries (id, name, iso2_code, iso3_code)
          `)
          .eq('indb_keyword_keywords.user_id', auth.userId)
          .eq('indb_keyword_keywords.is_active', true)
          .gte('check_date', startDate)
          .lte('check_date', endDate)
          .order('check_date', { ascending: false })

        if (domain_id) query = query.eq('indb_keyword_keywords.domain_id', domain_id)
        if (device_type) query = query.eq('indb_keyword_keywords.device_type', device_type)
        if (country_id) query = query.eq('indb_keyword_keywords.country_id', country_id)

        query = query.limit(limit)

        const { data: rankHistory, error } = await query

        if (error) throw new Error('Failed to fetch rank history')

        return rankHistory
      }
    )

    if (!rankHistory || rankHistory.length === 0) {
      return formatSuccess({
        data: [],
        meta: { start_date: startDate, end_date: endDate, total_keywords: 0 }
      })
    }

    const transformedData = rankHistory?.reduce((acc: any, record: any) => {
      const keywordData = record.indb_keyword_keywords
      const keywordId = keywordData.id
      
      if (!acc[keywordId]) {
        acc[keywordId] = {
          keyword_id: keywordId,
          keyword: keywordData.keyword,
          device_type: record.device_type || keywordData.device_type,
          tags: keywordData.tags || [],
          is_active: keywordData.is_active,
          last_check_date: keywordData.last_check_date,
          domain: {
            id: keywordData.indb_keyword_domains.id,
            domain_name: keywordData.indb_keyword_domains.domain_name,
            display_name: keywordData.indb_keyword_domains.display_name,
            verification_status: keywordData.indb_keyword_domains.verification_status
          },
          country: record.indb_keyword_countries,
          history: {}
        }
      }
      
      acc[keywordId].history[record.check_date] = {
        position: record.position,
        url: record.url,
        search_volume: record.search_volume,
        difficulty_score: record.difficulty_score,
        created_at: record.created_at,
        updated_at: record.updated_at
      }
      
      return acc
    }, {}) || {}

    const results = Object.values(transformedData).sort((a: any, b: any) => 
      a.keyword.localeCompare(b.keyword)
    )

    return formatSuccess({
      data: results,
      meta: { start_date: startDate, end_date: endDate, total_keywords: results.length, total_history_entries: rankHistory.length }
    })

  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/rank-tracking/rank-history', method: 'GET', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

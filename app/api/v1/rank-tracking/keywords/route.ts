import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const GET = authenticatedApiWrapper(async (request, auth) => {
  try {
    const url = new URL(request.url)
    const domain_id = url.searchParams.get('domain_id') || undefined
    const device_type = url.searchParams.get('device_type') || undefined
    const country_id = url.searchParams.get('country_id') || undefined
    const tags = url.searchParams.get('tags') || undefined
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const keywordsResult = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_user_keywords',
        source: 'rank-tracking',
        reason: 'User fetching their keywords for rank tracking',
        metadata: { endpoint: '/api/v1/rank-tracking/keywords', filters: { domain_id, device_type, country_id, tags }, pagination: { page, limit } },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'indb_keyword_keywords', operationType: 'select' },
      async (db) => {
        let query = db
          .from('indb_keyword_keywords')
          .select(`
            *,
            domain:indb_keyword_domains(id, domain_name, display_name),
            country:indb_keyword_countries(id, name, iso2_code),
            rankings:indb_keyword_rankings(position, url, search_volume, check_date, created_at)
          `)
          .eq('is_active', true)

        if (domain_id) query = query.eq('domain_id', domain_id)
        if (device_type) query = query.eq('device_type', device_type)
        if (country_id) query = query.eq('country_id', country_id)
        if (tags) {
          const tagArray = tags.split(',').filter(Boolean)
          if (tagArray.length > 0) query = query.overlaps('tags', tagArray)
        }

        let countQuery = db
          .from('indb_keyword_keywords')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)

        if (domain_id) countQuery = countQuery.eq('domain_id', domain_id)
        if (device_type) countQuery = countQuery.eq('device_type', device_type)
        if (country_id) countQuery = countQuery.eq('country_id', country_id)
        if (tags) {
          const tagArray = tags.split(',').filter(Boolean)
          if (tagArray.length > 0) countQuery = countQuery.overlaps('tags', tagArray)
        }

        const { count } = await countQuery
        const { data: keywords, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return { keywords, count, error }
      }
    )

    const { keywords, count, error } = keywordsResult

    if (error) throw new Error('Failed to fetch keywords')

    const keywordIds = (keywords || []).map((k: any) => k.id)
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    const yesterdayStr = formatDate(yesterday)
    const threeDaysAgoStr = formatDate(threeDaysAgo)
    const sevenDaysAgoStr = formatDate(sevenDaysAgo)
    
    const historicalData = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_keyword_rank_history',
        source: 'rank-tracking',
        reason: 'User fetching historical rank data for position change calculations',
        metadata: { endpoint: '/api/v1/rank-tracking/keywords', keywordIds, dates: [yesterdayStr, threeDaysAgoStr, sevenDaysAgoStr] },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'indb_keyword_rank_history', operationType: 'select' },
      async (db) => {
        const { data } = await db
          .from('indb_keyword_rank_history')
          .select('keyword_id, position, check_date')
          .in('keyword_id', keywordIds)
          .in('check_date', [yesterdayStr, threeDaysAgoStr, sevenDaysAgoStr])
        return data
      }
    )
    
    const positionHistory: { [keywordId: string]: { [date: string]: number | null } } = {}
    
    if (historicalData) {
      historicalData.forEach((record: any) => {
        if (!positionHistory[record.keyword_id]) {
          positionHistory[record.keyword_id] = {}
        }
        positionHistory[record.keyword_id][record.check_date] = record.position
      })
    }

    const processedKeywords = (keywords || []).map((keyword: any) => {
      const rankings = Array.isArray(keyword.rankings) ? keyword.rankings : keyword.rankings ? [keyword.rankings] : []
      const currentRanking = rankings.length > 0 ? rankings[0] : null
      const keywordHistory = positionHistory[keyword.id] || {}
      const currentPosition = currentRanking?.position || null
      
      const get1DChange = () => {
        const yesterdayPosition = keywordHistory[yesterdayStr]
        if (!yesterdayPosition || !currentPosition) return null
        return yesterdayPosition - currentPosition
      }

      const get3DChange = () => {
        const threeDaysAgoPosition = keywordHistory[threeDaysAgoStr]
        if (!threeDaysAgoPosition || !currentPosition) return null
        return threeDaysAgoPosition - currentPosition
      }

      const get7DChange = () => {
        const sevenDaysAgoPosition = keywordHistory[sevenDaysAgoStr]
        if (!sevenDaysAgoPosition || !currentPosition) return null
        return sevenDaysAgoPosition - currentPosition
      }

      return {
        ...keyword,
        current_position: currentPosition,
        current_url: currentRanking?.url || null,
        search_volume: currentRanking?.search_volume || null,
        last_updated: currentRanking?.check_date || null,
        position_1d: get1DChange(),
        position_3d: get3DChange(),
        position_7d: get7DChange(),
        rankings: undefined
      }
    })

    return formatSuccess({
      data: processedKeywords,
      pagination: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) }
    })

  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/rank-tracking/keywords', method: 'GET', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

export const POST = authenticatedApiWrapper(async (request, auth) => {
  try {
    const body = await request.json()
    
    const validation = z.object({
      domain_id: z.string().uuid('Invalid domain ID'),
      keywords: z.array(z.string().min(1)).min(1, 'At least one keyword is required'),
      device_type: z.enum(['desktop', 'mobile']).default('desktop'),
      country_id: z.string().uuid('Invalid country ID'),
      tags: z.array(z.string()).optional().default([])
    }).safeParse(body)

    if (!validation.success) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        validation.error.issues[0].message,
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const { domain_id, keywords, device_type, country_id, tags } = validation.data

    const domain = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'verify_domain_ownership',
        source: 'rank-tracking',
        reason: 'User verifying domain ownership for keyword creation',
        metadata: { endpoint: '/api/v1/rank-tracking/keywords', domainId: domain_id },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'indb_keyword_domains', operationType: 'select' },
      async (db) => {
        const { data, error } = await db
          .from('indb_keyword_domains')
          .select('id')
          .eq('id', domain_id)
          .single()
        return { data, error }
      }
    )

    if (domain.error || !domain.data) {
      const notFoundError = await ErrorHandlingService.createError(
        ErrorType.BUSINESS_LOGIC,
        'Access denied',
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 404 }
      )
      return formatError(notFoundError)
    }

    const quotaCheckResult = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'check_keyword_quota',
        source: 'rank-tracking',
        reason: 'User checking keyword quota before creating new keywords',
        metadata: { endpoint: '/api/v1/rank-tracking/keywords', requestedKeywords: keywords.length },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'multiple_tables', operationType: 'select' },
      async (db) => {
        const [userProfileResult, keywordCountResult] = await Promise.all([
          db.from('indb_auth_user_profiles')
            .select(`*, package:indb_payment_packages(quota_limits)`)
            .single(),
          db.from('indb_keyword_keywords')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
        ])
        return { userProfile: userProfileResult.data, currentKeywordCount: keywordCountResult.count }
      }
    )

    const userProfile = quotaCheckResult.userProfile
    const currentKeywordCount = quotaCheckResult.currentKeywordCount

    let quotaLimits: any = null
    
    if (userProfile?.package_id && userProfile?.package) {
      quotaLimits = userProfile.package.quota_limits
    } else {
      const activeSubscriptions = await SecureServiceRoleWrapper.executeWithUserSession(
        auth.supabase,
        {
          userId: auth.userId,
          operation: 'get_active_subscriptions',
          source: 'rank-tracking',
          reason: 'User checking active subscriptions for quota limits',
          metadata: { endpoint: '/api/v1/rank-tracking/keywords', fallbackQuotaCheck: 'active_subscriptions' },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        },
        { table: 'indb_payment_subscriptions', operationType: 'select' },
        async (db) => {
          const { data } = await db
            .from('indb_payment_subscriptions')
            .select(`package:indb_payment_packages(quota_limits)`)
            .eq('subscription_status', 'active')
          return data
        }
      )
      
      if (activeSubscriptions && activeSubscriptions.length > 0) {
        const firstSubscription = activeSubscriptions[0] as any
        quotaLimits = firstSubscription?.package?.quota_limits
      }
    }
    
    let keywordLimit: number
    if (quotaLimits?.keywords_limit === -1) {
      keywordLimit = Infinity
    } else if (quotaLimits?.keywords_limit) {
      keywordLimit = quotaLimits.keywords_limit
    } else {
      keywordLimit = 50
    }

    if (keywordLimit !== Infinity && (currentKeywordCount || 0) + keywords.length > keywordLimit) {
      const quotaError = await ErrorHandlingService.createError(
        ErrorType.BUSINESS_LOGIC,
        `Adding ${keywords.length} keywords would exceed your limit of ${keywordLimit === Infinity ? 'unlimited' : keywordLimit}. Current usage: ${currentKeywordCount || 0}`,
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
      )
      return formatError(quotaError)
    }

    const existingKeywords = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'check_duplicate_keywords',
        source: 'rank-tracking',
        reason: 'User checking for existing keywords before creation',
        metadata: { domainId: domain_id, deviceType: device_type, countryId: country_id, keywords },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'indb_keyword_keywords', operationType: 'select' },
      async (db) => {
        const { data } = await db
          .from('indb_keyword_keywords')
          .select('keyword')
          .eq('domain_id', domain_id)
          .eq('device_type', device_type)
          .eq('country_id', country_id)
          .in('keyword', keywords)
        return data
      }
    )

    const existingKeywordTexts = existingKeywords?.map((k: any) => k.keyword) || []
    const newKeywords = keywords.filter((k: string) => !existingKeywordTexts.includes(k))

    if (newKeywords.length === 0) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        'All keywords already exist for this domain/device/country combination',
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const keywordEntries = newKeywords.map(keyword => ({
      user_id: auth.userId,
      domain_id,
      keyword: keyword.trim(),
      device_type,
      country_id,
      tags: tags || []
    }))

    const insertResult = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'insert_keywords',
        source: 'rank-tracking',
        reason: 'User creating new keywords for rank tracking',
        metadata: { domainId: domain_id, keywordCount: newKeywords.length, deviceType: device_type, countryId: country_id },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'indb_keyword_keywords', operationType: 'insert' },
      async (db) => {
        const { data, error } = await db
          .from('indb_keyword_keywords')
          .insert(keywordEntries)
          .select(`
            id, user_id, domain_id, keyword, device_type, country_id, tags, created_at, updated_at,
            domain:indb_keyword_domains(id, domain_name, display_name),
            country:indb_keyword_countries(id, name, iso2_code)
          `)
        return { data, error }
      }
    )

    const { data: insertedKeywords, error } = insertResult

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error, null, 2))
      throw new Error(`Failed to add keywords: ${error.message || JSON.stringify(error)}`)
    }

    return formatSuccess({
      data: insertedKeywords,
      message: `Successfully added ${insertedKeywords?.length || 0} keywords`
    })

  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/rank-tracking/keywords', method: 'POST', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

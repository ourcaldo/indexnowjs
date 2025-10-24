import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

const getWeeklyTrendsSchema = z.object({
  domain_id: z.string().uuid(),
  device_type: z.string().optional(),
  country_id: z.string().uuid().optional(),
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2020).max(2099).optional()
})

interface WeeklyTrendsData {
  weekNumber: number
  weekLabel: string
  startDate: string
  endDate: string
  totalKeywords: number
  improvement: number
  decline: number
  unchanged: number
  positionDistribution: {
    topThree: number
    topTen: number
    topTwenty: number
    topHundred: number
    outOfHundred: number
  }
}

export const GET = authenticatedApiWrapper<{
  data: WeeklyTrendsData[]
  meta: {
    month: number
    year: number
    totalWeeks?: number
  }
}>(async (request, auth) => {
  try {
    const url = new URL(request.url)
    const queryParams = {
      domain_id: url.searchParams.get('domain_id'),
      device_type: url.searchParams.get('device_type') || undefined,
      country_id: url.searchParams.get('country_id') || undefined,
      month: url.searchParams.get('month') ? parseInt(url.searchParams.get('month')!) : undefined,
      year: url.searchParams.get('year') ? parseInt(url.searchParams.get('year')!) : undefined
    }

    if (!queryParams.domain_id) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        'domain_id is required',
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const validation = getWeeklyTrendsSchema.safeParse(queryParams)
    if (!validation.success) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        validation.error.issues[0].message,
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const { domain_id, device_type, country_id, month, year } = validation.data

    const now = new Date()
    const targetMonth = month || (now.getMonth() + 1)
    const targetYear = year || now.getFullYear()

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1)
    const endOfMonth = new Date(targetYear, targetMonth, 0)

    const startDate = startOfMonth.toISOString().split('T')[0]
    const endDate = endOfMonth.toISOString().split('T')[0]

    const rankHistory = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_weekly_trends',
        source: 'rank-tracking/weekly-trends',
        reason: 'User retrieving weekly trends data for analytics',
        metadata: { endpoint: '/api/v1/rank-tracking/weekly-trends', method: 'GET', filters: { domain_id, device_type, country_id } },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'indb_keyword_rank_history', operationType: 'select' },
      async (db) => {
        let query = db
          .from('indb_keyword_rank_history')
          .select(`
            keyword_id, position, check_date,
            indb_keyword_keywords!inner (
              id, keyword, user_id, domain_id, device_type, country_id, is_active
            )
          `)
          .eq('indb_keyword_keywords.user_id', auth.userId)
          .eq('indb_keyword_keywords.domain_id', domain_id)
          .eq('indb_keyword_keywords.is_active', true)
          .gte('check_date', startDate)
          .lte('check_date', endDate)
          .order('check_date', { ascending: true })

        if (device_type) query = query.eq('indb_keyword_keywords.device_type', device_type)
        if (country_id) query = query.eq('indb_keyword_keywords.country_id', country_id)

        const { data, error } = await query

        if (error) throw new Error('Failed to fetch weekly trends')

        return data
      }
    )

    if (!rankHistory || rankHistory.length === 0) {
      return formatSuccess({
        data: [],
        meta: { month: targetMonth, year: targetYear }
      })
    }

    const getWeekNumber = (date: Date): number => {
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
      const dayOfMonth = date.getDate()
      return Math.ceil((dayOfMonth + firstDayOfMonth.getDay()) / 7)
    }

    const getWeekLabel = (weekNum: number, month: number, year: number): string => {
      const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short' })
      return `Week ${weekNum}, ${monthName}`
    }

    const getWeekDateRange = (weekNum: number, month: number, year: number): { start: string, end: string } => {
      const firstDayOfMonth = new Date(year, month - 1, 1)
      const startDay = ((weekNum - 1) * 7) - firstDayOfMonth.getDay() + 1
      const endDay = startDay + 6

      const startDate = new Date(year, month - 1, Math.max(1, startDay))
      const lastDayOfMonth = new Date(year, month, 0).getDate()
      const endDate = new Date(year, month - 1, Math.min(lastDayOfMonth, endDay))

      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    }

    const weeklyData: Map<number, Map<string, Array<{ position: number | null, date: string }>>> = new Map()

    rankHistory.forEach((record: any) => {
      const checkDate = new Date(record.check_date)
      const weekNum = getWeekNumber(checkDate)
      const keywordId = record.keyword_id

      if (!weeklyData.has(weekNum)) {
        weeklyData.set(weekNum, new Map())
      }

      const weekData = weeklyData.get(weekNum)!
      if (!weekData.has(keywordId)) {
        weekData.set(keywordId, [])
      }

      weekData.get(keywordId)!.push({
        position: record.position,
        date: record.check_date
      })
    })

    const weeklyTrends: WeeklyTrendsData[] = []
    const weeks = Array.from(weeklyData.keys()).sort((a, b) => a - b)

    for (const weekNum of weeks) {
      const weekData = weeklyData.get(weekNum)!
      const dateRange = getWeekDateRange(weekNum, targetMonth, targetYear)

      let improvement = 0
      let decline = 0
      let unchanged = 0
      let topThree = 0
      let topTen = 0
      let topTwenty = 0
      let topHundred = 0
      let outOfHundred = 0

      weekData.forEach((positions, keywordId) => {
        positions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        const firstPos = positions[0]?.position
        const lastPos = positions[positions.length - 1]?.position

        if (firstPos !== null && lastPos !== null) {
          const change = firstPos - lastPos
          if (change > 0) improvement++
          else if (change < 0) decline++
          else unchanged++

          if (lastPos >= 1 && lastPos <= 3) topThree++
          else if (lastPos >= 4 && lastPos <= 10) topTen++
          else if (lastPos >= 11 && lastPos <= 20) topTwenty++
          else if (lastPos >= 21 && lastPos <= 100) topHundred++
          else if (lastPos === 0 || lastPos > 100) outOfHundred++
        }
      })

      weeklyTrends.push({
        weekNumber: weekNum,
        weekLabel: getWeekLabel(weekNum, targetMonth, targetYear),
        startDate: dateRange.start,
        endDate: dateRange.end,
        totalKeywords: weekData.size,
        improvement,
        decline,
        unchanged,
        positionDistribution: {
          topThree,
          topTen,
          topTwenty,
          topHundred,
          outOfHundred
        }
      })
    }

    return formatSuccess({
      data: weeklyTrends,
      meta: { month: targetMonth, year: targetYear, totalWeeks: weeklyTrends.length }
    })

  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/rank-tracking/weekly-trends', method: 'GET', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

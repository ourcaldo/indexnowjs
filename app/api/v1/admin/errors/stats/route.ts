/**
 * Error Statistics API Endpoint
 * Provides comprehensive error tracking statistics for admin dashboard
 * Updated for Phase 3: Shows ALL error types, not just rank-check errors
 */

import { NextRequest } from 'next/server'
import { adminApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database/supabase'

/**
 * GET /api/v1/admin/errors/stats
 * Query Parameters:
 * - range: Time range (24h, 7d, 30d) - defaults to 24h
 */
export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const { searchParams } = new URL(request.url)
  const endpoint = new URL(request.url).pathname
  const timeRange = searchParams.get('range') || '24h'

  const stats = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: adminUser.id,
      operation: 'fetch_error_statistics',
      reason: 'Admin viewing error dashboard statistics',
      source: endpoint,
      metadata: { timeRange }
    },
    {
      table: 'indb_system_error_logs',
      operationType: 'select',
      columns: ['*'],
      whereConditions: { /* time-based filtering */ }
    },
    async () => {
      const timeFilter = getTimeFilter(timeRange)
      const previousTimeFilter = getPreviousTimeFilter(timeRange)
      
      // Total errors in current period
      const { count: totalErrors, error: totalError } = await supabaseAdmin
        .from('indb_system_error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', timeFilter)
      if (totalError) throw totalError

      // Critical errors in current period
      const { count: criticalErrors, error: criticalError } = await supabaseAdmin
        .from('indb_system_error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'CRITICAL')
        .gte('created_at', timeFilter)
      if (criticalError) throw criticalError

      // High severity errors in current period
      const { count: highErrors, error: highError } = await supabaseAdmin
        .from('indb_system_error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'HIGH')
        .gte('created_at', timeFilter)
      if (highError) throw highError

      // Unresolved errors in current period
      const { count: unresolvedErrors, error: unresolvedError } = await supabaseAdmin
        .from('indb_system_error_logs')
        .select('*', { count: 'exact', head: true })
        .is('resolved_at', null)
        .gte('created_at', timeFilter)
      if (unresolvedError) throw unresolvedError

      // Errors by type distribution
      const { data: errorsByType, error: typeError } = await supabaseAdmin
        .from('indb_system_error_logs')
        .select('error_type')
        .gte('created_at', timeFilter)
      if (typeError) throw typeError

      const typeDistribution = errorsByType?.reduce((acc, row) => {
        acc[row.error_type] = (acc[row.error_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Errors by severity distribution
      const { data: errorsBySeverity, error: severityError } = await supabaseAdmin
        .from('indb_system_error_logs')
        .select('severity')
        .gte('created_at', timeFilter)
      if (severityError) throw severityError

      const severityDistribution = errorsBySeverity?.reduce((acc, row) => {
        acc[row.severity] = (acc[row.severity] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Most common errors (top 5 by message)
      const { data: commonErrors, error: commonError } = await supabaseAdmin
        .from('indb_system_error_logs')
        .select('message, error_type, severity')
        .gte('created_at', timeFilter)
        .order('created_at', { ascending: false })
        .limit(100)
      if (commonError) throw commonError

      // Group by message and count occurrences
      const errorCounts = commonErrors?.reduce((acc, error) => {
        const key = error.message
        if (!acc[key]) {
          acc[key] = {
            message: error.message,
            error_type: error.error_type,
            severity: error.severity,
            count: 0
          }
        }
        acc[key].count++
        return acc
      }, {} as Record<string, any>) || {}

      const topErrors = Object.values(errorCounts)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5)

      // Error trend (compare with previous period)
      const { count: previousPeriodErrors, error: trendError } = await supabaseAdmin
        .from('indb_system_error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousTimeFilter)
        .lt('created_at', timeFilter)
      if (trendError) throw trendError

      // Calculate trend percentage
      const trend = previousPeriodErrors && previousPeriodErrors > 0
        ? ((totalErrors! - previousPeriodErrors) / previousPeriodErrors) * 100
        : totalErrors! > 0 ? 100 : 0

      // Most affected endpoints (top 5)
      const { data: errorsByEndpoint, error: endpointError } = await supabaseAdmin
        .from('indb_system_error_logs')
        .select('endpoint')
        .gte('created_at', timeFilter)
        .not('endpoint', 'is', null)
      if (endpointError) throw endpointError

      const endpointDistribution = errorsByEndpoint?.reduce((acc, row) => {
        const endpoint = row.endpoint || 'Unknown'
        acc[endpoint] = (acc[endpoint] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const topEndpoints = Object.entries(endpointDistribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([endpoint, count]) => ({ endpoint, count }))

      return {
        summary: {
          totalErrors: totalErrors || 0,
          criticalErrors: criticalErrors || 0,
          highErrors: highErrors || 0,
          unresolvedErrors: unresolvedErrors || 0
        },
        distributions: {
          byType: typeDistribution,
          bySeverity: severityDistribution,
          byEndpoint: topEndpoints
        },
        topErrors,
        trend: {
          value: Math.round(trend * 10) / 10, // Round to 1 decimal
          direction: trend > 5 ? 'up' : trend < -5 ? 'down' : 'stable',
          previousPeriodCount: previousPeriodErrors || 0,
          currentPeriodCount: totalErrors || 0
        },
        timeRange
      }
    }
  )

  return formatSuccess(stats)
})

/**
 * Calculate time filter for current period
 */
function getTimeFilter(range: string): string {
  const now = new Date()
  switch (range) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  }
}

/**
 * Calculate time filter for previous period (for trend calculation)
 */
function getPreviousTimeFilter(range: string): string {
  const now = new Date()
  switch (range) {
    case '24h':
      return new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
    case '7d':
      return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    case '30d':
      return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
    default:
      return new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
  }
}
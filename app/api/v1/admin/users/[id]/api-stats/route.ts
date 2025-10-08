import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'

export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Extract user ID from URL path
  const pathParts = request.url.split('/').filter(Boolean)
  const userId = pathParts[pathParts.indexOf('users') + 1]

  // Get user API statistics using secure wrapper
  const result = await withDatabaseOperation(
    async () => {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser.id,
          operation: 'admin_get_user_api_stats',
          reason: 'Admin fetching user API call statistics for monitoring',
          source: 'admin/users/[id]/api-stats',
          metadata: {
            targetUserId: userId,
            endpoint: '/api/v1/admin/users/[id]/api-stats'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
          userAgent: request.headers.get('user-agent')
        },
        {
          table: 'multiple_tables',
          operationType: 'select',
          columns: ['service_accounts', 'quota_usage'],
          whereConditions: { user_id: userId }
        },
        async () => {
          // Get user's service accounts first
          const { data: serviceAccounts } = await supabaseAdmin
            .from('indb_google_service_accounts')
            .select('id')
            .eq('user_id', userId)

          if (!serviceAccounts || serviceAccounts.length === 0) {
            return {
              stats: {
                total_calls: 0,
                successful_calls: 0,
                failed_calls: 0,
                success_rate: 0,
                last_7_days: 0,
                today: 0
              }
            }
          }

          const serviceAccountIds = serviceAccounts.map(acc => acc.id)

          // Get date ranges
          const today = new Date().toISOString().split('T')[0]
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

          // Get all-time stats
          const { data: allTimeStats } = await supabaseAdmin
            .from('indb_google_quota_usage')
            .select('requests_made, requests_successful, requests_failed')
            .in('service_account_id', serviceAccountIds)

          // Get last 7 days stats
          const { data: last7DaysStats } = await supabaseAdmin
            .from('indb_google_quota_usage')
            .select('requests_made')
            .in('service_account_id', serviceAccountIds)
            .gte('date', sevenDaysAgoStr)

          // Get today's stats
          const { data: todayStats } = await supabaseAdmin
            .from('indb_google_quota_usage')
            .select('requests_made')
            .in('service_account_id', serviceAccountIds)
            .eq('date', today)

          // Calculate totals
          const totalCalls = allTimeStats?.reduce((sum, stat) => sum + (stat.requests_made || 0), 0) || 0
          const successfulCalls = allTimeStats?.reduce((sum, stat) => sum + (stat.requests_successful || 0), 0) || 0
          const failedCalls = allTimeStats?.reduce((sum, stat) => sum + (stat.requests_failed || 0), 0) || 0
          const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0

          const last7DaysTotal = last7DaysStats?.reduce((sum, stat) => sum + (stat.requests_made || 0), 0) || 0
          const todayTotal = todayStats?.reduce((sum, stat) => sum + (stat.requests_made || 0), 0) || 0

          return {
            stats: {
              total_calls: totalCalls,
              successful_calls: successfulCalls,
              failed_calls: failedCalls,
              success_rate: successRate,
              last_7_days: last7DaysTotal,
              today: todayTotal
            }
          }
        }
      )
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/users/[id]/api-stats' }
  )

  if (!result.success) {
    return result
  }

  const { stats } = result.data

  return formatSuccess({ stats }, undefined, 200)
})

import { NextRequest } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/auth'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType } from '@/lib/monitoring/error-handling'

export const GET = publicApiWrapper(async (request: NextRequest) => {
  try {
    await requireSuperAdminAuth(request)

    // Get system statistics using secure admin operation
    const systemStats = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'admin',
        operation: 'get_system_status',
        source: 'system/status',
        reason: 'Admin fetching system status and statistics',
        metadata: {
          endpoint: '/api/v1/system/status',
          method: 'GET'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_auth_user_profiles', operationType: 'select' },
      async (supabase) => {
        // Get system statistics
        const [usersCount, jobsCount, serviceAccountsCount] = await Promise.all([
          supabase
            .from('indb_auth_user_profiles')
            .select('user_id', { count: 'exact' }),
          supabase
            .from('indb_indexing_jobs')
            .select('id', { count: 'exact' }),
          supabase
            .from('indb_indexing_service_accounts')
            .select('id', { count: 'exact' })
        ])

        // Get recent activity count (last 24 hours)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        
        const { data: recentActivity, error: activityError } = await supabase
          .from('indb_security_activity_logs')
          .select('id', { count: 'exact' })
          .gte('created_at', yesterday.toISOString())
        
        return {
          usersCount: usersCount.count || 0,
          jobsCount: jobsCount.count || 0,
          serviceAccountsCount: serviceAccountsCount.count || 0,
          recentActivityCount: recentActivity?.length || 0
        }
      }
    )

    return formatSuccess({
      system: {
        status: 'operational',
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        node_version: process.version,
        platform: process.platform
      },
      database: {
        status: 'connected',
        total_users: systemStats.usersCount,
        total_jobs: systemStats.jobsCount,
        total_service_accounts: systemStats.serviceAccountsCount,
        recent_activity_24h: systemStats.recentActivityCount
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    if (error && typeof error === 'object' && 'type' in error) {
      return formatError(error as any)
    }
    
    const structuredError = ErrorHandlingService.createError(
      ErrorType.INTERNAL,
      error as Error,
      { statusCode: 500, context: { endpoint: '/api/v1/system/status' } }
    )
    return formatError(structuredError)
  }
})
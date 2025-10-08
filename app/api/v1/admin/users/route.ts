import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import { ActivityLogger } from '@/lib/monitoring'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const GET = adminApiWrapper(async (
  request: NextRequest,
  adminUser
) => {
  const usersContext = {
    userId: adminUser.id,
    operation: 'admin_get_users_summary',
    reason: 'Admin fetching user summary data from materialized view',
    source: 'admin/users',
    metadata: {
      endpoint: '/api/v1/admin/users',
      method: 'GET'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }

  const usersWithAuthData = await SecureServiceRoleWrapper.executeSecureOperation(
    usersContext,
    {
      table: 'indb_admin_user_summary',
      operationType: 'select',
      columns: ['*', 'package:indb_payment_packages(id,name,slug,quota_limits)']
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_admin_user_summary')
        .select(`
          *,
          package:indb_payment_packages(
            id,
            name,
            slug,
            quota_limits
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch user data: ${error.message}`)
      }

      return data
    }
  )

  await ActivityLogger.logAdminAction(
    adminUser.id,
    'user_list_view',
    undefined,
    `Viewed users list (${usersWithAuthData?.length || 0} users)`,
    request,
    { 
      userListView: true,
      totalUsers: usersWithAuthData?.length || 0,
      activeUsers: usersWithAuthData?.filter(u => u.role === 'user').length || 0,
      adminUsers: usersWithAuthData?.filter(u => u.role === 'admin').length || 0,
      superAdminUsers: usersWithAuthData?.filter(u => u.role === 'super_admin').length || 0
    }
  )

  return formatSuccess({ users: usersWithAuthData })
})

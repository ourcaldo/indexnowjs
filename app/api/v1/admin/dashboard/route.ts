import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { adminApiWrapper, withDatabaseOperation } from '@/lib/core/api-response-middleware'

/**
 * Admin Dashboard Stats - Standardized Response Format
 * GET /api/v1/admin/dashboard
 * 
 * Returns: ApiSuccessResponse<stats> | ApiErrorResponse
 */
export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Log admin dashboard access
  try {
    await ActivityLogger.logAdminDashboardActivity(
      adminUser.id,
      ActivityEventTypes.ADMIN_DASHBOARD_VIEW,
      'Accessed admin dashboard overview with system statistics',
      request,
      {
        section: 'dashboard_overview',
        action: 'view_stats',
        adminEmail: adminUser.email
      }
    )
  } catch (logError) {
    // Silently fail activity logging - don't block the request
  }

  // Fetch dashboard stats with automatic error handling
  const response = await withDatabaseOperation(
    async () => {
      const statsContext = {
        userId: adminUser.id,
        operation: 'admin_get_dashboard_stats',
        reason: 'Admin fetching dashboard statistics for overview',
        source: 'admin/dashboard',
        metadata: {
          endpoint: '/api/v1/admin/dashboard',
          adminEmail: adminUser.email || 'unknown'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }

      const stats = await SecureServiceRoleWrapper.executeSecureOperation(
        statsContext,
        {
          table: 'admin_dashboard_stats',
          operationType: 'select',
          columns: ['*']
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('admin_dashboard_stats')
            .select('*')
            .single()

          if (error) {
            throw new Error(`Failed to fetch dashboard statistics: ${error.message}`)
          }

          return data
        }
      )

      return { stats }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/dashboard' }
  )

  return response
})

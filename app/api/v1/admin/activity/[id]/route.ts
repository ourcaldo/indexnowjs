import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation, createStandardError, formatSuccess } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleHelpers, SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'
import { supabaseAdmin } from '@/lib/database'

export const GET = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params

  const response = await withDatabaseOperation(
    async () => {
      // Use secure service role wrapper for admin activity log access
      const operationContext = {
        userId: 'system',
        operation: 'admin_get_activity_log',
        reason: 'Admin user retrieving specific activity log for review',
        source: 'admin/activity/[id]',
        metadata: {
          requestedLogId: id,
          endpoint: '/api/v1/admin/activity/[id]'
        }
      }

      const logs = await SecureServiceRoleHelpers.secureSelect(
        operationContext,
        'indb_security_activity_logs',
        ['*'],
        { id: id }
      )

      if (!logs || logs.length === 0) {
        throw new Error('Activity log not found')
      }

      const log = logs[0]

      // Get user profile and auth data using secure service role wrapper
      let userProfile = null
      let userEmail = null

      try {
        // Secure profile fetch
        const profileContext = {
          userId: 'system',
          operation: 'admin_get_user_profile_for_activity_log',
          reason: 'Admin retrieving user profile details for activity log display',
          source: 'admin/activity/[id]',
          metadata: {
            targetUserId: log.user_id,
            activityLogId: id
          }
        }

        const profiles = await SecureServiceRoleHelpers.secureSelect(
          profileContext,
          'indb_auth_user_profiles',
          ['full_name', 'user_id'],
          { user_id: log.user_id }
        )

        if (profiles && profiles.length > 0) {
          userProfile = profiles[0]
          
          try {
            // Secure auth data fetch - using wrapper for auth operations
            const authContext = {
              userId: 'system',
              operation: 'admin_get_auth_user_for_activity_log',
              reason: 'Admin retrieving user auth details for activity log display',
              source: 'admin/activity/[id]',
              metadata: {
                targetUserId: profiles[0].user_id,
                activityLogId: id
              }
            }

            const authUser = await SecureServiceRoleWrapper.executeSecureOperation(
              authContext,
              {
                table: 'auth.users',
                operationType: 'select',
                columns: ['email'],
                whereConditions: { id: profiles[0].user_id }
              },
              async () => {
                const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profiles[0].user_id)
                if (authError || !authUser?.user) throw authError
                return authUser.user
              }
            )

            if (authUser?.email) {
              userEmail = authUser.email
            }
          } catch (authFetchError) {
            logger.error({ error: authFetchError instanceof Error ? authFetchError.message : String(authFetchError) }, `Failed to fetch auth data for user ${log.user_id}:`)
          }
        }
      } catch (fetchError) {
        logger.error({ error: fetchError instanceof Error ? fetchError.message : String(fetchError) }, `Failed to fetch user data for log ${log.id}:`)
      }

      // Get related activities from the same user (last 5) using secure service role wrapper
      let relatedLogs = []
      try {
        const relatedLogsContext = {
          userId: 'system',
          operation: 'admin_get_related_activity_logs',
          reason: 'Admin retrieving related activity logs for context display',
          source: 'admin/activity/[id]',
          metadata: {
            targetUserId: log.user_id,
            excludeLogId: log.id,
            activityLogId: id
          }
        }

        relatedLogs = await SecureServiceRoleWrapper.executeSecureOperation(
          relatedLogsContext,
          {
            table: 'indb_security_activity_logs',
            operationType: 'select',
            columns: ['*'],
            whereConditions: { user_id: log.user_id }
          },
          async () => {
            const { data, error } = await supabaseAdmin
              .from('indb_security_activity_logs')
              .select('*')
              .eq('user_id', log.user_id)
              .neq('id', log.id)
              .order('created_at', { ascending: false })
              .limit(5)
            
            if (error) throw error
            return data || []
          }
        )
      } catch (relatedError) {
        logger.error({ error: relatedError instanceof Error ? relatedError.message : String(relatedError) }, `Failed to fetch related logs for user ${log.user_id}:`)
        relatedLogs = []
      }

      const enrichedLog = {
        ...log,
        user_name: userProfile?.full_name || 'Unknown User',
        user_email: userEmail || 'Unknown Email',
        related_activities: relatedLogs
      }

      return enrichedLog
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/activity/[id]' }
  )

  if (!response.success) {
    // Check if it's a "not found" error
    if (response.error.message.includes('not found')) {
      return createStandardError(
        ErrorType.AUTHORIZATION,
        'Activity log not found',
        404,
        ErrorSeverity.LOW
      )
    }
    return response
  }

  return formatSuccess({ activity: response.data })
})

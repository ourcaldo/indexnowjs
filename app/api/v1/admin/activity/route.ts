import { NextRequest, NextResponse } from 'next/server'
import { adminApiWrapper, withDatabaseOperation, formatSuccess } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleHelpers, SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ActivityLogger } from '@/lib/monitoring'
import { validationMiddleware } from '@/lib/services/validation'
import { apiRequestSchemas } from '@/shared/schema'
import { supabaseAdmin } from '@/lib/database'
import { logger } from '@/lib/monitoring/error-handling'

export const POST = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const body = await request.json()
  
  // Use authenticated admin user info
  const userId = adminUser.id
  const userEmail = adminUser.email || ''
  
  // Extract and parse IP address properly (handle multiple IPs from proxy)
  const rawIpAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || body.ip_address || ''
  const cleanIpAddress = rawIpAddress.split(',')[0].trim() || ''

  // Log the activity using the ActivityLogger static method
  await ActivityLogger.logActivity({
    userId,
    eventType: body.eventType || body.action_type || 'system_action',
    actionDescription: body.actionDescription || body.action_description || 'System action performed',
    ipAddress: cleanIpAddress,
    userAgent: request.headers.get('user-agent') || body.user_agent || '',
    request,
    metadata: {
      userEmail,
      originalIpHeader: rawIpAddress,
      ...body.metadata || {}
    }
  })

  return formatSuccess({ 
    message: 'Activity logged successfully'
  })
})

export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Apply validation middleware (skip auth/admin checks as wrapper handles it)
  const { response, validationResult } = await validationMiddleware.validateRequest(request, {
    requireAuth: false, // Wrapper already handles auth
    requireAdmin: false, // Wrapper already handles admin check
    validateQuery: apiRequestSchemas.adminActivityQuery,
    rateLimitConfig: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20 // 20 requests per minute for admin activity logs
    }
  });

  // Return error response if validation failed - cast as any to match wrapper return type
  if (response) {
    return response as any;
  }

  // Get validated query parameters
  const queryParams = validationResult.sanitizedData?.query || {};
  const { 
    days = 7, 
    limit = 100, 
    page = 1, 
    user: userId = null, 
    search: searchTerm = '', 
    event_type: eventType = 'all' 
  } = queryParams;

  const offset = (page - 1) * limit;

  // Calculate date filter
  const dateFilter = new Date()
  dateFilter.setDate(dateFilter.getDate() - days)

  const logsResponse = await withDatabaseOperation(
    async () => {
      // Create secure operation context
      const operationContext = {
        userId: adminUser.id,
        operation: 'admin_get_activity_logs',
        reason: 'Admin fetching activity logs with filters',
        source: 'admin/activity',
        metadata: {
          days,
          limit,
          page,
          userId: userId || null,
          searchTerm: searchTerm || null,
          eventType,
          endpoint: '/api/v1/admin/activity'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }

      // Build query with filters using secure wrapper
      const logs = await SecureServiceRoleWrapper.executeSecureOperation(
        operationContext,
        {
          table: 'indb_security_activity_logs',
          operationType: 'select',
          columns: ['*'],
          whereConditions: {
            ...(userId && { user_id: userId }),
            ...(eventType !== 'all' && { event_type: eventType })
          }
        },
        async () => {
          let query = supabaseAdmin
            .from('indb_security_activity_logs')
            .select('*')
            .gte('created_at', dateFilter.toISOString())

          // Apply filters
          if (userId) {
            query = query.eq('user_id', userId)
          }

          if (eventType !== 'all') {
            query = query.eq('event_type', eventType)
          }

          if (searchTerm) {
            query = query.or(`action_description.ilike.%${searchTerm}%,user_agent.ilike.%${searchTerm}%`)
          }

          // Apply pagination and ordering
          const { data: logs, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

          if (error) throw error
          return logs
        }
      )

      if (!logs) {
        throw new Error('Failed to fetch activity logs')
      }

      // Get user profiles for each log to include user name/email
      const logsWithUserData = []
      
      for (const log of logs || []) {
        try {
          // Get user profile using secure wrapper
          let userProfile: any = null
          let userEmail: string | null = null
          
          try {
            const profileContext = {
              userId: 'system',
              operation: 'admin_get_activity_user_profile',
              reason: 'Admin fetching user profile for activity log display',
              source: 'admin/activity',
              metadata: {
                activityLogId: log.id,
                targetUserId: log.user_id,
                endpoint: '/api/v1/admin/activity'
              }
            }

            const profiles = await SecureServiceRoleHelpers.secureSelect(
              profileContext,
              'indb_auth_user_profiles',
              ['full_name', 'user_id'],
              { user_id: log.user_id }
            )

            userProfile = profiles.length > 0 ? profiles[0] : null

            // Get user email using secure wrapper
            if (userProfile) {
              const authContext = {
                userId: 'system',
                operation: 'admin_get_activity_user_auth',
                reason: 'Admin fetching user auth data for activity log display',
                source: 'admin/activity',
                metadata: {
                  activityLogId: log.id,
                  targetUserId: userProfile.user_id,
                  endpoint: '/api/v1/admin/activity'
                }
              }

              const authUser = await SecureServiceRoleWrapper.executeSecureOperation(
                authContext,
                {
                  table: 'auth.users',
                  operationType: 'select',
                  columns: ['id', 'email'],
                  whereConditions: { id: userProfile.user_id }
                },
                async () => {
                  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userProfile.user_id)
                  if (error || !data?.user) throw error
                  return data.user
                }
              )

              userEmail = authUser.email || null
            }
          } catch (error) {
            logger.error({ error: error instanceof Error ? error.message : String(error) }, `Failed to fetch user data for log ${log.user_id}:`)
          }

          logsWithUserData.push({
            ...log,
            user_name: userProfile?.full_name || 'Unknown User',
            user_email: userEmail || 'Unknown Email'
          })
        } catch (fetchError) {
          logger.error({ error: fetchError instanceof Error ? fetchError.message : String(fetchError) }, `Failed to fetch user data for log ${log.id}:`)
          logsWithUserData.push({
            ...log,
            user_name: 'Unknown User',
            user_email: 'Unknown Email'
          })
        }
      }

      // Get total count for pagination using secure wrapper
      const countContext = {
        userId: adminUser.id,
        operation: 'admin_get_activity_logs_count',
        reason: 'Admin getting activity logs count for pagination',
        source: 'admin/activity',
        metadata: {
          days,
          endpoint: '/api/v1/admin/activity'
        }
      }

      const countResult = await SecureServiceRoleWrapper.executeSecureOperation(
        countContext,
        {
          table: 'indb_security_activity_logs',
          operationType: 'select',
          columns: ['*'],
          whereConditions: {}
        },
        async () => {
          const { count, error: countError } = await supabaseAdmin
            .from('indb_security_activity_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', dateFilter.toISOString())
          
          if (countError) throw countError
          return { count }
        }
      )

      const count = countResult.count

      return {
        logs: logsWithUserData,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/activity' }
  )

  if (!logsResponse.success) {
    return logsResponse
  }

  return formatSuccess(logsResponse.data)
})

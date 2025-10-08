import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { authService } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'

export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const currentUser = await authService.getCurrentUser()
  
  if (!currentUser) {
    return formatSuccess({
      error: 'Not authenticated',
      currentUser: null,
      profile: null
    })
  }

  // Get user profile using secure wrapper
  let profile = null
  let profileError = null
  try {
    const profileContext = {
      userId: currentUser.id,
      operation: 'admin_debug_get_profile',
      reason: 'Admin debug functionality fetching user profile for debugging',
      source: 'admin/debug-auth',
      metadata: {
        targetUserId: currentUser.id,
        endpoint: '/api/v1/admin/debug-auth'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    profile = await SecureServiceRoleWrapper.executeSecureOperation(
      profileContext,
      {
        table: 'indb_auth_user_profiles',
        operationType: 'select',
        columns: ['*'],
        whereConditions: { user_id: currentUser.id }
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single()

        if (error) {
          throw new Error(`Failed to fetch user profile: ${error.message}`)
        }

        return data
      }
    )
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error fetching profile in debug route:')
    profileError = { message: error instanceof Error ? error.message : String(error) }
  }

  return formatSuccess({
    currentUser: {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name
    },
    profile: profile || 'No profile found',
    profileError: profileError ? profileError.message : null,
    environment: 'development',
    timestamp: new Date().toISOString()
  })
})

export const POST = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const { targetUserId } = await request.json()
  const currentUser = await authService.getCurrentUser()
  
  if (!currentUser) {
    return formatSuccess({
      error: 'Not authenticated'
    }, undefined, 401)
  }

  // Use provided target user ID or current user ID
  const userIdToEscalate = targetUserId || currentUser.id

  const response = await withDatabaseOperation(
    async () => {
      // Update or create user profile with super_admin role using secure wrapper
      const escalationContext = {
        userId: adminUser.id,
        operation: 'admin_debug_escalate_privileges',
        reason: 'Admin debug functionality escalating user privileges to super_admin',
        source: 'admin/debug-auth',
        metadata: {
          targetUserId: userIdToEscalate,
          newRole: 'super_admin',
          endpoint: '/api/v1/admin/debug-auth'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }

      const escalationData = {
        user_id: userIdToEscalate,
        full_name: currentUser.name || currentUser.email?.split('@')[0] || 'Admin User',
        role: 'super_admin',
        email_notifications: true,
        updated_at: new Date().toISOString()
      }

      const profile = await SecureServiceRoleWrapper.executeSecureOperation(
        escalationContext,
        {
          table: 'indb_auth_user_profiles',
          operationType: 'update',
          data: escalationData
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .upsert(escalationData, {
              onConflict: 'user_id'
            })
            .select()
            .single()

          if (error) {
            throw new Error(`Failed to update profile: ${error.message}`)
          }

          return data
        }
      )

      // Log the privilege escalation for audit purposes
      logger.info({
        performedBy: adminUser.id,
        targetUser: userIdToEscalate,
        timestamp: new Date().toISOString(),
        environment: 'development'
      }, '⚠️ [SECURITY] Privilege escalation performed in development')

      return {
        message: 'Profile updated to super_admin (development only)',
        profile,
        warning: 'This operation is only allowed in development environment'
      }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/debug-auth' }
  )

  return response
})
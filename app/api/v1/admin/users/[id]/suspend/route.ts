import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import { ActivityLogger } from '@/lib/monitoring'
import { SecureServiceRoleHelpers, SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'

export const PATCH = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const { id: userId } = await params

  const fetchUserContext = {
    userId: adminUser.id,
    operation: 'admin_get_user_for_suspension',
    reason: 'Admin fetching user profile before suspension/unsuspension action',
    source: 'admin/users/[id]/suspend',
    metadata: {
      targetUserId: userId,
      adminAction: 'suspend_unsuspend_check',
      endpoint: '/api/v1/admin/users/[id]/suspend'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }

  const userProfiles = await SecureServiceRoleHelpers.secureSelect(
    fetchUserContext,
    'indb_auth_user_profiles',
    ['full_name', 'role'],
    { user_id: userId }
  )

  const currentUser = userProfiles.length > 0 ? userProfiles[0] : null

  if (!currentUser) {
    return await createStandardError(
      ErrorType.AUTHORIZATION,
      'User not found',
      404,
      ErrorSeverity.MEDIUM,
      { userId }
    )
  }

  let authUser = null
  try {
    const authContext = {
      userId: adminUser.id,
      operation: 'admin_get_user_auth_for_suspension',
      reason: 'Admin checking user auth status before suspension action',
      source: 'admin/users/[id]/suspend',
      metadata: {
        targetUserId: userId,
        targetUserName: currentUser.full_name,
        endpoint: '/api/v1/admin/users/[id]/suspend'
      }
    }

    authUser = await SecureServiceRoleWrapper.executeSecureOperation(
      authContext,
      {
        table: 'auth.users',
        operationType: 'select',
        columns: ['id', 'email', 'banned_until'],
        whereConditions: { id: userId }
      },
      async () => {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (error || !data?.user) {
          throw new Error('Failed to fetch user auth data')
        }
        return data
      }
    )
  } catch (error) {
    logger.error({
      userId: adminUser.id,
      endpoint: '/api/v1/admin/users/[id]/suspend',
      method: 'PATCH',
      targetUserId: userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Auth user fetch error')
    
    return await createStandardError(
      ErrorType.DATABASE,
      'Failed to fetch user auth data',
      500,
      ErrorSeverity.HIGH,
      { userId }
    )
  }

  const isBanned = authUser.user?.banned_until !== null
  const action = isBanned ? 'unban' : 'ban'

  const updateUserContext = {
    userId: adminUser.id,
    operation: action === 'ban' ? 'admin_suspend_user' : 'admin_unsuspend_user',
    reason: `Admin ${action === 'ban' ? 'suspending' : 'unsuspending'} user account`,
    source: 'admin/users/[id]/suspend',
    metadata: {
      targetUserId: userId,
      targetUserName: currentUser.full_name,
      targetUserRole: currentUser.role,
      suspensionAction: action,
      banDuration: isBanned ? 'none' : '10000h',
      endpoint: '/api/v1/admin/users/[id]/suspend'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }

  const updateResult = await SecureServiceRoleWrapper.executeSecureOperation(
    updateUserContext,
    {
      table: 'supabase_auth_users',
      operationType: 'update',
      whereConditions: { id: userId }
    },
    async () => {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: isBanned ? 'none' : '10000h'
      })
      if (error) throw error
      return { success: true }
    }
  )

  if (!updateResult) {
    logger.error({
      userId: adminUser.id,
      endpoint: '/api/v1/admin/users/[id]/suspend',
      method: 'PATCH',
      targetUserId: userId,
      action
    }, 'User suspend/unsuspend error')
    
    return await createStandardError(
      ErrorType.DATABASE,
      'Failed to update user status',
      500,
      ErrorSeverity.HIGH,
      { userId, action }
    )
  }

  await ActivityLogger.logAdminAction(
    adminUser.id,
    action === 'ban' ? 'suspend' : 'unsuspend',
    userId,
    `${action === 'ban' ? 'Suspended' : 'Unsuspended'} user ${currentUser.full_name || 'User'}`,
    request,
    { 
      suspensionAction: true,
      action,
      userRole: currentUser.role,
      previousStatus: isBanned ? 'suspended' : 'active',
      newStatus: action === 'ban' ? 'suspended' : 'active'
    }
  )

  return formatSuccess({ 
    action,
    message: `User ${action === 'ban' ? 'suspended' : 'unsuspended'} successfully`
  }, undefined, 202)
})

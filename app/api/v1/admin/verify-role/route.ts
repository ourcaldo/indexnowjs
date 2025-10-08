import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleHelpers, SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = adminApiWrapper(async (
  request: NextRequest,
  adminUser
) => {
  const { userId } = await request.json()

  if (!userId) {
    return await createStandardError(
      ErrorType.VALIDATION,
      'User ID is required',
      400,
      ErrorSeverity.LOW,
      { field: 'userId' }
    )
  }

  const authProfileContext = {
    userId: adminUser.id,
    operation: 'get_auth_user_profile',
    reason: 'Verify role endpoint checking authenticated user profile for authorization',
    source: 'admin/verify-role',
    metadata: {
      endpoint: '/api/v1/admin/verify-role',
      authUserId: adminUser.id
    }
  }

  const authProfiles = await SecureServiceRoleHelpers.secureSelect(
    authProfileContext,
    'indb_auth_user_profiles',
    ['role'],
    { user_id: adminUser.id }
  )
  
  const authProfile = authProfiles.length > 0 ? authProfiles[0] : null
  const isRequestingSuperAdmin = authProfile?.role === 'super_admin'

  if (userId !== adminUser.id && !isRequestingSuperAdmin) {
    return await createStandardError(
      ErrorType.AUTHORIZATION,
      'Access denied - can only check your own role',
      403,
      ErrorSeverity.MEDIUM,
      { userId, requesterId: adminUser.id }
    )
  }

  const profileContext = {
    userId: adminUser.id,
    operation: 'get_target_user_profile',
    reason: `Fetching user profile for role verification of user ${userId}`,
    source: 'admin/verify-role',
    metadata: {
      endpoint: '/api/v1/admin/verify-role',
      targetUserId: userId,
      isOwnProfile: userId === adminUser.id,
      isSuperAdminRequest: authProfile?.role === 'super_admin'
    }
  }

  const profiles = await SecureServiceRoleHelpers.secureSelect(
    profileContext,
    'indb_auth_user_profiles',
    ['role', 'full_name'],
    { user_id: userId }
  )

  if (!profiles || profiles.length === 0) {
    return await createStandardError(
      ErrorType.AUTHORIZATION,
      'User profile not found or access denied',
      403,
      ErrorSeverity.MEDIUM,
      { userId }
    )
  }

  const profile = profiles[0]
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
  const isSuperAdmin = profile.role === 'super_admin'

  return formatSuccess({
    isAdmin,
    isSuperAdmin,
    role: profile.role,
    name: profile.full_name || 'Unknown'
  })
})

import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import { ActivityLogger } from '@/lib/monitoring'
import { SecureServiceRoleHelpers, SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'

export const GET = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const { id: userId } = await params

  const operationContext = {
    userId: adminUser.id,
    operation: 'admin_get_user_profile',
    reason: `Admin fetching detailed user profile for user ID: ${userId}`,
    source: 'admin/users/[id]',
    metadata: {
      requestedUserId: userId,
      includePackageInfo: true,
      endpoint: '/api/v1/admin/users/[id]'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }

  const profileWithPackage = await SecureServiceRoleWrapper.executeSecureOperation(
    operationContext,
    {
      table: 'indb_auth_user_profiles',
      operationType: 'select',
      columns: ['*'],
      whereConditions: { user_id: userId }
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select(`
          *,
          package:indb_payment_packages(
            id,
            name,
            slug,
            description,
            pricing_tiers,
            currency,
            billing_period,
            features,
            quota_limits,
            is_active
          )
        `)
        .eq('user_id', userId)
        .single()

      if (error) throw error
      return data
    }
  )

  if (!profileWithPackage) {
    logger.error({
      userId: adminUser.id,
      endpoint: '/api/v1/admin/users/[id]',
      method: 'GET',
      targetUserId: userId
    }, 'Admin user lookup - Profile not found for user')
    
    return await createStandardError(
      ErrorType.AUTHORIZATION,
      'User not found',
      404,
      ErrorSeverity.MEDIUM,
      { userId }
    )
  }

  const profile = profileWithPackage

  let authUser = null
  
  try {
    const authContext = {
      userId: adminUser.id,
      operation: 'admin_get_user_auth_details',
      reason: 'Admin fetching user auth details for profile display',
      source: 'admin/users/[id]',
      metadata: {
        targetUserId: userId,
        endpoint: '/api/v1/admin/users/[id]'
      }
    }

    authUser = await SecureServiceRoleWrapper.executeSecureOperation(
      authContext,
      {
        table: 'auth.users',
        operationType: 'select',
        columns: ['id', 'email', 'email_confirmed_at', 'created_at', 'last_sign_in_at'],
        whereConditions: { id: userId }
      },
      async () => {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (error || !data?.user) {
          throw error || new Error('User not found')
        }
        return data
      }
    )
  } catch (error) {
    logger.error({
      userId: adminUser.id,
      endpoint: '/api/v1/admin/users/[id]',
      method: 'GET',
      targetUserId: userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Auth user fetch error')
  }

  const statsContext = {
    userId: adminUser.id,
    operation: 'admin_get_user_statistics',
    reason: `Admin fetching user statistics for user ID: ${userId}`,
    source: 'admin/users/[id]',
    metadata: {
      requestedUserId: userId,
      statsType: 'service_accounts_and_jobs',
      endpoint: '/api/v1/admin/users/[id]'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }

  const [serviceAccountsResult, activeJobsResult] = await Promise.all([
    SecureServiceRoleWrapper.executeSecureOperation(
      statsContext,
      {
        table: 'indb_google_service_accounts',
        operationType: 'select',
        columns: ['id'],
        whereConditions: { user_id: userId, is_active: true }
      },
      async () => {
        const { count, error } = await supabaseAdmin
          .from('indb_google_service_accounts')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('is_active', true)
        if (error) throw error
        return { count }
      }
    ),
    SecureServiceRoleWrapper.executeSecureOperation(
      { ...statsContext, operation: 'admin_get_user_active_jobs' },
      {
        table: 'indb_indexing_jobs',
        operationType: 'select',
        columns: ['id'],
        whereConditions: { user_id: userId }
      },
      async () => {
        const { count, error } = await supabaseAdmin
          .from('indb_indexing_jobs')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .in('status', ['running', 'pending'])
        if (error) throw error
        return { count }
      }
    )
  ])

  const userWithAuthData = {
    ...profile,
    email: authUser?.user?.email || null,
    email_confirmed_at: authUser?.user?.email_confirmed_at || null,
    last_sign_in_at: authUser?.user?.last_sign_in_at || null,
    service_account_count: serviceAccountsResult.count || 0,
    active_jobs_count: activeJobsResult.count || 0,
  }

  await ActivityLogger.logAdminAction(
    adminUser.id,
    'user_profile_view',
    userId,
    `Viewed detailed profile for ${profile.full_name || authUser?.user?.email || 'User'}`,
    request,
    { 
      profileView: true,
      userRole: profile.role,
      userEmail: authUser?.user?.email,
      lastSignIn: authUser?.user?.last_sign_in_at
    }
  )

  return formatSuccess({ user: userWithAuthData })
})

export const PATCH = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const { id: userId } = await params
  const body = await request.json()
  const { full_name, role, email_notifications, phone_number } = body

  const currentProfile = await SecureServiceRoleHelpers.secureSelect(
    {
      userId: adminUser.id,
      operation: 'get_current_user_profile',
      reason: `Getting current profile before update for user: ${userId}`,
      source: 'admin/users/[id]',
      metadata: { requestedUserId: userId }
    },
    'indb_auth_user_profiles',
    ['role', 'full_name'],
    { user_id: userId }
  )

  const updateOperationContext = {
    userId: adminUser.id,
    operation: 'admin_update_user_profile',
    reason: `Admin updating user profile for user ID: ${userId}`,
    source: 'admin/users/[id]',
    metadata: {
      requestedUserId: userId,
      updatedFields: { full_name, role, email_notifications, phone_number },
      roleChanged: currentProfile.length > 0 ? currentProfile[0].role !== role : false,
      endpoint: '/api/v1/admin/users/[id]'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }

  const updateData = {
    full_name,
    role,
    email_notifications,
    phone_number,
    updated_at: new Date().toISOString()
  }

  const updatedProfiles = await SecureServiceRoleHelpers.secureUpdate(
    updateOperationContext,
    'indb_auth_user_profiles',
    updateData,
    { user_id: userId }
  )

  if (!updatedProfiles || updatedProfiles.length === 0) {
    logger.error({
      userId: adminUser.id,
      endpoint: '/api/v1/admin/users/[id]',
      method: 'PATCH',
      targetUserId: userId
    }, 'Profile update failed - no rows returned')
    
    return await createStandardError(
      ErrorType.DATABASE,
      'Failed to update user profile',
      500,
      ErrorSeverity.HIGH,
      { userId }
    )
  }

  const updatedProfile = updatedProfiles[0]

  await ActivityLogger.logAdminAction(
    adminUser.id,
    'profile_update',
    userId,
    `Updated profile for ${full_name || 'User'} - Role: ${role}`,
    request,
    { 
      profileUpdate: true,
      updatedFields: { full_name, role, email_notifications, phone_number },
      newRole: role,
      previousRole: currentProfile.length > 0 ? currentProfile[0].role : 'unknown',
      roleChanged: currentProfile.length > 0 ? currentProfile[0].role !== role : false
    }
  )

  return formatSuccess({ user: updatedProfile }, undefined, 202)
})

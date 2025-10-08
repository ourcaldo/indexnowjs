import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { ActivityLogger } from '@/lib/monitoring'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const { id: userId } = await params
  const body = await request.json()
  const { packageId, reason, effectiveDate, notifyUser } = body

  if (!packageId) {
    return await createStandardError(
      ErrorType.VALIDATION,
      'Package ID is required',
      400,
      ErrorSeverity.LOW,
      { field: 'packageId' }
    )
  }

  const packageResult = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: adminUser.id,
      operation: 'admin_verify_package',
      reason: 'Admin verifying package exists before assignment',
      source: 'admin/users/[id]/change-package',
      metadata: {
        targetUserId: userId,
        packageId: packageId,
        endpoint: '/api/v1/admin/users/[id]/change-package'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    },
    {
      table: 'indb_payment_packages',
      operationType: 'select',
      columns: ['id', 'name', 'slug'],
      whereConditions: { id: packageId, is_active: true }
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_payment_packages')
        .select('id, name, slug')
        .eq('id', packageId)
        .eq('is_active', true)
        .single()
      return { data, error }
    }
  )

  const { data: packageData, error: packageError } = packageResult

  if (packageError || !packageData) {
    return await createStandardError(
      ErrorType.VALIDATION,
      'Invalid package selected',
      400,
      ErrorSeverity.LOW,
      { packageId }
    )
  }

  const userResult = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: adminUser.id,
      operation: 'admin_get_user_for_package_change',
      reason: 'Admin fetching user data before package change',
      source: 'admin/users/[id]/change-package',
      metadata: {
        targetUserId: userId,
        newPackageId: packageId,
        endpoint: '/api/v1/admin/users/[id]/change-package'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    },
    {
      table: 'indb_auth_user_profiles',
      operationType: 'select',
      columns: ['full_name', 'package_id', 'package'],
      whereConditions: { user_id: userId }
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('full_name, package_id, package:indb_payment_packages(name)')
        .eq('user_id', userId)
        .single()
      return { data, error }
    }
  )

  const { data: currentUser, error: userError } = userResult

  if (userError || !currentUser) {
    return await createStandardError(
      ErrorType.AUTHORIZATION,
      'User not found',
      404,
      ErrorSeverity.MEDIUM,
      { userId }
    )
  }

  const updateResult = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: adminUser.id,
      operation: 'admin_update_user_package',
      reason: `Admin changing user package from ${Array.isArray(currentUser.package) ? currentUser.package[0]?.name : currentUser.package?.name || 'No Package'} to ${packageData.name}`,
      source: 'admin/users/[id]/change-package',
      metadata: {
        targetUserId: userId,
        targetUserName: currentUser.full_name,
        oldPackageId: currentUser.package_id,
        newPackageId: packageId,
        newPackageName: packageData.name,
        newPackageSlug: packageData.slug,
        resetQuota: true,
        endpoint: '/api/v1/admin/users/[id]/change-package'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    },
    {
      table: 'indb_auth_user_profiles',
      operationType: 'update',
      columns: ['package_id', 'subscribed_at', 'expires_at', 'daily_quota_used', 'daily_quota_reset_date', 'updated_at'],
      whereConditions: { user_id: userId },
      data: {
        package_id: packageId,
        subscribed_at: new Date().toISOString(),
        expires_at: packageData.slug === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        daily_quota_used: 0,
        daily_quota_reset_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      }
    },
    async () => {
      const { error } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .update({
          package_id: packageId,
          subscribed_at: new Date().toISOString(),
          expires_at: packageData.slug === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          daily_quota_used: 0,
          daily_quota_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      return { error }
    }
  )

  const { error: updateError } = updateResult

  if (updateError) {
    return await createStandardError(
      ErrorType.DATABASE,
      'Failed to change package',
      500,
      ErrorSeverity.HIGH,
      { userId, packageId }
    )
  }

  const oldPackageName = Array.isArray(currentUser.package) ? 
    currentUser.package[0]?.name : currentUser.package?.name || 'No Package'
  
  await ActivityLogger.logAdminAction(
    adminUser.id,
    'package_change',
    userId,
    `Changed package for ${currentUser.full_name || 'User'} from "${oldPackageName}" to "${packageData.name}"`,
    request,
    { 
      packageChange: true,
      oldPackageId: currentUser.package_id,
      newPackageId: packageId,
      oldPackageName,
      newPackageName: packageData.name,
      userFullName: currentUser.full_name 
    }
  )

  return formatSuccess({ 
    message: `Package successfully changed to ${packageData.name}`,
    package: packageData
  }, undefined, 201)
})

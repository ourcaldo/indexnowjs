import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import { ActivityLogger } from '@/lib/monitoring'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const { id: userId } = await params
  const body = await request.json()
  const { days = 30 } = body

  const currentUserResult = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: adminUser.id,
      operation: 'admin_get_user_subscription_data',
      reason: 'Admin retrieving user subscription data to extend subscription',
      source: 'admin/users/[id]/extend-subscription',
      metadata: {
        targetUserId: userId,
        requestedExtensionDays: days,
        endpoint: '/api/v1/admin/users/[id]/extend-subscription',
        method: 'POST'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    },
    {
      table: 'indb_auth_user_profiles',
      operationType: 'select',
      columns: ['full_name', 'expires_at', 'package'],
      whereConditions: { user_id: userId }
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('full_name, expires_at, package:indb_payment_packages(name, slug)')
        .eq('user_id', userId)
        .single()
      return { data, error }
    }
  )

  const { data: currentUser, error: userError } = currentUserResult
  if (userError || !currentUser) {
    return await createStandardError(
      ErrorType.AUTHORIZATION,
      'User not found',
      404,
      ErrorSeverity.MEDIUM,
      { userId }
    )
  }

  const currentExpiry = currentUser.expires_at ? new Date(currentUser.expires_at) : new Date()
  const now = new Date()
  const baseDate = currentExpiry > now ? currentExpiry : now
  const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)

  const updateResult = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: adminUser.id,
      operation: 'admin_extend_user_subscription',
      reason: `Admin extending user subscription by ${days} days`,
      source: 'admin/users/[id]/extend-subscription',
      metadata: {
        targetUserId: userId,
        targetUserName: currentUser.full_name,
        extensionDays: days,
        previousExpiry: currentUser.expires_at,
        newExpiry: newExpiry.toISOString(),
        endpoint: '/api/v1/admin/users/[id]/extend-subscription',
        method: 'POST'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    },
    {
      table: 'indb_auth_user_profiles',
      operationType: 'update',
      columns: ['expires_at', 'updated_at'],
      whereConditions: { user_id: userId },
      data: {
        expires_at: newExpiry.toISOString(),
        updated_at: new Date().toISOString()
      }
    },
    async () => {
      const { error } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .update({
          expires_at: newExpiry.toISOString(),
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
      'Failed to extend subscription',
      500,
      ErrorSeverity.HIGH,
      { userId, days }
    )
  }

  await ActivityLogger.logAdminAction(
    adminUser.id,
    'subscription_extend',
    userId,
    `Extended subscription for ${currentUser.full_name || 'User'} by ${days} days`,
    request,
    { 
      subscriptionExtend: true,
      extensionDays: days,
      previousExpiry: currentUser.expires_at,
      newExpiry: newExpiry.toISOString(),
      userFullName: currentUser.full_name 
    }
  )

  return formatSuccess({ 
    message: `Subscription successfully extended by ${days} days`,
    new_expiry: newExpiry.toISOString()
  }, undefined, 201)
})

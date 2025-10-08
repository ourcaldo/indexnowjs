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

  const quotaResetContext = {
    userId: adminUser.id,
    operation: 'admin_reset_user_quota',
    reason: 'Admin resetting daily quota usage for user',
    source: 'admin/users/[id]/reset-quota',
    metadata: {
      targetUserId: userId,
      endpoint: '/api/v1/admin/users/[id]/reset-quota'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }

  const result = await SecureServiceRoleWrapper.executeSecureOperation(
    quotaResetContext,
    {
      table: 'indb_auth_user_profiles',
      operationType: 'update',
      data: {
        daily_quota_used: 0,
        daily_quota_reset_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      },
      whereConditions: { user_id: userId }
    },
    async () => {
      const { data: currentUser, error: userError } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('full_name, daily_quota_used, package:indb_payment_packages(name)')
        .eq('user_id', userId)
        .single()

      if (userError || !currentUser) {
        throw new Error('User not found')
      }

      const { error: updateError } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .update({
          daily_quota_used: 0,
          daily_quota_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        throw new Error(`Failed to reset quota: ${updateError.message}`)
      }

      return currentUser
    }
  )

  if (!result) {
    return await createStandardError(
      ErrorType.AUTHORIZATION,
      'User not found',
      404,
      ErrorSeverity.MEDIUM,
      { userId }
    )
  }

  const currentUser = result

  await ActivityLogger.logAdminAction(
    adminUser.id,
    'quota_reset',
    userId,
    `Reset daily quota for ${currentUser.full_name || 'User'} (was ${currentUser.daily_quota_used || 0})`,
    request,
    { 
      quotaReset: true,
      previousQuotaUsed: currentUser.daily_quota_used || 0,
      userFullName: currentUser.full_name 
    }
  )

  return formatSuccess({ 
    message: `Daily quota successfully reset to 0`,
    previous_quota_used: currentUser.daily_quota_used || 0
  }, undefined, 201)
})

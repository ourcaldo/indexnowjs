import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import { ActivityLogger } from '@/lib/monitoring'
import { SecureServiceRoleHelpers, SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const { id: userId } = await params

  const userContext = {
    userId: adminUser.id,
    operation: 'admin_get_user_for_password_reset',
    reason: 'Admin fetching user details before password reset',
    source: 'admin/users/[id]/reset-password',
    metadata: {
      targetUserId: userId,
      endpoint: '/api/v1/admin/users/[id]/reset-password'
    }
  }

  const users = await SecureServiceRoleHelpers.secureSelect(
    userContext,
    'indb_auth_user_profiles',
    ['full_name', 'role'],
    { user_id: userId }
  )

  if (!users || users.length === 0) {
    return await createStandardError(
      ErrorType.AUTHORIZATION,
      'User not found',
      404,
      ErrorSeverity.MEDIUM,
      { userId }
    )
  }

  const currentUser = users[0]

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    password += '0123456789'[Math.floor(Math.random() * 10)]
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
    
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)]
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  const newPassword = generatePassword()

  const updateContext = {
    userId: adminUser.id,
    operation: 'admin_reset_user_password',
    reason: 'Admin resetting user password for security/access purposes',
    source: 'admin/users/[id]/reset-password',
    metadata: {
      targetUserId: userId,
      targetUserName: currentUser.full_name,
      passwordLength: newPassword.length,
      endpoint: '/api/v1/admin/users/[id]/reset-password'
    }
  }

  const updateResult = await SecureServiceRoleWrapper.executeSecureOperation(
    updateContext,
    {
      table: 'auth.users',
      operationType: 'update',
      columns: ['password'],
      whereConditions: { id: userId },
      data: { password: newPassword }
    },
    async () => {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      })
      
      if (error) {
        throw new Error('Failed to reset password')
      }
      
      return { success: true }
    }
  )

  if (!updateResult || !updateResult.success) {
    return await createStandardError(
      ErrorType.DATABASE,
      'Failed to reset password',
      500,
      ErrorSeverity.HIGH,
      { userId }
    )
  }

  await ActivityLogger.logAdminAction(
    adminUser.id,
    'password_reset',
    userId,
    `Generated new password for ${currentUser.full_name || 'User'} (${newPassword.length} chars)`,
    request,
    { 
      passwordReset: true,
      userRole: currentUser.role,
      passwordLength: newPassword.length,
      adminInitiated: true
    }
  )

  return formatSuccess({ 
    newPassword: newPassword,
    message: 'Password reset successfully'
  }, undefined, 201)
})

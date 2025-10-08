import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/database'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = authenticatedApiWrapper(async (request, auth) => {
  try {
    const body = await request.json()
    const { currentPassword, newPassword } = body

    const updateResult = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'change_user_password',
        source: 'auth/user/change-password',
        reason: 'User changing their own password for security',
        metadata: { endpoint: '/api/v1/auth/user/change-password', method: 'POST', securityEvent: true },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'auth.users', operationType: 'update' },
      async () => {
        const { error } = await supabaseAdmin!.auth.admin.updateUserById(
          auth.userId,
          { password: newPassword }
        )
        return { error }
      }
    )

    const { error: updateError } = updateResult
    if (updateError) {
      const passwordError = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        'Failed to change password',
        { severity: ErrorSeverity.MEDIUM, userId: auth.userId, statusCode: 400 }
      )
      return formatError(passwordError)
    }

    try {
      await ActivityLogger.logActivity({
        userId: auth.userId,
        eventType: ActivityEventTypes.PASSWORD_CHANGE,
        actionDescription: 'Changed account password',
        request,
        metadata: { passwordChange: true, security_event: true }
      })
    } catch (logError) {}

    return formatSuccess({ message: 'Password changed successfully' })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/auth/user/change-password', method: 'POST', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

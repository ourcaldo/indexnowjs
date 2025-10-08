import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { loginSchema } from '@/shared/schema'
import { publicApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { ErrorHandlingService, ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'

export const POST = publicApiWrapper(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        validation.error.issues[0].message,
        { severity: ErrorSeverity.LOW, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const { email, password } = validation.data

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {}
          },
        },
      }
    )

    const { data, error } = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'user_login_password',
        source: 'auth/login',
        reason: 'System processing user password-based authentication',
        metadata: { email, loginMethod: 'password', hasPassword: !!password },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      { table: 'auth.users', operationType: 'select' },
      async () => {
        const result = await supabase.auth.signInWithPassword({ email, password })
        if (result.error) throw new Error(`Login failed: ${result.error.message}`)
        return result
      }
    )

    if (error) {
      const errorObj = error as any
      const errorMessage = errorObj?.message || 'Unknown error'
      const errorCode = errorObj?.code || 'unknown'
      
      const authError = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        `Login failed for ${email}: ${errorMessage}`,
        { severity: ErrorSeverity.MEDIUM, statusCode: 401, metadata: { email, errorCode, attempt: 'password_login' } }
      )

      try {
        await ActivityLogger.logAuth(email, ActivityEventTypes.LOGIN, false, request, errorMessage)
      } catch (logError) {}

      return formatError(authError)
    }

    if (data.user?.id) {
      try {
        await ActivityLogger.logAuth(data.user.id, ActivityEventTypes.LOGIN, true, request)
      } catch (logError) {}

      process.nextTick(async () => {
        try {
          const { loginNotificationService } = await import('@/lib/email/login-notification-service')
          const { getRequestInfo } = await import('@/lib/utils/ip-device-utils')
          
          const requestInfo = await getRequestInfo(request)
          
          Promise.race([
            loginNotificationService.sendLoginNotification({
              userId: data.user.id,
              userEmail: data.user.email || '',
              userName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
              ipAddress: requestInfo.ipAddress || 'Unknown',
              userAgent: requestInfo.userAgent || 'Unknown',
              deviceInfo: requestInfo.deviceInfo || undefined,
              locationData: requestInfo.locationData || undefined,
              loginTime: new Date().toISOString()
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Email sending timeout')), 30000))
          ]).catch(() => {})
        } catch (importError) {}
      })
    }

    return formatSuccess({ user: data.user, session: data.session })
  } catch (error) {
    const systemError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      { severity: ErrorSeverity.HIGH, statusCode: 500, metadata: { operation: 'user_login' } }
    )
    return formatError(systemError)
  }
})

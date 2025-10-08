import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { publicApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

function getBaseDomain(): string {
  const envUrls = [
    process.env.NEXT_PUBLIC_DASHBOARD_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL, 
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_BASE_URL
  ].filter(Boolean) as string[]
  
  for (const url of envUrls) {
    try {
      const urlHostname = new URL(url).hostname
      const parts = urlHostname.split('.')
      if (parts.length >= 2) {
        return parts.slice(-2).join('.')
      }
    } catch (e) {}
  }
  
  return ''
}

export const POST = publicApiWrapper(async (request: NextRequest) => {
  try {
    const cookieStore = await cookies()
    const baseDomain = getBaseDomain()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = {
                ...options,
                maxAge: 0,
                ...(baseDomain && { domain: `.${baseDomain}` })
              }
              cookieStore.set(name, value, cookieOptions)
            })
          },
        },
      }
    )

    const logoutResult = await SecureServiceRoleWrapper.executeWithUserSession(
      supabase,
      {
        userId: 'user-logout',
        operation: 'user_logout',
        reason: 'User logging out of application',
        source: 'auth/logout',
        metadata: { endpoint: '/api/v1/auth/logout' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      { table: 'auth.sessions', operationType: 'delete' },
      async (userSupabase) => {
        const { data: { session } } = await userSupabase.auth.getSession()
        const userId = session?.user?.id
        const { error } = await userSupabase.auth.signOut()
        return { userId, error }
      }
    )

    const { userId, error } = logoutResult

    if (error) {
      const logoutError = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        'Logout failed',
        { severity: ErrorSeverity.MEDIUM, statusCode: 400 }
      )
      return formatError(logoutError)
    }

    if (userId) {
      try {
        await ActivityLogger.logAuth(userId, ActivityEventTypes.LOGOUT, true, request)
      } catch (logError) {}
    }

    return formatSuccess({ message: 'Logged out successfully' })
  } catch (error: any) {
    const systemError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error,
      { severity: ErrorSeverity.HIGH, statusCode: 500, metadata: { operation: 'user_logout' } }
    )
    return formatError(systemError)
  }
})

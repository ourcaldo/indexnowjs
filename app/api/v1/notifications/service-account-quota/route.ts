import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType } from '@/lib/monitoring/error-handling'

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  try {

    // Create user's authenticated Supabase client
    const cookieStore = await cookies()
    const userSupabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          }
        }
      }
    )

    // Get quota-related notifications using SecureWrapper
    const notifications = await SecureServiceRoleWrapper.executeWithUserSession(
      userSupabaseClient,
      {
        userId: auth.userId,
        operation: 'get_user_quota_notifications',
        source: 'notifications/service-account-quota',
        reason: 'User retrieving their quota-related notifications',
        metadata: {
          endpoint: '/api/v1/notifications/service-account-quota',
          method: 'GET'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_notifications_dashboard', operationType: 'select' },
      async (db) => {
        const { data: notifications, error } = await db
          .from('indb_notifications_dashboard')
          .select('*')
          .eq('user_id', auth.userId)
          .eq('type', 'quota_warning')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          const dbError = ErrorHandlingService.createError(
            ErrorType.DATABASE,
            error,
            { statusCode: 500, context: { userId: auth.userId, operation: 'fetch_quota_notifications' } }
          )
          throw dbError
        }

        return notifications || []
      }
    )

    return formatSuccess({
      success: true,
      data: notifications
    })

  } catch (error) {
    if (error && typeof error === 'object' && 'type' in error) {
      return formatError(error as any)
    }
    
    const structuredError = ErrorHandlingService.createError(
      ErrorType.INTERNAL,
      error as Error,
      { statusCode: 500, context: { endpoint: '/api/v1/notifications/service-account-quota' } }
    )
    return formatError(structuredError)
  }
})
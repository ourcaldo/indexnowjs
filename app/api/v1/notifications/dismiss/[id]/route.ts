import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType } from '@/lib/monitoring/error-handling'

export const POST = authenticatedApiWrapper(async (
  request: NextRequest,
  auth,
  { params }: { params: { id: string } } = {} as any
) => {
  try {
    const notificationId = (await params).id

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

    // Dismiss the notification using SecureWrapper
    await SecureServiceRoleWrapper.executeWithUserSession(
      userSupabaseClient,
      {
        userId: auth.userId,
        operation: 'dismiss_user_notification',
        source: 'notifications/dismiss/[id]',
        reason: 'User dismissing their notification',
        metadata: {
          notificationId,
          endpoint: '/api/v1/notifications/dismiss/[id]',
          method: 'POST'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_notifications_dashboard', operationType: 'update' },
      async (db) => {
        const { error } = await db
          .from('indb_notifications_dashboard')
          .update({ 
            is_read: true,
            dismissed_at: new Date().toISOString()
          })
          .eq('id', notificationId)
          .eq('user_id', auth.userId)

        if (error) {
          const dbError = ErrorHandlingService.createError(
            ErrorType.DATABASE,
            error,
            { statusCode: 500, context: { userId: auth.userId, notificationId, operation: 'dismiss_notification' } }
          )
          throw dbError
        }

        return true
      }
    )

    return formatSuccess({
      success: true,
      message: 'Notification dismissed successfully'
    })

  } catch (error) {
    if (error && typeof error === 'object' && 'type' in error) {
      return formatError(error as any)
    }
    
    const structuredError = ErrorHandlingService.createError(
      ErrorType.INTERNAL,
      error as Error,
      { statusCode: 500, context: { endpoint: '/api/v1/notifications/dismiss/[id]' } }
    )
    return formatError(structuredError)
  }
})
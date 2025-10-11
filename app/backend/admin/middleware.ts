import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'
import { isRateLimited, recordFailedAttempt, createRateLimitResponse, resetRateLimit } from '@/lib/middleware/admin-rate-limiter'

export async function adminMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow access to admin login page
  if (pathname === '/backend/admin/login') {
    return NextResponse.next()
  }

  // Check if IP is rate limited
  if (isRateLimited(request)) {
    return createRateLimitResponse(request)
  }

  // For all other admin routes, check authentication
  try {
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // Cannot set cookies in middleware
          },
        },
      }
    )

    const { data: { user }, error } = await supabaseServer.auth.getUser()
    
    if (error || !user) {
      // Log unauthorized access attempt - no authentication
      logger.warn({
        userId: 'anonymous',
        endpoint: pathname,
        attemptedRole: 'none',
        requiredRole: 'admin',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }, 'Unauthorized admin access attempt - no authentication')

      // Record failed attempt for rate limiting
      recordFailedAttempt(request)

      // Redirect to admin login
      const loginUrl = new URL('/backend/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Secure admin role verification using SecureWrapper
    try {
      const profile = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: user.id,
          operation: 'admin_middleware_role_verification',
          reason: 'Admin middleware checking user role for backend access',
          source: 'app/backend/admin/middleware.ts',
          metadata: {
            pathname,
            requestedPath: pathname,
            userEmail: user.email
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        },
        {
          table: 'indb_auth_user_profiles',
          operationType: 'select',
          columns: ['role'],
          whereConditions: { user_id: user.id }
        },
        async () => {
          const { createClient } = require('@supabase/supabase-js')
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          
          const { data, error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()

          if (error) throw error
          return data
        }
      )

      if (!profile || profile.role !== 'super_admin') {
        // Log unauthorized access attempt - insufficient permissions
        logger.warn({
          userId: user.id,
          endpoint: pathname,
          attemptedRole: profile?.role || 'none',
          requiredRole: 'super_admin',
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }, 'Unauthorized admin access attempt - insufficient permissions (super_admin required)')

        // Record failed attempt for rate limiting
        recordFailedAttempt(request)

        const loginUrl = new URL('/backend/admin/login', request.url)
        return NextResponse.redirect(loginUrl)
      }
    } catch (dbError) {
      // Log system error - database error during role verification
      logger.error({
        userId: user.id,
        endpoint: pathname,
        attemptedRole: 'unknown',
        requiredRole: 'admin',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, 'Admin middleware database error during role verification')

      // Record failed attempt for rate limiting
      recordFailedAttempt(request)

      const loginUrl = new URL('/backend/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Successful authentication - reset rate limit for this IP
    resetRateLimit(request)
    
    return NextResponse.next()

  } catch (error) {
    // Log system error - general middleware error
    logger.error({
      userId: 'unknown',
      endpoint: pathname,
      attemptedRole: 'unknown',
      requiredRole: 'admin',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown middleware error'
    }, 'Admin middleware general error')

    // Record failed attempt for rate limiting
    recordFailedAttempt(request)

    const loginUrl = new URL('/backend/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
}
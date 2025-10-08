import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { logger } from '@/lib/monitoring/error-handling'

function getBaseDomain(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_BASE_URL!).hostname
  } catch (e) {
    return ''
  }
}

export const GET = publicApiWrapper(async (request: NextRequest) => {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'
  // Ensure redirect URL is a safe path (starts with /) to prevent open redirects
  const next = rawNext.startsWith('/') ? rawNext : '/dashboard'
  const error_code = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Handle Supabase auth errors first
  if (error_code) {
    logger.error({ data: [{ error_code, error_description }] }, 'Supabase auth error:')
    
    // Map specific Supabase errors to user-friendly messages
    switch (error_code) {
      case 'access_denied':
        return NextResponse.redirect(`${origin}/login?error=access_denied`)
      case 'server_error':
        return NextResponse.redirect(`${origin}/login?error=server_error`)
      case 'temporarily_unavailable':
        return NextResponse.redirect(`${origin}/login?error=temporarily_unavailable`)
      default:
        return NextResponse.redirect(`${origin}/login?error=auth_error&details=${encodeURIComponent(error_description || 'Unknown error')}`)
    }
  }

  // Handle successful authentication with code
  if (code) {
    const cookieStore = await cookies()
    const baseDomain = getBaseDomain()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Add cross-subdomain support to Supabase cookies
              const cookieOptions = {
                ...options,
                ...(baseDomain && { domain: `.${baseDomain}` })
              }
              cookieStore.set(name, value, cookieOptions)
            })
          },
        },
      }
    )

    try {
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Auth callback error:')
        
        // Enhanced error handling with specific error types
        if (error.message?.includes('expired')) {
          return NextResponse.redirect(`${origin}/login?error=expired_link`)
        } else if (error.message?.includes('invalid')) {
          return NextResponse.redirect(`${origin}/login?error=invalid_link`)
        } else {
          return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
        }
      }

      // Verify we have a valid session and user
      if (!data.session || !data.user) {
        logger.error({ error: 'Auth callback error: No session or user data received' instanceof Error ? 'Auth callback error: No session or user data received'.message : String('Auth callback error: No session or user data received') }, 'Error occurred')
        return NextResponse.redirect(`${origin}/login?error=no_session_data`)
      }

      // Log successful authentication
      logger.info({ data: [data.user.id] }, 'Successful authentication callback for user:')

      // For email verification, check if this was an unconfirmed user
      if (!data.user.email_confirmed_at && data.session) {
        // This shouldn't happen with proper verification, but handle gracefully
        logger.warn({ data: [data.user.id] }, 'User session created but email not confirmed:')
      }

      // Successful authentication - redirect to requested page or dashboard
      const redirectUrl = `${origin}${next}`
      logger.info({ data: [redirectUrl] }, 'Redirecting authenticated user to:')
      return NextResponse.redirect(redirectUrl)
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Auth callback exception:')
      
      // More specific error handling for exceptions
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          return NextResponse.redirect(`${origin}/login?error=network_error`)
        } else if (error.message.includes('timeout')) {
          return NextResponse.redirect(`${origin}/login?error=timeout_error`)
        }
      }
      
      return NextResponse.redirect(`${origin}/login?error=auth_callback_exception`)
    }
  }

  // If no code or error present, this is an invalid callback
  logger.error({ error: 'Auth callback error: Missing required parameters (code or error)' instanceof Error ? 'Auth callback error: Missing required parameters (code or error)'.message : String('Auth callback error: Missing required parameters (code or error)') }, 'Error occurred')
  return NextResponse.redirect(`${origin}/login?error=missing_auth_code`)
})
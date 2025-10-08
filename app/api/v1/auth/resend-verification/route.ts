import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { publicApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'

const rateLimitStore = new Map<string, { count: number; resetTime: number; lastRequest: number }>()

const RATE_LIMIT = {
  MAX_ATTEMPTS: 3,
  WINDOW_MS: 15 * 60 * 1000,
  COOLDOWN_MS: 60 * 1000,
}

function checkRateLimit(email: string, clientIP: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const emailKey = `resend_email_${email.toLowerCase()}`
  const ipKey = `resend_ip_${clientIP}`
  
  const emailRecord = rateLimitStore.get(emailKey)
  const ipRecord = rateLimitStore.get(ipKey)

  if (emailRecord && now > emailRecord.resetTime) {
    rateLimitStore.delete(emailKey)
  }
  if (ipRecord && now > ipRecord.resetTime) {
    rateLimitStore.delete(ipKey)
  }

  const currentEmailRecord = rateLimitStore.get(emailKey)
  const currentIPRecord = rateLimitStore.get(ipKey)

  if (currentEmailRecord && (now - currentEmailRecord.lastRequest) < RATE_LIMIT.COOLDOWN_MS) {
    const retryAfter = Math.ceil((RATE_LIMIT.COOLDOWN_MS - (now - currentEmailRecord.lastRequest)) / 1000)
    return { allowed: false, retryAfter }
  }

  if (currentIPRecord && currentIPRecord.count >= RATE_LIMIT.MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((currentIPRecord.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  if (currentEmailRecord && currentEmailRecord.count >= RATE_LIMIT.MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((currentEmailRecord.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  const emailCount = currentEmailRecord ? currentEmailRecord.count + 1 : 1
  const ipCount = currentIPRecord ? currentIPRecord.count + 1 : 1

  rateLimitStore.set(emailKey, {
    count: emailCount,
    resetTime: currentEmailRecord?.resetTime || (now + RATE_LIMIT.WINDOW_MS),
    lastRequest: now
  })

  rateLimitStore.set(ipKey, {
    count: ipCount,
    resetTime: currentIPRecord?.resetTime || (now + RATE_LIMIT.WINDOW_MS),
    lastRequest: now
  })

  return { allowed: true }
}

export const POST = publicApiWrapper(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        'Email address is required',
        { severity: ErrorSeverity.LOW, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        'Please enter a valid email address',
        { severity: ErrorSeverity.LOW, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const normalizedEmail = email.trim().toLowerCase()
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || '127.0.0.1'

    const rateCheck = checkRateLimit(normalizedEmail, clientIP)
    if (!rateCheck.allowed) {
      const rateLimitError = await ErrorHandlingService.createError(
        ErrorType.RATE_LIMITING,
        'Too many requests. Please try again later.',
        { 
          severity: ErrorSeverity.LOW, 
          statusCode: 429,
          metadata: { retryAfter: rateCheck.retryAfter }
        }
      )
      return formatError(rateLimitError)
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const resendResult = await SecureServiceRoleWrapper.executeWithUserSession(
      supabase,
      {
        userId: 'anonymous',
        operation: 'resend_verification_email',
        reason: 'User requesting email verification resend',
        source: 'auth/resend-verification',
        metadata: { email: normalizedEmail },
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      { table: 'auth.users', operationType: 'update' },
      async (userSupabase) => {
        const { error: resendError } = await userSupabase.auth.resend({
          type: 'signup',
          email: normalizedEmail,
          options: { emailRedirectTo: `${request.nextUrl.origin}/auth/callback` }
        })
        return { error: resendError }
      }
    )

    const { error: resendError } = resendResult

    if (resendError) {
      if (resendError.message?.includes('rate limit') || resendError.message?.includes('too_many_requests')) {
        const rateLimitError = await ErrorHandlingService.createError(
          ErrorType.RATE_LIMITING,
          'Email sending rate limit exceeded. Please try again in a few minutes.',
          { 
            severity: ErrorSeverity.LOW, 
            statusCode: 429,
            metadata: { retryAfter: 300 }
          }
        )
        return formatError(rateLimitError)
      }
      logger.warn({ message: 'Resend verification error (hidden from user)', error: resendError.message })
    }

    return formatSuccess({
      message: 'If an account with this email exists and is unverified, a verification email has been sent.',
      canResendAfter: RATE_LIMIT.COOLDOWN_MS / 1000
    })

  } catch (error) {
    const systemError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      { severity: ErrorSeverity.HIGH, statusCode: 500 }
    )
    return formatError(systemError)
  }
})

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

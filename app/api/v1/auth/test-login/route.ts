import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabase } from '@/lib/database'
import { publicApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = publicApiWrapper(async (request: NextRequest) => {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        'Email and password are required',
        { severity: ErrorSeverity.LOW, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const authError = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        error.message,
        { severity: ErrorSeverity.MEDIUM, statusCode: 401 }
      )
      return formatError(authError)
    }

    if (!data.session) {
      const sessionError = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        'No session created',
        { severity: ErrorSeverity.MEDIUM, statusCode: 401 }
      )
      return formatError(sessionError)
    }

    return formatSuccess({
      user: {
        id: data.user?.id,
        email: data.user?.email
      }
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

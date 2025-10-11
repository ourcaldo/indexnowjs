import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { ErrorHandlingService, ErrorType, ErrorSeverity, CommonErrors, logger, isTransientError } from '../monitoring/error-handling'
import { SecureServiceRoleWrapper } from '../services/security/SecureServiceRoleWrapper'
import { formatSuccess, formatError } from './api-response-formatter'

// Re-export formatting functions for use in API routes
export { formatSuccess, formatError } from './api-response-formatter'
export type { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from './api-response-formatter'

export interface AuthenticatedRequest {
  user: {
    id: string
    email: string
  }
  userId: string
  supabase: any
}

/**
 * Enhanced authentication middleware with comprehensive error handling
 */
export async function authenticateRequest(
  request: NextRequest,
  endpoint?: string,
  method?: string
): Promise<{ success: true; data: AuthenticatedRequest } | { success: false; error: any }> {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      const error = await CommonErrors.UNAUTHORIZED()
      return { success: false, error }
    }

    const token = authHeader.substring(7)
    
    // Create user-authenticated Supabase client with Authorization header for cross-subdomain support
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // Cannot set cookies in middleware
          },
        },
      }
    )

    // Set the session with provided token for authentication
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: ''
    })
    
    // Get authenticated user directly (don't use SecureServiceRoleWrapper here - it validates userId match)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Handle errors from getUser() - distinguish between transient and auth failures
    if (authError) {
      // Check if this is a transient service/network error
      if (isTransientError(authError)) {
        logger.warn({
          endpoint,
          method,
          errorMessage: authError.message,
          errorCode: authError.code,
          errorStatus: authError.status
        }, 'Transient error during authentication - service/network issue detected')
        
        const structuredError = await CommonErrors.SERVICE_UNAVAILABLE(
          'Supabase Auth',
          authError.message
        )
        return { success: false, error: structuredError }
      }
      
      // Otherwise, treat as authentication failure
      logger.info({
        endpoint,
        method,
        errorMessage: authError.message,
        errorCode: authError.code
      }, 'Authentication failed - invalid or expired token')
      
      throw new Error('Invalid authentication token')
    }
    
    if (!user) {
      logger.info({
        endpoint,
        method
      }, 'Authentication failed - no user found')
      
      throw new Error('Invalid authentication token')
    }

    // Log successful authentication
    logger.debug({
      userId: user.id,
      email: user.email,
      endpoint,
      method
    }, 'User authenticated successfully')

    return { 
      success: true, 
      data: { 
        user: { id: user.id, email: user.email! },
        userId: user.id,
        supabase: supabase
      } 
    }
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.AUTHENTICATION,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        endpoint,
        method,
        statusCode: 401,
        userMessageKey: 'default'
      }
    )
    return { success: false, error: structuredError }
  }
}

/**
 * Validate request with Zod schema and comprehensive error handling
 */
export async function validateRequest<T = any>(
  request: NextRequest,
  schema: any,
  userId?: string,
  endpoint?: string
): Promise<{ success: true; data: T } | { success: false; error: any }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    
    if (!result.success) {
      const validationDetails = result.error.errors
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      
      const error = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        `Validation failed: ${validationDetails}`,
        {
          severity: ErrorSeverity.LOW,
          userId,
          endpoint,
          statusCode: 400,
          userMessageKey: 'invalid_format',
          metadata: { validationErrors: result.error.errors }
        }
      )
      return { success: false, error }
    }

    return { success: true, data: result.data }
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      error as Error,
      {
        severity: ErrorSeverity.MEDIUM,
        userId,
        endpoint,
        statusCode: 400,
        userMessageKey: 'invalid_format'
      }
    )
    return { success: false, error: structuredError }
  }
}

/**
 * Database operation wrapper with error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  userId?: string,
  endpoint?: string
): Promise<{ success: true; data: T } | { success: false; error: any }> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId,
        endpoint,
        statusCode: 500,
        userMessageKey: 'query_failed',
        metadata: { operation: operationName }
      }
    )
    return { success: false, error: structuredError }
  }
}

/**
 * External API call wrapper with error handling
 */
export async function withExternalAPIErrorHandling<T>(
  operation: () => Promise<T>,
  serviceName: string,
  userId?: string,
  endpoint?: string
): Promise<{ success: true; data: T } | { success: false; error: any }> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.EXTERNAL_API,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId,
        endpoint,
        statusCode: 503,
        userMessageKey: serviceName.toLowerCase().includes('google') ? 'google_api_error' : 'default',
        metadata: { service: serviceName }
      }
    )
    return { success: false, error: structuredError }
  }
}

/**
 * Create standardized API response helper
 */
export function createApiResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * Create error response from structured error
 */
export function createErrorResponse(error: any) {
  const responseData = ErrorHandlingService.createErrorResponse(error)
  return createApiResponse(responseData, error.statusCode || 500)
}

/**
 * API route wrapper that handles common patterns
 */
export function apiRouteWrapper(
  handler: (request: NextRequest, auth: AuthenticatedRequest, endpoint: string) => Promise<Response>
) {
  return async (request: NextRequest) => {
    const url = new URL(request.url)
    const endpoint = url.pathname
    const method = request.method

    try {
      // Authenticate the request
      const authResult = await authenticateRequest(request, endpoint, method)
      if (!authResult.success) {
        return createErrorResponse(authResult.error)
      }

      // Call the handler with authenticated context
      return await handler(request, authResult.data, endpoint)
    } catch (error) {
      // Catch any unhandled errors
      const structuredError = await ErrorHandlingService.createError(
        ErrorType.SYSTEM,
        error as Error,
        {
          severity: ErrorSeverity.CRITICAL,
          endpoint,
          method,
          statusCode: 500,
          userMessageKey: 'default'
        }
      )
      return createErrorResponse(structuredError)
    }
  }
}

/**
 * Public API route wrapper (no authentication required)
 */
export function publicApiRouteWrapper(
  handler: (request: NextRequest, endpoint: string) => Promise<Response>
) {
  return async (request: NextRequest) => {
    const url = new URL(request.url)
    const endpoint = url.pathname
    const method = request.method

    try {
      return await handler(request, endpoint)
    } catch (error) {
      const structuredError = await ErrorHandlingService.createError(
        ErrorType.SYSTEM,
        error as Error,
        {
          severity: ErrorSeverity.CRITICAL,
          endpoint,
          method,
          statusCode: 500,
          userMessageKey: 'default'
        }
      )
      return createErrorResponse(structuredError)
    }
  }
}
/**
 * Enhanced API Response Middleware for Phase 2 Standardization
 * 
 * This module provides middleware that enforces standardized response formats
 * across ALL API routes (admin, authenticated, public) with automatic error handling,
 * logging, and monitoring integration.
 * 
 * Usage:
 * - For admin routes: Use `adminApiWrapper`
 * - For authenticated routes: Use `authenticatedApiWrapper` 
 * - For public routes: Use `publicApiWrapper`
 * 
 * All wrappers guarantee standardized ApiResponse format with comprehensive error tracking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/auth'
import { ErrorHandlingService, ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'
import { formatSuccess, formatError, type ApiSuccessResponse, type ApiErrorResponse } from './api-response-formatter'
import { authenticateRequest, type AuthenticatedRequest } from './api-middleware'
import { AdminSecurityLogger } from '@/lib/services/security/AdminSecurityLogger'

// Re-export formatter functions for convenience
export { formatSuccess, formatError } from './api-response-formatter'
export type { ApiSuccessResponse, ApiErrorResponse } from './api-response-formatter'

/**
 * Admin API wrapper - Requires super admin authentication
 * Automatically standardizes all responses to ApiResponse format
 * Includes comprehensive error handling and security logging
 * 
 * @example
 * export const GET = adminApiWrapper(async (request, adminUser) => {
 *   const data = await fetchAdminData()
 *   return formatSuccess(data)
 * })
 */
export function adminApiWrapper<T = any>(
  handler: (request: NextRequest, adminUser: { id: string; email: string | undefined }) => Promise<ApiSuccessResponse<T> | ApiErrorResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const endpoint = new URL(request.url).pathname
    const method = request.method

    try {
      // Verify super admin authentication
      const adminUser = await requireSuperAdminAuth(request)
      
      if (!adminUser) {
        // Extract request metadata for security logging
        const { ipAddress, userAgent } = AdminSecurityLogger.extractRequestMetadata(request)
        
        // Log unauthorized admin access attempt
        await AdminSecurityLogger.logUnauthorizedAccess({
          eventType: 'unauthorized_access',
          endpoint,
          method,
          ipAddress,
          userAgent,
          reason: 'Attempted to access admin endpoint without super admin privileges',
          requiredRole: 'super_admin',
          severity: 'high'
        })
        
        // Create standardized 403 error response
        const error = await ErrorHandlingService.createError(
          ErrorType.AUTHENTICATION,
          'Super admin access required',
          {
            severity: ErrorSeverity.MEDIUM,
            endpoint,
            method,
            statusCode: 403,
            userMessageKey: 'default'
          }
        )
        
        const errorResponse = formatError(error)
        return NextResponse.json(errorResponse, { status: 403 })
      }

      // Log admin API access
      logger.info({
        userId: adminUser.id,
        endpoint,
        method,
        adminEmail: adminUser.email
      }, `Admin API access: ${method} ${endpoint}`)

      // Execute handler and get standardized response
      const response = await handler(request, adminUser)
      
      // Return with appropriate status code
      if (response.success) {
        // Use statusCode from response if provided, otherwise default to 200
        const statusCode = response.statusCode || 200
        return NextResponse.json(response, { status: statusCode })
      } else {
        // Use statusCode from error (now included in ApiErrorResponse)
        const statusCode = response.error.statusCode || 500
        return NextResponse.json(response, { status: statusCode })
      }


    } catch (error) {
      // Handle unexpected errors with standardized format
      const structuredError = await ErrorHandlingService.createError(
        ErrorType.SYSTEM,
        error as Error,
        {
          severity: ErrorSeverity.HIGH,
          endpoint,
          method,
          statusCode: 500,
          userMessageKey: 'default'
        }
      )
      
      const errorResponse = formatError(structuredError)
      return NextResponse.json(errorResponse, { status: 500 })
    }
  }
}

/**
 * Authenticated API wrapper - Requires user authentication
 * Automatically standardizes all responses to ApiResponse format
 * Includes comprehensive error handling and request logging
 * 
 * @example
 * export const GET = authenticatedApiWrapper(async (request, auth) => {
 *   const data = await fetchUserData(auth.userId)
 *   return formatSuccess(data)
 * })
 * 
 * @example Dynamic routes
 * export const GET = authenticatedApiWrapper(async (request, auth, { params }) => {
 *   const { id } = await params
 *   const data = await fetchData(id)
 *   return formatSuccess(data)
 * })
 */
export function authenticatedApiWrapper<T = any>(
  handler: (
    request: NextRequest, 
    auth: AuthenticatedRequest, 
    context?: { params: Promise<any> }
  ) => Promise<ApiSuccessResponse<T> | ApiErrorResponse>
) {
  return async (request: NextRequest, context?: { params: Promise<any> }): Promise<NextResponse> => {
    const endpoint = new URL(request.url).pathname
    const method = request.method

    try {
      // Authenticate user
      const authResult = await authenticateRequest(request, endpoint, method)
      
      if (!authResult.success) {
        // Return standardized error response
        const errorResponse = formatError(authResult.error)
        return NextResponse.json(errorResponse, { status: authResult.error.statusCode || 401 })
      }

      // Log authenticated API access
      logger.debug({
        userId: authResult.data.userId,
        endpoint,
        method,
        userEmail: authResult.data.user.email
      }, `Authenticated API access: ${method} ${endpoint}`)

      // Execute handler and get standardized response (pass context for dynamic routes)
      const response = await handler(request, authResult.data, context)
      
      // Return with appropriate status code
      if (response.success) {
        const statusCode = response.statusCode || 200
        return NextResponse.json(response, { status: statusCode })
      } else {
        const statusCode = response.error.statusCode || 500
        return NextResponse.json(response, { status: statusCode })
      }

    } catch (error) {
      // Handle unexpected errors with standardized format
      const structuredError = await ErrorHandlingService.createError(
        ErrorType.SYSTEM,
        error as Error,
        {
          severity: ErrorSeverity.HIGH,
          endpoint,
          method,
          statusCode: 500,
          userMessageKey: 'default'
        }
      )
      
      const errorResponse = formatError(structuredError)
      return NextResponse.json(errorResponse, { status: 500 })
    }
  }
}

/**
 * Public API wrapper - No authentication required
 * Automatically standardizes all responses to ApiResponse format
 * Includes comprehensive error handling and request logging
 * Supports dynamic routes with context parameter
 * 
 * @example
 * export const GET = publicApiWrapper(async (request) => {
 *   const data = await fetchPublicData()
 *   return formatSuccess(data)
 * })
 * 
 * @example Dynamic routes
 * export const GET = publicApiWrapper(async (request, context) => {
 *   const { id } = await context.params
 *   const data = await fetchData(id)
 *   return formatSuccess(data)
 * })
 */
export function publicApiWrapper<T = any>(
  handler: (request: NextRequest, context?: { params: Promise<any> }) => Promise<ApiSuccessResponse<T> | ApiErrorResponse>
) {
  return async (request: NextRequest, context?: { params: Promise<any> }): Promise<NextResponse> => {
    const endpoint = new URL(request.url).pathname
    const method = request.method

    try {
      // Log public API access
      logger.debug({
        endpoint,
        method,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      }, `Public API access: ${method} ${endpoint}`)

      // Execute handler and get standardized response (pass context for dynamic routes)
      const response = await handler(request, context)
      
      // Return with appropriate status code
      if (response.success) {
        const statusCode = response.statusCode || 200
        return NextResponse.json(response, { status: statusCode })
      } else {
        const statusCode = response.error.statusCode || 500
        return NextResponse.json(response, { status: statusCode })
      }

    } catch (error) {
      // Handle unexpected errors with standardized format
      const structuredError = await ErrorHandlingService.createError(
        ErrorType.SYSTEM,
        error as Error,
        {
          severity: ErrorSeverity.MEDIUM,
          endpoint,
          method,
          statusCode: 500,
          userMessageKey: 'default'
        }
      )
      
      const errorResponse = formatError(structuredError)
      return NextResponse.json(errorResponse, { status: 500 })
    }
  }
}

/**
 * Helper: Create standardized success response with data
 * @param data - Response data
 * @param requestId - Optional request ID for tracking
 */
export function createSuccessResponse<T>(data: T, requestId?: string): ApiSuccessResponse<T> {
  return formatSuccess(data, requestId)
}

/**
 * Helper: Create standardized error response
 * @param type - Error type
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @param severity - Error severity
 * @param metadata - Additional error metadata
 */
export async function createStandardError(
  type: ErrorType,
  message: string | Error,
  statusCode: number = 500,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  metadata?: Record<string, any>
): Promise<ApiErrorResponse> {
  const error = await ErrorHandlingService.createError(
    type,
    message,
    {
      severity,
      statusCode,
      metadata,
      userMessageKey: 'default'
    }
  )
  
  return formatError(error)
}

/**
 * Helper: Wrap database operations with error handling
 * Returns standardized success or error response
 */
export async function withDatabaseOperation<T>(
  operation: () => Promise<T>,
  errorContext?: { userId?: string; endpoint?: string }
): Promise<ApiSuccessResponse<T> | ApiErrorResponse> {
  try {
    const data = await operation()
    return formatSuccess(data)
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: errorContext?.userId,
        endpoint: errorContext?.endpoint,
        statusCode: 500,
        userMessageKey: 'query_failed'
      }
    )
    return formatError(structuredError)
  }
}

/**
 * Helper: Wrap external API calls with error handling
 * Returns standardized success or error response
 */
export async function withExternalAPI<T>(
  operation: () => Promise<T>,
  serviceName: string,
  errorContext?: { userId?: string; endpoint?: string }
): Promise<ApiSuccessResponse<T> | ApiErrorResponse> {
  try {
    const data = await operation()
    return formatSuccess(data)
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.EXTERNAL_API,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: errorContext?.userId,
        endpoint: errorContext?.endpoint,
        statusCode: 503,
        metadata: { service: serviceName },
        userMessageKey: 'default'
      }
    )
    return formatError(structuredError)
  }
}

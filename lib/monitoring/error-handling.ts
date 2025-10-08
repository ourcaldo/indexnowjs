import pino from 'pino'
import { v4 as uuidv4 } from 'uuid'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleHelpers } from '@/lib/services/security/SecureServiceRoleWrapper'
import { trackServerError } from '@/lib/analytics/sentry-server'
import { formatError } from '../core/api-response-formatter'
import { SocketIOBroadcaster } from '@/lib/core/socketio-broadcaster'

// Configure Pino logger to avoid worker threads completely
export const logger = pino({
  level: 'debug', // Always use debug level
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Completely disable pino-pretty transport to avoid worker thread issues
  // Use basic console output instead of pino-pretty which creates workers
})

// Error types for structured logging
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION', 
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  EXTERNAL_API = 'EXTERNAL_API',
  ENCRYPTION = 'ENCRYPTION',
  RATE_LIMITING = 'RATE_LIMITING',
  SYSTEM = 'SYSTEM',
  NETWORK = 'NETWORK',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Structured error interface
export interface StructuredError {
  id: string
  type: ErrorType
  severity: ErrorSeverity
  message: string
  userMessage: string
  userId?: string
  endpoint?: string
  method?: string
  statusCode: number
  metadata?: Record<string, any>
  stack?: string
  timestamp: Date
}

// User-friendly error messages mapping
const USER_ERROR_MESSAGES: Record<ErrorType, Record<string, string>> = {
  [ErrorType.AUTHENTICATION]: {
    default: 'Authentication failed. Please log in again.',
    invalid_credentials: 'Invalid email or password.',
    token_expired: 'Your session has expired. Please log in again.',
    missing_token: 'Please log in to access this feature.'
  },
  [ErrorType.AUTHORIZATION]: {
    default: 'You do not have permission to perform this action.',
    insufficient_permissions: 'Insufficient permissions for this operation.',
    resource_not_found: 'The requested resource was not found.'
  },
  [ErrorType.VALIDATION]: {
    default: 'Please check your input and try again.',
    invalid_format: 'The provided data format is invalid.',
    missing_required: 'Required fields are missing.',
    invalid_email: 'Please provide a valid email address.'
  },
  [ErrorType.DATABASE]: {
    default: 'A database error occurred. Please try again.',
    connection_failed: 'Database connection failed. Please try again later.',
    query_failed: 'Failed to process your request. Please try again.'
  },
  [ErrorType.EXTERNAL_API]: {
    default: 'External service temporarily unavailable. Please try again.',
    google_api_error: 'Google API service is temporarily unavailable.',
    quota_exceeded: 'API quota has been exceeded. Please try again later.',
    rate_limited: 'Too many requests. Please wait before trying again.'
  },
  [ErrorType.ENCRYPTION]: {
    default: 'Security processing error. Please try again.',
    decryption_failed: 'Failed to decrypt service account credentials.',
    encryption_failed: 'Failed to encrypt sensitive data.'
  },
  [ErrorType.RATE_LIMITING]: {
    default: 'Too many requests. Please wait before trying again.',
    quota_exceeded: 'Rate limit exceeded. Please try again later.'
  },
  [ErrorType.SYSTEM]: {
    default: 'System error occurred. Please try again.',
    service_unavailable: 'Service temporarily unavailable.',
    maintenance: 'System is under maintenance. Please try again later.'
  },
  [ErrorType.NETWORK]: {
    default: 'Network error occurred. Please check your connection.',
    timeout: 'Request timed out. Please try again.',
    connection_failed: 'Connection failed. Please check your network.'
  },
  [ErrorType.BUSINESS_LOGIC]: {
    default: 'Unable to process your request.',
    invalid_operation: 'This operation is not allowed.',
    resource_conflict: 'A conflict occurred with existing data.'
  }
}

// Service Account specific error messages
const SERVICE_ACCOUNT_ERRORS = {
  upload_failed: 'Failed to upload service account. Please check the file format.',
  invalid_credentials: 'Invalid service account credentials. Please upload a valid Google service account JSON file.',
  encryption_failed: 'Failed to securely store service account credentials.',
  not_found: 'Service account not found.',
  delete_failed: 'Failed to delete service account.',
  quota_exceeded: 'Service account quota has been exceeded.'
}

// Job management specific error messages
const JOB_ERRORS = {
  create_failed: 'Failed to create indexing job. Please try again.',
  not_found: 'Indexing job not found.',
  update_failed: 'Failed to update job status.',
  delete_failed: 'Failed to delete indexing job.',
  processing_failed: 'Job processing failed. Please check the job logs.',
  invalid_schedule: 'Invalid schedule configuration.',
  sitemap_parse_failed: 'Failed to parse sitemap. Please check the URL.',
  no_urls_found: 'No valid URLs found in the provided source.'
}

/**
 * Enhanced error handling service
 */
export class ErrorHandlingService {
  /**
   * Create a structured error with automatic logging and database recording
   */
  static async createError(
    type: ErrorType,
    error: Error | string,
    options: {
      severity?: ErrorSeverity
      userId?: string
      endpoint?: string
      method?: string
      statusCode?: number
      metadata?: Record<string, any>
      userMessageKey?: string
    } = {}
  ): Promise<StructuredError> {
    const errorId = uuidv4()
    const timestamp = new Date()
    
    const errorMessage = typeof error === 'string' ? error : error.message
    const stack = typeof error === 'string' ? undefined : error.stack
    
    // Get user-friendly message
    const userMessage = options.userMessageKey 
      ? USER_ERROR_MESSAGES[type][options.userMessageKey] || USER_ERROR_MESSAGES[type].default
      : USER_ERROR_MESSAGES[type].default

    const structuredError: StructuredError = {
      id: errorId,
      type,
      severity: options.severity || ErrorSeverity.MEDIUM,
      message: errorMessage,
      userMessage,
      userId: options.userId,
      endpoint: options.endpoint,
      method: options.method,
      statusCode: options.statusCode || 500,
      metadata: options.metadata,
      stack,
      timestamp
    }

    // Log the error based on severity
    const logContext = {
      errorId,
      type,
      severity: structuredError.severity,
      userId: options.userId,
      endpoint: options.endpoint,
      method: options.method,
      statusCode: structuredError.statusCode,
      metadata: options.metadata
    }

    switch (structuredError.severity) {
      case ErrorSeverity.CRITICAL:
        logger.fatal(logContext, errorMessage)
        break
      case ErrorSeverity.HIGH:
        logger.error(logContext, errorMessage)
        break
      case ErrorSeverity.MEDIUM:
        logger.warn(logContext, errorMessage)
        break
      case ErrorSeverity.LOW:
        logger.info(logContext, errorMessage)
        break
    }

    // Record error in database (async, don't block response)
    this.recordErrorInDatabase(structuredError).catch(dbError => {
      logger.error({ errorId, dbError: dbError.message }, 'Failed to record error in database')
    })

    // Also send to Sentry for server-side error tracking
    if (typeof window === 'undefined') {
      try {
        trackServerError(error instanceof Error ? error : new Error(errorMessage), {
          errorId,
          errorType: type,
          severity: structuredError.severity,
          userId: options.userId,
          endpoint: options.endpoint,
          method: options.method,
          statusCode: structuredError.statusCode,
          metadata: options.metadata,
        })
      } catch (sentryError) {
        // Silent fail - analytics should never break the app
      }
    }

    // Broadcast critical errors to admin users via WebSocket
    if (structuredError.severity === ErrorSeverity.CRITICAL && typeof window === 'undefined') {
      try {
        const broadcaster = SocketIOBroadcaster.getInstance()
        broadcaster.broadcastCriticalError({
          id: errorId,
          severity: structuredError.severity,
          message: errorMessage,
          endpoint: options.endpoint,
          error_type: type,
          user_message: userMessage
        })
      } catch (wsError) {
        // Silent fail - WebSocket broadcast should never break the app
      }
    }

    return structuredError
  }

  /**
   * Record error in database for tracking and analytics using secure service role wrapper
   */
  private static async recordErrorInDatabase(error: StructuredError): Promise<void> {
    try {
      const operationContext = {
        userId: error.userId || 'system',
        operation: 'record_system_error_log',
        reason: 'Recording structured error in database for monitoring and analytics',
        source: 'lib/monitoring/error-handling',
        metadata: {
          errorId: error.id,
          errorType: error.type,
          severity: error.severity,
          endpoint: error.endpoint,
          statusCode: error.statusCode
        }
      }

      await SecureServiceRoleHelpers.secureInsert(
        operationContext,
        'indb_system_error_logs',
        {
          id: error.id,
          user_id: error.userId || null,
          error_type: error.type,
          severity: error.severity,
          message: error.message,
          user_message: error.userMessage,
          endpoint: error.endpoint || null,
          http_method: error.method || null,
          status_code: error.statusCode,
          metadata: error.metadata || null,
          stack_trace: error.stack || null,
          created_at: error.timestamp.toISOString()
        }
      )
    } catch (dbError) {
      // Don't throw here to avoid infinite loop
      logger.error({ 
        originalErrorId: error.id, 
        dbError: dbError instanceof Error ? dbError.message : 'Unknown database error' 
      }, 'Failed to record error in database')
    }
  }

  /**
   * Get service account specific error message
   */
  static getServiceAccountError(key: keyof typeof SERVICE_ACCOUNT_ERRORS): string {
    return SERVICE_ACCOUNT_ERRORS[key] || 'Service account operation failed.'
  }

  /**
   * Get job management specific error message
   */
  static getJobError(key: keyof typeof JOB_ERRORS): string {
    return JOB_ERRORS[key] || 'Job operation failed.'
  }

  /**
   * Create a standardized API error response
   * Uses the new standard format with success: false
   */
  static createErrorResponse(structuredError: StructuredError, requestId?: string) {
    return formatError(structuredError, requestId)
  }

  /**
   * Wrap async functions with error handling
   */
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    errorContext: {
      type: ErrorType
      severity?: ErrorSeverity
      userId?: string
      endpoint?: string
      method?: string
      userMessageKey?: string
    }
  ): Promise<{ success: true; data: T } | { success: false; error: StructuredError }> {
    try {
      const data = await fn()
      return { success: true, data }
    } catch (error) {
      const structuredError = await this.createError(
        errorContext.type,
        error as Error,
        errorContext
      )
      return { success: false, error: structuredError }
    }
  }
}

/**
 * HTTP status code utilities
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const

/**
 * Common error patterns for consistent responses
 */
export const CommonErrors = {
  UNAUTHORIZED: (userId?: string) => ErrorHandlingService.createError(
    ErrorType.AUTHENTICATION,
    'Authentication required',
    { 
      severity: ErrorSeverity.MEDIUM,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      userId,
      userMessageKey: 'missing_token'
    }
  ),
  
  INVALID_TOKEN: (userId?: string) => ErrorHandlingService.createError(
    ErrorType.AUTHENTICATION,
    'Invalid or expired authentication token',
    {
      severity: ErrorSeverity.MEDIUM,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      userId,
      userMessageKey: 'token_expired'
    }
  ),

  FORBIDDEN: (userId: string, resource?: string) => ErrorHandlingService.createError(
    ErrorType.AUTHORIZATION,
    `Access denied to resource: ${resource || 'unknown'}`,
    {
      severity: ErrorSeverity.HIGH,
      statusCode: HTTP_STATUS.FORBIDDEN,
      userId,
      userMessageKey: 'insufficient_permissions',
      metadata: { resource }
    }
  ),

  VALIDATION_ERROR: (details: string, userId?: string) => ErrorHandlingService.createError(
    ErrorType.VALIDATION,
    `Validation failed: ${details}`,
    {
      severity: ErrorSeverity.LOW,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      userId,
      userMessageKey: 'invalid_format',
      metadata: { validationDetails: details }
    }
  ),

  NOT_FOUND: (resource: string, userId?: string) => ErrorHandlingService.createError(
    ErrorType.AUTHORIZATION,
    `Resource not found: ${resource}`,
    {
      severity: ErrorSeverity.MEDIUM,
      statusCode: HTTP_STATUS.NOT_FOUND,
      userId,
      userMessageKey: 'resource_not_found',
      metadata: { resource }
    }
  ),

  DATABASE_ERROR: (operation: string, userId?: string) => ErrorHandlingService.createError(
    ErrorType.DATABASE,
    `Database operation failed: ${operation}`,
    {
      severity: ErrorSeverity.HIGH,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      userId,
      userMessageKey: 'query_failed',
      metadata: { operation }
    }
  ),

  EXTERNAL_API_ERROR: (service: string, details?: string, userId?: string) => ErrorHandlingService.createError(
    ErrorType.EXTERNAL_API,
    `External API error from ${service}: ${details || 'Unknown error'}`,
    {
      severity: ErrorSeverity.HIGH,
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      userId,
      userMessageKey: service.toLowerCase().includes('google') ? 'google_api_error' : 'default',
      metadata: { service, details }
    }
  )
}
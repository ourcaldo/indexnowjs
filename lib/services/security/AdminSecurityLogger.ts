/**
 * Admin Security Logger
 * 
 * Tracks and logs security-related events for admin operations:
 * - Unauthorized access attempts
 * - Failed authentication attempts
 * - Suspicious activity patterns
 * - Admin action auditing
 * 
 * Integrates with:
 * - ErrorHandlingService for structured logging
 * - Sentry for real-time alerts
 * - Database (indb_security_activity_logs) for audit trail
 */

import { logger, ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import { trackError } from '@/lib/analytics'

export interface SecurityEvent {
  /**
   * Type of security event
   */
  eventType: 'unauthorized_access' | 'failed_auth' | 'suspicious_activity' | 'admin_action'
  
  /**
   * User ID (if authenticated) or 'anonymous'
   */
  userId?: string
  
  /**
   * Email address (if available)
   */
  userEmail?: string
  
  /**
   * Attempted endpoint or resource
   */
  endpoint: string
  
  /**
   * HTTP method used
   */
  method: string
  
  /**
   * IP address of the request
   */
  ipAddress?: string
  
  /**
   * User agent string
   */
  userAgent?: string
  
  /**
   * Reason for the security event
   */
  reason: string
  
  /**
   * Current user role (if authenticated)
   */
  currentRole?: string
  
  /**
   * Required role for the endpoint
   */
  requiredRole?: string
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>
  
  /**
   * Severity level
   */
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export class AdminSecurityLogger {
  /**
   * Log unauthorized admin access attempt
   * 
   * Called when a user attempts to access admin endpoints without proper authorization.
   * Creates both structured log entry and sends alert to Sentry for high-severity events.
   */
  static async logUnauthorizedAccess(event: SecurityEvent): Promise<void> {
    const severity = event.severity || 'medium'
    
    // Structured logging
    logger.warn({
      eventType: event.eventType,
      userId: event.userId || 'anonymous',
      userEmail: event.userEmail || 'unknown',
      endpoint: event.endpoint,
      method: event.method,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      currentRole: event.currentRole || 'none',
      requiredRole: event.requiredRole || 'unknown',
      reason: event.reason,
      severity,
      timestamp: new Date().toISOString(),
      ...event.metadata
    }, `Security Alert: ${event.eventType} - ${event.reason}`)

    // Track high-severity events in Sentry
    if (severity === 'high' || severity === 'critical') {
      try {
        const error = new Error(`Security Event: ${event.reason}`)
        trackError(error, {
          eventType: event.eventType,
          userId: event.userId,
          endpoint: event.endpoint,
          severity,
          ...event.metadata
        })
      } catch (sentryError) {
        // Silently fail Sentry tracking - don't break the application
      }
    }

    // Create structured error for database logging
    // This ensures the event is persisted in indb_system_error_logs
    if (severity === 'high' || severity === 'critical') {
      try {
        await ErrorHandlingService.createError(
          ErrorType.AUTHORIZATION,
          event.reason,
          {
            severity: severity === 'critical' ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH,
            userId: event.userId,
            endpoint: event.endpoint,
            method: event.method,
            statusCode: 403,
            metadata: {
              eventType: event.eventType,
              ipAddress: event.ipAddress,
              userAgent: event.userAgent,
              currentRole: event.currentRole,
              requiredRole: event.requiredRole,
              ...event.metadata
            }
          }
        )
      } catch (dbError) {
        // Silently fail database logging - don't break the application
        logger.error({ error: dbError }, 'Failed to log security event to database')
      }
    }
  }

  /**
   * Log failed authentication attempt
   */
  static async logFailedAuth(event: Omit<SecurityEvent, 'eventType'>): Promise<void> {
    await this.logUnauthorizedAccess({
      ...event,
      eventType: 'failed_auth'
    })
  }

  /**
   * Log suspicious activity pattern
   */
  static async logSuspiciousActivity(event: Omit<SecurityEvent, 'eventType'>): Promise<void> {
    await this.logUnauthorizedAccess({
      ...event,
      eventType: 'suspicious_activity',
      severity: event.severity || 'high'
    })
  }

  /**
   * Log admin action for audit trail
   */
  static async logAdminAction(event: Omit<SecurityEvent, 'eventType'>): Promise<void> {
    // Admin actions are logged with lower severity by default
    await this.logUnauthorizedAccess({
      ...event,
      eventType: 'admin_action',
      severity: event.severity || 'low'
    })
  }

  /**
   * Extract request metadata for security logging
   */
  static extractRequestMetadata(request: Request): {
    ipAddress: string
    userAgent: string
  } {
    const headers = request.headers
    
    const ipAddress = 
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip') ||
      'unknown'
    
    const userAgent = headers.get('user-agent') || 'unknown'
    
    return { ipAddress, userAgent }
  }
}

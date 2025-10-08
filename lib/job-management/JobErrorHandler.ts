/**
 * Background Job Error Handler
 * 
 * Standardized error handling for background job processors and workers.
 * Replaces console.error() with structured logging and Sentry integration.
 * 
 * Usage:
 * - Wrap all job operations with JobErrorHandler.withJobErrorHandling()
 * - All errors are logged to database and Sentry
 * - User-friendly error messages are returned
 */

import { ErrorHandlingService, ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'
import { trackError } from '@/lib/analytics'

export interface JobContext {
  /**
   * Job ID
   */
  jobId: string
  
  /**
   * Job type (e.g., 'indexing', 'rank_tracking', 'keyword_enrichment')
   */
  jobType: string
  
  /**
   * Job name/description
   */
  jobName?: string
  
  /**
   * User ID associated with the job
   */
  userId?: string
  
  /**
   * Additional job metadata
   */
  metadata?: Record<string, any>
}

export class JobErrorHandler {
  /**
   * Wrap job operations with comprehensive error handling
   * 
   * Automatically:
   * - Catches and logs errors with structured logging
   * - Tracks errors in Sentry for monitoring
   * - Persists errors to database
   * - Returns standardized error messages
   * 
   * @example
   * const result = await JobErrorHandler.withJobErrorHandling(
   *   async () => {
   *     // Job processing logic
   *     return await processJob()
   *   },
   *   {
   *     jobId: 'job_123',
   *     jobType: 'indexing',
   *     userId: 'user_456'
   *   }
   * )
   */
  static async withJobErrorHandling<T>(
    operation: () => Promise<T>,
    context: JobContext
  ): Promise<{ success: true; data: T } | { success: false; error: string; errorId: string }> {
    try {
      const data = await operation()
      
      // Log successful job completion
      logger.info({
        jobId: context.jobId,
        jobType: context.jobType,
        jobName: context.jobName,
        userId: context.userId,
        ...context.metadata
      }, `Job completed successfully: ${context.jobType} (${context.jobId})`)
      
      return { success: true, data }
      
    } catch (error) {
      // Structured error logging
      const structuredError = await ErrorHandlingService.createError(
        ErrorType.SYSTEM,
        error as Error,
        {
          severity: ErrorSeverity.HIGH,
          userId: context.userId,
          endpoint: `background-job-${context.jobType}`,
          method: 'processJob',
          statusCode: 500,
          metadata: {
            jobId: context.jobId,
            jobType: context.jobType,
            jobName: context.jobName,
            ...context.metadata
          }
        }
      )
      
      // Track in Sentry for real-time alerting
      try {
        trackError(error as Error, {
          jobId: context.jobId,
          jobType: context.jobType,
          jobName: context.jobName,
          userId: context.userId,
          ...context.metadata
        })
      } catch (sentryError) {
        // Silently fail Sentry tracking
      }
      
      // Enhanced structured logging
      logger.error({
        errorId: structuredError.id,
        errorType: structuredError.type,
        errorMessage: structuredError.message,
        errorSeverity: structuredError.severity,
        jobId: context.jobId,
        jobType: context.jobType,
        jobName: context.jobName,
        userId: context.userId,
        ...context.metadata
      }, `Job failed: ${context.jobType} (${context.jobId})`)
      
      return {
        success: false,
        error: structuredError.userMessage,
        errorId: structuredError.id
      }
    }
  }

  /**
   * Log job status change with structured logging
   */
  static logJobStatusChange(
    context: JobContext,
    oldStatus: string,
    newStatus: string
  ): void {
    logger.info({
      jobId: context.jobId,
      jobType: context.jobType,
      jobName: context.jobName,
      userId: context.userId,
      oldStatus,
      newStatus,
      ...context.metadata
    }, `Job status changed: ${oldStatus} → ${newStatus}`)
  }

  /**
   * Log job progress update with structured logging
   */
  static logJobProgress(
    context: JobContext,
    progress: {
      processed: number
      total: number
      percentage?: number
    }
  ): void {
    const percentage = progress.percentage || (progress.processed / progress.total * 100)
    
    logger.debug({
      jobId: context.jobId,
      jobType: context.jobType,
      jobName: context.jobName,
      userId: context.userId,
      processed: progress.processed,
      total: progress.total,
      percentage: Math.round(percentage),
      ...context.metadata
    }, `Job progress: ${progress.processed}/${progress.total} (${Math.round(percentage)}%)`)
  }

  /**
   * Log critical job failure (e.g., database corruption, data loss)
   */
  static async logCriticalJobFailure(
    context: JobContext,
    error: Error,
    reason: string
  ): Promise<void> {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error,
      {
        severity: ErrorSeverity.CRITICAL,
        userId: context.userId,
        endpoint: `background-job-${context.jobType}`,
        method: 'criticalFailure',
        statusCode: 500,
        metadata: {
          jobId: context.jobId,
          jobType: context.jobType,
          jobName: context.jobName,
          reason,
          ...context.metadata
        }
      }
    )
    
    // Always track critical failures in Sentry
    try {
      trackError(error, {
        severity: 'critical',
        jobId: context.jobId,
        jobType: context.jobType,
        reason,
        ...context.metadata
      })
    } catch (sentryError) {
      // Silently fail
    }
    
    logger.error({
      errorId: structuredError.id,
      errorType: structuredError.type,
      errorSeverity: 'CRITICAL',
      jobId: context.jobId,
      jobType: context.jobType,
      reason,
      ...context.metadata
    }, `CRITICAL JOB FAILURE: ${reason}`)
  }
}

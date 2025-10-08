import { supabaseAdmin } from '../database/supabase';
import { SecureServiceRoleWrapper } from '../services/security/SecureServiceRoleWrapper';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface JobLogEntry {
  job_id: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Job Logging Service
 * 
 * Handles detailed logging of job execution events to the indb_indexing_job_logs table
 * Provides comprehensive tracking of job processing steps, errors, and performance metrics
 */
export class JobLoggingService {
  private static instance: JobLoggingService;

  constructor() {}

  static getInstance(): JobLoggingService {
    if (!JobLoggingService.instance) {
      JobLoggingService.instance = new JobLoggingService();
    }
    return JobLoggingService.instance;
  }

  /**
   * Log a job event to the database
   */
  async logJobEvent(entry: JobLogEntry): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'insert_job_log_event',
          reason: 'Logging job execution event to indexing job logs for monitoring and debugging',
          source: 'job-management/job-logging-service',
          metadata: {
            job_id: entry.job_id,
            log_level: entry.level,
            log_message: entry.message,
            operation_type: 'job_logging'
          }
        },
        {
          table: 'indb_indexing_job_logs',
          operationType: 'insert',
          data: {
            job_id: entry.job_id,
            level: entry.level.toLowerCase(),
            message: entry.message,
            metadata: entry.metadata || null,
            created_at: new Date().toISOString()
          }
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_indexing_job_logs')
            .insert({
              job_id: entry.job_id,
              level: entry.level.toLowerCase(),
              message: entry.message,
              metadata: entry.metadata || null,
              created_at: new Date().toISOString()
            })

          if (error) {
            throw new Error(`Failed to log job event: ${error.message}`)
          }

          return { success: true }
        }
      )
    } catch (error) {
      // Silently handle logging errors to prevent infinite loops
    }
  }

  /**
   * Log job start event
   */
  async logJobStarted(jobId: string, jobName: string, totalUrls: number): Promise<void> {
    await this.logJobEvent({
      job_id: jobId,
      level: 'INFO',
      message: `Job started: ${jobName}`,
      metadata: {
        job_name: jobName,
        event_type: 'job_started',
        started_at: new Date().toISOString(),
        total_urls: totalUrls
      }
    });
  }

  /**
   * Log job completion event
   */
  async logJobCompleted(jobId: string, jobName: string, stats: { 
    total_urls: number; 
    successful_urls: number; 
    failed_urls: number;
    processing_time_ms?: number;
  }): Promise<void> {
    await this.logJobEvent({
      job_id: jobId,
      level: 'INFO',
      message: `Job completed: ${jobName}`,
      metadata: {
        job_name: jobName,
        event_type: 'job_completed',
        completed_at: new Date().toISOString(),
        ...stats
      }
    });
  }

  /**
   * Log job failure event
   */
  async logJobFailed(jobId: string, jobName: string, errorMessage: string, metadata?: Record<string, any>): Promise<void> {
    await this.logJobEvent({
      job_id: jobId,
      level: 'ERROR',
      message: `Job failed: ${jobName} - ${errorMessage}`,
      metadata: {
        job_name: jobName,
        event_type: 'job_failed',
        error_message: errorMessage,
        failed_at: new Date().toISOString(),
        ...metadata
      }
    });
  }

  /**
   * Log URL processing event
   */
  async logUrlProcessed(jobId: string, url: string, success: boolean, errorMessage?: string, responseTime?: number): Promise<void> {
    await this.logJobEvent({
      job_id: jobId,
      level: success ? 'INFO' : 'ERROR',
      message: success ? `Successfully indexed URL: ${url}` : `Failed to index URL: ${url}`,
      metadata: {
        event_type: 'url_processed',
        url: url,
        success: success,
        error_message: errorMessage,
        response_time_ms: responseTime,
        processed_at: new Date().toISOString()
      }
    });
  }

  /**
   * Log quota usage event
   */
  async logQuotaUsage(jobId: string, serviceAccountId: string, remainingQuota: number, apiResponse?: any): Promise<void> {
    await this.logJobEvent({
      job_id: jobId,
      level: 'DEBUG',
      message: `Quota usage updated - ${remainingQuota} requests remaining`,
      metadata: {
        event_type: 'quota_usage',
        service_account_id: serviceAccountId,
        remaining_quota: remainingQuota,
        api_response: apiResponse,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log service account usage
   */
  async logServiceAccountUsage(jobId: string, serviceAccountEmail: string, action: string): Promise<void> {
    await this.logJobEvent({
      job_id: jobId,
      level: 'DEBUG',
      message: `Service account ${action}: ${serviceAccountEmail}`,
      metadata: {
        event_type: 'service_account_usage',
        service_account_email: serviceAccountEmail,
        action: action,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log progress update
   */
  async logProgressUpdate(jobId: string, progress: number, processedUrls: number, totalUrls: number): Promise<void> {
    await this.logJobEvent({
      job_id: jobId,
      level: 'INFO',
      message: `Progress update: ${processedUrls}/${totalUrls} URLs processed (${progress.toFixed(1)}%)`,
      metadata: {
        event_type: 'progress_update',
        progress_percentage: progress,
        processed_urls: processedUrls,
        total_urls: totalUrls,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log Google API interaction
   */
  async logGoogleApiCall(jobId: string, url: string, statusCode: number, responseData?: any, errorMessage?: string): Promise<void> {
    await this.logJobEvent({
      job_id: jobId,
      level: statusCode >= 400 ? 'ERROR' : 'DEBUG',
      message: `Google API call for ${url}: ${statusCode}`,
      metadata: {
        event_type: 'google_api_call',
        url: url,
        status_code: statusCode,
        response_data: responseData,
        error_message: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log warning events
   */
  async logWarning(jobId: string, message: string, metadata?: Record<string, any>): Promise<void> {
    await this.logJobEvent({
      job_id: jobId,
      level: 'WARN',
      message: message,
      metadata: {
        event_type: 'warning',
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  }
}
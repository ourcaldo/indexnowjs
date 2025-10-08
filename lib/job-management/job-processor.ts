import { supabaseAdmin } from '../database/supabase';
import { GoogleAuthService } from '../google-services/google-auth-service';
import { SocketIOBroadcaster } from '../core/socketio-broadcaster';
import { SecureServiceRoleWrapper } from '../services/security/SecureServiceRoleWrapper';
import { JobErrorHandler } from './JobErrorHandler';
import { logger } from '@/lib/monitoring/error-handling';

interface Job {
  id: string;
  user_id: string;
  name: string;
  type: 'manual' | 'sitemap';
  status: string;
  source_data: any;
  total_urls: number;
  processed_urls: number;
  successful_urls: number;
  failed_urls: number;
  progress_percentage: number;
}

interface UrlSubmission {
  id: string;
  job_id: string;
  url: string;
  status: 'pending' | 'submitted' | 'indexed' | 'failed' | 'quota_exceeded';
  retry_count: number;
}

export class JobProcessor {
  private static instance: JobProcessor;
  private googleAuth: GoogleAuthService;
  private websocket: SocketIOBroadcaster;
  private processingJobs = new Set<string>();

  constructor() {
    this.googleAuth = GoogleAuthService.getInstance();
    this.websocket = SocketIOBroadcaster.getInstance();
  }

  static getInstance(): JobProcessor {
    if (!JobProcessor.instance) {
      JobProcessor.instance = new JobProcessor();
    }
    return JobProcessor.instance;
  }

  async processJob(jobId: string): Promise<void> {
    if (this.processingJobs.has(jobId)) {
      return;
    }

    try {
      await JobErrorHandler.withJobErrorHandling(
        async () => {
          const lockResult = await this.lockJob(jobId);
          if (!lockResult) {
            throw new Error(`Failed to lock job ${jobId}`);
          }

          this.processingJobs.add(jobId);
          
          const job = await this.getJobDetails(jobId);
          if (!job) {
            throw new Error(`Job ${jobId} not found`);
          }

          await this.updateJobStatus(jobId, 'running', { started_at: new Date().toISOString() });
          this.websocket.broadcastJobUpdate(job.user_id, jobId, {
            status: 'running',
            progress: this.getJobProgress(job)
          });

          await this.processJobUrls(job);

          await this.updateJobStatus(jobId, 'completed', { 
            completed_at: new Date().toISOString(),
            locked_at: null,
            locked_by: null
          });

          this.websocket.broadcastJobUpdate(job.user_id, jobId, {
            status: 'completed',
            progress: this.getJobProgress({ ...job, status: 'completed' })
          });

          return { jobId, status: 'completed' };
        },
        {
          jobId,
          jobType: 'indexing_job_processing',
          jobName: 'Indexing Job Processor',
          metadata: { operation: 'process_job' }
        }
      );
    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', { 
        error_message: error instanceof Error ? error.message : 'Unknown error',
        locked_at: null,
        locked_by: null
      });

      const job = await this.getJobDetails(jobId);
      if (job) {
        this.websocket.broadcastJobUpdate(job.user_id, jobId, {
          status: 'failed',
          progress: this.getJobProgress(job),
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  private async lockJob(jobId: string): Promise<boolean> {
    try {
      const lockTime = new Date().toISOString();
      const lockId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'lock_indexing_job_for_processing',
          reason: 'Locking indexing job to prevent concurrent processing by multiple workers',
          source: 'job-management/job-processor',
          metadata: {
            job_id: jobId,
            lock_id: lockId,
            lock_time: lockTime,
            operation_type: 'job_locking'
          }
        },
        {
          table: 'indb_indexing_jobs',
          operationType: 'update',
          whereConditions: { id: jobId },
          data: {
            locked_at: lockTime,
            locked_by: lockId,
            status: 'running'
          }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .update({
              locked_at: lockTime,
              locked_by: lockId,
              status: 'running'
            })
            .eq('id', jobId)
            .or('locked_at.is.null,status.neq.running')
            .select()

          if (error) {
            throw new Error(`Failed to lock job: ${error.message}`)
          }

          return data || []
        }
      )

      return data && data.length > 0;
    } catch (error) {
      logger.error({ error, jobId }, 'Error locking job');
      return false;
    }
  }

  private async getJobDetails(jobId: string): Promise<Job | null> {
    try {
      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_indexing_job_details',
          reason: 'Retrieving indexing job details for processing',
          source: 'job-management/job-processor',
          metadata: {
            job_id: jobId,
            operation_type: 'job_lookup'
          }
        },
        {
          table: 'indb_indexing_jobs',
          operationType: 'select',
          columns: ['*'],
          whereConditions: { id: jobId }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .select('*')
            .eq('id', jobId)
            .single()

          if (error) {
            throw new Error(`Failed to get job details: ${error.message}`)
          }

          return data
        }
      )

      return data;
    } catch (error) {
      logger.error({ error, jobId }, 'Error getting job details');
      return null;
    }
  }

  private async updateJobStatus(jobId: string, status: string, extraFields: Record<string, any> = {}): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'update_indexing_job_status',
          reason: 'Updating indexing job status during processing workflow',
          source: 'job-management/job-processor',
          metadata: {
            job_id: jobId,
            new_status: status,
            extra_fields: extraFields,
            operation_type: 'job_status_update'
          }
        },
        {
          table: 'indb_indexing_jobs',
          operationType: 'update',
          whereConditions: { id: jobId },
          data: {
            status,
            updated_at: new Date().toISOString(),
            ...extraFields
          }
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .update({
              status,
              updated_at: new Date().toISOString(),
              ...extraFields
            })
            .eq('id', jobId)

          if (error) {
            throw new Error(`Failed to update job status: ${error.message}`)
          }

          return { success: true }
        }
      )
    } catch (error) {
      logger.error({ error, jobId, status }, 'Error updating job status');
    }
  }

  private async processJobUrls(job: Job): Promise<void> {
    // Get all pending URL submissions for this job
    const submissions = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'get_pending_url_submissions_for_job',
        reason: 'Retrieving pending URL submissions for indexing job processing',
        source: 'job-management/job-processor',
        metadata: {
          job_id: job.id,
          operation_type: 'url_submissions_lookup'
        }
      },
      {
        table: 'indb_indexing_url_submissions',
        operationType: 'select',
        columns: ['*'],
        whereConditions: { job_id: job.id, status: 'pending' }
      },
      async () => {
        const { data: submissions, error } = await supabaseAdmin
          .from('indb_indexing_url_submissions')
          .select('*')
          .eq('job_id', job.id)
          .eq('status', 'pending')
          .order('created_at')

        if (error) {
          throw new Error(`Failed to get URL submissions: ${error.message}`)
        }

        return submissions || []
      }
    )

    if (!submissions?.length) {
      logger.info({ jobId: job.id }, 'No pending submissions found for job');
      return;
    }

    // Get service account
    const serviceAccount = await this.googleAuth.getAvailableServiceAccount(job.user_id);
    if (!serviceAccount) {
      throw new Error('No available service account found');
    }

    // Process URLs in batches
    const batchSize = 10;
    for (let i = 0; i < submissions.length; i += batchSize) {
      const batch = submissions.slice(i, i + batchSize);
      await this.processBatch(job, batch, serviceAccount.id);
      
      // Update progress and broadcast to frontend
      const updatedJob = await this.getJobDetails(job.id);
      if (updatedJob) {
        this.websocket.broadcastJobUpdate(job.user_id, job.id, {
          status: 'running',
          progress: this.getJobProgress(updatedJob),
          current_url: batch[batch.length - 1]?.url
        });
      }
    }
  }

  private async processBatch(job: Job, submissions: UrlSubmission[], serviceAccountId: string): Promise<void> {
    const accessToken = await this.googleAuth.getAccessToken(serviceAccountId);
    if (!accessToken) {
      throw new Error('Failed to get access token');
    }

    for (const submission of submissions) {
      try {
        await this.submitUrlToGoogle(submission.url, accessToken);
        
        // Update submission status
        await SecureServiceRoleWrapper.executeSecureOperation(
          {
            userId: 'system',
            operation: 'update_url_submission_status_submitted',
            reason: 'Updating URL submission status to submitted after successful Google API call',
            source: 'job-management/job-processor',
            metadata: {
              submission_id: submission.id,
              url: submission.url,
              service_account_id: serviceAccountId,
              operation_type: 'url_submission_success'
            }
          },
          {
            table: 'indb_indexing_url_submissions',
            operationType: 'update',
            whereConditions: { id: submission.id },
            data: {
              status: 'submitted',
              submitted_at: new Date().toISOString(),
              service_account_id: serviceAccountId
            }
          },
          async () => {
            const { error } = await supabaseAdmin
              .from('indb_indexing_url_submissions')
              .update({
                status: 'submitted',
                submitted_at: new Date().toISOString(),
                service_account_id: serviceAccountId
              })
              .eq('id', submission.id)

            if (error) {
              throw new Error(`Failed to update submission status: ${error.message}`)
            }

            return { success: true }
          }
        )

        // Update job progress
        await this.updateJobProgress(job.id, 'successful');

      } catch (error) {
        logger.error({ error, url: submission.url, submissionId: submission.id }, 'Error submitting URL');
        
        // Update submission as failed
        await SecureServiceRoleWrapper.executeSecureOperation(
          {
            userId: 'system',
            operation: 'update_url_submission_status_failed',
            reason: 'Updating URL submission status to failed after Google API error',
            source: 'job-management/job-processor',
            metadata: {
              submission_id: submission.id,
              url: submission.url,
              error_message: error instanceof Error ? error.message : 'Submission failed',
              retry_count: submission.retry_count + 1,
              operation_type: 'url_submission_failure'
            }
          },
          {
            table: 'indb_indexing_url_submissions',
            operationType: 'update',
            whereConditions: { id: submission.id },
            data: {
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Submission failed',
              retry_count: submission.retry_count + 1
            }
          },
          async () => {
            const { error: updateError } = await supabaseAdmin
              .from('indb_indexing_url_submissions')
              .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Submission failed',
                retry_count: submission.retry_count + 1
              })
              .eq('id', submission.id)

            if (updateError) {
              throw new Error(`Failed to update submission status: ${updateError.message}`)
            }

            return { success: true }
          }
        )

        // Update job progress
        await this.updateJobProgress(job.id, 'failed');
      }
    }
  }

  private async submitUrlToGoogle(url: string, accessToken: string): Promise<void> {
    const response = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        url: url,
        type: 'URL_UPDATED'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
  }

  private async updateJobProgress(jobId: string, result: 'successful' | 'failed'): Promise<void> {
    try {
      const field = result === 'successful' ? 'successful_urls' : 'failed_urls';
      
      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_job_progress_for_update',
          reason: 'Retrieving current job progress counters for updating after URL processing',
          source: 'job-management/job-processor',
          metadata: {
            job_id: jobId,
            result_type: result,
            operation_type: 'job_progress_lookup'
          }
        },
        {
          table: 'indb_indexing_jobs',
          operationType: 'select',
          columns: ['processed_urls', 'successful_urls', 'failed_urls', 'total_urls'],
          whereConditions: { id: jobId }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .select('processed_urls, successful_urls, failed_urls, total_urls')
            .eq('id', jobId)
            .single()

          if (error) {
            throw new Error(`Failed to get job progress: ${error.message}`)
          }

          return data
        }
      )

      if (data) {
        const newProcessed = data.processed_urls + 1;
        const newSuccessful = result === 'successful' ? data.successful_urls + 1 : data.successful_urls;
        const newFailed = result === 'failed' ? data.failed_urls + 1 : data.failed_urls;
        const progressPercentage = (newProcessed / data.total_urls) * 100;

        await SecureServiceRoleWrapper.executeSecureOperation(
          {
            userId: 'system',
            operation: 'update_job_progress_counters',
            reason: 'Updating job progress counters after URL processing result',
            source: 'job-management/job-processor',
            metadata: {
              job_id: jobId,
              processed_urls: newProcessed,
              successful_urls: newSuccessful,
              failed_urls: newFailed,
              progress_percentage: progressPercentage,
              result_type: result,
              operation_type: 'job_progress_update'
            }
          },
          {
            table: 'indb_indexing_jobs',
            operationType: 'update',
            whereConditions: { id: jobId },
            data: {
              processed_urls: newProcessed,
              successful_urls: newSuccessful,
              failed_urls: newFailed,
              progress_percentage: progressPercentage
            }
          },
          async () => {
            const { error } = await supabaseAdmin
              .from('indb_indexing_jobs')
              .update({
                processed_urls: newProcessed,
                successful_urls: newSuccessful,
                failed_urls: newFailed,
                progress_percentage: progressPercentage
              })
              .eq('id', jobId)

            if (error) {
              throw new Error(`Failed to update job progress: ${error.message}`)
            }

            return { success: true }
          }
        )
      }
    } catch (error) {
      logger.error({ error, jobId, result }, 'Error updating job progress');
    }
  }

  private getJobProgress(job: Job) {
    return {
      total_urls: job.total_urls,
      processed_urls: job.processed_urls,
      successful_urls: job.successful_urls,
      failed_urls: job.failed_urls,
      progress_percentage: job.progress_percentage
    };
  }
}
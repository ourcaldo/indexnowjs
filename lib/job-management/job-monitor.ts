import * as cron from 'node-cron';
import { supabaseAdmin } from '../database/supabase';
import { GoogleIndexingProcessor } from '../google-services/google-indexing-processor';
import { SecureServiceRoleWrapper } from '../services/security/SecureServiceRoleWrapper';
import { JobErrorHandler } from './JobErrorHandler';

/**
 * Job Monitor Service
 * 
 * This service runs as a background worker that:
 * 1. Monitors for pending jobs every minute
 * 2. Automatically triggers processing for pending jobs
 * 3. Handles scheduled jobs based on their next_run_at time
 * 4. Ensures only one instance processes jobs to prevent conflicts
 */
export class JobMonitor {
  private static instance: JobMonitor;
  private isRunning = false;
  private processor: GoogleIndexingProcessor;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.processor = GoogleIndexingProcessor.getInstance();
  }

  static getInstance(): JobMonitor {
    if (!JobMonitor.instance) {
      JobMonitor.instance = new JobMonitor();
    }
    return JobMonitor.instance;
  }

  /**
   * Start the job monitor
   * Runs every minute to check for pending jobs
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Run every minute to check for pending jobs
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkAndProcessJobs();
    }, {
      timezone: 'UTC'
    });
  }

  /**
   * Stop the job monitor
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }
  }

  /**
   * Check for pending jobs and process them
   */
  private async checkAndProcessJobs(): Promise<void> {
    const jobId = `job-monitor-${Date.now()}`;
    
    await JobErrorHandler.withJobErrorHandling(
      async () => {
        // Find pending jobs that are ready to run
        const pendingJobs = await SecureServiceRoleWrapper.executeSecureOperation(
          {
            userId: 'system',
            operation: 'fetch_pending_indexing_jobs_for_processing',
            reason: 'Fetching pending indexing jobs that are ready to run for automated job processing',
            source: 'job-management/job-monitor',
            metadata: {
              current_time: new Date().toISOString(),
              max_jobs: 5,
              operation_type: 'job_queue_processing'
            }
          },
          {
            table: 'indb_indexing_jobs',
            operationType: 'select',
            columns: ['id', 'name', 'user_id', 'next_run_at', 'schedule_type'],
            whereConditions: { 
              status: 'pending',
              locked_at: null
            }
          },
          async () => {
            const { data: pendingJobs, error } = await supabaseAdmin
              .from('indb_indexing_jobs')
              .select('id, name, user_id, next_run_at, schedule_type')
              .eq('status', 'pending')
              .is('locked_at', null)
              .or('next_run_at.is.null,next_run_at.lte.' + new Date().toISOString())
              .limit(5); // Process max 5 jobs per minute to prevent overload

            if (error) {
              throw new Error(`Failed to fetch pending jobs: ${error.message}`)
            }

            return pendingJobs || []
          }
        )

        if (!pendingJobs || pendingJobs.length === 0) {
          return { processed: 0 };
        }

        JobErrorHandler.logJobProgress(
          {
            jobId,
            jobType: 'job_monitoring',
            jobName: 'Job Monitor'
          },
          {
            processed: 0,
            total: pendingJobs.length
          }
        );

        // Process each job
        let processedCount = 0;
        for (const job of pendingJobs) {
          const result = await this.processor.processIndexingJob(job.id);
          
          if (result.success) {
            // Update next run time for recurring jobs
            if (job.schedule_type && job.schedule_type !== 'one-time') {
              await this.scheduleNextRun(job.id, job.schedule_type);
            }
          }

          processedCount++;
          JobErrorHandler.logJobProgress(
            {
              jobId,
              jobType: 'job_monitoring',
              jobName: 'Job Monitor'
            },
            {
              processed: processedCount,
              total: pendingJobs.length
            }
          );
        }

        return { processed: processedCount };
      },
      {
        jobId,
        jobType: 'job_monitoring',
        jobName: 'Job Monitor',
        metadata: { operation: 'check_and_process_jobs' }
      }
    );
  }

  /**
   * Schedule the next run for recurring jobs
   */
  private async scheduleNextRun(jobId: string, scheduleType: string): Promise<void> {
    const now = new Date();
    let nextRun: Date;

    switch (scheduleType) {
      case 'hourly':
        nextRun = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
        break;
      case 'daily':
        nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
        break;
      case 'weekly':
        nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +1 week
        break;
      case 'monthly':
        nextRun = new Date(now);
        nextRun.setMonth(nextRun.getMonth() + 1); // +1 month
        break;
      default:
        return; // one-time jobs don't get rescheduled
    }

    await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'schedule_next_recurring_job_run',
        reason: 'Scheduling next run time for recurring indexing job after completion',
        source: 'job-management/job-monitor',
        metadata: {
          job_id: jobId,
          schedule_type: scheduleType,
          next_run_at: nextRun.toISOString(),
          operation_type: 'job_scheduling'
        }
      },
      {
        table: 'indb_indexing_jobs',
        operationType: 'update',
        whereConditions: { id: jobId },
        data: {
          status: 'pending',
          next_run_at: nextRun.toISOString(),
          updated_at: new Date().toISOString()
        }
      },
      async () => {
        const { error } = await supabaseAdmin
          .from('indb_indexing_jobs')
          .update({
            status: 'pending',
            next_run_at: nextRun.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId)

        if (error) {
          throw new Error(`Failed to schedule next run for job: ${error.message}`)
        }

        return { success: true }
      }
    )
  }

  /**
   * Get monitor status
   */
  getStatus(): { isRunning: boolean; nextCheck?: string } {
    return {
      isRunning: this.isRunning,
      nextCheck: this.cronJob ? 'Every minute' : undefined
    };
  }

  /**
   * Manually trigger job processing (for testing)
   */
  async triggerNow(): Promise<void> {
    await this.checkAndProcessJobs();
  }
}

// Export singleton instance
export const jobMonitor = JobMonitor.getInstance();
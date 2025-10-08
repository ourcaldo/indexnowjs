/**
 * Indexing Job Service for IndexNow Studio
 * Business logic for managing indexing jobs and URL submissions
 */

import { GoogleApiService } from '../external/GoogleApiService';
import { SupabaseService } from '../external/SupabaseService';
import { EmailService } from '../external/EmailService';
import { JOB_STATUS, JOB_TYPES, SCHEDULE_TYPES, JobStatus, JobType, ScheduleType } from '@/lib/core/constants/AppConstants';
import { JobErrorHandler } from '@/lib/job-management/JobErrorHandler';

export interface IndexingJob {
  id: string;
  userId: string;
  name: string;
  type: JobType;
  status: JobStatus;
  scheduleType: ScheduleType;
  cronExpression?: string;
  sourceData: {
    urls?: string[];
    sitemapUrl?: string;
    content?: string;
  };
  totalUrls: number;
  processedUrls: number;
  successfulUrls: number;
  failedUrls: number;
  serviceAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface JobSubmission {
  id: string;
  jobId: string;
  url: string;
  type: 'URL_UPDATED' | 'URL_DELETED';
  status: 'pending' | 'processing' | 'success' | 'failed';
  responseData?: any;
  errorMessage?: string;
  submittedAt?: Date;
  processedAt?: Date;
}

export interface JobProgress {
  jobId: string;
  status: JobStatus;
  totalUrls: number;
  processedUrls: number;
  successfulUrls: number;
  failedUrls: number;
  progressPercentage: number;
  currentUrl?: string;
  estimatedCompletion?: Date;
}

export interface CreateJobRequest {
  name: string;
  type: JobType;
  scheduleType: ScheduleType;
  cronExpression?: string;
  sourceData: {
    urls?: string[];
    sitemapUrl?: string;
    content?: string;
  };
  serviceAccountId?: string;
}

export class IndexingJobService {
  private supabaseService: SupabaseService;
  private emailService: EmailService;

  constructor(
    supabaseService: SupabaseService,
    emailService: EmailService
  ) {
    this.supabaseService = supabaseService;
    this.emailService = emailService;
  }

  /**
   * Create a new indexing job
   */
  async createJob(userId: string, request: CreateJobRequest): Promise<IndexingJob> {
    const urls = await this.extractUrls(request.sourceData);
    
    const insertData = {
      user_id: userId,
      name: request.name,
      type: request.type,
      status: JOB_STATUS.PENDING,
      schedule_type: request.scheduleType,
      cron_expression: request.cronExpression,
      source_data: request.sourceData,
      total_urls: urls.length,
      processed_urls: 0,
      successful_urls: 0,
      failed_urls: 0,
      service_account_id: request.serviceAccountId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      scheduled_at: request.scheduleType === SCHEDULE_TYPES.ONE_TIME ? new Date().toISOString() : null,
    };

    const { data: jobData, error } = await this.supabaseService.insert('indb_indexing_jobs', insertData);
    
    if (error || !jobData) {
      throw new Error(`Failed to create job: ${error?.message}`);
    }

    // Create job submissions
    if (urls.length > 0) {
      await this.createJobSubmissions((jobData as any).id, urls);
    }

    return this.mapDatabaseJobToModel(jobData);
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string, userId?: string): Promise<IndexingJob | null> {
    const filters = userId ? { id: jobId, user_id: userId } : { id: jobId };
    const { data, error } = await this.supabaseService.query('indb_indexing_jobs', { filters });
    
    if (error || !data || data.length === 0) {
      return null;
    }

    return this.mapDatabaseJobToModel(data[0]);
  }

  /**
   * Get user jobs with pagination
   */
  async getUserJobs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: JobStatus;
      type?: JobType;
    } = {}
  ): Promise<{ jobs: IndexingJob[]; total: number }> {
    const { page = 1, limit = 10, status, type } = options;
    const offset = (page - 1) * limit;
    
    const filters: any = { user_id: userId };
    if (status) filters.status = status;
    if (type) filters.type = type;

    const { data, error, count } = await this.supabaseService.query('indb_indexing_jobs', {
      filters,
      orderBy: { column: 'created_at', ascending: false },
      limit,
      offset,
    });

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    const jobs = data?.map(job => this.mapDatabaseJobToModel(job)) || [];
    
    return {
      jobs,
      total: count || 0,
    };
  }

  /**
   * Process a job
   */
  async processJob(jobId: string, googleApiService: GoogleApiService): Promise<void> {
    await JobErrorHandler.withJobErrorHandling(
      async () => {
        await this.updateJobStatus(jobId, JOB_STATUS.PROCESSING, { started_at: new Date().toISOString() });

        const { data: submissions } = await this.supabaseService.query('indb_job_submissions', {
          filters: { job_id: jobId, status: 'pending' },
        });

        if (!submissions || submissions.length === 0) {
          await this.updateJobStatus(jobId, JOB_STATUS.COMPLETED, { completed_at: new Date().toISOString() });
          return { successCount: 0, failCount: 0 };
        }

        let successCount = 0;
        let failCount = 0;

        for (const submission of submissions) {
          try {
            await this.supabaseService.update('indb_job_submissions', 
              { status: 'processing' },
              { id: submission.id }
            );

            const response = await googleApiService.submitUrl({
              url: submission.url,
              type: submission.type,
            });

            await this.supabaseService.update('indb_job_submissions', {
              status: 'success',
              response_data: response,
              processed_at: new Date().toISOString(),
            }, { id: submission.id });

            successCount++;
          } catch (error) {
            await this.supabaseService.update('indb_job_submissions', {
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              processed_at: new Date().toISOString(),
            }, { id: submission.id });

            failCount++;
          }

          await this.updateJobProgress(jobId, successCount + failCount, successCount, failCount);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await this.updateJobStatus(jobId, JOB_STATUS.COMPLETED, {
          completed_at: new Date().toISOString(),
          successful_urls: successCount,
          failed_urls: failCount,
        });

        await this.sendJobCompletionNotification(jobId);
        return { successCount, failCount };
      },
      {
        jobId,
        jobType: 'indexing_job',
        jobName: 'Indexing Job Processing',
        metadata: { operation: 'process_job' }
      }
    );
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, userId?: string): Promise<void> {
    const filters = userId ? { id: jobId, user_id: userId } : { id: jobId };
    
    await this.supabaseService.update('indb_indexing_jobs', {
      status: JOB_STATUS.CANCELLED,
      updated_at: new Date().toISOString(),
    }, filters);

    // Cancel pending submissions
    await this.supabaseService.update('indb_job_submissions', {
      status: 'cancelled',
    }, { job_id: jobId, status: 'pending' });
  }

  /**
   * Get job progress
   */
  async getJobProgress(jobId: string): Promise<JobProgress | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;

    // Get current processing submission
    const { data: currentSubmission } = await this.supabaseService.query('indb_job_submissions', {
      filters: { job_id: jobId, status: 'processing' },
      limit: 1,
    });

    const progressPercentage = job.totalUrls > 0 
      ? Math.round((job.processedUrls / job.totalUrls) * 100)
      : 0;

    return {
      jobId: job.id,
      status: job.status,
      totalUrls: job.totalUrls,
      processedUrls: job.processedUrls,
      successfulUrls: job.successfulUrls,
      failedUrls: job.failedUrls,
      progressPercentage,
      currentUrl: currentSubmission?.[0]?.url,
      estimatedCompletion: this.calculateEstimatedCompletion(job),
    };
  }

  /**
   * Get job submissions
   */
  async getJobSubmissions(
    jobId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
    } = {}
  ): Promise<{ submissions: JobSubmission[]; total: number }> {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;
    
    const filters: any = { job_id: jobId };
    if (status) filters.status = status;

    const { data, error, count } = await this.supabaseService.query('indb_job_submissions', {
      filters,
      orderBy: { column: 'created_at', ascending: false },
      limit,
      offset,
    });

    if (error) {
      throw new Error(`Failed to fetch submissions: ${error.message}`);
    }

    const submissions = data?.map(sub => this.mapDatabaseSubmissionToModel(sub)) || [];
    
    return {
      submissions,
      total: count || 0,
    };
  }

  /**
   * Extract URLs from source data
   */
  private async extractUrls(sourceData: any): Promise<string[]> {
    if (sourceData.urls) {
      return sourceData.urls;
    }

    if (sourceData.sitemapUrl) {
      // Parse sitemap and extract URLs
      return await this.parseSitemap(sourceData.sitemapUrl);
    }

    if (sourceData.content) {
      // Parse content for URLs
      return sourceData.content
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && line.startsWith('http'));
    }

    return [];
  }

  /**
   * Parse sitemap to extract URLs
   */
  private async parseSitemap(sitemapUrl: string): Promise<string[]> {
    try {
      const response = await fetch(sitemapUrl);
      const xmlText = await response.text();
      
      // Simple XML parsing for sitemap URLs
      const urlMatches = xmlText.match(/<loc>(.*?)<\/loc>/g);
      if (!urlMatches) return [];

      return urlMatches.map(match => match.replace(/<\/?loc>/g, ''));
    } catch (error) {
      console.error('Failed to parse sitemap:', error);
      return [];
    }
  }

  /**
   * Create job submissions
   */
  private async createJobSubmissions(jobId: string, urls: string[]): Promise<void> {
    const submissions = urls.map(url => ({
      job_id: jobId,
      url,
      type: 'URL_UPDATED',
      status: 'pending',
      created_at: new Date().toISOString(),
    }));

    // Insert in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < submissions.length; i += batchSize) {
      const batch = submissions.slice(i, i + batchSize);
      await this.supabaseService.insert('indb_job_submissions', batch);
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: JobStatus, additionalData: any = {}): Promise<void> {
    await this.supabaseService.update('indb_indexing_jobs', {
      status,
      updated_at: new Date().toISOString(),
      ...additionalData,
    }, { id: jobId });
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    processedUrls: number,
    successfulUrls: number,
    failedUrls: number
  ): Promise<void> {
    await this.supabaseService.update('indb_indexing_jobs', {
      processed_urls: processedUrls,
      successful_urls: successfulUrls,
      failed_urls: failedUrls,
      updated_at: new Date().toISOString(),
    }, { id: jobId });
  }

  /**
   * Calculate estimated completion time
   */
  private calculateEstimatedCompletion(job: IndexingJob): Date | undefined {
    if (job.status !== JOB_STATUS.PROCESSING || !job.startedAt) return undefined;

    const elapsed = Date.now() - job.startedAt.getTime();
    const remainingUrls = job.totalUrls - job.processedUrls;
    
    if (job.processedUrls === 0) return undefined;

    const avgTimePerUrl = elapsed / job.processedUrls;
    const estimatedRemainingTime = remainingUrls * avgTimePerUrl;

    return new Date(Date.now() + estimatedRemainingTime);
  }

  /**
   * Send job completion notification
   */
  private async sendJobCompletionNotification(jobId: string): Promise<void> {
    try {
      const job = await this.getJob(jobId);
      if (!job) return;

      // Get user email from user profile
      const { data: userProfile } = await this.supabaseService.query('indb_user_profiles', {
        filters: { user_id: job.userId },
      });

      if (!userProfile?.[0]?.email || !userProfile[0].email_job_completion) return;

      const duration = job.completedAt && job.startedAt 
        ? Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000 / 60)
        : 0;

      await this.emailService.sendJobCompletionEmail(
        { email: userProfile[0].email },
        {
          jobName: job.name,
          totalUrls: job.totalUrls,
          successfulUrls: job.successfulUrls,
          failedUrls: job.failedUrls,
          duration: `${duration} minutes`,
        }
      );
    } catch (error) {
      console.error('Failed to send job completion notification:', error);
    }
  }

  /**
   * Send job failure notification
   */
  private async sendJobFailureNotification(jobId: string, errorMessage: string): Promise<void> {
    try {
      const job = await this.getJob(jobId);
      if (!job) return;

      // Get user email from user profile
      const { data: userProfile } = await this.supabaseService.query('indb_user_profiles', {
        filters: { user_id: job.userId },
      });

      if (!userProfile?.[0]?.email || !userProfile[0].email_job_failure) return;

      await this.emailService.sendJobFailureEmail(
        { email: userProfile[0].email },
        {
          jobName: job.name,
          errorMessage,
          failedAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('Failed to send job failure notification:', error);
    }
  }

  /**
   * Map database job to model
   */
  private mapDatabaseJobToModel(data: any): IndexingJob {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      type: data.type,
      status: data.status,
      scheduleType: data.schedule_type,
      cronExpression: data.cron_expression,
      sourceData: data.source_data,
      totalUrls: data.total_urls,
      processedUrls: data.processed_urls,
      successfulUrls: data.successful_urls,
      failedUrls: data.failed_urls,
      serviceAccountId: data.service_account_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : undefined,
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      errorMessage: data.error_message,
    };
  }

  /**
   * Map database submission to model
   */
  private mapDatabaseSubmissionToModel(data: any): JobSubmission {
    return {
      id: data.id,
      jobId: data.job_id,
      url: data.url,
      type: data.type,
      status: data.status,
      responseData: data.response_data,
      errorMessage: data.error_message,
      submittedAt: data.submitted_at ? new Date(data.submitted_at) : undefined,
      processedAt: data.processed_at ? new Date(data.processed_at) : undefined,
    };
  }
}

export default IndexingJobService;
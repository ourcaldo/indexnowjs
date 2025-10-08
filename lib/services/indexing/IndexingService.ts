import { GoogleApiClient } from './GoogleApiClient';
import { JobQueue } from './JobQueue';
import { RetryHandler } from './RetryHandler';
import { QuotaManager } from './QuotaManager';
import { SocketIOBroadcaster } from '../../core/socketio-broadcaster';
import { JobLoggingService } from '../../job-management/job-logging-service';

interface IndexingJob {
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
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Main Indexing Service - Orchestrates the entire indexing process
 * Coordinates between job queue, Google API client, and quota management
 */
export class IndexingService {
  private static instance: IndexingService;
  private googleApiClient: GoogleApiClient;
  private jobQueue: JobQueue;
  private retryHandler: RetryHandler;
  private quotaManager: QuotaManager;
  private socketBroadcaster: SocketIOBroadcaster;
  private jobLogger: JobLoggingService;
  private processingJobs = new Set<string>();

  constructor() {
    this.googleApiClient = GoogleApiClient.getInstance();
    this.jobQueue = JobQueue.getInstance();
    this.retryHandler = RetryHandler.getInstance();
    this.quotaManager = QuotaManager.getInstance();
    this.socketBroadcaster = SocketIOBroadcaster.getInstance();
    this.jobLogger = JobLoggingService.getInstance();
  }

  static getInstance(): IndexingService {
    if (!IndexingService.instance) {
      IndexingService.instance = new IndexingService();
    }
    return IndexingService.instance;
  }

  /**
   * Process a complete indexing job
   * Main entry point for job processing
   */
  async processIndexingJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    if (this.processingJobs.has(jobId)) {
      return { success: false, error: 'Job is already being processed' };
    }

    try {
      // Lock the job to prevent concurrent processing
      const lockResult = await this.jobQueue.lockJobForProcessing(jobId);
      if (!lockResult) {
        return { success: false, error: 'Failed to lock job - may already be processing' };
      }

      this.processingJobs.add(jobId);
      console.log(`🚀 Starting indexing job ${jobId}`);
      
      // Get job details
      const job = await this.jobQueue.getJobDetails(jobId);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      // Log job start
      await this.jobLogger.logJobStarted(jobId, job.name, job.total_urls || 0);

      // Update job status to running
      await this.jobQueue.updateJobStatus(jobId, 'running', { 
        started_at: new Date().toISOString(),
        processed_urls: 0,
        successful_urls: 0,
        failed_urls: 0,
        progress_percentage: 0
      });

      // Extract URLs from job source data
      const urls = await this.jobQueue.extractUrlsFromJobSource(job);
      if (urls.length === 0) {
        throw new Error('No URLs found to process in job source data');
      }

      console.log(`📋 Found ${urls.length} URLs to process`);

      // Log URL extraction
      await this.jobLogger.logJobEvent({
        job_id: jobId,
        level: 'INFO',
        message: `Found ${urls.length} URLs to process`,
        metadata: {
          event_type: 'urls_extracted',
          url_count: urls.length,
          job_type: job.type
        }
      });

      // Create URL submissions for tracking
      await this.jobQueue.createUrlSubmissionsForJob(jobId, urls);

      // Process all URLs through Google's Indexing API
      await this.googleApiClient.processUrlSubmissionsWithGoogleAPI(job);

      // Get final stats and check current job status
      const finalJob = await this.jobQueue.getJobDetails(jobId);
      const processingTimeMs = finalJob?.started_at ? new Date().getTime() - new Date(finalJob.started_at).getTime() : undefined;

      // Check if job was paused due to quota exhaustion during processing
      if (finalJob?.status === 'paused') {
        console.log(`⏸️ Job ${jobId} was paused due to quota exhaustion - not marking as completed`);
        
        // Log job pause event
        await this.jobLogger.logJobEvent({
          job_id: jobId,
          level: 'INFO',
          message: `Job paused due to service account quota exhaustion`,
          metadata: {
            event_type: 'job_paused_quota_exhausted',
            total_urls: finalJob?.total_urls || 0,
            processed_urls: finalJob?.processed_urls || 0,
            successful_urls: finalJob?.successful_urls || 0,
            failed_urls: finalJob?.failed_urls || 0,
            processing_time_ms: processingTimeMs
          }
        });

        return { success: true };
      }

      // Mark job as completed only if not paused
      await this.jobQueue.updateJobStatus(jobId, 'completed', { 
        completed_at: new Date().toISOString()
      });

      // Log job completion
      await this.jobLogger.logJobCompleted(jobId, job.name, {
        total_urls: finalJob?.total_urls || 0,
        successful_urls: finalJob?.successful_urls || 0,
        failed_urls: finalJob?.failed_urls || 0,
        processing_time_ms: processingTimeMs
      });

      // Send real-time completion update
      this.socketBroadcaster.broadcastJobUpdate(job.user_id, jobId, {
        status: 'completed',
        progress: {
          total_urls: finalJob?.total_urls || 0,
          processed_urls: finalJob?.processed_urls || 0,
          successful_urls: finalJob?.successful_urls || 0,
          failed_urls: finalJob?.failed_urls || 0,
          progress_percentage: 100
        }
      });

      console.log(`✅ Indexing job ${jobId} completed successfully`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Indexing job ${jobId} failed:`, error);
      
      // Get job details for logging
      const job = await this.jobQueue.getJobDetails(jobId);
      
      // Log job failure
      if (job) {
        await this.jobLogger.logJobFailed(jobId, job.name, error instanceof Error ? error.message : 'Unknown error', {
          error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
          stack_trace: error instanceof Error ? error.stack : undefined
        });
      }
      
      // Mark job as failed
      await this.jobQueue.updateJobStatus(jobId, 'failed', { 
        error_message: error instanceof Error ? error.message : 'Unknown error',
        locked_at: null,
        locked_by: null
      });

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      this.processingJobs.delete(jobId);
    }
  }
}
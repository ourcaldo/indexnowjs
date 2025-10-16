import { supabaseAdmin } from '../../database/supabase';
import { GoogleAuthService } from '../../google-services/google-auth-service';
import { JobLoggingService } from '../../job-management/job-logging-service';
import { QuotaManager } from './QuotaManager';
import { SecureServiceRoleWrapper } from '../security/SecureServiceRoleWrapper';

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

interface UrlSubmission {
  id: string;
  job_id: string;
  url: string;
  status: string;
  retry_count: number;
  service_account_id?: string;
  error_message?: string;
}

/**
 * Google API Client Service
 * Handles all communication with Google's Indexing API
 */
export class GoogleApiClient {
  private static instance: GoogleApiClient;
  private googleAuth: GoogleAuthService;
  private jobLogger: JobLoggingService;
  private quotaManager: QuotaManager;
  private rateLimitTracker: Map<string, number>;

  constructor() {
    this.googleAuth = GoogleAuthService.getInstance();
    this.jobLogger = JobLoggingService.getInstance();
    this.quotaManager = QuotaManager.getInstance();
    this.rateLimitTracker = new Map();
  }

  static getInstance(): GoogleApiClient {
    if (!GoogleApiClient.instance) {
      GoogleApiClient.instance = new GoogleApiClient();
    }
    return GoogleApiClient.instance;
  }

  /**
   * Process all URL submissions through Google's Indexing API
   */
  async processUrlSubmissionsWithGoogleAPI(job: IndexingJob): Promise<void> {
    try {
      console.log(`🔄 Processing URL submissions for job ${job.id}`);
      
      // Get active service accounts and pending submissions using SecureWrapper
      const { serviceAccounts, submissions } = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_service_accounts_and_submissions',
          reason: 'Google API client getting active service accounts and pending URL submissions for processing',
          source: 'GoogleApiClient.processUrlSubmissionsWithGoogleAPI',
          metadata: {
            jobId: job.id,
            userId: job.user_id,
            operation_type: 'job_processing_setup'
          }
        },
        { table: 'indb_google_service_accounts', operationType: 'select' },
        async () => {
          // Get active service accounts for load balancing
          const { data: serviceAccounts, error: saError } = await supabaseAdmin
            .from('indb_google_service_accounts')
            .select('*')
            .eq('user_id', job.user_id)
            .eq('is_active', true);

          if (saError || !serviceAccounts || serviceAccounts.length === 0) {
            throw new Error('No active Google service accounts found for user');
          }

          console.log(`📈 Using ${serviceAccounts.length} service accounts for load balancing`);

          // Get pending submissions for this job
          const { data: submissions, error: subError } = await supabaseAdmin
            .from('indb_indexing_url_submissions')
            .select('*')
            .eq('job_id', job.id)
            .eq('status', 'pending')
            .order('created_at');

          if (subError) {
            throw new Error(`Error fetching URL submissions: ${subError.message}`);
          }

          return { serviceAccounts, submissions };
        }
      );

      if (!submissions || submissions.length === 0) {
        console.log('⚠️ No pending submissions found for processing');
        return;
      }

      console.log(`🎯 Processing ${submissions.length} URL submissions`);

      let processed = 0;
      let successful = 0;
      let failed = 0;

      // Process each URL submission
      for (const submission of submissions) {
        try {
          // Check if job is still running (immediate pause/stop detection)
          const currentJob = await SecureServiceRoleWrapper.executeSecureOperation(
            {
              userId: 'system',
              operation: 'check_job_status_during_processing',
              reason: 'Google API client checking if job is still running during URL processing',
              source: 'GoogleApiClient.processUrlSubmissionsWithGoogleAPI',
              metadata: {
                jobId: job.id,
                processedCount: processed,
                currentUrl: submission.url,
                operation_type: 'job_status_check'
              }
            },
            { table: 'indb_indexing_jobs', operationType: 'select' },
            async () => {
              const { data: currentJob } = await supabaseAdmin
                .from('indb_indexing_jobs')
                .select('status')
                .eq('id', job.id)
                .single();

              return currentJob;
            }
          );

          if (currentJob?.status !== 'running') {
            console.log(`🛑 Job ${job.id} was ${currentJob?.status || 'stopped'} - stopping processing immediately`);
            await this.jobLogger.logJobEvent({
              job_id: job.id,
              level: 'INFO',
              message: `Job processing stopped - status changed to ${currentJob?.status || 'unknown'}`,
              metadata: {
                processed_count: processed,
                total_submissions: submissions.length,
                stopped_at_url: submission.url
              }
            });
            break; // Stop processing immediately
          }

          // Round-robin service account selection for load balancing
          const serviceAccount = serviceAccounts[processed % serviceAccounts.length];
          
          // Log service account usage
          await this.jobLogger.logServiceAccountUsage(job.id, serviceAccount.email, 'selected_for_url_processing');
          
          // Get access token for Google API
          const accessToken = await this.googleAuth.getAccessToken(serviceAccount.id);
          if (!accessToken) {
            console.log(`⚠️ Skipping service account ${serviceAccount.id} - no valid access token (likely missing credentials)`);
            await this.jobLogger.logWarning(job.id, `Skipping service account ${serviceAccount.email} - no valid access token`, {
              service_account_id: serviceAccount.id,
              service_account_email: serviceAccount.email
            });
            continue; // Skip this service account and try the next one
          }

          // Submit URL to Google's Indexing API
          const startTime = Date.now();
          await this.submitUrlToGoogleIndexingAPI(submission.url, accessToken, serviceAccount.id);
          const responseTime = Date.now() - startTime;
          
          // Update submission as successful using SecureWrapper
          const updatedSubmission = await SecureServiceRoleWrapper.executeSecureOperation(
            {
              userId: 'system',
              operation: 'update_submission_successful',
              reason: 'Google API client updating URL submission as successfully submitted to Google Indexing API',
              source: 'GoogleApiClient.processUrlSubmissionsWithGoogleAPI',
              metadata: {
                submissionId: submission.id,
                jobId: job.id,
                url: submission.url,
                serviceAccountId: serviceAccount.id,
                responseTime,
                operation_type: 'submission_success_update'
              }
            },
            { table: 'indb_indexing_url_submissions', operationType: 'update' },
            async () => {
              const { data: updatedSubmission } = await supabaseAdmin
                .from('indb_indexing_url_submissions')
                .update({
                  status: 'submitted',
                  submitted_at: new Date().toISOString(),
                  service_account_id: serviceAccount.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', submission.id)
                .select()
                .single();

              return updatedSubmission;
            }
          );

          successful++;
          console.log(`✅ Successfully submitted URL: ${submission.url}`);
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Failed to submit URL ${submission.url}:`, errorMessage);

          // Update submission as failed using SecureWrapper
          await SecureServiceRoleWrapper.executeSecureOperation(
            {
              userId: 'system',
              operation: 'update_submission_failed',
              reason: 'Google API client updating URL submission as failed due to API error',
              source: 'GoogleApiClient.processUrlSubmissionsWithGoogleAPI',
              metadata: {
                submissionId: submission.id,
                jobId: job.id,
                url: submission.url,
                error: errorMessage,
                operation_type: 'submission_failure_update'
              }
            },
            { table: 'indb_indexing_url_submissions', operationType: 'update' },
            async () => {
              await supabaseAdmin
                .from('indb_indexing_url_submissions')
                .update({
                  status: 'failed',
                  error_message: errorMessage,
                  updated_at: new Date().toISOString()
                })
                .eq('id', submission.id);
            }
          );

          await this.jobLogger.logJobEvent({
            job_id: job.id,
            level: 'ERROR',
            message: `Failed to submit URL: ${errorMessage}`,
            metadata: {
              url: submission.url,
              error: errorMessage
            }
          });
        } finally {
          processed++;
        }
      }

      console.log(`📊 URL processing completed: ${processed} processed, ${successful} successful, ${failed} failed`);
    } catch (error) {
      console.error('Error in processUrlSubmissionsWithGoogleAPI:', error);
      throw error;
    }
  }

  /**
   * Submit a URL to Google's Indexing API
   */
  private async submitUrlToGoogleIndexingAPI(url: string, accessToken: string, serviceAccountId: string): Promise<void> {
    // Apply rate limiting: 60 requests per minute = 1 request per second
    await this.applyRateLimit(serviceAccountId);
    
    const apiUrl = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
    
    const response = await fetch(apiUrl, {
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
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      
      // Check for quota exceeded error specifically
      if (errorMessage.includes('Quota exceeded') || errorMessage.includes('quota exceeded')) {
        console.log(`🚫 Service account ${serviceAccountId} quota exhausted, pausing all related jobs`);
        await this.quotaManager.handleServiceAccountQuotaExhausted(serviceAccountId);
      }
      
      throw new Error(`Google Indexing API error: ${errorMessage}`);
    }

    // Log successful response for debugging
    const responseData = await response.json();
    console.log(`🎯 Google API response for ${url}:`, responseData);
  }

  /**
   * Apply rate limiting to comply with Google's 60 requests/minute limit
   */
  private async applyRateLimit(serviceAccountId: string): Promise<void> {
    const now = Date.now();
    const key = `rate_limit_${serviceAccountId}`;
    
    // Get last request time from memory
    if (!this.rateLimitTracker) {
      this.rateLimitTracker = new Map();
    }
    
    const lastRequestTime = this.rateLimitTracker.get(key) || 0;
    const timeSinceLastRequest = now - lastRequestTime;
    
    // Ensure at least 1 second between requests (60 requests/minute)
    const minimumDelay = 1000; // 1 second
    
    if (timeSinceLastRequest < minimumDelay) {
      const delayNeeded = minimumDelay - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: waiting ${delayNeeded}ms before next request for service account ${serviceAccountId}`);
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
    
    // Update last request time
    this.rateLimitTracker.set(key, Date.now());
  }
}
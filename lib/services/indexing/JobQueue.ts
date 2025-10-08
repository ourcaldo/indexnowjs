import { supabaseAdmin } from '../../database/supabase';
import { SocketIOBroadcaster } from '../../core/socketio-broadcaster';
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

/**
 * Job Queue Management Service
 * Handles job locking, URL extraction, and submission tracking
 */
export class JobQueue {
  private static instance: JobQueue;
  private socketBroadcaster: SocketIOBroadcaster;

  constructor() {
    this.socketBroadcaster = SocketIOBroadcaster.getInstance();
  }

  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  /**
   * Lock job to prevent concurrent processing
   */
  async lockJobForProcessing(jobId: string): Promise<boolean> {
    try {
      const lockTime = new Date().toISOString();
      const lockId = `processor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const result = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'lock_indexing_job_for_processing',
          reason: 'JobQueue service locking indexing job to prevent concurrent processing',
          source: 'JobQueue.lockJobForProcessing',
          metadata: {
            jobId,
            lockId,
            lockTime,
            targetStatus: 'running',
            fromStatus: 'pending'
          }
        },
        { table: 'indb_indexing_jobs', operationType: 'update' },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .update({
              status: 'running'
            })
            .eq('id', jobId)
            .eq('status', 'pending')
            .select();

          if (error) {
            throw error;
          }

          return { data, error };
        }
      );

      const { data, error } = result;

      // Send real-time status update
      if (data && data.length > 0) {
        // Get user_id from the job data
        const job = await this.getJobDetails(jobId);
        if (job) {
          this.socketBroadcaster.broadcastJobUpdate(job.user_id, jobId, {
            status: 'running',
            progress: {
              total_urls: job.total_urls,
              processed_urls: 0,
              successful_urls: 0,
              failed_urls: 0,
              progress_percentage: 0
            }
          });
        }
      }

      if (error) {
        console.error('Error locking job:', error);
        return false;
      }

      const success = data && data.length > 0;
      if (!success) {
        console.log(`Job ${jobId} is already locked or not in pending status`);
      }
      
      return success;
    } catch (error) {
      console.error('Error locking job:', error);
      return false;
    }
  }

  /**
   * Get job details from database
   */
  async getJobDetails(jobId: string): Promise<IndexingJob | null> {
    try {
      const result = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_indexing_job_details',
          reason: 'JobQueue service retrieving indexing job details for processing',
          source: 'JobQueue.getJobDetails',
          metadata: {
            jobId,
            operation: 'select_single_job'
          }
        },
        { table: 'indb_indexing_jobs', operationType: 'select' },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          return data;
        }
      );

      return result;
    } catch (error) {
      console.error('Error getting job details:', error);
      return null;
    }
  }

  /**
   * Update job status and additional fields
   */
  async updateJobStatus(jobId: string, status: string, extraFields: Record<string, any> = {}): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'update_indexing_job_status',
          reason: 'JobQueue service updating indexing job status and progress',
          source: 'JobQueue.updateJobStatus',
          metadata: {
            jobId,
            newStatus: status,
            extraFields: Object.keys(extraFields),
            hasProgressUpdate: 'processed_urls' in extraFields || 'progress_percentage' in extraFields
          }
        },
        { table: 'indb_indexing_jobs', operationType: 'update', data: { status, ...extraFields } },
        async () => {
          await supabaseAdmin
            .from('indb_indexing_jobs')
            .update({
              status,
              updated_at: new Date().toISOString(),
              ...extraFields
            })
            .eq('id', jobId);

          return true;
        }
      );
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  }

  /**
   * Extract URLs from job source data based on job type
   * FIXED: Now supports URL caching for sitemap jobs to enable proper resumption
   */
  async extractUrlsFromJobSource(job: IndexingJob): Promise<string[]> {
    try {
      if (job.type === 'manual') {
        // For manual jobs, URLs are stored in source_data.urls
        const urls = job.source_data?.urls || [];
        console.log(`📝 Manual job: extracted ${urls.length} URLs`);
        return urls;
      } else if (job.type === 'sitemap') {
        // Check if we have already parsed URLs stored
        if (job.source_data?.parsed_urls && Array.isArray(job.source_data.parsed_urls)) {
          console.log(`📋 Using ${job.source_data.parsed_urls.length} previously parsed URLs (last parsed: ${job.source_data.last_parsed})`);
          return job.source_data.parsed_urls;
        }
        
        // First time or re-run: parse sitemap and store URLs
        const sitemapUrl = job.source_data?.sitemap_url;
        if (!sitemapUrl) {
          throw new Error('No sitemap URL found in job source data');
        }
        
        console.log(`🗺️ Sitemap job: parsing ${sitemapUrl} for the first time`);
        const urls = await this.parseSitemapUrls(sitemapUrl);
        
        // Store parsed URLs in source_data for future resumes
        await this.storeParseUrlsInJob(job.id, urls);
        
        return urls;
      }
      return [];
    } catch (error) {
      console.error('Error extracting URLs from job source:', error);
      throw error;
    }
  }

  /**
   * Store parsed URLs in job's source_data for future resume operations
   */
  private async storeParseUrlsInJob(jobId: string, urls: string[]): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'store_parsed_urls_in_job',
          reason: 'JobQueue service storing parsed sitemap URLs in job source_data for resume capability',
          source: 'JobQueue.storeParseUrlsInJob',
          metadata: {
            jobId,
            urlCount: urls.length,
            operation_type: 'sitemap_url_caching'
          }
        },
        { table: 'indb_indexing_jobs', operationType: 'update' },
        async () => {
          const { data: job } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .select('source_data')
            .eq('id', jobId)
            .single();
            
          const updatedSourceData = {
            ...job?.source_data,
            parsed_urls: urls,
            last_parsed: new Date().toISOString(),
            total_parsed: urls.length
          };
          
          const { error } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .update({ 
              source_data: updatedSourceData,
              total_urls: urls.length,
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
            
          if (error) {
            console.error('Error storing parsed URLs:', error);
            throw error;
          }
          
          console.log(`💾 Stored ${urls.length} parsed URLs in job ${jobId} source_data`);
        }
      );
    } catch (error) {
      console.error('Failed to store parsed URLs:', error);
      throw error;
    }
  }

  /**
   * Parse sitemap XML to extract all URLs
   */
  private async parseSitemapUrls(sitemapUrl: string): Promise<string[]> {
    try {
      console.log(`🔍 Fetching sitemap: ${sitemapUrl}`);
      const response = await fetch(sitemapUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
      }

      const xmlContent = await response.text();
      const xml2js = await import('xml2js');
      const parser = new xml2js.Parser();
      const parsedXml = await parser.parseStringPromise(xmlContent);

      const urls: string[] = [];
      
      // Handle regular sitemap with URL entries
      if (parsedXml.urlset?.url) {
        parsedXml.urlset.url.forEach((urlEntry: any) => {
          if (urlEntry.loc?.[0]) {
            urls.push(urlEntry.loc[0]);
          }
        });
      }
      
      // Handle sitemap index with nested sitemaps
      if (parsedXml.sitemapindex?.sitemap) {
        for (const sitemapEntry of parsedXml.sitemapindex.sitemap) {
          if (sitemapEntry.loc?.[0]) {
            const nestedUrls = await this.parseSitemapUrls(sitemapEntry.loc[0]);
            urls.push(...nestedUrls);
          }
        }
      }

      console.log(`✅ Extracted ${urls.length} URLs from sitemap`);
      return urls;
    } catch (error) {
      console.error('Error parsing sitemap:', error);
      throw new Error(`Sitemap parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create URL submission records for tracking individual URL processing
   * PRESERVES HISTORY: Always adds new submissions, never deletes old ones
   */
  async createUrlSubmissionsForJob(jobId: string, urls: string[]): Promise<void> {
    try {
      console.log(`📊 Creating ${urls.length} URL submission records (PRESERVING HISTORY)`);
      
      // Get existing submissions and job status using SecureWrapper
      const result = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'check_existing_url_submissions',
          reason: 'JobQueue service checking existing URL submissions to determine if this is a job resume',
          source: 'JobQueue.createUrlSubmissionsForJob',
          metadata: {
            jobId,
            operation_type: 'submission_resume_check'
          }
        },
        { table: 'indb_indexing_url_submissions', operationType: 'select' },
        async () => {
          // Get existing submissions to check if this is a resume or new run
          const { data: existingSubmissions, error: countError } = await supabaseAdmin
            .from('indb_indexing_url_submissions')
            .select('*')
            .eq('job_id', jobId)
            .order('created_at');

          if (countError) {
            console.warn('Warning: Could not fetch existing submissions, continuing with new run');
          }

          // Check job status to determine if this is a resume
          const { data: job } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .select('status, processed_urls')
            .eq('id', jobId)
            .single();

          return { existingSubmissions, job };
        }
      );

      const { existingSubmissions, job } = result;

      const isResume = job?.status === 'running' && existingSubmissions && existingSubmissions.length > 0;
      const pendingSubmissions = existingSubmissions?.filter(sub => sub.status === 'pending') || [];

      if (isResume && pendingSubmissions.length > 0) {
        console.log(`🔄 RESUMING job ${jobId} - found ${pendingSubmissions.length} pending submissions to continue from`);
        console.log(`📍 Job will resume from URL index ${job?.processed_urls || 0} onwards`);
        console.log(`✅ FIXED: No duplicate submissions will be created - using existing pending URLs`);
        
        // For resume: don't create new submissions, use existing pending ones
        // The processing will continue from the last processed URL
        return;
      }

      // Check if this is a sitemap job with existing submissions for same URLs
      if (existingSubmissions && existingSubmissions.length > 0) {
        const existingUrls = new Set(existingSubmissions.map(sub => sub.url));
        const duplicateUrls = urls.filter(url => existingUrls.has(url));
        
        if (duplicateUrls.length > 0) {
          console.log(`⚠️ DUPLICATE PREVENTION: Found ${duplicateUrls.length} URLs that already exist in submissions`);
          console.log(`🎯 This indicates sitemap job is being resumed properly - using cached URLs`);
        }
      }

      // Calculate run number based on existing submissions for NEW run
      let runNumber = 1;
      if (existingSubmissions && existingSubmissions.length > 0) {
        const existingRunNumbers = existingSubmissions
          .map(sub => sub.response_data?.run_number || 1)
          .filter(num => typeof num === 'number');
        runNumber = existingRunNumbers.length > 0 ? Math.max(...existingRunNumbers) + 1 : 1;
      }

      console.log(`🔄 Creating submissions for NEW run #${runNumber} (preserving ${existingSubmissions?.length || 0} historical records)`);
      
      const submissions = urls.map((url, index) => ({
        job_id: jobId,
        url: url,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        response_data: { 
          run_number: runNumber, 
          batch_index: index,
          created_at: new Date().toISOString()
        }
      }));

      // Create submissions and update job using SecureWrapper
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'create_url_submissions_batch',
          reason: 'JobQueue service creating new URL submission records for indexing job processing',
          source: 'JobQueue.createUrlSubmissionsForJob',
          metadata: {
            jobId,
            urlCount: submissions.length,
            runNumber,
            operation_type: 'url_submission_creation'
          }
        },
        { table: 'indb_indexing_url_submissions', operationType: 'insert' },
        async () => {
          // CRITICAL: INSERT only - NEVER delete or update existing submissions
          const batchSize = 100;
          for (let i = 0; i < submissions.length; i += batchSize) {
            const batch = submissions.slice(i, i + batchSize);
            const { error } = await supabaseAdmin
              .from('indb_indexing_url_submissions')
              .insert(batch);

            if (error) {
              throw new Error(`Failed to create URL submissions: ${error.message}`);
            }
          }

          // Update job with current run info (reset progress ONLY for new runs, not resume)
          await supabaseAdmin
            .from('indb_indexing_jobs')
            .update({ 
              total_urls: urls.length,
              processed_urls: 0,
              successful_urls: 0,
              failed_urls: 0,
              progress_percentage: 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
        }
      );

      console.log(`✅ Created ${urls.length} NEW URL submission records for run #${runNumber} (total history preserved)`);
    } catch (error) {
      console.error('Error creating URL submissions:', error);
      throw error;
    }
  }
}
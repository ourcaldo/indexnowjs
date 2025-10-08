/**
 * Keyword Enrichment Service - FIXED VERSION
 * Properly separates two distinct flows:
 * 1. Flow 1: Force enrichment for new keywords (keyword_bank_id IS NULL) - NO cache check
 * 2. Flow 2: Refresh stale keywords (data older than 30 days) - direct keyword_bank lookup
 */

import {
  SeRankingKeywordData,
  SeRankingApiResponse,
  ServiceResponse,
  BulkProcessingJob,
  QuotaStatus,
  ApiMetrics,
  HealthCheckResult,
  SeRankingError,
  SeRankingErrorType
} from '../types/SeRankingTypes';

import {
  KeywordBankEntity,
  KeywordBankInsert,
  KeywordBankUpdate,
  KeywordBankQuery,
  KeywordBankQueryResult,
  KeywordBankOperationResult,
  BulkKeywordBankOperationResult,
  CacheStatus,
  CacheStats,
  KeywordLookupParams
} from '../types/KeywordBankTypes';

import {
  ISeRankingApiClient,
  IKeywordBankService,
  IKeywordEnrichmentService
} from '../types/ServiceTypes';

import { ValidationService, ValidationResult } from './ValidationService';
import { ErrorHandlingService } from './ErrorHandlingService';
import { supabaseAdmin } from '../../../database/supabase';
import { SecureServiceRoleWrapper } from '../../../services/security/SecureServiceRoleWrapper';
import { logger } from '@/lib/monitoring/error-handling';

// Configuration interface
export interface KeywordEnrichmentConfig {
  cacheExpiryDays: number;
  batchSize: number;
  maxConcurrentRequests: number;
  enableMetrics: boolean;
  enableCachePreloading: boolean;
  defaultLanguageCode: string;
  quotaThresholdWarning: number;
  quotaThresholdError: number;
  enableGracefulDegradation: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Interface for stale keywords
interface StaleKeywordEntity {
  id: string;
  keyword: string;
  country_id: string;
  data_updated_at: string;
}

export class KeywordEnrichmentService implements IKeywordEnrichmentService {
  private config: KeywordEnrichmentConfig;
  private keywordBankService: IKeywordBankService;
  private apiClient: ISeRankingApiClient;
  private errorHandler: ErrorHandlingService;
  private validationService: ValidationService;
  private metrics: ApiMetrics;
  private activeJobs: Map<string, BulkProcessingJob> = new Map();
  private quotaStatus?: QuotaStatus;
  private lastQuotaCheck?: Date;

  constructor(
    keywordBankService: IKeywordBankService,
    apiClient: ISeRankingApiClient,
    errorHandler?: ErrorHandlingService,
    config: Partial<KeywordEnrichmentConfig> = {}
  ) {
    this.config = {
      cacheExpiryDays: 30,
      batchSize: 25,
      maxConcurrentRequests: 3,
      enableMetrics: true,
      enableCachePreloading: false,
      defaultLanguageCode: 'en',
      quotaThresholdWarning: 0.8,
      quotaThresholdError: 0.95,
      enableGracefulDegradation: true,
      logLevel: 'info',
      ...config
    };

    this.keywordBankService = keywordBankService;
    this.apiClient = apiClient;
    this.errorHandler = errorHandler || new ErrorHandlingService();
    this.validationService = new ValidationService();

    this.metrics = {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      average_response_time: 0,
      cache_hits: 0,
      cache_misses: 0
    };

    // Initialize services
    this.initialize();
  }

  /**
   * Initialize service and perform health checks
   */
  private async initialize(): Promise<void> {
    try {
      this.log('info', 'Initializing KeywordEnrichmentService');
      
      // Check API health
      const health = await this.apiClient.testConnection();
      if (health.status !== 'healthy') {
        this.log('warn', `API health check failed: ${health.error_message}`);
      }
      
      this.log('info', 'KeywordEnrichmentService initialized successfully');
    } catch (error) {
      this.log('error', `Failed to initialize KeywordEnrichmentService: ${error}`);
    }
  }

  /**
   * FLOW 1: Force enrichment for NEW keywords (keyword_bank_id IS NULL)
   * This method does NOT check cache - it forces API enrichment for new keywords
   */
  async enrichNewKeyword(
    keyword: string,
    countryCode: string
  ): Promise<ServiceResponse<KeywordBankEntity>> {
    const startTime = Date.now();
    
    try {
      this.log('info', `[FLOW 1] Force enriching new keyword: ${keyword} (${countryCode})`);
      
      // Validate inputs
      const validation = ValidationService.validateKeywordBankInsert({
        keyword,
        country_id: countryCode,
        language_code: this.config.defaultLanguageCode,
        is_data_found: false
      });

      if (!validation.isValid) {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Invalid input parameters',
          { errors: validation.errors }
        );
      }

      // NO CACHE CHECK FOR FLOW 1 - we want to force enrichment
      this.metrics.cache_misses++;

      // Force fetch from API - no fallback for new keywords
      const apiResponse = await this.fetchFromApi([keyword], countryCode);
      if (!apiResponse.success || !apiResponse.data || apiResponse.data.length === 0) {
        return this.createErrorResponse(
          apiResponse.error?.type || SeRankingErrorType.UNKNOWN_ERROR,
          `Failed to fetch data for new keyword: ${apiResponse.error?.message || 'Unknown error'}`,
          { apiError: apiResponse.error }
        );
      }

      // Process and store API data
      const apiKeywordData = apiResponse.data[0];
      
      // Log API data for debugging
      this.log('info', `[FLOW 1] API Data for ${keyword}: is_data_found=${apiKeywordData.is_data_found}, volume=${apiKeywordData.volume}, cpc=${apiKeywordData.cpc}`);
      
      const enrichedData = await this.storeEnrichedData(
        keyword,
        countryCode,
        this.config.defaultLanguageCode,
        apiKeywordData
      );

      if (!enrichedData.success) {
        this.log('error', `[FLOW 1] Failed to store data for ${keyword}: ${JSON.stringify(enrichedData.error)}`);
        return this.createErrorResponse(
          SeRankingErrorType.UNKNOWN_ERROR,
          'Failed to store enriched data for new keyword',
          { error: enrichedData.error }
        );
      }
      
      this.log('info', `[FLOW 1] Successfully stored ${keyword} in bank with ID: ${enrichedData.data?.id}`)

      this.metrics.successful_requests++;
      this.log('info', `[FLOW 1] Successfully enriched new keyword: ${keyword}`);
      
      return {
        success: true,
        data: enrichedData.data!,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };

    } catch (error) {
      this.metrics.failed_requests++;
      this.log('error', `[FLOW 1] Failed to enrich new keyword ${keyword}: ${error}`);
      
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to enrich new keyword',
        { error, keyword, countryCode }
      );
    }
  }

  /**
   * FLOW 2: Refresh OLD keywords that have stale cache data (>30 days)
   * This method directly looks at keyword_bank table and refreshes stale data
   */
  async refreshStaleKeywords(limit: number = 50): Promise<ServiceResponse<{
    processed: number;
    successful: number;
    failed: number;
    keywords: string[];
  }>> {
    const startTime = Date.now();
    
    try {
      this.log('info', `[FLOW 2] Finding stale keywords to refresh (limit: ${limit})`);
      
      // Find keywords in keyword_bank that are older than 30 days
      const staleKeywords = await this.findStaleKeywords(limit);
      
      if (staleKeywords.length === 0) {
        this.log('info', '[FLOW 2] No stale keywords found');
        return {
          success: true,
          data: {
            processed: 0,
            successful: 0,
            failed: 0,
            keywords: []
          },
          metadata: {
            source: 'cache',
            timestamp: new Date()
          }
        };
      }

      this.log('info', `[FLOW 2] Found ${staleKeywords.length} stale keywords to refresh`);
      
      let processed = 0;
      let successful = 0;
      let failed = 0;
      const processedKeywords: string[] = [];
      
      // Process each stale keyword
      for (const staleKeyword of staleKeywords) {
        try {
          const refreshResult = await this.refreshStaleKeyword(staleKeyword);
          processed++;
          processedKeywords.push(staleKeyword.keyword);
          
          if (refreshResult.success) {
            successful++;
            this.log('info', `[FLOW 2] Refreshed stale keyword: ${staleKeyword.keyword}`);
          } else {
            failed++;
            this.log('warn', `[FLOW 2] Failed to refresh stale keyword: ${staleKeyword.keyword}`);
          }
          
          // Small delay between requests
          await this.delay(500);
          
        } catch (error) {
          processed++;
          failed++;
          processedKeywords.push(staleKeyword.keyword);
          this.log('error', `[FLOW 2] Error refreshing ${staleKeyword.keyword}: ${error}`);
        }
      }
      
      this.log('info', `[FLOW 2] Completed refresh: ${processed} processed, ${successful} successful, ${failed} failed`);
      
      return {
        success: true,
        data: {
          processed,
          successful,
          failed,
          keywords: processedKeywords
        },
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      this.log('error', `[FLOW 2] Error in refreshStaleKeywords: ${error}`);
      
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to refresh stale keywords',
        { error }
      );
    }
  }

  /**
   * Find stale keywords in keyword_bank table (older than 30 days)
   */
  private async findStaleKeywords(limit: number = 50): Promise<StaleKeywordEntity[]> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'find_stale_keywords',
          reason: 'Finding stale keywords (older than 30 days) for refresh enrichment in Flow 2',
          source: 'rank-tracking/seranking/services/KeywordEnrichmentService',
          metadata: {
            limit: limit,
            cutoff_date: thirtyDaysAgo.toISOString(),
            operation_type: 'stale_keyword_lookup'
          }
        },
        {
          table: 'indb_keyword_bank',
          operationType: 'select',
          columns: ['id', 'keyword', 'country_id', 'data_updated_at'],
          whereConditions: {
            data_updated_at_lt: thirtyDaysAgo.toISOString(),
            is_data_found: true
          }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_keyword_bank')
            .select('id, keyword, country_id, data_updated_at')
            .lt('data_updated_at', thirtyDaysAgo.toISOString())
            .eq('is_data_found', true)
            .limit(limit)

          if (error) {
            throw new Error(`[FLOW 2] Error finding stale keywords: ${error.message}`)
          }

          return data || []
        }
      )

      return data || []
    } catch (error) {
      this.log('error', `[FLOW 2] Error in findStaleKeywords: ${error}`);
      return [];
    }
  }

  /**
   * Refresh a single stale keyword
   */
  private async refreshStaleKeyword(staleKeyword: StaleKeywordEntity): Promise<ServiceResponse<KeywordBankEntity>> {
    try {
      this.log('info', `[FLOW 2] Refreshing stale keyword: ${staleKeyword.keyword} (${staleKeyword.country_id})`);

      // Fetch fresh data from API
      const apiResponse = await this.fetchFromApi([staleKeyword.keyword], staleKeyword.country_id);
      if (!apiResponse.success || !apiResponse.data || apiResponse.data.length === 0) {
        return this.createErrorResponse(
          apiResponse.error?.type || SeRankingErrorType.UNKNOWN_ERROR,
          `Failed to refresh stale keyword: ${apiResponse.error?.message || 'Unknown error'}`,
          { apiError: apiResponse.error }
        );
      }

      // Update existing keyword_bank record with fresh data
      const apiKeywordData = apiResponse.data[0];
      const updateResult = await this.updateExistingKeywordData(
        staleKeyword.id,
        apiKeywordData
      );

      if (!updateResult.success) {
        return this.createErrorResponse(
          SeRankingErrorType.UNKNOWN_ERROR,
          'Failed to update stale keyword data',
          { error: updateResult.error }
        );
      }

      this.metrics.successful_requests++;
      this.log('info', `[FLOW 2] Successfully refreshed stale keyword: ${staleKeyword.keyword}`);
      
      return {
        success: true,
        data: updateResult.data!,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };

    } catch (error) {
      this.log('error', `[FLOW 2] Error refreshing stale keyword ${staleKeyword.keyword}: ${error}`);
      
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to refresh stale keyword',
        { error, keyword: staleKeyword.keyword }
      );
    }
  }

  /**
   * Update existing keyword_bank record with fresh API data
   */
  private async updateExistingKeywordData(
    keywordBankId: string,
    apiData: SeRankingKeywordData
  ): Promise<KeywordBankOperationResult> {
    try {
      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'update_existing_keyword_data',
          reason: 'Updating existing keyword bank entry with fresh API data during stale keyword refresh',
          source: 'rank-tracking/seranking/services/KeywordEnrichmentService',
          metadata: {
            keyword_bank_id: keywordBankId,
            volume: apiData.volume,
            cpc: apiData.cpc,
            is_data_found: apiData.is_data_found,
            operation_type: 'keyword_data_update'
          }
        },
        {
          table: 'indb_keyword_bank',
          operationType: 'update',
          data: {
            volume: apiData.volume,
            cpc: apiData.cpc,
            competition: apiData.competition,
            difficulty: apiData.difficulty,
            history_trend: apiData.history_trend,
            keyword_intent: null,
            is_data_found: apiData.is_data_found,
            data_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          whereConditions: { id: keywordBankId }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_keyword_bank')
            .update({
              volume: apiData.volume,
              cpc: apiData.cpc,
              competition: apiData.competition,
              difficulty: apiData.difficulty,
              history_trend: apiData.history_trend,
              keyword_intent: null, // Will be set by separate logic later
              is_data_found: apiData.is_data_found,
              data_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', keywordBankId)
            .select()
            .single()

          if (error) {
            throw new Error(`Failed to update keyword data: ${error.message}`)
          }

          return data as KeywordBankEntity
        }
      )

      return {
        success: true,
        data: data
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown update error',
          details: error
        }
      };
    }
  }

  /**
   * Backward compatibility method - now properly decides which flow to use
   * For new keywords (first time enrichment), use Flow 1
   */
  async enrichKeyword(
    keyword: string,
    countryCode: string,
    forceRefresh: boolean = false
  ): Promise<ServiceResponse<KeywordBankEntity>> {
    // This method delegates to the appropriate flow
    // By default, we assume this is for new keywords (Flow 1)
    return this.enrichNewKeyword(keyword, countryCode);
  }

  /**
   * Bulk enrichment using enrichNewKeyword for each keyword
   */
  async enrichKeywordsBulk(
    keywords: Array<{keyword: string; countryCode: string}>
  ): Promise<ServiceResponse<BulkProcessingJob>> {
    const jobId = this.generateJobId();
    const startTime = Date.now();

    try {
      // Validate batch request
      if (!keywords || keywords.length === 0) {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'No keywords provided for bulk enrichment'
        );
      }

      if (keywords.length > 1000) {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Too many keywords in batch (max 1000)'
        );
      }

      // Create processing job
      const job: BulkProcessingJob = {
        id: jobId,
        keywords: keywords.map(k => ({
          keyword: k.keyword,
          country_code: k.countryCode,
          language_code: this.config.defaultLanguageCode,
          priority: 'normal'
        })),
        status: 'queued',
        progress: {
          total: keywords.length,
          processed: 0,
          successful: 0,
          failed: 0
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      this.activeJobs.set(jobId, job);

      // Process batch asynchronously
      this.processBatchJob(job).catch(error => {
        this.log('error', `Batch job ${jobId} failed: ${error}`);
        job.status = 'failed';
        job.error_message = error.message;
        job.updated_at = new Date();
      });

      return {
        success: true,
        data: job,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };

    } catch (error) {
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to create bulk enrichment job',
        { error }
      );
    }
  }

  /**
   * Get enrichment job status
   */
  async getJobStatus(jobId: string): Promise<ServiceResponse<BulkProcessingJob>> {
    try {
      const job = this.activeJobs.get(jobId);
      
      if (!job) {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Job not found',
          { jobId }
        );
      }

      return {
        success: true,
        data: job,
        metadata: {
          source: 'cache',
          timestamp: new Date()
        }
      };

    } catch (error) {
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to get job status',
        { error, jobId }
      );
    }
  }

  /**
   * Cancel enrichment job
   */
  async cancelJob(jobId: string): Promise<ServiceResponse<boolean>> {
    try {
      const job = this.activeJobs.get(jobId);
      
      if (!job) {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Job not found',
          { jobId }
        );
      }

      if (job.status === 'completed' || job.status === 'failed') {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Cannot cancel completed or failed job',
          { jobId, status: job.status }
        );
      }

      job.status = 'cancelled';
      job.updated_at = new Date();

      return {
        success: true,
        data: true,
        metadata: {
          source: 'cache',
          timestamp: new Date()
        }
      };

    } catch (error) {
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to cancel job',
        { error, jobId }
      );
    }
  }

  /**
   * Retry failed keyword enrichments
   */
  async retryFailedEnrichments(jobId: string): Promise<ServiceResponse<BulkProcessingJob>> {
    try {
      const job = this.activeJobs.get(jobId);
      
      if (!job) {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Job not found',
          { jobId }
        );
      }

      if (job.status !== 'failed' && job.status !== 'completed') {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Cannot retry job that is not completed or failed',
          { jobId, status: job.status }
        );
      }

      // Reset failed portions and restart
      job.status = 'queued';
      job.progress.processed -= job.progress.failed;
      job.progress.failed = 0;
      job.updated_at = new Date();
      job.error_message = undefined;

      // Restart processing
      this.processBatchJob(job).catch(error => {
        this.log('error', `Retry batch job ${jobId} failed: ${error}`);
        job.status = 'failed';
        job.error_message = error.message;
        job.updated_at = new Date();
      });

      return {
        success: true,
        data: job,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };

    } catch (error) {
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to retry job',
        { error, jobId }
      );
    }
  }

  // Private helper methods

  private async fetchFromApi(
    keywords: string[],
    countryCode: string
  ): Promise<ServiceResponse<SeRankingApiResponse>> {
    try {
      const apiResponse = await this.apiClient.fetchKeywordData(keywords, countryCode);
      
      // Validate API response
      const validation = ValidationService.validateApiResponse(apiResponse);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            type: SeRankingErrorType.PARSING_ERROR,
            message: 'Invalid API response format',
            details: validation.errors
          }
        };
      }

      return {
        success: true,
        data: apiResponse,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: this.mapErrorType(error),
          message: error instanceof Error ? error.message : 'Unknown API error',
          details: error
        }
      };
    }
  }

  private async storeEnrichedData(
    keyword: string,
    countryCode: string,
    languageCode: string,
    apiData: SeRankingKeywordData
  ): Promise<KeywordBankOperationResult> {
    const insertData: KeywordBankInsert = {
      keyword: keyword.trim().toLowerCase(),
      country_id: countryCode.toLowerCase(), // Fixed: use country_id to match schema
      language_code: languageCode.toLowerCase(),
      is_data_found: apiData.is_data_found,
      volume: apiData.volume,
      cpc: apiData.cpc,
      competition: apiData.competition,
      difficulty: apiData.difficulty,
      history_trend: apiData.history_trend,
      keyword_intent: null // Will be set by separate logic later
    };

    try {
      return await this.keywordBankService.upsertKeywordData(insertData);
    } catch (error) {
      this.log('error', `Failed to store enriched data for ${keyword}: ${error}`);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown storage error',
          details: error
        }
      };
    }
  }

  private async processBatchJob(job: BulkProcessingJob): Promise<void> {
    job.status = 'processing';
    job.updated_at = new Date();

    const batches = this.createBatches(job.keywords, this.config.batchSize);
    
    for (const batch of batches) {
      if (job.status === 'cancelled' as any) {
        break;
      }

      try {
        await this.processBatch(batch, job);
      } catch (error) {
        this.log('error', `Batch processing error: ${error}`);
        job.progress.failed += batch.length;
      }
    }

    // Update final job status
    if (job.status !== 'cancelled' as any) {
      job.status = job.progress.failed > 0 ? 'failed' : 'completed';
      job.completed_at = new Date();
    }
    
    job.updated_at = new Date();
  }

  private async processBatch(
    batch: Array<{keyword: string; country_code: string; language_code?: string}>,
    job: BulkProcessingJob
  ): Promise<void> {
    for (const request of batch) {
      if (job.status === 'cancelled' as any) {
        break;
      }

      try {
        const result = await this.enrichNewKeyword(
          request.keyword,
          request.country_code
        );

        if (result.success) {
          job.progress.successful++;
        } else {
          job.progress.failed++;
        }

        job.progress.processed++;
        job.updated_at = new Date();

        // Small delay to prevent overwhelming the API
        await this.delay(100);

      } catch (error) {
        job.progress.failed++;
        job.progress.processed++;
        this.log('error', `Failed to process ${request.keyword}: ${error}`);
      }
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }


  private createErrorResponse<T>(
    errorType: SeRankingErrorType,
    message: string,
    details?: any
  ): ServiceResponse<T> {
    return {
      success: false,
      error: {
        type: errorType,
        message,
        details
      },
      metadata: {
        source: 'api',
        timestamp: new Date()
      }
    };
  }

  private mapErrorType(error: any): SeRankingErrorType {
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return SeRankingErrorType.QUOTA_EXCEEDED_ERROR;
      }
      if (error.message.includes('auth') || error.message.includes('401')) {
        return SeRankingErrorType.AUTHENTICATION_ERROR;
      }
      if (error.message.includes('rate') || error.message.includes('429')) {
        return SeRankingErrorType.RATE_LIMIT_ERROR;
      }
      if (error.message.includes('timeout')) {
        return SeRankingErrorType.TIMEOUT_ERROR;
      }
      if (error.message.includes('network') || error.message.includes('connection')) {
        return SeRankingErrorType.NETWORK_ERROR;
      }
    }
    return SeRankingErrorType.UNKNOWN_ERROR;
  }

  private generateJobId(): string {
    return `enrichment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (this.shouldLog(level)) {
      const metadata = {
        service: 'KeywordEnrichmentService',
        ...(data ? { data } : {})
      };
      
      logger[level](metadata, message);
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.config.logLevel];
  }
}
/**
 * Simple Keyword Enrichment Background Worker
 * Checks user keywords and enriches them using SeRanking API
 * Uses existing indb_keyword_keywords and indb_keyword_bank tables
 */

import * as cron from 'node-cron';
import { supabaseAdmin } from '../database/supabase';
import { KeywordBankService } from '../rank-tracking/seranking/services/KeywordBankService';
import { SeRankingApiClient } from '../rank-tracking/seranking/client/SeRankingApiClient';
import { KeywordEnrichmentService } from '../rank-tracking/seranking/services/KeywordEnrichmentService';
import { ErrorHandlingService } from '../rank-tracking/seranking/services/ErrorHandlingService';
import { IntegrationService } from '../rank-tracking/seranking/services/IntegrationService';
import { SecureServiceRoleWrapper } from '../services/security/SecureServiceRoleWrapper';
import { JobErrorHandler } from './JobErrorHandler';
import { logger } from '@/lib/monitoring/error-handling';

interface KeywordToEnrich {
  id: string;
  user_id: string;
  keyword: string;
  country_id: string;
  keyword_bank_id: string | null;
  intelligence_updated_at: string | null;
}

export class KeywordEnrichmentWorker {
  private static instance: KeywordEnrichmentWorker | null = null;
  private isRunning: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;
  
  private keywordBankService!: KeywordBankService;
  private enrichmentService!: KeywordEnrichmentService;
  private errorHandler!: ErrorHandlingService;
  private integrationService!: IntegrationService;

  private async initialize() {
    // Initialize services
    this.keywordBankService = new KeywordBankService();
    this.errorHandler = new ErrorHandlingService();
    
    // Initialize integration service to get API key from database
    this.integrationService = new IntegrationService({
      defaultQuotaLimit: 1000,
      enableMetrics: true,
      logLevel: 'info'
    } as any, {} as any); // We'll only use getIntegrationSettings method

    // Get API key directly from database using correct column name 'apikey'
    const integrationData = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'get_seranking_api_key_for_keyword_enrichment',
        reason: 'Retrieving SeRanking API key for keyword enrichment worker initialization',
        source: 'job-management/keyword-enrichment-worker',
        metadata: {
          service_name: 'seranking_keyword_export',
          operation_type: 'integration_config_lookup'
        }
      },
      {
        table: 'indb_site_integration',
        operationType: 'select',
        columns: ['apikey'],
        whereConditions: { service_name: 'seranking_keyword_export', is_active: true }
      },
      async () => {
        const { data: integrationData, error } = await supabaseAdmin
          .from('indb_site_integration')
          .select('apikey')
          .eq('service_name', 'seranking_keyword_export')
          .eq('is_active', true)
          .single()

        if (error) {
          throw new Error(`Failed to get SeRanking API key: ${error.message}`)
        }

        return integrationData
      }
    )

    const apiKey = integrationData?.apikey || '';
    
    if (!apiKey) {
      logger.warn({}, 'Keyword Enrichment Worker: No SeRanking API key found in database');
    } else {
      logger.info({}, 'Keyword Enrichment Worker: Found SeRanking API key in database');
    }

    // Initialize SeRanking API client with API key from database
    const apiClient = new SeRankingApiClient({
      apiKey: apiKey,
      baseUrl: 'https://api.seranking.com',
      timeout: 30000
    });

    // Initialize enrichment service with 30-day cache
    this.enrichmentService = new KeywordEnrichmentService(
      this.keywordBankService,
      apiClient,
      this.errorHandler,
      {
        cacheExpiryDays: 30,
        batchSize: 10, // Small batches to be gentle
        maxConcurrentRequests: 2
      }
    );
  }

  private constructor() {
    // Constructor is now empty, initialization happens in initialize() method
  }

  static async getInstance(): Promise<KeywordEnrichmentWorker> {
    if (!KeywordEnrichmentWorker.instance) {
      KeywordEnrichmentWorker.instance = new KeywordEnrichmentWorker();
      await KeywordEnrichmentWorker.instance.initialize();
    }
    return KeywordEnrichmentWorker.instance;
  }

  /**
   * Start the background worker
   * Runs immediately on startup, then every hour to check for keywords that need enrichment
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info({}, 'Keyword enrichment worker is already running');
      return;
    }

    logger.info({}, 'Keyword Enrichment: Starting background worker');
    this.isRunning = true;

    // Wait for enrichmentService to be ready before processing keywords
    while (!this.enrichmentService) {
      logger.debug({}, 'Keyword Enrichment: Waiting for service initialization');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Run immediately on startup to check for keywords
    logger.info({}, 'Keyword Enrichment: Running initial keyword check');
    await this.processKeywords().catch(error => {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Keyword Enrichment: Initial run failed');
    });

    // Then schedule to run every hour at minute 30
    this.cronJob = cron.schedule('30 * * * *', async () => {
      await this.processKeywords();
    }, {
      timezone: 'UTC'
    });

    logger.info({}, 'Keyword Enrichment: Background worker started - running immediately and then every hour');
  }

  /**
   * Stop the background worker
   */
  stop(): void {
    if (!this.isRunning) {
      logger.info({}, 'Keyword Enrichment: Worker is not running');
      return;
    }

    logger.info({}, 'Keyword Enrichment: Stopping background worker');
    this.isRunning = false;

    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }

    logger.info({}, 'Keyword Enrichment: Background worker stopped');
  }

  /**
   * Main processing function - find and enrich keywords
   */
  private async processKeywords(): Promise<void> {
    const jobId = `keyword-enrichment-${Date.now()}`;
    
    await JobErrorHandler.withJobErrorHandling(
      async () => {
        const keywordsToEnrich = await this.findKeywordsNeedingEnrichment();
        
        if (keywordsToEnrich.length === 0) {
          return { processed: 0, successful: 0, totalFound: 0 };
        }

        let processed = 0;
        let successful = 0;
        
        for (const keyword of keywordsToEnrich) {
          try {
            await this.enrichKeyword(keyword);
            successful++;
            processed++;
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            processed++;
          }
        }

        return { processed, successful, totalFound: keywordsToEnrich.length };
      },
      {
        jobId,
        jobType: 'keyword_enrichment',
        jobName: 'Keyword Enrichment Worker',
        metadata: { schedule: '30 * * * *' }
      }
    );
  }

  /**
   * Find keywords that need enrichment
   * Simple logic: get keywords from indb_keyword_keywords where keyword_bank_id IS NULL
   */
  private async findKeywordsNeedingEnrichment(limit: number = 50): Promise<KeywordToEnrich[]> {
    try {
      logger.debug({ limit }, 'Keyword Enrichment: Finding keywords without keyword_bank_id');

      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'find_keywords_needing_enrichment',
          reason: 'Finding keywords without keyword bank data for automated enrichment processing',
          source: 'job-management/keyword-enrichment-worker',
          metadata: {
            limit: limit,
            operation_type: 'keyword_enrichment_lookup'
          }
        },
        {
          table: 'indb_keyword_keywords',
          operationType: 'select',
          columns: ['id', 'user_id', 'keyword', 'country_id', 'keyword_bank_id', 'intelligence_updated_at'],
          whereConditions: { is_active: true, keyword_bank_id: null }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_keyword_keywords')
            .select('id, user_id, keyword, country_id, keyword_bank_id, intelligence_updated_at')
            .eq('is_active', true)
            .is('keyword_bank_id', null)  // Simple: get keywords that don't have bank reference
            .limit(limit)

          if (error) {
            throw new Error(`Failed to find keywords needing enrichment: ${error.message}`)
          }

          return data || []
        }
      )

      logger.info({ count: (data || []).length }, 'Keyword Enrichment: Found keywords without enrichment data');
      return data || [];
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Keyword Enrichment: Error finding keywords');
      return [];
    }
  }

  /**
   * Enrich a single keyword
   */
  private async enrichKeyword(keyword: KeywordToEnrich): Promise<void> {
    try {
      logger.debug({ keyword: keyword.keyword }, 'Keyword Enrichment: Enriching keyword');

      // Get ISO2 code from country_id - lookup from countries table to get the actual ISO2 code
      logger.debug({ countryId: keyword.country_id, keyword: keyword.keyword }, 'Keyword Enrichment: Looking up country');
      
      const countryData = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_country_iso_code_for_keyword_enrichment',
          reason: 'Retrieving country ISO code for keyword enrichment API call',
          source: 'job-management/keyword-enrichment-worker',
          metadata: {
            keyword_id: keyword.id,
            keyword_text: keyword.keyword,
            country_id: keyword.country_id,
            operation_type: 'country_lookup'
          }
        },
        {
          table: 'indb_keyword_countries',
          operationType: 'select',
          columns: ['iso2_code', 'name'],
          whereConditions: { id: keyword.country_id }
        },
        async () => {
          const { data: countryData, error: countryError } = await supabaseAdmin
            .from('indb_keyword_countries')
            .select('iso2_code, name')
            .eq('id', keyword.country_id)
            .single()

          if (countryError) {
            throw new Error(`Failed to get country data: ${countryError.message}`)
          }

          return countryData
        }
      )

      if (!countryData) {
        logger.error({ keyword: keyword.keyword, countryId: keyword.country_id }, 'Keyword Enrichment: Could not find country');
        return;
      }

      logger.debug({ country: countryData.name, iso2: countryData.iso2_code, keyword: keyword.keyword }, 'Keyword Enrichment: Found country');

      // Use lowercase ISO2 code for KeywordBankService (it expects direct ISO2 codes like "id", "us")
      const countryCodeForBank = countryData.iso2_code.toLowerCase();
      logger.debug({ countryCodeForBank }, 'Keyword Enrichment: Using country code');
      
      const result = await this.enrichmentService.enrichKeyword(
        keyword.keyword, 
        countryCodeForBank
      );

      logger.debug({ 
        keyword: keyword.keyword,
        success: result.success,
        hasData: !!result.data,
        dataFound: result.data?.is_data_found,
        volume: result.data?.volume,
        bankId: result.data?.id
      }, 'Keyword Enrichment: Enrichment result');

      if (result.success && result.data) {
        // Update the keyword record with bank_id and intelligence data
        // ALWAYS update keyword_bank_id regardless of is_data_found status
        const updateData: any = {
          keyword_bank_id: result.data.id,
          search_volume: result.data.volume,
          cpc: result.data.cpc,
          competition: result.data.competition,
          difficulty: result.data.difficulty,
          keyword_intent: result.data.keyword_intent,
          history_trend: result.data.history_trend,
          intelligence_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        logger.debug({ keyword: keyword.keyword, bankId: result.data.id, isDataFound: result.data.is_data_found }, 'Keyword Enrichment: Updating keyword');

        await SecureServiceRoleWrapper.executeSecureOperation(
          {
            userId: 'system',
            operation: 'update_keyword_enrichment_data',
            reason: 'Updating keyword with enrichment data from SeRanking API',
            source: 'job-management/keyword-enrichment-worker',
            metadata: {
              keyword_id: keyword.id,
              keyword_text: keyword.keyword,
              keyword_bank_id: result.data.id,
              search_volume: result.data.volume,
              is_data_found: result.data.is_data_found,
              operation_type: 'keyword_enrichment_update'
            }
          },
          {
            table: 'indb_keyword_keywords',
            operationType: 'update',
            whereConditions: { id: keyword.id },
            data: updateData
          },
          async () => {
            const { error: updateError } = await supabaseAdmin
              .from('indb_keyword_keywords')
              .update(updateData)
              .eq('id', keyword.id)

            if (updateError) {
              throw new Error(`Failed to update keyword enrichment data: ${updateError.message}`)
            }

            return { success: true }
          }
        )

        {
          if (result.data.is_data_found) {
            logger.info({ keyword: keyword.keyword, volume: result.data.volume }, 'Keyword Enrichment: Successfully enriched');
          } else {
            logger.info({ keyword: keyword.keyword }, 'Keyword Enrichment: Successfully processed (no market data)');
          }
        }
      } else {
        logger.error({ keyword: keyword.keyword, success: result.success, error: result.error, hasData: !!result.data }, 'Keyword Enrichment: Failed to enrich keyword');
      }

    } catch (error) {
      logger.error({ keyword: keyword.keyword, error: error instanceof Error ? error.message : 'Unknown error' }, 'Keyword Enrichment: Error enriching keyword');
    }
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isRunning: boolean;
    schedule: string;
    description: string;
  } {
    return {
      isRunning: this.isRunning,
      schedule: '30 * * * *',
      description: 'Checks for keywords needing enrichment every hour'
    };
  }

  /**
   * Manual trigger for testing
   */
  async runManually(): Promise<void> {
    logger.info({}, 'Keyword Enrichment: Manual trigger started');
    await this.processKeywords();
    logger.info({}, 'Keyword Enrichment: Manual trigger completed');
  }
}

// Export singleton instance
export const keywordEnrichmentWorker = KeywordEnrichmentWorker.getInstance();
/**
 * Keyword Bank Service
 * Database operations and intelligent caching for SeRanking keyword intelligence data
 */

import { supabase, supabaseAdmin } from '../../../database/supabase';
import { Database } from '../../../database/database-types';
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper';
import { logger } from '@/lib/monitoring/error-handling';
import {
  KeywordBankEntity,
  KeywordBankInsert,
  KeywordBankUpdate,
  KeywordBankQuery,
  KeywordBankQueryResult,
  KeywordBankOperationResult,
  KeywordBankBatchResult,
  KeywordLookupParams,
  CacheStatus,
  CacheStats
} from '../types/KeywordBankTypes';
import { SeRankingKeywordData } from '../types/SeRankingTypes';
import { IKeywordBankService } from '../types/ServiceTypes';
import { BulkKeywordBankOperationResult } from '../types/KeywordBankTypes';

// Type aliases for convenience
type KeywordBankRow = Database['public']['Tables']['indb_keyword_bank']['Row'];
type KeywordBankInsertRow = Database['public']['Tables']['indb_keyword_bank']['Insert'];
type KeywordBankUpdateRow = Database['public']['Tables']['indb_keyword_bank']['Update'];

export class KeywordBankService implements IKeywordBankService {
  /**
   * Get keyword data from bank by keyword and location (Interface implementation)
   */
  async getKeywordData(
    keyword: string,
    countryCode: string,
    languageCode: string = 'en'
  ): Promise<KeywordBankEntity | null> {
    try {
      const result = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_keyword_bank_data',
          reason: 'SeRanking service fetching keyword intelligence data from bank',
          source: 'KeywordBankService.getKeywordData',
          metadata: {
            keyword: keyword.trim().toLowerCase(),
            countryCode: countryCode.toLowerCase(),
            languageCode: languageCode.toLowerCase()
          }
        },
        { table: 'indb_keyword_bank', operationType: 'select' },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_keyword_bank')
            .select('*')
            .eq('keyword', keyword.trim().toLowerCase())
            .eq('country_id', countryCode.toLowerCase())
            .eq('language_code', languageCode.toLowerCase())
            .single();

          if (error) {
            logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error fetching keyword data');
            return null;
          }

          return data ? this.mapRowToEntity(data) : null;
        }
      );

      return result;
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in getKeywordData');
      return null;
    }
  }

  /**
   * Get multiple keyword data entries by keywords and location
   */
  async getKeywordDataBatch(
    keywords: string[],
    countryCode: string,
    languageCode: string = 'en'
  ): Promise<KeywordBankEntity[]> {
    try {
      if (keywords.length === 0) return [];

      const normalizedKeywords = keywords.map(k => k.trim().toLowerCase());

      const result = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_keyword_bank_data_batch',
          reason: 'SeRanking service fetching multiple keyword intelligence data entries from bank',
          source: 'KeywordBankService.getKeywordDataBatch',
          metadata: {
            keywordCount: keywords.length,
            keywords: normalizedKeywords.slice(0, 10), // Log first 10 keywords only
            countryCode: countryCode.toLowerCase(),
            languageCode: languageCode.toLowerCase()
          }
        },
        { table: 'indb_keyword_bank', operationType: 'select' },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_keyword_bank')
            .select('*')
            .in('keyword', normalizedKeywords)
            .eq('country_id', countryCode.toLowerCase())
            .eq('language_code', languageCode.toLowerCase());

          if (error) {
            logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error fetching keyword data batch');
            return [];
          }

          return (data || []).map(row => this.mapRowToEntity(row));
        }
      );

      return result;
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in getKeywordDataBatch');
      return [];
    }
  }

  /**
   * Check cache availability for keywords
   */
  async checkCacheStatus(
    keywords: string[],
    countryCode: string,
    languageCode: string = 'en'
  ): Promise<CacheStatus> {
    try {
      const normalizedKeywords = keywords.map(k => k.trim().toLowerCase());
      const existingData = await this.getKeywordDataBatch(normalizedKeywords, countryCode, languageCode);
      
      const existingKeywords = new Set(existingData.map(d => d.keyword));
      const missingKeywords = normalizedKeywords.filter(k => !existingKeywords.has(k));
      
      // Filter fresh data (updated within last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const freshData = existingData.filter(d => new Date(d.data_updated_at) > sevenDaysAgo);
      const staleData = existingData.filter(d => new Date(d.data_updated_at) <= sevenDaysAgo);
      
      return {
        total_keywords: keywords.length,
        cached_keywords: existingKeywords.size,
        missing_keywords: missingKeywords.length,
        fresh_cache: freshData.length,
        stale_cache: staleData.length,
        cache_hit_rate: existingKeywords.size / keywords.length,
        needs_api_call: missingKeywords.length > 0 || staleData.length > 0,
        missing_keyword_list: missingKeywords,
        stale_keyword_list: staleData.map(d => d.keyword),
        fresh_data: freshData,
        stale_data: staleData
      };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in checkCacheStatus');
      return {
        total_keywords: keywords.length,
        cached_keywords: 0,
        missing_keywords: keywords.length,
        fresh_cache: 0,
        stale_cache: 0,
        cache_hit_rate: 0,
        needs_api_call: true,
        missing_keyword_list: keywords,
        stale_keyword_list: [],
        fresh_data: [],
        stale_data: []
      };
    }
  }

  /**
   * Store keyword data in the bank
   */
  async storeKeywordData(
    keyword: string,
    countryCode: string,
    apiData: SeRankingKeywordData,
    languageCode: string = 'en'
  ): Promise<KeywordBankOperationResult> {
    try {
      const insertData: KeywordBankInsertRow = {
        keyword: keyword.trim().toLowerCase(),
        country_id: countryCode.toLowerCase(),
        language_code: languageCode.toLowerCase(),
        is_data_found: apiData.is_data_found,
        volume: apiData.volume,
        cpc: apiData.cpc,
        competition: apiData.competition,
        difficulty: apiData.difficulty,
        history_trend: apiData.history_trend,
        keyword_intent: this.extractKeywordIntent(apiData),
        data_updated_at: new Date().toISOString()
      };

      const result = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'store_keyword_bank_data',
          reason: 'SeRanking service storing keyword intelligence data to bank',
          source: 'KeywordBankService.storeKeywordData',
          metadata: {
            keyword: keyword.trim().toLowerCase(),
            countryCode: countryCode.toLowerCase(),
            languageCode: languageCode.toLowerCase(),
            hasData: apiData.is_data_found,
            volume: apiData.volume
          }
        },
        { table: 'indb_keyword_bank', operationType: 'insert', data: insertData },
        async () => {
          // Use upsert to handle duplicate keywords
          const { data, error } = await supabaseAdmin
            .from('indb_keyword_bank')
            .upsert(insertData, {
              onConflict: 'keyword,country_id,language_code'
            })
            .select()
            .single();

          if (error) {
            logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error storing keyword data');
            return {
              success: false,
              error: {
                message: error.message,
                code: error.code
              },
              keyword,
              operation: 'store'
            };
          }

          return {
            success: true,
            data: data ? this.mapRowToEntity(data) : undefined,
            keyword,
            operation: 'store'
          };
        }
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in storeKeywordData');
      return {
        success: false,
        error: {
          message: errorMessage
        },
        keyword,
        operation: 'store'
      };
    }
  }

  /**
   * Store multiple keyword data entries in batch
   */
  async storeKeywordDataBatch(
    keywordDataPairs: Array<{
      keyword: string;
      countryCode: string;
      apiData: SeRankingKeywordData;
      languageCode?: string;
    }>
  ): Promise<KeywordBankBatchResult> {
    try {
      if (keywordDataPairs.length === 0) {
        return {
          total_operations: 0,
          successful_operations: 0,
          failed_operations: 0,
          success_rate: 1,
          results: [],
          errors: []
        };
      }

      const insertData: KeywordBankInsertRow[] = keywordDataPairs.map(pair => ({
        keyword: pair.keyword.trim().toLowerCase(),
        country_id: pair.countryCode.toLowerCase(),
        language_code: (pair.languageCode || 'en').toLowerCase(),
        is_data_found: pair.apiData.is_data_found,
        volume: pair.apiData.volume,
        cpc: pair.apiData.cpc,
        competition: pair.apiData.competition,
        difficulty: pair.apiData.difficulty,
        history_trend: pair.apiData.history_trend,
        keyword_intent: this.extractKeywordIntent(pair.apiData),
        data_updated_at: new Date().toISOString()
      }));

      const result = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'store_keyword_bank_data_batch',
          reason: 'SeRanking service storing multiple keyword intelligence data entries to bank',
          source: 'KeywordBankService.storeKeywordDataBatch',
          metadata: {
            batchSize: keywordDataPairs.length,
            keywords: keywordDataPairs.slice(0, 5).map(p => p.keyword) // Log first 5 keywords only
          }
        },
        { table: 'indb_keyword_bank', operationType: 'insert', data: insertData },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_keyword_bank')
            .upsert(insertData, {
              onConflict: 'keyword,country_id,language_code'
            })
            .select();
          
          return { data, error };
        }
      );

      const { data, error } = result;

      const results: KeywordBankOperationResult[] = [];
      const errors: string[] = [];

      if (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in batch store operation');
        // Create error results for all keywords
        keywordDataPairs.forEach(pair => {
          results.push({
            success: false,
            error: {
              message: error.message,
              code: error.code
            },
            keyword: pair.keyword,
            operation: 'batch_store'
          });
          errors.push(`${pair.keyword}: ${error.message}`);
        });
      } else {
        // Create success results
        (data || []).forEach((row, index) => {
          results.push({
            success: true,
            data: this.mapRowToEntity(row),
            keyword: keywordDataPairs[index]?.keyword || 'unknown',
            operation: 'batch_store'
          });
        });
      }

      const successfulCount = results.filter(r => r.success).length;
      const failedCount = results.length - successfulCount;

      return {
        total_operations: keywordDataPairs.length,
        successful_operations: successfulCount,
        failed_operations: failedCount,
        success_rate: successfulCount / keywordDataPairs.length,
        results,
        errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in storeKeywordDataBatch');
      
      // Create error results for all keywords
      const results = keywordDataPairs.map(pair => ({
        success: false as const,
        error: {
          message: errorMessage
        },
        keyword: pair.keyword,
        operation: 'batch_store' as const
      }));

      return {
        total_operations: keywordDataPairs.length,
        successful_operations: 0,
        failed_operations: keywordDataPairs.length,
        success_rate: 0,
        results,
        errors: [errorMessage]
      };
    }
  }

  /**
   * Update keyword data in the bank
   */
  async updateKeywordData(
    id: string,
    updates: KeywordBankUpdate
  ): Promise<KeywordBankOperationResult> {
    try {
      // Convert Date objects to strings for database compatibility
      const updateData: KeywordBankUpdateRow = {
        is_data_found: updates.is_data_found,
        volume: updates.volume,
        cpc: updates.cpc,
        competition: updates.competition,
        difficulty: updates.difficulty,
        history_trend: updates.history_trend,
        keyword_intent: updates.keyword_intent,
        data_updated_at: updates.data_updated_at instanceof Date 
          ? updates.data_updated_at.toISOString()
          : updates.data_updated_at,
        updated_at: new Date().toISOString()
      };

      if (updates.volume !== undefined || updates.cpc !== undefined || 
          updates.competition !== undefined || updates.difficulty !== undefined) {
        updateData.data_updated_at = new Date().toISOString();
      }

      const result = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'update_keyword_bank_data',
          reason: 'SeRanking service updating keyword intelligence data in bank',
          source: 'KeywordBankService.updateKeywordData',
          metadata: {
            keywordId: id,
            hasVolumeUpdate: updates.volume !== undefined,
            hasCpcUpdate: updates.cpc !== undefined,
            hasCompetitionUpdate: updates.competition !== undefined
          }
        },
        { table: 'indb_keyword_bank', operationType: 'update', data: updateData },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_keyword_bank')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          return { data, error };
        }
      );

      const { data, error } = result;

      if (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error updating keyword data');
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code
          },
          keyword: id,
          operation: 'update'
        };
      }

      return {
        success: true,
        data: data ? this.mapRowToEntity(data) : undefined,
        keyword: data?.keyword || id,
        operation: 'update'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in updateKeywordData');
      return {
        success: false,
        error: {
          message: errorMessage
        },
        keyword: id,
        operation: 'update'
      };
    }
  }

  /**
   * Search and filter keyword bank data
   */
  async queryKeywordData(query: KeywordBankQuery): Promise<KeywordBankQueryResult> {
    try {
      let dbQuery = supabaseAdmin
        .from('indb_keyword_bank')
        .select('*', { count: 'exact' });

      // Apply filters
      if (query.keyword) {
        dbQuery = dbQuery.ilike('keyword', `%${query.keyword}%`);
      }

      if (query.country_code) {
        dbQuery = dbQuery.eq('country_id', query.country_code.toLowerCase());
      }

      if (query.language_code) {
        dbQuery = dbQuery.eq('language_code', query.language_code.toLowerCase());
      }

      if (query.is_data_found !== undefined) {
        dbQuery = dbQuery.eq('is_data_found', query.is_data_found);
      }

      if (query.min_volume !== undefined) {
        dbQuery = dbQuery.gte('volume', query.min_volume);
      }

      if (query.max_volume !== undefined) {
        dbQuery = dbQuery.lte('volume', query.max_volume);
      }

      if (query.min_difficulty !== undefined) {
        dbQuery = dbQuery.gte('difficulty', query.min_difficulty);
      }

      if (query.max_difficulty !== undefined) {
        dbQuery = dbQuery.lte('difficulty', query.max_difficulty);
      }

      if (query.keyword_intent) {
        dbQuery = dbQuery.eq('keyword_intent', query.keyword_intent);
      }

      if (query.updated_since) {
        dbQuery = dbQuery.gte('data_updated_at', query.updated_since.toISOString());
      }

      // Apply ordering
      if (query.order_by) {
        const ascending = query.order_direction === 'asc';
        dbQuery = dbQuery.order(query.order_by, { ascending });
      } else {
        dbQuery = dbQuery.order('data_updated_at', { ascending: false });
      }

      // Apply pagination
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      dbQuery = dbQuery.range(offset, offset + limit - 1);

      const { data, error, count } = await dbQuery;

      if (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error querying keyword data');
        return {
          data: [],
          total: 0,
          has_more: false
        };
      }

      const entities = (data || []).map(row => this.mapRowToEntity(row));
      const total = count || 0;
      const has_more = (offset + limit) < total;

      return {
        data: entities,
        total,
        has_more,
        next_offset: has_more ? offset + limit : undefined
      };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in queryKeywordData');
      return {
        data: [],
        total: 0,
        has_more: false
      };
    }
  }

  // Removed duplicate deleteKeywordData method - interface version below is the correct one

  /**
   * Get cache statistics
   */
  async getCacheStats(
    countryCode?: string,
    languageCode?: string
  ): Promise<CacheStats> {
    try {
      let query = supabaseAdmin
        .from('indb_keyword_bank')
        .select('*', { count: 'exact', head: true });

      if (countryCode) {
        query = query.eq('country_id', countryCode.toLowerCase());
      }

      if (languageCode) {
        query = query.eq('language_code', languageCode.toLowerCase());
      }

      const { count: totalCount } = await query;

      // Get data found count
      let dataFoundQuery = supabaseAdmin
        .from('indb_keyword_bank')
        .select('*', { count: 'exact', head: true })
        .eq('is_data_found', true);

      if (countryCode) dataFoundQuery = dataFoundQuery.eq('country_id', countryCode.toLowerCase());
      if (languageCode) dataFoundQuery = dataFoundQuery.eq('language_code', languageCode.toLowerCase());

      const { count: dataFoundCount } = await dataFoundQuery;

      // Get fresh data count (within last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      let freshQuery = supabaseAdmin
        .from('indb_keyword_bank')
        .select('*', { count: 'exact', head: true })
        .gte('data_updated_at', sevenDaysAgo.toISOString());

      if (countryCode) freshQuery = freshQuery.eq('country_id', countryCode.toLowerCase());
      if (languageCode) freshQuery = freshQuery.eq('language_code', languageCode.toLowerCase());

      const { count: freshCount } = await freshQuery;

      const total = totalCount || 0;
      const dataFound = dataFoundCount || 0;
      const fresh = freshCount || 0;
      const stale = total - fresh;

      return {
        total_entries: total,
        cache_hits: dataFound,
        cache_misses: total - dataFound,
        hit_ratio: total > 0 ? dataFound / total : 0,
        average_age: 0, // Could be calculated from creation dates
        expired_entries: stale,
        memory_usage: 0, // Not applicable for database cache
        total_keywords: total,
        keywords_with_data: dataFound,
        keywords_without_data: total - dataFound,
        fresh_data: fresh,
        stale_data: stale,
        data_found_rate: total > 0 ? dataFound / total : 0,
        fresh_data_rate: total > 0 ? fresh / total : 0,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in getCacheStats');
      return {
        total_entries: 0,
        cache_hits: 0,
        cache_misses: 0,
        hit_ratio: 0,
        average_age: 0,
        expired_entries: 0,
        memory_usage: 0,
        total_keywords: 0,
        keywords_with_data: 0,
        keywords_without_data: 0,
        fresh_data: 0,
        stale_data: 0,
        data_found_rate: 0,
        fresh_data_rate: 0,
        last_updated: new Date().toISOString()
      };
    }
  }

  /**
   * Clean up old/stale keyword data
   */
  async cleanupStaleData(olderThanDays: number = 30): Promise<KeywordBankBatchResult> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      // First, get the records to be deleted for reporting
      const { data: staleRecords, error: selectError } = await supabaseAdmin
        .from('indb_keyword_bank')
        .select('keyword')
        .lt('data_updated_at', cutoffDate.toISOString());

      if (selectError) {
        logger.error({ error: selectError instanceof Error ? selectError.message : String(selectError) }, 'Error selecting stale records');
        return {
          total_operations: 0,
          successful_operations: 0,
          failed_operations: 0,
          success_rate: 0,
          results: [],
          errors: [selectError.message]
        };
      }

      const recordCount = staleRecords?.length || 0;
      
      if (recordCount === 0) {
        return {
          total_operations: 0,
          successful_operations: 0,
          failed_operations: 0,
          success_rate: 1,
          results: [],
          errors: []
        };
      }

      // Delete stale records
      const { error: deleteError } = await supabaseAdmin
        .from('indb_keyword_bank')
        .delete()
        .lt('data_updated_at', cutoffDate.toISOString());

      if (deleteError) {
        logger.error({ error: deleteError instanceof Error ? deleteError.message : String(deleteError) }, 'Error deleting stale records');
        return {
          total_operations: recordCount,
          successful_operations: 0,
          failed_operations: recordCount,
          success_rate: 0,
          results: [],
          errors: [deleteError.message]
        };
      }

      const results: KeywordBankOperationResult[] = (staleRecords || []).map(record => ({
        success: true,
        keyword: record.keyword,
        operation: 'cleanup'
      }));

      return {
        total_operations: recordCount,
        successful_operations: recordCount,
        failed_operations: 0,
        success_rate: 1,
        results,
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in cleanupStaleData');
      return {
        total_operations: 0,
        successful_operations: 0,
        failed_operations: 1,
        success_rate: 0,
        results: [],
        errors: [errorMessage]
      };
    }
  }

  /**
   * Map database row to entity
   */
  private mapRowToEntity(row: KeywordBankRow): KeywordBankEntity {
    return {
      id: row.id,
      keyword: row.keyword,
      country_id: row.country_id,
      language_code: row.language_code,
      is_data_found: row.is_data_found,
      volume: row.volume,
      cpc: row.cpc,
      competition: row.competition,
      difficulty: row.difficulty,
      history_trend: row.history_trend,
      keyword_intent: row.keyword_intent,
      data_updated_at: new Date(row.data_updated_at),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Insert or update keyword data in bank (Interface method)
   */
  async upsertKeywordData(data: KeywordBankInsert): Promise<KeywordBankOperationResult> {
    try {
      const insertData: KeywordBankInsertRow = {
        keyword: data.keyword.trim().toLowerCase(),
        country_id: data.country_id.toLowerCase(),
        language_code: (data.language_code || 'en').toLowerCase(),
        is_data_found: data.is_data_found,
        volume: data.volume,
        cpc: data.cpc,
        competition: data.competition,
        difficulty: data.difficulty,
        history_trend: data.history_trend,
        keyword_intent: data.keyword_intent,
        data_updated_at: new Date().toISOString()
      };

      const { data: result, error } = await supabaseAdmin
        .from('indb_keyword_bank')
        .upsert(insertData, {
          onConflict: 'keyword,country_id,language_code'
        })
        .select()
        .single();

      if (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error upserting keyword data');
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code
          },
          keyword: data.keyword,
          operation: 'upsert'
        };
      }

      return {
        success: true,
        data: result ? this.mapRowToEntity(result) : undefined,
        keyword: data.keyword,
        operation: 'upsert'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in upsertKeywordData');
      return {
        success: false,
        error: {
          message: errorMessage
        },
        keyword: data.keyword,
        operation: 'upsert'
      };
    }
  }

  /**
   * Bulk upsert keyword data (Interface method)
   */
  async bulkUpsertKeywordData(data: KeywordBankInsert[]): Promise<BulkKeywordBankOperationResult> {
    try {
      if (data.length === 0) {
        return {
          success: true,
          data: [],
          total_processed: 0,
          successful: 0,
          failed: 0,
          errors: []
        };
      }

      const insertData: KeywordBankInsertRow[] = data.map(item => ({
        keyword: item.keyword.trim().toLowerCase(),
        country_id: item.country_id.toLowerCase(),
        language_code: (item.language_code || 'en').toLowerCase(),
        is_data_found: item.is_data_found,
        volume: item.volume,
        cpc: item.cpc,
        competition: item.competition,
        difficulty: item.difficulty,
        history_trend: item.history_trend,
        keyword_intent: item.keyword_intent,
        data_updated_at: new Date().toISOString()
      }));

      const { data: result, error } = await supabaseAdmin
        .from('indb_keyword_bank')
        .upsert(insertData, {
          onConflict: 'keyword,country_id,language_code'
        })
        .select();

      if (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in bulk upsert operation');
        const errors = data.map(item => ({
          keyword: item.keyword,
          country_code: item.country_id,
          error: error.message
        }));

        return {
          success: false,
          data: [],
          total_processed: data.length,
          successful: 0,
          failed: data.length,
          errors
        };
      }

      const entities = (result || []).map(row => this.mapRowToEntity(row));
      
      return {
        success: true,
        data: entities,
        total_processed: data.length,
        successful: entities.length,
        failed: 0,
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in bulkUpsertKeywordData');
      
      const errors = data.map(item => ({
        keyword: item.keyword,
        country_code: item.country_id,
        error: errorMessage
      }));

      return {
        success: false,
        data: [],
        total_processed: data.length,
        successful: 0,
        failed: data.length,
        errors
      };
    }
  }

  /**
   * Search keyword bank with filters (Interface method)
   */
  async searchKeywords(query: KeywordBankQuery): Promise<KeywordBankQueryResult> {
    return this.queryKeywordData(query);
  }

  /**
   * Get keywords that need refresh (Interface method)
   */
  async getStaleKeywords(olderThanDays: number, limit?: number): Promise<KeywordBankEntity[]> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      let query = supabaseAdmin
        .from('indb_keyword_bank')
        .select('*')
        .lt('data_updated_at', cutoffDate.toISOString())
        .order('data_updated_at', { ascending: true });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error fetching stale keywords');
        return [];
      }

      return (data || []).map(row => this.mapRowToEntity(row));
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in getStaleKeywords');
      return [];
    }
  }

  /**
   * Get bank statistics (Interface method - simplified version)
   */
  async getBankStats(): Promise<{
    total_keywords: number;
    with_data: number;
    without_data: number;
    average_age_days: number;
  }> {
    try {
      const cacheStats = await this.getCacheStats();
      
      // Calculate average age (simplified)
      const averageAge = 0; // Could be enhanced to calculate actual average age
      
      return {
        total_keywords: cacheStats.total_keywords,
        with_data: cacheStats.keywords_with_data,
        without_data: cacheStats.keywords_without_data,
        average_age_days: averageAge
      };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in getBankStats');
      return {
        total_keywords: 0,
        with_data: 0,
        without_data: 0,
        average_age_days: 0
      };
    }
  }

  /**
   * Delete keyword data from bank (Interface method - updated signature)
   */
  async deleteKeywordData(keyword: string, countryCode: string): Promise<KeywordBankOperationResult> {
    try {
      const { error } = await supabaseAdmin
        .from('indb_keyword_bank')
        .delete()
        .eq('keyword', keyword.trim().toLowerCase())
        .eq('country_id', countryCode.toLowerCase());

      if (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error deleting keyword data');
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code
          },
          keyword,
          operation: 'delete'
        };
      }

      return {
        success: true,
        keyword,
        operation: 'delete'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in deleteKeywordData');
      return {
        success: false,
        error: {
          message: errorMessage
        },
        keyword,
        operation: 'delete'
      };
    }
  }

  /**
   * Extract keyword intent from API data (basic implementation)
   */
  private extractKeywordIntent(apiData: SeRankingKeywordData): string | null {
    // Basic keyword intent classification based on patterns
    // This could be enhanced with ML or more sophisticated rules
    
    if (!apiData.is_data_found || !apiData.keyword) return null;
    
    const keyword = apiData.keyword.toLowerCase();
    
    // Commercial intent keywords
    if (/\b(buy|purchase|order|shop|store|price|cost|cheap|deal|discount|sale)\b/.test(keyword)) {
      return 'commercial';
    }
    
    // Informational intent keywords  
    if (/\b(how|what|why|when|where|guide|tutorial|learn|tips|help|advice)\b/.test(keyword)) {
      return 'informational';
    }
    
    // Navigational intent keywords
    if (/\b(login|sign in|account|website|official|homepage)\b/.test(keyword)) {
      return 'navigational';
    }
    
    // Transactional intent keywords
    if (/\b(download|subscribe|register|signup|trial|demo|quote|contact)\b/.test(keyword)) {
      return 'transactional';
    }
    
    // Default to informational for longer queries, commercial for shorter ones
    const wordCount = keyword.split(/\s+/).length;
    return wordCount >= 3 ? 'informational' : 'commercial';
  }
}
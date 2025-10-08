/**
 * Batch Processor Service
 * Handles daily rank checks for multiple keywords in batches
 */

import { RankTracker } from '../rank-tracking/rank-tracker'
import { APIKeyManager } from '../rank-tracking/api-key-manager'
import { supabaseAdmin } from '../database/supabase'
import { SecureServiceRoleWrapper } from '../services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'
import { JobErrorHandler } from './JobErrorHandler'

interface KeywordToTrack {
  id: string
  keyword: string
  domain: string
  deviceType: 'desktop' | 'mobile'
  countryCode: string
  userId: string
}

export class BatchProcessor {
  private rankTracker: RankTracker
  private apiKeyManager: APIKeyManager
  private batchSize: number = 5 // Process 5 keywords at once
  private delayBetweenRequests: number = 2000 // 2 second delay
  private delayBetweenUsers: number = 5000 // 5 second delay between users

  constructor() {
    this.rankTracker = new RankTracker()
    this.apiKeyManager = new APIKeyManager()
  }

  /**
   * Process daily rank checks for all active keywords
   */
  async processDailyRankChecks(): Promise<void> {
    const jobId = `daily-rank-check-${Date.now()}`
    
    const result = await JobErrorHandler.withJobErrorHandling(
      async () => {
        logger.info({}, 'Starting daily rank check process')

        // 1. Get all keywords that need checking today
        const keywords = await this.getKeywordsToTrack()
        logger.info({ keywordCount: keywords.length }, `Found keywords to track`)

        if (keywords.length === 0) {
          logger.info({}, 'No keywords need checking today')
          return { totalProcessed: 0, totalErrors: 0 }
        }

        // 2. Group by user to manage quotas
        const keywordsByUser = this.groupKeywordsByUser(keywords)
        logger.info({ userCount: keywordsByUser.size }, `Processing keywords for users`)

        // 3. Process each user's keywords in batches
        let totalProcessed = 0
        let totalErrors = 0

        for (const [userId, userKeywords] of Array.from(keywordsByUser.entries())) {
          try {
            const result = await this.processUserKeywords(userId, userKeywords)
            totalProcessed += result.processed
            totalErrors += result.errors
            
            // Delay between users to avoid overwhelming API
            if (keywordsByUser.size > 1) {
              await this.delay(this.delayBetweenUsers)
            }
          } catch (error) {
            logger.error({ userId, error: error instanceof Error ? error.message : 'Unknown error' }, `Failed to process keywords for user`)
            totalErrors += userKeywords.length
          }
        }

        logger.info({ totalProcessed, totalErrors }, `Daily rank check completed`)
        return { totalProcessed, totalErrors }
      },
      {
        jobId,
        jobType: 'daily_rank_check_batch',
        jobName: 'Daily Rank Check Batch Processing',
        metadata: { delayBetweenRequests: this.delayBetweenRequests, batchSize: this.batchSize }
      }
    )

    if (!result.success) {
      throw new Error(result.error)
    }
  }

  /**
   * Get keywords that need daily rank checking
   */
  private async getKeywordsToTrack(): Promise<KeywordToTrack[]> {
    try {
      const keywords = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_keywords_for_daily_rank_tracking',
          reason: 'Retrieving keywords that need daily rank tracking for batch processing',
          source: 'job-management/batch-processor',
          metadata: {
            check_date: new Date().toISOString().split('T')[0],
            operation_type: 'daily_rank_check_batch'
          }
        },
        {
          table: 'indb_keyword_keywords',
          operationType: 'select',
          columns: ['id', 'keyword', 'device_type', 'user_id', 'last_check_date'],
          whereConditions: { is_active: true }
        },
        async () => {
          const { data: keywords, error } = await supabaseAdmin
            .from('indb_keyword_keywords')
            .select(`
              id,
              keyword,
              device_type,
              user_id,
              last_check_date,
              domain:indb_keyword_domains(domain_name),
              country:indb_keyword_countries(iso2_code)
            `)
            .eq('is_active', true)
            .or('last_check_date.is.null,last_check_date.neq.' + new Date().toISOString().split('T')[0])
            .order('user_id')
            .order('created_at')

          if (error) {
            throw new Error(`Failed to get keywords for tracking: ${error.message}`)
          }

          return keywords || []
        }
      )

      return (keywords || []).map((k: any) => ({
        id: k.id,
        keyword: k.keyword,
        domain: k.domain.domain_name,
        deviceType: k.device_type,
        countryCode: k.country.iso2_code,
        userId: k.user_id
      }))

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error getting keywords to track')
      return []
    }
  }

  /**
   * Group keywords by user ID
   */
  private groupKeywordsByUser(keywords: KeywordToTrack[]): Map<string, KeywordToTrack[]> {
    const grouped = new Map<string, KeywordToTrack[]>()
    
    for (const keyword of keywords) {
      const existing = grouped.get(keyword.userId) || []
      existing.push(keyword)
      grouped.set(keyword.userId, existing)
    }
    
    return grouped
  }

  /**
   * Process keywords for a specific user
   */
  private async processUserKeywords(userId: string, keywords: KeywordToTrack[]): Promise<{ processed: number, errors: number }> {
    logger.info({ userId, keywordCount: keywords.length }, `Processing keywords for user`)

    // Check user's available quota first
    const availableQuota = await this.apiKeyManager.getAvailableQuota()
    const keywordsToProcess = keywords.slice(0, availableQuota)

    if (keywordsToProcess.length < keywords.length) {
      logger.warn({ userId, processing: keywordsToProcess.length, total: keywords.length, quotaLimit: availableQuota }, `Quota limit reached for user`)
    }

    if (keywordsToProcess.length === 0) {
      logger.warn({ userId }, `No quota available, skipping all keywords`)
      return { processed: 0, errors: 0 }
    }

    // Process in batches
    let processed = 0
    let errors = 0

    for (let i = 0; i < keywordsToProcess.length; i += this.batchSize) {
      const batch = keywordsToProcess.slice(i, i + this.batchSize)
      const batchNumber = Math.floor(i / this.batchSize) + 1
      
      logger.debug({ userId, batchNumber, batchSize: batch.length }, `Processing batch for user`)

      // Process batch in parallel (but rate limited)
      const batchResults = await Promise.allSettled(
        batch.map(keyword => this.rankTracker.trackKeyword(keyword))
      )

      // Count results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          processed++
        } else {
          errors++
          logger.error({ reason: result.reason }, 'Keyword tracking failed in batch')
        }
      }

      // Delay between batches (except for last batch)
      if (i + this.batchSize < keywordsToProcess.length) {
        await this.delay(this.delayBetweenRequests)
      }
    }

    logger.info({ userId, processed, errors }, `Completed processing for user`)
    return { processed, errors }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get batch processing statistics
   */
  async getProcessingStats(): Promise<any> {
    try {
      // Get keywords needing check
      const pendingCount = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'count_pending_keywords_for_rank_check',
          reason: 'Counting keywords that need daily rank checking for processing statistics',
          source: 'job-management/batch-processor',
          metadata: {
            check_date: new Date().toISOString().split('T')[0],
            operation_type: 'batch_stats_pending_count'
          }
        },
        {
          table: 'indb_keyword_keywords',
          operationType: 'select',
          columns: ['id'],
          whereConditions: { is_active: true }
        },
        async () => {
          const { count: pendingCount, error } = await supabaseAdmin
            .from('indb_keyword_keywords')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .or('last_check_date.is.null,last_check_date.neq.' + new Date().toISOString().split('T')[0])

          if (error) {
            throw new Error(`Failed to count pending keywords: ${error.message}`)
          }

          return pendingCount || 0
        }
      )

      // Get total active keywords
      const totalCount = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'count_total_active_keywords',
          reason: 'Counting total active keywords for processing statistics',
          source: 'job-management/batch-processor',
          metadata: {
            operation_type: 'batch_stats_total_count'
          }
        },
        {
          table: 'indb_keyword_keywords',
          operationType: 'select',
          columns: ['id'],
          whereConditions: { is_active: true }
        },
        async () => {
          const { count: totalCount, error } = await supabaseAdmin
            .from('indb_keyword_keywords')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)

          if (error) {
            throw new Error(`Failed to count total keywords: ${error.message}`)
          }

          return totalCount || 0
        }
      )

      // Get recent rank history count (today)
      const checkedTodayCount = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'count_keywords_checked_today',
          reason: 'Counting keywords checked today for processing statistics',
          source: 'job-management/batch-processor',
          metadata: {
            check_date: new Date().toISOString().split('T')[0],
            operation_type: 'batch_stats_checked_today_count'
          }
        },
        {
          table: 'indb_keyword_rank_history',
          operationType: 'select',
          columns: ['id'],
          whereConditions: { check_date: new Date().toISOString().split('T')[0] }
        },
        async () => {
          const { count: checkedTodayCount, error } = await supabaseAdmin
            .from('indb_keyword_rank_history')
            .select('id', { count: 'exact', head: true })
            .eq('check_date', new Date().toISOString().split('T')[0])

          if (error) {
            throw new Error(`Failed to count checked keywords: ${error.message}`)
          }

          return checkedTodayCount || 0
        }
      )

      return {
        totalKeywords: totalCount || 0,
        pendingChecks: pendingCount || 0,
        checkedToday: checkedTodayCount || 0,
        completionRate: totalCount ? ((checkedTodayCount || 0) / totalCount * 100).toFixed(1) : 0
      }

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error getting processing stats')
      return {
        totalKeywords: 0,
        pendingChecks: 0,
        checkedToday: 0,
        completionRate: 0
      }
    }
  }
}
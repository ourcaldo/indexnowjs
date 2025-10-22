/**
 * Rank Tracker Service
 * Core service for tracking keyword positions using IndexNow Rank Tracker API
 */

import { RankTrackerService } from './rank-tracker-service'
import { APIKeyManager } from './api-key-manager'
import { supabaseAdmin } from '../database/supabase'
import { errorTracker, ErrorTracker } from '../monitoring/error-tracker'
import { SecureServiceRoleWrapper } from '../services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'
import { removeUrlParameters } from '../utils/url-utils'

interface KeywordToTrack {
  id: string
  keyword: string
  domain: string
  deviceType: 'desktop' | 'mobile'
  countryCode: string
  countryName: string
  userId: string
}

interface RankResult {
  position: number | null
  url: string | null
  found: boolean
  totalResults: number
  errorMessage?: string
  firecrawlResponse?: any
}

export class RankTracker {
  private rankTrackerService: RankTrackerService | null = null
  private apiKeyManager: APIKeyManager

  constructor() {
    this.apiKeyManager = new APIKeyManager()
  }

  /**
   * Track a single keyword and store the result
   */
  async trackKeyword(keywordData: KeywordToTrack): Promise<void> {
    try {
      logger.info({ keyword: keywordData.keyword, domain: keywordData.domain }, 'Starting rank check')

      // 1. Get site-level API key from database
      const apiKey = await this.apiKeyManager.getActiveAPIKey()
      if (!apiKey) {
        throw new Error('No active Firecrawl API integration found. Please contact admin to configure API integration.')
      }

      // 2. Check remaining credits (site-level) - need at least 10 credits per request
      const availableCredits = await this.apiKeyManager.getAvailableQuota()
      if (availableCredits < 10) {
        throw new Error(`Insufficient credits: ${availableCredits} remaining. Need minimum 10 credits per request. Contact admin.`)
      }

      logger.info({ availableCredits }, 'Site API credits remaining')

      // 3. Initialize Firecrawl Rank Tracker service (loads API key from database)
      this.rankTrackerService = new RankTrackerService()

      // 4. Make rank check request using country name from database
      const rankResult = await this.rankTrackerService.checkKeywordRank({
        keyword: keywordData.keyword,
        domain: keywordData.domain,
        country: keywordData.countryName,
        deviceType: keywordData.deviceType
      })

      // 5. Handle API response with error logging
      if (!rankResult.errorMessage) {
        // Credit usage is automatically updated by RankTrackerService after each API call
        logger.info({ keyword: keywordData.keyword }, 'API credits consumed for successful request')
      } else {
        logger.warn({ error: rankResult.errorMessage }, 'API request failed')
        // Log API-level errors to error tracking system
        await this.logRankCheckError(keywordData, rankResult.errorMessage, 'api_error')
      }

      // 6. Store result in database (both success and failure)
      await this.storeRankResult(keywordData.id, rankResult)

      // 7. Update last check date
      await this.updateLastCheckDate(keywordData.id)

      logger.info({ keywordId: keywordData.id, position: rankResult.position || 'Not found' }, 'Rank check completed')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ keywordId: keywordData.id, error: errorMessage }, 'Firecrawl rank tracking failed')
      
      // Log error to error tracking system with proper classification
      await this.logRankCheckError(keywordData, errorMessage, this.classifyError(errorMessage))
      
      // Store failed result in database
      await this.storeFailedResult(keywordData.id, errorMessage)
      throw error // Re-throw to let caller handle
    }
  }

  /**
   * Store successful rank result in database
   */
  private async storeRankResult(keywordId: string, result: RankResult): Promise<void> {
    try {
      // Sanitize URL by removing query parameters before storing
      // Example: "https://cetta.id/en/?srsltid=..." -> "https://cetta.id/en"
      const cleanUrl = removeUrlParameters(result.url)
      
      if (result.url && cleanUrl !== result.url) {
        logger.debug({ 
          original: result.url, 
          cleaned: cleanUrl 
        }, 'URL sanitized: Removed query parameters')
      }

      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'store_rank_result',
          reason: 'System rank tracking - storing successful rank check result and updating current rankings',
          source: 'RankTracker.storeRankResult',
          metadata: {
            keywordId,
            position: result.position,
            found: result.found,
            operation_type: 'rank_storage'
          }
        },
        {
          table: 'indb_keyword_keywords',
          operationType: 'select'
        },
        async () => {
          // Get keyword details for device_type and country_id
          const { data: keyword, error: keywordError } = await supabaseAdmin
            .from('indb_keyword_keywords')
            .select('device_type, country_id')
            .eq('id', keywordId)
            .single()

          if (keywordError || !keyword) {
            throw new Error(`Failed to get keyword details: ${keywordError?.message}`)
          }

          // Insert into rank history with sanitized URL and Firecrawl response metadata
          const { error: historyError } = await supabaseAdmin
            .from('indb_keyword_rank_history')
            .insert({
              keyword_id: keywordId,
              position: result.position,
              url: cleanUrl, // Use sanitized URL
              search_volume: null, // Firecrawl doesn't provide search volume
              difficulty_score: null, // Firecrawl doesn't provide difficulty
              check_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
              device_type: keyword.device_type,
              country_id: keyword.country_id,
              metadata: result.firecrawlResponse || null, // Store complete Firecrawl API response
              created_at: new Date().toISOString()
            })

          if (historyError) {
            logger.error({ error: historyError.message }, 'Error storing rank history')
            throw new Error(`Failed to store rank history: ${historyError.message}`)
          }

          // Update or insert current ranking (for quick access on Overview page) with sanitized URL
          const { error: rankingError } = await supabaseAdmin
            .from('indb_keyword_rankings')
            .upsert({
              keyword_id: keywordId,
              position: result.position,
              url: cleanUrl, // Use sanitized URL
              search_volume: null,
              difficulty_score: null,
              check_date: new Date().toISOString().split('T')[0]
            }, {
              onConflict: 'keyword_id'
            })

          if (rankingError) {
            logger.error({ error: rankingError.message }, 'Error updating current ranking')
            throw new Error(`Failed to update current ranking: ${rankingError.message}`)
          }

          logger.info({ keywordId, cleanUrl }, 'Successfully stored rank result with sanitized URL')
        }
      );

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error storing rank result')
      throw error
    }
  }

  /**
   * Store failed rank check result
   */
  private async storeFailedResult(keywordId: string, errorMessage: string): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'store_failed_rank_result',
          reason: 'System rank tracking - storing failed rank check result for audit and troubleshooting',
          source: 'RankTracker.storeFailedResult',
          metadata: {
            keywordId,
            errorMessage,
            operation_type: 'failed_rank_storage'
          }
        },
        {
          table: 'indb_keyword_keywords',
          operationType: 'select'
        },
        async () => {
          // Get keyword details
          const { data: keyword, error: keywordError } = await supabaseAdmin
            .from('indb_keyword_keywords')
            .select('device_type, country_id')
            .eq('id', keywordId)
            .single()

          if (keywordError || !keyword) {
            logger.error({ error: keywordError?.message }, 'Failed to get keyword details for failed result')
            throw keywordError
          }

          // Store failed result in history with null position
          const { error } = await supabaseAdmin
            .from('indb_keyword_rank_history')
            .insert({
              keyword_id: keywordId,
              position: null,
              url: null,
              search_volume: null,
              difficulty_score: null,
              check_date: new Date().toISOString().split('T')[0],
              device_type: keyword.device_type,
              country_id: keyword.country_id,
              created_at: new Date().toISOString()
            })

          if (error) {
            logger.error({ error: error.message || String(error) }, 'Error storing failed result')
            throw error
          } else {
            logger.info(`Stored failed result for keyword ${keywordId}: ${errorMessage}`)
          }
        }
      );

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error storing failed result')
    }
  }

  /**
   * Update last check date for keyword
   */
  private async updateLastCheckDate(keywordId: string): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'update_keyword_last_check_date',
          reason: 'System rank tracking - updating keyword last check date after rank check completion',
          source: 'RankTracker.updateLastCheckDate',
          metadata: {
            keywordId,
            operation_type: 'keyword_timestamp_update'
          }
        },
        {
          table: 'indb_keyword_keywords',
          operationType: 'update'
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_keyword_keywords')
            .update({
              last_check_date: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString()
            })
            .eq('id', keywordId)

          if (error) {
            logger.error({ error: error.message || String(error) }, 'Error updating last check date')
            throw error
          } else {
            logger.info(`Updated last check date for keyword ${keywordId}`)
          }
        }
      );

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error updating last check date')
    }
  }

  /**
   * Log rank check error to error tracking system
   */
  private async logRankCheckError(
    keywordData: KeywordToTrack, 
    errorMessage: string,
    errorType: 'quota_exceeded' | 'api_error' | 'parsing_error' | 'network_error' | 'authentication_error' = 'api_error'
  ): Promise<void> {
    try {
      await errorTracker.logError({
        keywordId: keywordData.id,
        userId: keywordData.userId,
        errorType,
        errorMessage,
        timestamp: new Date(),
        severity: ErrorTracker.determineSeverity(errorType, errorMessage),
        context: {
          keyword: keywordData.keyword,
          domain: keywordData.domain,
          deviceType: keywordData.deviceType,
          countryCode: keywordData.countryCode
        }
      })
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to log rank check error')
    }
  }

  /**
   * Classify error type based on error message
   */
  private classifyError(errorMessage: string): 'quota_exceeded' | 'api_error' | 'parsing_error' | 'network_error' | 'authentication_error' {
    const message = errorMessage.toLowerCase()
    
    if (message.includes('credit') || message.includes('quota') || message.includes('limit exceeded') || message.includes('insufficient')) {
      return 'quota_exceeded'
    }
    
    if (message.includes('unauthorized') || message.includes('invalid api key') || message.includes('authentication')) {
      return 'authentication_error'
    }
    
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return 'network_error'
    }
    
    if (message.includes('parse') || message.includes('invalid response') || message.includes('unexpected format')) {
      return 'parsing_error'
    }
    
    return 'api_error' // Default classification
  }

  /**
   * Get keyword details with domain and country information
   */
  async getKeywordWithDetails(keywordId: string, userId: string): Promise<KeywordToTrack | null> {
    try {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_keyword_with_details',
          reason: 'System rank tracking - retrieving keyword details with domain and country information for rank checking',
          source: 'RankTracker.getKeywordWithDetails',
          metadata: {
            keywordId,
            targetUserId: userId,
            operation_type: 'keyword_details_retrieval'
          }
        },
        {
          table: 'indb_keyword_keywords',
          operationType: 'select'
        },
        async () => {
          const { data: keyword, error } = await supabaseAdmin
            .from('indb_keyword_keywords')
            .select(`
              *,
              domain:indb_keyword_domains(domain_name),
              country:indb_keyword_countries(name, iso2_code)
            `)
            .eq('id', keywordId)
            .eq('user_id', userId)
            .eq('is_active', true)
            .single()

          if (error || !keyword) {
            logger.warn(`Keyword not found: ${keywordId} for user ${userId}`)
            return null
          }

          return {
            id: keyword.id,
            keyword: keyword.keyword,
            domain: keyword.domain.domain_name,
            deviceType: keyword.device_type,
            countryCode: keyword.country.iso2_code,
            countryName: keyword.country.name,
            userId: keyword.user_id
          }
        }
      );

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error getting keyword details')
      return null
    }
  }
}
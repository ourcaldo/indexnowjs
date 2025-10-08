/**
 * API Key Manager Service
 * Manages Firecrawl API integration and credit tracking
 */

import { supabaseAdmin } from '../database/supabase'
import { SecureServiceRoleWrapper } from '../services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'

interface APIKeyInfo {
  apiKey: string
  quotaUsed: number
  quotaLimit: number
  quotaResetDate: string
}

export class APIKeyManager {
  /**
   * Get active API key (site-level configuration)
   * Automatically switches to next available key if current one is exhausted
   */
  async getActiveAPIKey(): Promise<string | null> {
    try {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_active_api_key',
          reason: 'System API management - retrieving active Firecrawl API key and managing quota exhaustion',
          source: 'APIKeyManager.getActiveAPIKey',
          metadata: {
            service_name: 'firecrawl',
            operation_type: 'api_key_management'
          }
        },
        {
          table: 'indb_site_integration',
          operationType: 'select'
        },
        async () => {
          // First, try to get current active API key
          const { data: integration, error } = await supabaseAdmin
            .from('indb_site_integration')
            .select('*')
            .eq('service_name', 'firecrawl')
            .eq('is_active', true)
            .single()

          if (error || !integration) {
            logger.warn({}, 'No active Firecrawl API integration found. Attempting to activate first available integration')
            
            // Try to activate the first available API key
            const activated = await this.activateNextAvailableAPIKey()
            if (activated) {
              // Recursively call to get the newly activated key
              return await this.getActiveAPIKey()
            }
            
            logger.error({}, 'No Firecrawl API integration available at all')
            return null
          }

          // Check if current key has credits available (minimum 10 credits needed)
          const hasCredits = (integration.api_quota_limit - integration.api_quota_used) >= 10
          if (!hasCredits) {
            logger.warn({ remainingCredits: integration.api_quota_limit - integration.api_quota_used }, 'Current API key has insufficient credits. Switching to next available key')
            
            // Deactivate current exhausted key
            await supabaseAdmin
              .from('indb_site_integration')
              .update({ is_active: false })
              .eq('id', integration.id)
            
            // Try to activate next available key
            const activated = await this.activateNextAvailableAPIKey()
            if (activated) {
              // Recursively call to get the newly activated key
              return await this.getActiveAPIKey()
            }
            
            logger.error({}, 'No alternative API keys with available credits found')
            return null
          }

          return integration.apikey
        }
      );

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error getting active API key')
      return null
    }
  }

  /**
   * Get available credits (site-level) - Variable credit consumption
   */
  async getAvailableQuota(): Promise<number> {
    try {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_available_quota',
          reason: 'System quota checking - retrieving available Firecrawl API credits for rank tracking',
          source: 'APIKeyManager.getAvailableQuota',
          metadata: {
            service_name: 'firecrawl',
            operation_type: 'quota_status_check'
          }
        },
        {
          table: 'indb_site_integration',
          operationType: 'select'
        },
        async () => {
          const { data: integration, error } = await supabaseAdmin
            .from('indb_site_integration')
            .select('api_quota_limit, api_quota_used')
            .eq('service_name', 'firecrawl')
            .eq('is_active', true)
            .single()

          if (error || !integration) {
            return 0
          }

          const available = integration.api_quota_limit - integration.api_quota_used
          // Return available credits (minimum 10 needed for search requests)
          return Math.max(0, available)
        }
      );

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error getting available credits')
      return 0
    }
  }

  /**
   * Update credit usage after API call - Variable credit consumption based on results
   * Credits are updated from the Firecrawl API response, not a fixed amount
   */
  async updateQuotaUsage(apiKey: string): Promise<void> {
    // Note: Credit usage is now handled by RankTrackerService after each API call
    // This method is kept for compatibility but credits are updated via updateCreditUsage()
    logger.info({}, 'Credit usage updated via Firecrawl API response tracking')
  }

  /**
   * REMOVED: Daily quota reset logic
   * IndexNow Rank Tracker quotas are TOTAL quotas until exhausted, not daily quotas
   * When quota hits limit, API integration becomes inactive and we switch to next available one
   */
  private async checkAndResetQuota(integration: any): Promise<void> {
    // No quota reset - quotas are total until exhausted
    // This method is kept for backward compatibility but does nothing
    return
  }

  /**
   * Activate next available API key when current one is exhausted
   * Fixed to properly find keys with available quota (no more daily reset logic)
   */
  private async activateNextAvailableAPIKey(): Promise<boolean> {
    try {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'activate_next_available_api_key',
          reason: 'System API management - activating next available Firecrawl API key when current one is exhausted',
          source: 'APIKeyManager.activateNextAvailableAPIKey',
          metadata: {
            service_name: 'firecrawl',
            operation_type: 'api_key_rotation'
          }
        },
        {
          table: 'indb_site_integration',
          operationType: 'update'
        },
        async () => {
          // Find next available Firecrawl API integration that is inactive but has credits remaining
          const { data: availableKeys, error } = await supabaseAdmin
            .from('indb_site_integration')
            .select('*')
            .eq('service_name', 'firecrawl')
            .eq('is_active', false)
            .order('created_at', { ascending: true })

          if (error || !availableKeys || availableKeys.length === 0) {
            logger.error({}, 'No alternative API integrations available. All Firecrawl API credits exhausted')
            return false
          }

          // Find the first key with available credits (minimum 10 credits needed)
          for (const key of availableKeys) {
            const availableCredits = key.api_quota_limit - key.api_quota_used
            
            if (availableCredits >= 10) { // Need at least 10 credits for next request
              // Activate this API key
              const { error: activateError } = await supabaseAdmin
                .from('indb_site_integration')
                .update({
                  is_active: true,
                  updated_at: new Date().toISOString()
                })
                .eq('id', key.id)

              if (!activateError) {
                logger.info({ availableCredits }, 'Successfully activated alternative API key')
                return true
              } else {
                logger.error({ error: activateError.message }, 'Error activating alternative API key')
                throw activateError
              }
            } else {
              logger.info({ availableCredits, required: 10 }, 'Skipping API key with insufficient credits')
            }
          }

          logger.error({}, 'No API integrations with available credits found. All Firecrawl API credits exhausted')
          return false
        }
      );

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error activating next available API key')
      return false
    }
  }

  /**
   * Get API key information with credit details (site-level)
   */
  async getAPIKeyInfo(): Promise<APIKeyInfo | null> {
    try {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_api_key_info',
          reason: 'System API management - retrieving detailed Firecrawl API key information and credit status',
          source: 'APIKeyManager.getAPIKeyInfo',
          metadata: {
            service_name: 'firecrawl',
            operation_type: 'api_key_info_retrieval'
          }
        },
        {
          table: 'indb_site_integration',
          operationType: 'select'
        },
        async () => {
          const { data: integration, error } = await supabaseAdmin
            .from('indb_site_integration')
            .select('*')
            .eq('service_name', 'firecrawl')
            .eq('is_active', true)
            .single()

          if (error || !integration) {
            return null
          }

          // Check and reset quota if needed
          await this.checkAndResetQuota(integration)

          // Get fresh data after potential reset
          const { data: freshIntegration } = await supabaseAdmin
            .from('indb_site_integration')
            .select('*')
            .eq('service_name', 'firecrawl')
            .eq('is_active', true)
            .single()

          if (!freshIntegration) return null

          return {
            apiKey: freshIntegration.apikey,
            quotaUsed: freshIntegration.api_quota_used,
            quotaLimit: freshIntegration.api_quota_limit,
            quotaResetDate: freshIntegration.quota_reset_date
          }
        }
      );

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error getting API key info')
      return null
    }
  }

  /**
   * Get total number of available API keys and credit status
   */
  async getAPIKeysSummary(): Promise<{
    totalKeys: number
    activeKeys: number
    totalQuota: number
    usedQuota: number
    availableQuota: number
  }> {
    try {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_api_keys_summary',
          reason: 'System monitoring - retrieving comprehensive Firecrawl API keys summary and quota statistics',
          source: 'APIKeyManager.getAPIKeysSummary',
          metadata: {
            service_name: 'firecrawl',
            operation_type: 'api_keys_summary_report'
          }
        },
        {
          table: 'indb_site_integration',
          operationType: 'select'
        },
        async () => {
          const { data: allKeys, error } = await supabaseAdmin
            .from('indb_site_integration')
            .select('*')
            .eq('service_name', 'firecrawl')

          if (error || !allKeys) {
            return { totalKeys: 0, activeKeys: 0, totalQuota: 0, usedQuota: 0, availableQuota: 0 }
          }

          const totalKeys = allKeys.length
          const activeKeys = allKeys.filter(key => key.is_active).length
          const totalQuota = allKeys.reduce((sum, key) => sum + (key.api_quota_limit || 0), 0)
          const usedQuota = allKeys.reduce((sum, key) => sum + (key.api_quota_used || 0), 0)
          const availableQuota = totalQuota - usedQuota

          return {
            totalKeys,
            activeKeys,
            totalQuota,
            usedQuota,
            availableQuota
          }
        }
      );

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error getting API keys summary')
      return { totalKeys: 0, activeKeys: 0, totalQuota: 0, usedQuota: 0, availableQuota: 0 }
    }
  }
}
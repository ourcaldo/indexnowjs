/**
 * Firecrawl Rank Tracker API Integration Service
 * Handles rank checking via Firecrawl API for search result analysis
 */

import { supabaseAdmin } from '../database/supabase'
import { SecureServiceRoleWrapper } from '../services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'

interface RankTrackerConfig {
  apiKey: string
  baseUrl: string
}

interface FirecrawlSearchRequest {
  query: string
  sources: string[]
  categories: string[]
  limit: number
  location: string
}

interface FirecrawlSearchResult {
  url: string
  title: string
  description: string
  position: number
}

interface FirecrawlApiResponse {
  success: boolean
  data: {
    web: FirecrawlSearchResult[]
    creditsUsed: number
  }
}

interface FirecrawlCreditResponse {
  success: boolean
  data: {
    remainingCredits: number
    planCredits: number | null
    billingPeriodStart: string | null
    billingPeriodEnd: string | null
  }
}

interface RankCheckRequest {
  keyword: string
  domain: string
  country: string // ISO2 code
  deviceType: 'desktop' | 'mobile'
}

interface RankCheckResponse {
  position: number | null
  url: string | null
  found: boolean
  totalResults: number
  errorMessage?: string
}


export class RankTrackerService {
  private config: RankTrackerConfig | null = null

  /**
   * Initialize service with API key from database
   */
  private async initialize(): Promise<void> {
    if (this.config) return // Already initialized

    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'initialize_rank_tracker_service',
          reason: 'System initialization - loading Firecrawl API configuration for rank tracking service',
          source: 'RankTrackerService.initialize',
          metadata: {
            service_name: 'firecrawl',
            operation_type: 'service_initialization'
          }
        },
        {
          table: 'indb_site_integration',
          operationType: 'select'
        },
        async () => {
          // Get API key and URL from database
          const { data: integration, error } = await supabaseAdmin
            .from('indb_site_integration')
            .select('apikey, api_url')
            .eq('service_name', 'firecrawl')
            .eq('is_active', true)
            .single()

          if (error || !integration?.apikey) {
            throw new Error('No active Firecrawl API integration found in database')
          }

          this.config = {
            apiKey: integration.apikey,
            baseUrl: integration.api_url || 'https://api.firecrawl.dev'
          }

          logger.info({}, 'Firecrawl Rank Tracker service initialized with database API key')
        }
      );

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to initialize Rank Tracker service')
      throw error
    }
  }

  /**
   * Check keyword ranking position for a specific domain using Firecrawl
   */
  async checkKeywordRank(request: RankCheckRequest): Promise<RankCheckResponse> {
    try {
      // Initialize service if not already done
      await this.initialize()
      
      if (!this.config) {
        throw new Error('Firecrawl service not properly initialized')
      }

      logger.info({ keyword: request.keyword, domain: request.domain }, 'Firecrawl: Checking rank')

      // Convert country code to full country name
      const countryName = this.convertCountryCodeToName(request.country)
      
      // Build Firecrawl search request
      const searchRequest: FirecrawlSearchRequest = {
        query: request.keyword,
        sources: ['web'],
        categories: [],
        limit: 100,
        location: countryName
      }

      // Make API request to Firecrawl
      const response = await this.makeFirecrawlRequest(searchRequest)
      
      if (!response.success) {
        throw new Error('Firecrawl API request failed')
      }

      // Process response to find domain position
      const result = this.processFirecrawlResponse(response, request.domain)
      
      // Update credit usage in database
      await this.updateCreditUsage(response.data.creditsUsed)
      
      return result

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Firecrawl rank check failed')
      return {
        position: null,
        url: null,
        found: false,
        totalResults: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Process Firecrawl API response to extract domain ranking
   */
  private processFirecrawlResponse(response: FirecrawlApiResponse, targetDomain: string): RankCheckResponse {
    logger.info({ resultCount: response.data.web.length }, 'Firecrawl: Processing search results')

    const cleanTargetDomain = this.extractDomain(targetDomain)
    
    // Search through results to find our domain
    for (const result of response.data.web) {
      const resultDomain = this.extractDomain(result.url)
      
      if (resultDomain === cleanTargetDomain) {
        logger.info({ domain: cleanTargetDomain, position: result.position }, 'Firecrawl: Found domain')
        return {
          position: result.position,
          url: result.url,
          found: true,
          totalResults: response.data.web.length
        }
      }
    }

    logger.info({ domain: cleanTargetDomain }, 'Firecrawl: Domain not found in search results')
    return {
      position: null,
      url: null,
      found: false,
      totalResults: response.data.web.length
    }
  }

  /**
   * Extract clean domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return urlObj.hostname.toLowerCase().replace(/^www\./, '')
    } catch (error) {
      // If URL parsing fails, try to extract domain manually
      const cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      return cleanUrl.toLowerCase()
    }
  }

  /**
   * Make HTTP request to Firecrawl API with error handling and retries
   */
  private async makeFirecrawlRequest(searchRequest: FirecrawlSearchRequest): Promise<FirecrawlApiResponse> {
    if (!this.config) {
      throw new Error('Service not initialized')
    }

    const url = `${this.config.baseUrl}/v2/search`

    logger.info(`Firecrawl: Making search request for keyword "${searchRequest.query}" in location "${searchRequest.location}"`)

    // Retry logic
    let lastError: Error | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.info(`Firecrawl: Sending request to ${url}`)
        logger.info(`Firecrawl: Request body: ${JSON.stringify(searchRequest)}`)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'IndexNow-Studio-Rank-Tracker/1.0'
          },
          body: JSON.stringify(searchRequest)
        })

        logger.info(`Firecrawl: Response status: ${response.status} ${response.statusText}`)

        if (!response.ok) {
          let errorDetails = ''
          try {
            errorDetails = await response.text()
            logger.error(`Firecrawl: Error response body: ${errorDetails}`)
          } catch (e) {
            logger.error('Firecrawl: Could not read error response body')
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`)
        }

        const data = await response.json() as FirecrawlApiResponse
        logger.info(`Firecrawl: Request successful, found ${data.data.web.length} results, used ${data.data.creditsUsed} credits`)
        return data

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        logger.warn({ error: lastError.message, attempt }, `Firecrawl: Attempt ${attempt}/3 failed`)
        
        if (attempt < 3) {
          // Wait before retry: 2s, 4s
          await this.delay(attempt * 2000)
        }
      }
    }

    throw lastError || new Error('All retry attempts failed')
  }

  /**
   * Convert ISO2 country code to full country name for Firecrawl
   */
  private convertCountryCodeToName(countryCode: string): string {
    const countryMap: Record<string, string> = {
      'ID': 'Indonesia',
      'US': 'United States',
      'MY': 'Malaysia',
      'SG': 'Singapore',
      'TH': 'Thailand',
      'PH': 'Philippines',
      'VN': 'Vietnam',
      'GB': 'United Kingdom',
      'AU': 'Australia',
      'CA': 'Canada',
      'IN': 'India',
      'JP': 'Japan',
      'KR': 'South Korea',
      'CN': 'China',
      'HK': 'Hong Kong',
      'TW': 'Taiwan',
      'DE': 'Germany',
      'FR': 'France',
      'IT': 'Italy',
      'ES': 'Spain',
      'NL': 'Netherlands',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'AR': 'Argentina',
      'CL': 'Chile',
      'CO': 'Colombia',
      'PE': 'Peru',
      'ZA': 'South Africa',
      'EG': 'Egypt',
      'NG': 'Nigeria',
      'KE': 'Kenya',
      'MA': 'Morocco',
      'TR': 'Turkey',
      'SA': 'Saudi Arabia',
      'AE': 'United Arab Emirates',
      'IL': 'Israel',
      'RU': 'Russia',
      'UA': 'Ukraine',
      'PL': 'Poland',
      'CZ': 'Czech Republic',
      'HU': 'Hungary',
      'RO': 'Romania',
      'BG': 'Bulgaria',
      'HR': 'Croatia',
      'RS': 'Serbia',
      'SK': 'Slovakia',
      'SI': 'Slovenia',
      'LT': 'Lithuania',
      'LV': 'Latvia',
      'EE': 'Estonia',
      'FI': 'Finland',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'IS': 'Iceland'
    }
    
    return countryMap[countryCode.toUpperCase()] || countryCode
  }

  /**
   * Update credit usage in database after API call
   */
  private async updateCreditUsage(creditsUsed: number): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'update_firecrawl_credit_usage',
          reason: 'System quota tracking - updating Firecrawl API credit usage after rank check API call',
          source: 'RankTrackerService.updateCreditUsage',
          metadata: {
            creditsUsed,
            service_name: 'firecrawl',
            operation_type: 'api_credit_tracking'
          }
        },
        {
          table: 'indb_site_integration',
          operationType: 'update'
        },
        async () => {
          // Get current credit info
          const creditInfo = await this.getCreditUsage()
          if (!creditInfo) {
            logger.error('Could not get credit usage info to update database')
            throw new Error('Failed to get credit usage info')
          }

          // Update the database with remaining credits
          const { error } = await supabaseAdmin
            .from('indb_site_integration')
            .update({
              api_quota_used: creditInfo.data.planCredits ? (creditInfo.data.planCredits - creditInfo.data.remainingCredits) : 0,
              api_quota_limit: creditInfo.data.planCredits || creditInfo.data.remainingCredits,
              updated_at: new Date().toISOString()
            })
            .eq('service_name', 'firecrawl')
            .eq('is_active', true)

          if (error) {
            logger.error({ error: error.message || String(error) }, 'Error updating credit usage')
            throw error
          } else {
            logger.info(`Updated credit usage: ${creditsUsed} credits used, ${creditInfo.data.remainingCredits} remaining`)
          }
        }
      );

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error updating credit usage')
    }
  }

  /**
   * Get current credit usage from Firecrawl API
   */
  private async getCreditUsage(): Promise<FirecrawlCreditResponse | null> {
    try {
      if (!this.config) {
        throw new Error('Service not initialized')
      }

      const url = `${this.config.baseUrl}/v2/team/credit-usage`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as FirecrawlCreditResponse
      logger.info(`Credit usage check: ${data.data.remainingCredits} credits remaining`)
      return data

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error getting credit usage')
      return null
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
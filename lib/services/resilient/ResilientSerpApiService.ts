/**
 * Resilient SERP API Service
 * 
 * Wraps SERP API calls with comprehensive resilience mechanisms
 * - Circuit breaker to prevent overwhelming failed service
 * - Exponential backoff with rate limit handling
 * - Cache fallback for graceful degradation
 * 
 * Phase 3 - Milestone C.7: Resilience integration with external APIs
 */

import { ResilientOperationExecutor } from '@/lib/resilience';
import { logger } from '@/lib/monitoring/error-handling';

export interface SerpApiRequest {
  keyword: string;
  location?: string;
  device?: 'desktop' | 'mobile';
  language?: string;
  domain?: string;
}

export interface SerpApiResult {
  keyword: string;
  position: number | null;
  url: string | null;
  title: string | null;
  snippet: string | null;
  timestamp: string;
}

export class ResilientSerpApiService {
  private static readonly API_BASE_URL = process.env.SERANKING_API_URL || '';
  private static readonly API_KEY = process.env.SERANKING_API_KEY || '';

  /**
   * Check keyword ranking with full resilience
   */
  static async checkRanking(request: SerpApiRequest): Promise<SerpApiResult> {
    const cacheKey = this.generateCacheKey(request);

    return ResilientOperationExecutor.executeSerpApi(
      async () => {
        logger.info({
          keyword: request.keyword,
          location: request.location,
          device: request.device
        }, 'Executing SERP API request');

        const response = await fetch(`${this.API_BASE_URL}/check-ranking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_KEY}`
          },
          body: JSON.stringify(request)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`SERP API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        return {
          keyword: request.keyword,
          position: data.position || null,
          url: data.url || null,
          title: data.title || null,
          snippet: data.snippet || null,
          timestamp: new Date().toISOString()
        };
      },
      cacheKey
    );
  }

  /**
   * Batch check rankings with resilience
   */
  static async batchCheckRankings(requests: SerpApiRequest[]): Promise<SerpApiResult[]> {
    const results: SerpApiResult[] = [];
    const errors: Error[] = [];

    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    for (let i = 0; i < requests.length; i += concurrencyLimit) {
      const batch = requests.slice(i, i + concurrencyLimit);
      
      const batchResults = await Promise.allSettled(
        batch.map(request => this.checkRanking(request))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push(result.reason);
          logger.error({
            keyword: batch[index].keyword,
            error: result.reason.message
          }, 'Batch ranking check failed');
        }
      });

      // Rate limiting delay between batches
      if (i + concurrencyLimit < requests.length) {
        await this.sleep(2000); // 2 second delay
      }
    }

    if (errors.length > 0) {
      logger.warn({
        total: requests.length,
        successful: results.length,
        failed: errors.length
      }, 'Batch ranking check completed with errors');
    }

    return results;
  }

  /**
   * Get search volume with resilience
   */
  static async getSearchVolume(keyword: string, location?: string): Promise<number> {
    const cacheKey = `search-volume:${keyword}:${location || 'global'}`;

    return ResilientOperationExecutor.executeSerpApi(
      async () => {
        const response = await fetch(`${this.API_BASE_URL}/search-volume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_KEY}`
          },
          body: JSON.stringify({ keyword, location })
        });

        if (!response.ok) {
          throw new Error(`SERP API error: ${response.status}`);
        }

        const data = await response.json();
        return data.volume || 0;
      },
      cacheKey
    );
  }

  /**
   * Generate cache key for request
   */
  private static generateCacheKey(request: SerpApiRequest): string {
    return `serp:${request.keyword}:${request.location || 'global'}:${request.device || 'desktop'}`;
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

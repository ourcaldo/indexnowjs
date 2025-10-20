/**
 * Immediate Rank Check Service
 * Triggers immediate rank checking for newly added keywords (instead of waiting for daily cron)
 */

import { RankTracker } from './rank-tracker'
import { logger } from '@/lib/monitoring/error-handling'

interface ImmediateCheckResult {
  keywordId: string
  success: boolean
  error?: string
}

/**
 * Trigger immediate rank check for newly added keywords
 * Runs asynchronously in background - does not block API response
 * 
 * @param keywordIds - Array of keyword IDs to check immediately
 * @param userId - User ID who owns these keywords
 */
export async function triggerImmediateRankCheck(
  keywordIds: string[],
  userId: string
): Promise<void> {
  // Validate input parameters
  if (!keywordIds || keywordIds.length === 0) {
    logger.info({}, 'No keywords to check - skipping immediate rank check')
    return
  }

  if (!userId) {
    logger.error({}, 'Missing userId - cannot proceed with immediate rank check')
    return
  }

  // Deduplicate keyword IDs to prevent duplicate checks
  const uniqueKeywordIds = Array.from(new Set(keywordIds))
  
  if (uniqueKeywordIds.length !== keywordIds.length) {
    logger.warn({ 
      original: keywordIds.length, 
      deduplicated: uniqueKeywordIds.length 
    }, 'Duplicate keyword IDs detected - deduplication applied')
  }

  logger.info({ 
    keywordCount: uniqueKeywordIds.length, 
    userId 
  }, 'Starting immediate rank check for newly added keywords')

  const rankTracker = new RankTracker()
  const results: ImmediateCheckResult[] = []

  // Process keywords sequentially to avoid overwhelming the API
  // (rate limiting is already handled in RankTrackerService)
  for (const keywordId of uniqueKeywordIds) {
    try {
      // Get keyword details (domain, country, etc.)
      const keywordData = await rankTracker.getKeywordWithDetails(keywordId, userId)
      
      if (!keywordData) {
        logger.warn({ keywordId }, 'Keyword not found or not accessible - skipping')
        results.push({
          keywordId,
          success: false,
          error: 'Keyword not found or not accessible'
        })
        continue
      }

      // Track the keyword (this will store result in database)
      await rankTracker.trackKeyword(keywordData)
      
      results.push({
        keywordId,
        success: true
      })

      logger.info({ 
        keywordId, 
        keyword: keywordData.keyword,
        domain: keywordData.domain 
      }, 'Immediate rank check completed successfully')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      results.push({
        keywordId,
        success: false,
        error: errorMessage
      })

      logger.error({ 
        keywordId, 
        error: errorMessage 
      }, 'Immediate rank check failed for keyword')
    }

    // Small delay between keywords to be respectful to API
    // (rate limiter already handles this, but extra safety)
    if (uniqueKeywordIds.indexOf(keywordId) < uniqueKeywordIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  const successCount = results.filter(r => r.success).length
  const failureCount = results.filter(r => !r.success).length

  logger.info({ 
    totalKeywords: uniqueKeywordIds.length,
    successCount,
    failureCount,
    userId
  }, 'Immediate rank check batch completed')
}

/**
 * Start immediate rank check in background (fire-and-forget)
 * This function returns immediately without waiting for checks to complete
 * 
 * @param keywordIds - Array of keyword IDs to check
 * @param userId - User ID who owns these keywords
 */
export function startImmediateRankCheckInBackground(
  keywordIds: string[],
  userId: string
): void {
  // Fire-and-forget: Start the check but don't wait for it
  triggerImmediateRankCheck(keywordIds, userId).catch(error => {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      keywordIds,
      userId
    }, 'Background immediate rank check failed')
  })

  logger.info({ 
    keywordCount: keywordIds.length 
  }, 'Immediate rank check started in background')
}

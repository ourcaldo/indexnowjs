/**
 * Firecrawl API Rate Limiter
 * 
 * Implements sliding window rate limiting for Firecrawl API
 * Limit: 30 requests per minute per API key
 * 
 * This is SERVER-SIDE rate limiting to prevent 429 errors from Firecrawl API
 * Different from user quota management - this tracks actual API calls per minute
 */

import { logger } from '@/lib/monitoring/error-handling'

interface RateLimitWindow {
  apiKey: string
  requestTimestamps: number[] // Unix timestamps in milliseconds
  lastCleanup: number
}

export class FirecrawlRateLimiter {
  private static instance: FirecrawlRateLimiter | null = null
  
  // Sliding window tracking for each API key
  private windows: Map<string, RateLimitWindow> = new Map()
  
  // Rate limit configuration
  private readonly REQUESTS_PER_MINUTE = 30
  private readonly WINDOW_SIZE_MS = 60 * 1000 // 60 seconds
  private readonly CLEANUP_INTERVAL_MS = 10 * 1000 // Clean up every 10 seconds
  
  // Safety buffer to stay under limit
  private readonly SAFETY_BUFFER = 2 // Stay 2 requests below limit for safety

  private constructor() {
    // Start periodic cleanup of old timestamps
    this.startPeriodicCleanup()
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FirecrawlRateLimiter {
    if (!FirecrawlRateLimiter.instance) {
      FirecrawlRateLimiter.instance = new FirecrawlRateLimiter()
    }
    return FirecrawlRateLimiter.instance
  }

  /**
   * Acquire a slot for making a Firecrawl API request
   * Returns true if request can proceed, false if rate limit would be exceeded
   * 
   * This method BLOCKS until a slot becomes available or timeout is reached
   */
  public async acquireSlot(apiKey: string, timeoutMs: number = 65000): Promise<boolean> {
    const startTime = Date.now()
    const keyHash = this.hashApiKey(apiKey)
    
    while (true) {
      // Check if we've exceeded timeout
      if (Date.now() - startTime > timeoutMs) {
        logger.warn({ keyHash }, 'Rate limiter: Timeout waiting for available slot')
        return false
      }

      // Get current window
      const window = this.getOrCreateWindow(keyHash)
      
      // Clean up old timestamps outside the sliding window
      this.cleanupWindow(window)
      
      // Check if we have capacity (staying under limit with safety buffer)
      const effectiveLimit = this.REQUESTS_PER_MINUTE - this.SAFETY_BUFFER
      if (window.requestTimestamps.length < effectiveLimit) {
        // Record this request timestamp
        window.requestTimestamps.push(Date.now())
        
        logger.debug({ 
          keyHash,
          requestsInWindow: window.requestTimestamps.length,
          limit: this.REQUESTS_PER_MINUTE,
          effectiveLimit
        }, 'Rate limiter: Slot acquired')
        
        return true
      }
      
      // Rate limit would be exceeded - calculate wait time
      const oldestTimestamp = window.requestTimestamps[0]
      const waitTimeMs = this.WINDOW_SIZE_MS - (Date.now() - oldestTimestamp)
      
      if (waitTimeMs > 0) {
        logger.info({ 
          keyHash,
          requestsInWindow: window.requestTimestamps.length,
          waitTimeMs: Math.ceil(waitTimeMs / 1000),
          limit: this.REQUESTS_PER_MINUTE
        }, 'Rate limiter: At capacity, waiting for slot to become available')
        
        // Wait for oldest request to fall outside the window
        await this.delay(Math.min(waitTimeMs + 100, 5000)) // Max 5 second wait per iteration
      } else {
        // Window should have capacity now, try again immediately
        continue
      }
    }
  }

  /**
   * Check if request can proceed without blocking
   * Returns true if request can proceed immediately
   */
  public canProceed(apiKey: string): boolean {
    const keyHash = this.hashApiKey(apiKey)
    const window = this.getOrCreateWindow(keyHash)
    this.cleanupWindow(window)
    
    const effectiveLimit = this.REQUESTS_PER_MINUTE - this.SAFETY_BUFFER
    return window.requestTimestamps.length < effectiveLimit
  }

  /**
   * Get number of remaining slots in current window
   */
  public getRemainingSlots(apiKey: string): number {
    const keyHash = this.hashApiKey(apiKey)
    const window = this.getOrCreateWindow(keyHash)
    this.cleanupWindow(window)
    
    const effectiveLimit = this.REQUESTS_PER_MINUTE - this.SAFETY_BUFFER
    return Math.max(0, effectiveLimit - window.requestTimestamps.length)
  }

  /**
   * Get current request count in sliding window
   */
  public getCurrentCount(apiKey: string): number {
    const keyHash = this.hashApiKey(apiKey)
    const window = this.getOrCreateWindow(keyHash)
    this.cleanupWindow(window)
    
    return window.requestTimestamps.length
  }

  /**
   * Get estimated time until next slot becomes available (in milliseconds)
   */
  public getTimeUntilNextSlot(apiKey: string): number {
    const keyHash = this.hashApiKey(apiKey)
    const window = this.getOrCreateWindow(keyHash)
    this.cleanupWindow(window)
    
    const effectiveLimit = this.REQUESTS_PER_MINUTE - this.SAFETY_BUFFER
    if (window.requestTimestamps.length < effectiveLimit) {
      return 0 // Slot available now
    }
    
    const oldestTimestamp = window.requestTimestamps[0]
    const timeUntilExpiry = this.WINDOW_SIZE_MS - (Date.now() - oldestTimestamp)
    
    return Math.max(0, timeUntilExpiry)
  }

  /**
   * Reset rate limit for specific API key (for testing or manual reset)
   */
  public reset(apiKey: string): void {
    const keyHash = this.hashApiKey(apiKey)
    this.windows.delete(keyHash)
    logger.info({ keyHash }, 'Rate limiter: Window reset')
  }

  /**
   * Reset all rate limits (for testing)
   */
  public resetAll(): void {
    this.windows.clear()
    logger.info({}, 'Rate limiter: All windows reset')
  }

  /**
   * Get or create rate limit window for API key
   */
  private getOrCreateWindow(keyHash: string): RateLimitWindow {
    let window = this.windows.get(keyHash)
    
    if (!window) {
      window = {
        apiKey: keyHash,
        requestTimestamps: [],
        lastCleanup: Date.now()
      }
      this.windows.set(keyHash, window)
    }
    
    return window
  }

  /**
   * Remove timestamps outside the sliding window
   */
  private cleanupWindow(window: RateLimitWindow): void {
    const now = Date.now()
    const cutoffTime = now - this.WINDOW_SIZE_MS
    
    // Filter out timestamps older than window size
    const before = window.requestTimestamps.length
    window.requestTimestamps = window.requestTimestamps.filter(
      timestamp => timestamp > cutoffTime
    )
    const after = window.requestTimestamps.length
    
    if (before !== after) {
      logger.debug({ 
        removed: before - after,
        remaining: after
      }, 'Rate limiter: Cleaned up expired timestamps')
    }
    
    window.lastCleanup = now
  }

  /**
   * Periodic cleanup of all windows
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      
      for (const [keyHash, window] of Array.from(this.windows.entries())) {
        // Cleanup if window hasn't been cleaned recently
        if (now - window.lastCleanup > this.CLEANUP_INTERVAL_MS) {
          this.cleanupWindow(window)
          
          // Remove window if it's been idle (no requests in last 5 minutes)
          if (window.requestTimestamps.length === 0 && 
              now - window.lastCleanup > 5 * 60 * 1000) {
            this.windows.delete(keyHash)
            logger.debug({ keyHash }, 'Rate limiter: Removed idle window')
          }
        }
      }
    }, this.CLEANUP_INTERVAL_MS)
  }

  /**
   * Hash API key for privacy (don't store actual API keys in memory)
   */
  private hashApiKey(apiKey: string): string {
    // Simple hash - just use last 8 characters as identifier
    // In production, you might want to use a proper hash function
    return apiKey.slice(-8)
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get rate limiter statistics for monitoring
   */
  public getStats(): {
    activeWindows: number
    totalRequests: number
    limit: number
    effectiveLimit: number
  } {
    let totalRequests = 0
    
    for (const window of Array.from(this.windows.values())) {
      this.cleanupWindow(window)
      totalRequests += window.requestTimestamps.length
    }
    
    return {
      activeWindows: this.windows.size,
      totalRequests,
      limit: this.REQUESTS_PER_MINUTE,
      effectiveLimit: this.REQUESTS_PER_MINUTE - this.SAFETY_BUFFER
    }
  }
}

// Export singleton instance
export const firecrawlRateLimiter = FirecrawlRateLimiter.getInstance()

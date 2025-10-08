/**
 * Rate Limiter
 * API rate limiting and throttling for SeRanking integration
 */

import {
  RateLimitConfig,
  RateLimitState,
  SeRankingErrorType
} from '../types/SeRankingTypes';

export class RateLimiter {
  private config: RateLimitConfig;
  private state: RateLimitState;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.state = this.initializeState();
  }

  /**
   * Check if request is allowed under current rate limits
   */
  async isAllowed(requestCount: number = 1): Promise<boolean> {
    const now = new Date();
    
    // Clean up expired requests
    await this.cleanupExpiredRequests(now);
    
    // Check each time window
    const minuteAllowed = this.isAllowedInWindow(
      this.state.minuteRequests, 
      this.config.requestsPerMinute, 
      requestCount
    );
    
    const hourAllowed = this.isAllowedInWindow(
      this.state.hourRequests, 
      this.config.requestsPerHour, 
      requestCount
    );
    
    const dailyAllowed = this.isAllowedInWindow(
      this.state.dailyRequests, 
      this.config.requestsPerDay, 
      requestCount
    );
    
    return minuteAllowed && hourAllowed && dailyAllowed;
  }

  /**
   * Record successful API requests
   */
  async recordRequest(requestCount: number = 1): Promise<void> {
    const now = new Date();
    const timestamp = now.getTime();
    
    // Add requests to each time window
    for (let i = 0; i < requestCount; i++) {
      this.state.minuteRequests.push(timestamp);
      this.state.hourRequests.push(timestamp);
      this.state.dailyRequests.push(timestamp);
    }
    
    // Clean up expired requests
    await this.cleanupExpiredRequests(now);
  }

  /**
   * Get current rate limit status
   */
  async getStatus(): Promise<{
    remaining: { minute: number; hour: number; day: number };
    resetTime: { minute: Date; hour: Date; day: Date };
    currentUsage: { minute: number; hour: number; day: number };
  }> {
    const now = new Date();
    await this.cleanupExpiredRequests(now);
    
    return {
      remaining: {
        minute: Math.max(0, this.config.requestsPerMinute - this.state.minuteRequests.length),
        hour: Math.max(0, this.config.requestsPerHour - this.state.hourRequests.length),
        day: Math.max(0, this.config.requestsPerDay - this.state.dailyRequests.length)
      },
      resetTime: {
        minute: new Date(now.getTime() + (60 * 1000)), // Next minute
        hour: new Date(now.getTime() + (60 * 60 * 1000)), // Next hour
        day: new Date(now.getTime() + (24 * 60 * 60 * 1000)) // Next day
      },
      currentUsage: {
        minute: this.state.minuteRequests.length,
        hour: this.state.hourRequests.length,
        day: this.state.dailyRequests.length
      }
    };
  }

  /**
   * Calculate delay needed before next request can be made
   */
  async getRetryAfterDelay(requestCount: number = 1): Promise<number> {
    const now = new Date();
    await this.cleanupExpiredRequests(now);
    
    // Check which limit would be exceeded
    const minuteDelay = this.getDelayForWindow(
      this.state.minuteRequests,
      this.config.requestsPerMinute,
      requestCount,
      60 * 1000 // 1 minute in ms
    );
    
    const hourDelay = this.getDelayForWindow(
      this.state.hourRequests,
      this.config.requestsPerHour,
      requestCount,
      60 * 60 * 1000 // 1 hour in ms
    );
    
    const dailyDelay = this.getDelayForWindow(
      this.state.dailyRequests,
      this.config.requestsPerDay,
      requestCount,
      24 * 60 * 60 * 1000 // 24 hours in ms
    );
    
    // Return the longest delay needed
    return Math.max(minuteDelay, hourDelay, dailyDelay);
  }

  /**
   * Reset all rate limit counters
   */
  async reset(): Promise<void> {
    this.state = this.initializeState();
  }

  /**
   * Wait for rate limit to allow request
   */
  async waitForAvailability(requestCount: number = 1): Promise<void> {
    const isAllowed = await this.isAllowed(requestCount);
    
    if (!isAllowed) {
      const delay = await this.getRetryAfterDelay(requestCount);
      
      if (delay > 0) {
        await this.sleep(delay);
        
        // Recursively check again after waiting
        return this.waitForAvailability(requestCount);
      }
    }
  }

  /**
   * Get throttling error if request would exceed limits
   */
  async getThrottlingError(requestCount: number = 1): Promise<Error | null> {
    const isAllowed = await this.isAllowed(requestCount);
    
    if (!isAllowed) {
      const delay = await this.getRetryAfterDelay(requestCount);
      const status = await this.getStatus();
      
      let limitType = '';
      let retryAfter = 0;
      
      if (status.remaining.minute < requestCount) {
        limitType = 'minute';
        retryAfter = 60; // seconds
      } else if (status.remaining.hour < requestCount) {
        limitType = 'hour';
        retryAfter = 3600; // seconds
      } else if (status.remaining.day < requestCount) {
        limitType = 'day';
        retryAfter = 86400; // seconds
      }
      
      const error = new Error(
        `Rate limit exceeded: ${requestCount} requests would exceed ${limitType} limit. Retry after ${retryAfter} seconds.`
      );
      
      // Add rate limit specific properties
      (error as any).type = SeRankingErrorType.RATE_LIMIT_ERROR;
      (error as any).retryable = true;
      (error as any).retryAfter = retryAfter;
      (error as any).limitType = limitType;
      (error as any).remaining = status.remaining;
      
      return error;
    }
    
    return null;
  }

  /**
   * Initialize rate limit state
   */
  private initializeState(): RateLimitState {
    const now = new Date();
    
    return {
      minuteRequests: [],
      hourRequests: [],
      dailyRequests: [],
      lastReset: {
        minute: now,
        hour: now,
        day: now
      }
    };
  }

  /**
   * Check if request is allowed within a specific time window
   */
  private isAllowedInWindow(
    requests: number[], 
    limit: number, 
    requestCount: number
  ): boolean {
    return (requests.length + requestCount) <= limit;
  }

  /**
   * Calculate delay needed for a specific time window
   */
  private getDelayForWindow(
    requests: number[],
    limit: number,
    requestCount: number,
    windowMs: number
  ): number {
    if ((requests.length + requestCount) <= limit) {
      return 0; // No delay needed
    }
    
    // Find the oldest request that would need to expire
    const excessRequests = (requests.length + requestCount) - limit;
    
    if (requests.length >= excessRequests) {
      const oldestRelevantRequest = requests[excessRequests - 1];
      const now = Date.now();
      const expiryTime = oldestRelevantRequest + windowMs;
      
      return Math.max(0, expiryTime - now);
    }
    
    return windowMs; // Wait for full window if we can't calculate exactly
  }

  /**
   * Clean up expired requests from all windows
   */
  private async cleanupExpiredRequests(now: Date): Promise<void> {
    const currentTime = now.getTime();
    
    // Clean minute window (keep last 60 seconds)
    const minuteThreshold = currentTime - (60 * 1000);
    this.state.minuteRequests = this.state.minuteRequests.filter(
      timestamp => timestamp > minuteThreshold
    );
    
    // Clean hour window (keep last 60 minutes)
    const hourThreshold = currentTime - (60 * 60 * 1000);
    this.state.hourRequests = this.state.hourRequests.filter(
      timestamp => timestamp > hourThreshold
    );
    
    // Clean daily window (keep last 24 hours)
    const dailyThreshold = currentTime - (24 * 60 * 60 * 1000);
    this.state.dailyRequests = this.state.dailyRequests.filter(
      timestamp => timestamp > dailyThreshold
    );
    
    // Update last reset times
    this.state.lastReset = {
      minute: now,
      hour: now,
      day: now
    };
  }

  /**
   * Sleep utility for waiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create default rate limit configuration for SeRanking
   */
  static createDefaultConfig(): RateLimitConfig {
    return {
      requestsPerMinute: 60,   // Conservative estimate
      requestsPerHour: 1000,   // Conservative estimate  
      requestsPerDay: 10000    // Conservative estimate (will be limited by quota)
    };
  }

  /**
   * Create conservative rate limit configuration
   */
  static createConservativeConfig(): RateLimitConfig {
    return {
      requestsPerMinute: 30,   // Very conservative
      requestsPerHour: 500,    // Very conservative
      requestsPerDay: 5000     // Very conservative
    };
  }

  /**
   * Create aggressive rate limit configuration (use with caution)
   */
  static createAggressiveConfig(): RateLimitConfig {
    return {
      requestsPerMinute: 120,  // Aggressive
      requestsPerHour: 2000,   // Aggressive
      requestsPerDay: 20000    // Aggressive
    };
  }

  /**
   * Calculate optimal batch size for given rate limits
   */
  static calculateOptimalBatchSize(config: RateLimitConfig): number {
    // Conservative batch size based on minute limit
    return Math.min(
      Math.floor(config.requestsPerMinute / 2), // Use half of minute limit
      50 // Never exceed 50 keywords per batch
    );
  }

  /**
   * Estimate time to complete given number of requests
   */
  static estimateCompletionTime(
    requestCount: number, 
    config: RateLimitConfig
  ): {
    optimisticMinutes: number;
    conservativeMinutes: number;
    batchCount: number;
  } {
    const batchSize = this.calculateOptimalBatchSize(config);
    const batchCount = Math.ceil(requestCount / batchSize);
    
    // Optimistic: Use minute rate limit
    const optimisticMinutes = Math.ceil(batchCount / (config.requestsPerMinute / batchSize));
    
    // Conservative: Account for potential delays and overhead
    const conservativeMinutes = optimisticMinutes * 1.5;
    
    return {
      optimisticMinutes,
      conservativeMinutes,
      batchCount
    };
  }
}
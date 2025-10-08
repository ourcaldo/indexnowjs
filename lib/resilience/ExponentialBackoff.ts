/**
 * Exponential Backoff Implementation
 * 
 * Automatically retries failed operations with increasing delays
 * Prevents overwhelming failed services with repeated requests
 * 
 * Phase 3 - Milestone C.5: Exponential Backoff implementation
 */

import { logger } from '@/lib/monitoring/error-handling';

export interface RetryConfig {
  maxAttempts: number;          // Maximum number of retry attempts
  initialDelay: number;          // Initial delay in milliseconds
  maxDelay: number;              // Maximum delay in milliseconds
  multiplier: number;            // Delay multiplier (typically 2 for exponential)
  jitter: boolean;               // Add randomness to prevent thundering herd
  retryableErrors?: RegExp[];    // Patterns for retryable errors
  onRetry?: (attempt: number, delay: number, error: Error) => void;
}

export interface RetryMetrics {
  attempts: number;
  totalDelay: number;
  success: boolean;
  finalError?: Error;
}

export class ExponentialBackoff {
  private readonly config: Required<RetryConfig>;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: config.maxAttempts ?? 3,
      initialDelay: config.initialDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      multiplier: config.multiplier ?? 2,
      jitter: config.jitter ?? true,
      retryableErrors: config.retryableErrors ?? [
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /ENOTFOUND/,
        /503/,
        /502/,
        /504/,
        /429/ // Rate limit
      ],
      onRetry: config.onRetry ?? (() => {})
    };
  }

  /**
   * Execute operation with exponential backoff retry
   */
  async execute<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    const metrics: RetryMetrics = {
      attempts: 0,
      totalDelay: 0,
      success: false
    };

    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      metrics.attempts = attempt;

      try {
        const result = await operation();
        metrics.success = true;
        
        if (attempt > 1) {
          logger.info({
            context,
            attempt,
            totalDelay: metrics.totalDelay,
            maxAttempts: this.config.maxAttempts
          }, 'Operation succeeded after retry');
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        metrics.finalError = lastError;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(lastError);
        const isLastAttempt = attempt === this.config.maxAttempts;

        if (!isRetryable || isLastAttempt) {
          logger.error({
            context,
            attempt,
            maxAttempts: this.config.maxAttempts,
            isRetryable,
            error: lastError.message
          }, 'Operation failed, no more retries');
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);
        metrics.totalDelay += delay;

        logger.warn({
          context,
          attempt,
          nextAttempt: attempt + 1,
          delay,
          error: lastError.message
        }, 'Operation failed, retrying with backoff');

        // Call onRetry callback
        this.config.onRetry(attempt, delay, lastError);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Calculate delay for given attempt with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    // Calculate exponential delay
    let delay = this.config.initialDelay * Math.pow(this.config.multiplier, attempt - 1);
    
    // Cap at max delay
    delay = Math.min(delay, this.config.maxDelay);

    // Add jitter if enabled (±25% randomness)
    if (this.config.jitter) {
      const jitterRange = delay * 0.25;
      const jitter = (Math.random() * 2 - 1) * jitterRange;
      delay = delay + jitter;
    }

    return Math.floor(delay);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message || '';
    return this.config.retryableErrors.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Pre-configured backoff strategies
 */
export const BackoffStrategies = {
  /**
   * Fast retry - for operations that usually succeed quickly
   */
  fast: new ExponentialBackoff({
    maxAttempts: 3,
    initialDelay: 500,
    maxDelay: 5000,
    multiplier: 2,
    jitter: true
  }),

  /**
   * Standard retry - balanced approach
   */
  standard: new ExponentialBackoff({
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true
  }),

  /**
   * Slow retry - for expensive operations
   */
  slow: new ExponentialBackoff({
    maxAttempts: 3,
    initialDelay: 5000,
    maxDelay: 60000,
    multiplier: 3,
    jitter: true
  }),

  /**
   * Aggressive retry - for critical operations
   */
  aggressive: new ExponentialBackoff({
    maxAttempts: 10,
    initialDelay: 500,
    maxDelay: 120000,
    multiplier: 2,
    jitter: true
  }),

  /**
   * API rate limit retry - for rate-limited APIs
   */
  rateLimit: new ExponentialBackoff({
    maxAttempts: 5,
    initialDelay: 2000,
    maxDelay: 60000,
    multiplier: 2,
    jitter: true,
    retryableErrors: [/429/, /rate.limit/i, /too.many.requests/i]
  })
};

/**
 * Utility function for simple retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>,
  context?: string
): Promise<T> {
  const backoff = new ExponentialBackoff(config);
  return backoff.execute(operation, context);
}

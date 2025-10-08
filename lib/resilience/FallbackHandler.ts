/**
 * Fallback Handler Implementation
 * 
 * Provides fallback strategies when operations fail
 * Ensures graceful degradation of service
 * 
 * Phase 3 - Milestone C.6: Fallback Handler implementation
 */

import { logger } from '@/lib/monitoring/error-handling';

export type FallbackStrategy<T> = 
  | { type: 'default'; value: T }
  | { type: 'cached'; ttl?: number }
  | { type: 'alternative'; operation: () => Promise<T> }
  | { type: 'degraded'; operation: () => Promise<Partial<T>> }
  | { type: 'empty' }
  | { type: 'error' };

export interface FallbackConfig<T> {
  strategies: FallbackStrategy<T>[];
  cacheTTL?: number;
  logFallbacks?: boolean;
}

export class FallbackHandler<T = any> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private readonly defaultCacheTTL = 300000; // 5 minutes

  constructor(private config: FallbackConfig<T>) {}

  /**
   * Execute operation with fallback strategies
   */
  async executeWithFallback(
    operation: () => Promise<T>,
    cacheKey?: string,
    context?: string
  ): Promise<T> {
    try {
      const result = await operation();
      
      // Cache successful result if cacheKey provided
      if (cacheKey) {
        this.setCached(cacheKey, result);
      }
      
      return result;
    } catch (primaryError) {
      if (this.config.logFallbacks) {
        logger.warn({
          context,
          error: (primaryError as Error).message,
          strategiesAvailable: this.config.strategies.length
        }, 'Primary operation failed, trying fallback strategies');
      }

      // Try each fallback strategy in order
      for (let index = 0; index < this.config.strategies.length; index++) {
        const strategy = this.config.strategies[index];
        try {
          const result = await this.executeFallbackStrategy(
            strategy,
            cacheKey,
            context
          );
          
          if (this.config.logFallbacks) {
            logger.info({
              context,
              strategyIndex: index,
              strategyType: strategy.type
            }, 'Fallback strategy succeeded');
          }
          
          return result as T;
        } catch (fallbackError) {
          if (this.config.logFallbacks) {
            logger.warn({
              context,
              strategyIndex: index,
              strategyType: strategy.type,
              error: (fallbackError as Error).message
            }, 'Fallback strategy failed, trying next');
          }
          // Continue to next strategy
        }
      }

      // All fallbacks failed
      logger.error({
        context,
        primaryError: (primaryError as Error).message,
        strategiesTried: this.config.strategies.length
      }, 'All fallback strategies failed');
      
      throw primaryError;
    }
  }

  /**
   * Execute a specific fallback strategy
   */
  private async executeFallbackStrategy(
    strategy: FallbackStrategy<T>,
    cacheKey?: string,
    context?: string
  ): Promise<T | Partial<T>> {
    switch (strategy.type) {
      case 'default':
        return strategy.value;

      case 'cached':
        if (!cacheKey) {
          throw new Error('Cache key required for cached fallback strategy');
        }
        const cached = this.getCached(cacheKey, strategy.ttl);
        if (!cached) {
          throw new Error('No cached value available');
        }
        return cached;

      case 'alternative':
        return await strategy.operation();

      case 'degraded':
        return await strategy.operation();

      case 'empty':
        return {} as T;

      case 'error':
        throw new Error('Error fallback - no fallback available');

      default:
        throw new Error(`Unknown fallback strategy: ${(strategy as any).type}`);
    }
  }

  /**
   * Get cached value if not expired
   */
  private getCached(key: string, ttl?: number): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const maxAge = ttl ?? this.config.cacheTTL ?? this.defaultCacheTTL;
    const age = Date.now() - cached.timestamp;

    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Set cached value
   */
  private setCached(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cached values
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear specific cached value
   */
  clearCacheKey(key: string): void {
    this.cache.delete(key);
  }
}

/**
 * Create a fallback handler with common strategies
 */
export function createFallbackHandler<T>(
  strategies: FallbackStrategy<T>[],
  config?: Partial<FallbackConfig<T>>
): FallbackHandler<T> {
  return new FallbackHandler({
    strategies,
    cacheTTL: config?.cacheTTL,
    logFallbacks: config?.logFallbacks ?? true
  });
}

/**
 * Pre-configured fallback handlers for common scenarios
 */
export const FallbackHandlers = {
  /**
   * Cached with default fallback
   */
  cachedWithDefault<T>(defaultValue: T, cacheTTL = 300000): FallbackHandler<T> {
    return new FallbackHandler({
      strategies: [
        { type: 'cached', ttl: cacheTTL },
        { type: 'default', value: defaultValue }
      ],
      cacheTTL,
      logFallbacks: true
    });
  },

  /**
   * Alternative operation with empty fallback
   */
  alternativeWithEmpty<T>(alternativeOp: () => Promise<T>): FallbackHandler<T> {
    return new FallbackHandler({
      strategies: [
        { type: 'alternative', operation: alternativeOp },
        { type: 'empty' }
      ],
      logFallbacks: true
    });
  },

  /**
   * Degraded service fallback
   */
  degradedService<T>(degradedOp: () => Promise<Partial<T>>): FallbackHandler<Partial<T>> {
    return new FallbackHandler<Partial<T>>({
      strategies: [
        { type: 'cached' },
        { type: 'degraded', operation: degradedOp },
        { type: 'empty' }
      ],
      logFallbacks: true
    });
  },

  /**
   * Fail-safe with multiple alternatives
   */
  multipleAlternatives<T>(
    alternatives: Array<() => Promise<T>>,
    defaultValue?: T
  ): FallbackHandler<T> {
    const strategies: FallbackStrategy<T>[] = [
      { type: 'cached' },
      ...alternatives.map(op => ({ type: 'alternative' as const, operation: op }))
    ];
    
    if (defaultValue !== undefined) {
      strategies.push({ type: 'default', value: defaultValue });
    } else {
      strategies.push({ type: 'empty' });
    }

    return new FallbackHandler({
      strategies,
      logFallbacks: true
    });
  }
};

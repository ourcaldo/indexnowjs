/**
 * Resilient Operation Executor
 * 
 * Combines Circuit Breaker, Exponential Backoff, and Fallback Handler
 * for comprehensive resilience in external service calls
 * 
 * Phase 3 - Milestone C.7: Integration of resilience mechanisms
 */

import { CircuitBreaker, CircuitBreakerManager } from './CircuitBreaker';
import { ExponentialBackoff, RetryConfig } from './ExponentialBackoff';
import { FallbackHandler, FallbackStrategy } from './FallbackHandler';
import { logger } from '@/lib/monitoring/error-handling';

export interface ResilientOperationConfig<T> {
  serviceName: string;
  circuitBreaker?: boolean;
  retryConfig?: Partial<RetryConfig>;
  fallbackStrategies?: FallbackStrategy<T>[];
  cacheKey?: string;
  context?: string;
}

export class ResilientOperationExecutor {
  /**
   * Execute operation with full resilience protection
   */
  static async execute<T>(
    operation: () => Promise<T>,
    config: ResilientOperationConfig<T>
  ): Promise<T> {
    const { serviceName, circuitBreaker, retryConfig, fallbackStrategies, cacheKey, context } = config;

    // Create resilience layers
    const breaker = circuitBreaker !== false 
      ? CircuitBreakerManager.getBreaker(serviceName)
      : null;

    const backoff = new ExponentialBackoff(retryConfig || {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true
    });

    const fallbackHandler = fallbackStrategies 
      ? new FallbackHandler<T>({ strategies: fallbackStrategies, logFallbacks: true })
      : null;

    // Build resilient operation
    const resilientOperation = async (): Promise<T> => {
      // Wrap with circuit breaker if enabled
      if (breaker) {
        return breaker.execute(() => backoff.execute(operation, context || serviceName));
      } else {
        return backoff.execute(operation, context || serviceName);
      }
    };

    // Execute with fallback if configured
    if (fallbackHandler) {
      return fallbackHandler.executeWithFallback(resilientOperation, cacheKey, context || serviceName);
    } else {
      return resilientOperation();
    }
  }

  /**
   * Quick execute with default resilience settings
   */
  static async executeWithDefaults<T>(
    operation: () => Promise<T>,
    serviceName: string,
    context?: string
  ): Promise<T> {
    return this.execute(operation, {
      serviceName,
      context: context || serviceName,
      circuitBreaker: true,
      retryConfig: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 30000
      }
    });
  }

  /**
   * Execute database operation with resilience
   */
  static async executeDatabase<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    return this.execute(operation, {
      serviceName: 'database',
      context: context || 'database-operation',
      circuitBreaker: true,
      retryConfig: {
        maxAttempts: 2,
        initialDelay: 500,
        maxDelay: 5000
      },
      fallbackStrategies: [
        { type: 'cached', ttl: 60000 },
        { type: 'error' }
      ]
    });
  }

  /**
   * Execute external API call with resilience
   */
  static async executeExternalApi<T>(
    operation: () => Promise<T>,
    apiName: string,
    fallbackValue?: T
  ): Promise<T> {
    const strategies: FallbackStrategy<T>[] = [
      { type: 'cached', ttl: 300000 } // 5 minutes
    ];
    
    if (fallbackValue !== undefined) {
      strategies.push({ type: 'default', value: fallbackValue });
    }

    return this.execute(operation, {
      serviceName: `external-api-${apiName}`,
      context: apiName,
      circuitBreaker: true,
      retryConfig: {
        maxAttempts: 5,
        initialDelay: 2000,
        maxDelay: 60000,
        multiplier: 2,
        jitter: true
      },
      fallbackStrategies: strategies
    });
  }

  /**
   * Execute SERP API call with resilience
   */
  static async executeSerpApi<T>(
    operation: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    return this.execute(operation, {
      serviceName: 'serp-api',
      context: 'serp-api-call',
      circuitBreaker: true,
      retryConfig: {
        maxAttempts: 10,
        initialDelay: 5000,
        maxDelay: 300000, // 5 minutes
        multiplier: 2,
        jitter: true,
        retryableErrors: [/429/, /503/, /rate.limit/i, /too.many.requests/i]
      },
      fallbackStrategies: [
        { type: 'cached', ttl: 3600000 } // 1 hour cache
      ],
      cacheKey
    });
  }

  /**
   * Execute payment operation with resilience
   */
  static async executePayment<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    return this.execute(operation, {
      serviceName: 'payment-service',
      context: context || 'payment-operation',
      circuitBreaker: true,
      retryConfig: {
        maxAttempts: 2,
        initialDelay: 2000,
        maxDelay: 10000
      },
      fallbackStrategies: [
        { type: 'error' } // Don't fallback for payments - fail explicitly
      ]
    });
  }
}

/**
 * Decorator for resilient methods
 */
export function Resilient<T>(config: Omit<ResilientOperationConfig<T>, 'serviceName'>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return ResilientOperationExecutor.execute(
        () => originalMethod.apply(this, args),
        {
          ...config,
          serviceName: `${target.constructor.name}.${propertyKey}`,
          context: config.context || `${target.constructor.name}.${propertyKey}`
        }
      );
    };

    return descriptor;
  };
}

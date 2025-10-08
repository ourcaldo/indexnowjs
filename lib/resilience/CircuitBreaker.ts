/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascade failures by stopping requests to failing services
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests fail immediately
 * - HALF_OPEN: Testing if service has recovered
 * 
 * Phase 3 - Milestone C.4: Circuit Breaker implementation
 */

import { logger } from '@/lib/monitoring/error-handling';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;       // Number of successes to close from half-open
  timeout: number;                // Time (ms) to wait before trying half-open
  monitoringWindow: number;       // Time window (ms) for counting failures
  name: string;                   // Identifier for this breaker
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange: number = Date.now();
  private nextAttempt: number = Date.now();
  private readonly failures: number[] = []; // Timestamps of failures within window
  
  // Metrics
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(
          `Circuit breaker "${this.config.name}" is OPEN. Service unavailable.`
        );
      }
      // Transition to half-open to test service
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.failureCount = 0;
    this.failures.length = 0; // Clear failure history

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.failures.push(this.lastFailureTime);

    // Remove failures outside monitoring window
    const windowStart = Date.now() - this.config.monitoringWindow;
    while (this.failures.length > 0 && this.failures[0] < windowStart) {
      this.failures.shift();
    }

    this.failureCount = this.failures.length;

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open immediately opens circuit
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === CircuitState.OPEN) {
      this.nextAttempt = Date.now() + this.config.timeout;
      this.successCount = 0;
      logger.warn({
        circuitBreaker: this.config.name,
        oldState,
        newState,
        failureCount: this.failureCount,
        nextAttempt: new Date(this.nextAttempt).toISOString()
      }, `Circuit breaker "${this.config.name}" opened`);
    } else if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
      this.failures.length = 0;
      logger.info({
        circuitBreaker: this.config.name,
        oldState,
        newState
      }, `Circuit breaker "${this.config.name}" closed`);
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
      logger.info({
        circuitBreaker: this.config.name,
        oldState,
        newState
      }, `Circuit breaker "${this.config.name}" half-open`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.failures.length = 0;
    logger.info({
      circuitBreaker: this.config.name
    }, `Circuit breaker "${this.config.name}" reset`);
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is available
   */
  isAvailable(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }
    if (this.state === CircuitState.HALF_OPEN) {
      return true;
    }
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttempt) {
      return true;
    }
    return false;
  }
}

/**
 * Circuit Breaker Manager
 * Manages circuit breakers for different services
 */
export class CircuitBreakerManager {
  private static breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for a service
   */
  static getBreaker(
    serviceName: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000, // 1 minute
        monitoringWindow: 120000, // 2 minutes
        name: serviceName,
        ...config
      };
      this.breakers.set(serviceName, new CircuitBreaker(defaultConfig));
    }
    return this.breakers.get(serviceName)!;
  }

  /**
   * Get all circuit breaker metrics
   */
  static getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    this.breakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }

  /**
   * Reset specific circuit breaker
   */
  static reset(serviceName: string): void {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.reset();
    }
  }
}

// Pre-configured circuit breakers for common services
export const ServiceCircuitBreakers = {
  database: () => CircuitBreakerManager.getBreaker('database', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,
    monitoringWindow: 60000
  }),
  
  externalApi: () => CircuitBreakerManager.getBreaker('external-api', {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 60000,
    monitoringWindow: 120000
  }),
  
  payment: () => CircuitBreakerManager.getBreaker('payment-service', {
    failureThreshold: 2,
    successThreshold: 3,
    timeout: 120000,
    monitoringWindow: 180000
  }),
  
  serp: () => CircuitBreakerManager.getBreaker('serp-api', {
    failureThreshold: 10,
    successThreshold: 3,
    timeout: 300000, // 5 minutes
    monitoringWindow: 600000 // 10 minutes
  })
};

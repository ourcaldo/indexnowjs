/**
 * Retry Handler Service
 * Manages retry logic for failed indexing operations
 */
export class RetryHandler {
  private static instance: RetryHandler;

  constructor() {}

  static getInstance(): RetryHandler {
    if (!RetryHandler.instance) {
      RetryHandler.instance = new RetryHandler();
    }
    return RetryHandler.instance;
  }

  /**
   * Determine if a URL submission should be retried
   */
  shouldRetry(retryCount: number, errorMessage: string): boolean {
    const maxRetries = 3;
    
    // Don't retry if we've exceeded the maximum retry count
    if (retryCount >= maxRetries) {
      return false;
    }

    // Don't retry on certain types of errors
    const nonRetryableErrors = [
      'invalid url',
      'malformed url',
      'permission denied',
      'unauthorized',
      'forbidden'
    ];

    const lowerErrorMessage = errorMessage.toLowerCase();
    for (const error of nonRetryableErrors) {
      if (lowerErrorMessage.includes(error)) {
        return false;
      }
    }

    // Retry on network errors, timeouts, and temporary server errors
    return true;
  }

  /**
   * Calculate delay before retry using exponential backoff
   */
  calculateRetryDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Execute retry operation with exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCount: number = 0,
    maxRetries: number = 3
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (!this.shouldRetry(retryCount, errorMessage) || retryCount >= maxRetries) {
        throw error;
      }

      const delay = this.calculateRetryDelay(retryCount);
      console.log(`🔄 Retrying operation in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.executeWithRetry(operation, retryCount + 1, maxRetries);
    }
  }
}
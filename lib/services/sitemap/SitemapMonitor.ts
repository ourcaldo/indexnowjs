/**
 * Sitemap Monitoring & Error Handling Service
 * Implements comprehensive monitoring for sitemap generation performance and errors
 */

export interface SitemapGenerationMetrics {
  type: 'main' | 'posts' | 'categories' | 'tags' | 'pages'
  startTime: number
  endTime: number
  duration: number
  urlCount: number
  success: boolean
  error?: string
  cacheHit?: boolean
}

export interface SitemapErrorDetails {
  type: string
  message: string
  timestamp: number
  context?: any
}

export class SitemapMonitor {
  private static metrics: SitemapGenerationMetrics[] = []
  private static errors: SitemapErrorDetails[] = []
  private static readonly MAX_METRICS_HISTORY = 100
  private static readonly MAX_ERROR_HISTORY = 50

  /**
   * Start monitoring a sitemap generation
   */
  static startGeneration(type: SitemapGenerationMetrics['type']): number {
    const startTime = Date.now()
    console.log(`[SITEMAP] Starting ${type} sitemap generation`)
    return startTime
  }

  /**
   * Complete monitoring and log metrics
   */
  static completeGeneration(
    type: SitemapGenerationMetrics['type'],
    startTime: number,
    urlCount: number,
    success: boolean = true,
    error?: string,
    cacheHit: boolean = false
  ): void {
    const endTime = Date.now()
    const duration = endTime - startTime

    const metric: SitemapGenerationMetrics = {
      type,
      startTime,
      endTime,
      duration,
      urlCount,
      success,
      error,
      cacheHit
    }

    // Add to metrics history
    this.metrics.push(metric)
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift()
    }

    // Log performance
    const status = success ? 'SUCCESS' : 'FAILED'
    const cacheStatus = cacheHit ? ' (CACHE HIT)' : ''
    console.log(`[SITEMAP] ${status}: ${type} sitemap - ${urlCount} URLs in ${duration}ms${cacheStatus}`)

    // Log error if failed
    if (!success && error) {
      this.logError(type, error, { urlCount, duration })
    }

    // Performance warnings
    if (success) {
      if (duration > 5000) {
        console.warn(`[SITEMAP WARNING] Slow generation: ${type} took ${duration}ms (>5s)`)
      }
      if (type === 'posts' && duration > 2000) {
        console.warn(`[SITEMAP WARNING] Posts sitemap slow: ${duration}ms (>2s target)`)
      }
    }
  }

  /**
   * Log sitemap generation error
   */
  static logError(type: string, message: string, context?: any): void {
    const error: SitemapErrorDetails = {
      type,
      message,
      timestamp: Date.now(),
      context
    }

    this.errors.push(error)
    if (this.errors.length > this.MAX_ERROR_HISTORY) {
      this.errors.shift()
    }

    console.error(`[SITEMAP ERROR] ${type}: ${message}`, context)
  }

  /**
   * Get performance metrics
   */
  static getMetrics(): SitemapGenerationMetrics[] {
    return [...this.metrics]
  }

  /**
   * Get recent errors
   */
  static getErrors(): SitemapErrorDetails[] {
    return [...this.errors]
  }

  /**
   * Get performance summary
   */
  static getPerformanceSummary(): {
    totalGenerations: number
    successRate: number
    averageDuration: number
    slowGenerations: number
    cacheHitRate: number
  } {
    if (this.metrics.length === 0) {
      return {
        totalGenerations: 0,
        successRate: 0,
        averageDuration: 0,
        slowGenerations: 0,
        cacheHitRate: 0
      }
    }

    const totalGenerations = this.metrics.length
    const successfulGenerations = this.metrics.filter(m => m.success).length
    const successRate = (successfulGenerations / totalGenerations) * 100
    const averageDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalGenerations
    const slowGenerations = this.metrics.filter(m => m.duration > 5000).length
    const cacheHits = this.metrics.filter(m => m.cacheHit).length
    const cacheHitRate = (cacheHits / totalGenerations) * 100

    return {
      totalGenerations,
      successRate,
      averageDuration,
      slowGenerations,
      cacheHitRate
    }
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string): { valid: boolean; error?: string } {
    try {
      new URL(url)
      
      // Additional validations
      if (url.length > 2048) {
        return { valid: false, error: 'URL too long (>2048 characters)' }
      }
      
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { valid: false, error: 'URL must start with http:// or https://' }
      }

      return { valid: true }
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' }
    }
  }

  /**
   * Check if generation should be throttled
   */
  static shouldThrottle(): boolean {
    const recentGenerations = this.metrics.filter(
      m => Date.now() - m.endTime < 60000 // Last minute
    )
    
    // Throttle if more than 10 generations in the last minute
    return recentGenerations.length > 10
  }

  /**
   * Clear metrics and errors (for testing)
   */
  static clearHistory(): void {
    this.metrics = []
    this.errors = []
  }
}
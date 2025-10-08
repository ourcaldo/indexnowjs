/**
 * API Metrics Collector Service
 * Enterprise-level API performance monitoring, metrics collection, and analysis
 * Tracks request/response metrics, error patterns, cache performance, and historical trends
 */

import {
  ApiMetrics,
  ServiceResponse,
  SeRankingErrorType,
  HealthCheckResult
} from '../types/SeRankingTypes';
import { IApiMetricsCollector } from '../types/ServiceTypes';
import { supabaseAdmin } from '../../../database/supabase';
import { SecureServiceRoleWrapper } from '../../../services/security/SecureServiceRoleWrapper';
import { logger } from '@/lib/monitoring/error-handling';

// Extended metrics configuration
export interface ApiMetricsConfig {
  retentionDays: number;
  aggregationIntervals: {
    realtime: number; // milliseconds
    hourly: boolean;
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
  alertingThresholds: {
    errorRatePercent: number;
    responseTimeMs: number;
    cacheMissRatePercent: number;
  };
  enableDetailedLogging: boolean;
  enablePredictiveAnalysis: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Detailed API call metadata
export interface ApiCallMetric {
  id?: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  status: 'success' | 'error' | 'timeout' | 'rate_limited';
  duration_ms: number;
  request_size?: number;
  response_size?: number;
  cache_hit: boolean;
  error_type?: SeRankingErrorType;
  error_message?: string;
  user_id?: string;
  quota_remaining?: number;
  rate_limit_remaining?: number;
  retry_attempt?: number;
  country_code?: string;
  keyword_count?: number;
  metadata?: Record<string, any>;
}

// Aggregated metrics for time periods
export interface AggregatedMetrics {
  period: string; // ISO date string
  period_type: 'hour' | 'day' | 'week' | 'month';
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  timeout_requests: number;
  rate_limited_requests: number;
  average_response_time: number;
  median_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  error_breakdown: Record<SeRankingErrorType, number>;
  quota_utilization_avg: number;
  total_keywords_processed: number;
  unique_users: number;
  peak_rps: number; // requests per second
  created_at: Date;
}

// Performance analysis results
export interface PerformanceAnalysis {
  overall_health_score: number; // 0-100
  performance_trends: {
    response_time: 'improving' | 'stable' | 'degrading';
    error_rate: 'improving' | 'stable' | 'degrading';
    cache_performance: 'improving' | 'stable' | 'degrading';
  };
  bottlenecks: Array<{
    type: 'high_error_rate' | 'slow_response' | 'poor_cache_hit' | 'quota_pressure';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendations: string[];
  }>;
  predictions: {
    quota_exhaustion_eta?: Date;
    expected_error_increase?: number;
    cache_efficiency_trend: number;
  };
}

// Alert configuration
export interface MetricsAlert {
  id: string;
  type: 'error_rate' | 'response_time' | 'cache_miss_rate' | 'quota_threshold';
  threshold: number;
  period_minutes: number;
  is_active: boolean;
  last_triggered?: Date;
  escalation_count: number;
}

export class ApiMetricsCollector implements IApiMetricsCollector {
  private config: ApiMetricsConfig;
  private realtimeMetrics: Map<string, ApiCallMetric[]> = new Map();
  private alerts: Map<string, MetricsAlert> = new Map();
  private aggregationTimer?: NodeJS.Timeout;
  private lastAggregation?: Date;

  constructor(config: Partial<ApiMetricsConfig> = {}) {
    this.config = {
      retentionDays: 90,
      aggregationIntervals: {
        realtime: 30000, // 30 seconds
        hourly: true,
        daily: true,
        weekly: true,
        monthly: true
      },
      alertingThresholds: {
        errorRatePercent: 5,
        responseTimeMs: 5000,
        cacheMissRatePercent: 70
      },
      enableDetailedLogging: true,
      enablePredictiveAnalysis: true,
      logLevel: 'info',
      ...config
    };

    this.initializeService();
  }

  /**
   * Initialize the metrics collection service
   */
  private async initializeService(): Promise<void> {
    try {
      this.log('info', 'Initializing ApiMetricsCollector service');
      
      // Load existing alerts configuration
      await this.loadAlertsConfiguration();
      
      // Start periodic aggregation
      this.startPeriodicAggregation();
      
      // Initialize database tables if needed
      await this.ensureMetricsTables();
      
      this.log('info', 'ApiMetricsCollector service initialized successfully');
    } catch (error) {
      this.log('error', `Failed to initialize ApiMetricsCollector: ${error}`);
      throw error;
    }
  }

  /**
   * Record a successful API call with detailed metrics
   */
  async recordApiCall(
    duration: number, 
    status: 'success' | 'error', 
    metadata?: {
      endpoint?: string;
      method?: string;
      cacheHit?: boolean;
      errorType?: SeRankingErrorType;
      errorMessage?: string;
      userId?: string;
      quotaRemaining?: number;
      countryCode?: string;
      keywordCount?: number;
      requestSize?: number;
      responseSize?: number;
      retryAttempt?: number;
    }
  ): Promise<void> {
    try {
      const metric: ApiCallMetric = {
        timestamp: new Date(),
        endpoint: metadata?.endpoint || '/api/seranking',
        method: metadata?.method || 'POST',
        status,
        duration_ms: duration,
        request_size: metadata?.requestSize,
        response_size: metadata?.responseSize,
        cache_hit: metadata?.cacheHit || false,
        error_type: metadata?.errorType,
        error_message: metadata?.errorMessage,
        user_id: metadata?.userId,
        quota_remaining: metadata?.quotaRemaining,
        country_code: metadata?.countryCode,
        keyword_count: metadata?.keywordCount,
        retry_attempt: metadata?.retryAttempt,
        metadata: metadata
      };

      // Store in realtime buffer
      const key = this.getRealTimeKey();
      if (!this.realtimeMetrics.has(key)) {
        this.realtimeMetrics.set(key, []);
      }
      this.realtimeMetrics.get(key)!.push(metric);

      // Store in database for persistence
      await this.persistMetric(metric);

      // Check alerting thresholds
      await this.checkAlertingThresholds();

      this.log('debug', `Recorded API call: ${status} in ${duration}ms`);
    } catch (error) {
      this.log('error', `Failed to record API call metric: ${error}`);
    }
  }

  /**
   * Record cache hit with performance data
   */
  async recordCacheHit(duration: number, metadata?: {
    endpoint?: string;
    userId?: string;
    countryCode?: string;
    keywordCount?: number;
  }): Promise<void> {
    await this.recordApiCall(duration, 'success', {
      ...metadata,
      cacheHit: true
    });
  }

  /**
   * Record cache miss
   */
  async recordCacheMiss(metadata?: {
    endpoint?: string;
    userId?: string;
    countryCode?: string;
    keywordCount?: number;
  }): Promise<void> {
    await this.recordApiCall(0, 'success', {
      ...metadata,
      cacheHit: false
    });
  }

  /**
   * Get current API metrics for specified time range
   */
  async getMetrics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<ApiMetrics> {
    try {
      const endTime = new Date();
      const startTime = new Date();
      
      switch (timeRange) {
        case 'hour':
          startTime.setHours(startTime.getHours() - 1);
          break;
        case 'day':
          startTime.setDate(startTime.getDate() - 1);
          break;
        case 'week':
          startTime.setDate(startTime.getDate() - 7);
          break;
        case 'month':
          startTime.setMonth(startTime.getMonth() - 1);
          break;
      }

      // Get aggregated metrics from database
      const aggregatedMetrics = await this.getAggregatedMetrics(startTime, endTime);
      
      // Combine with realtime metrics
      const realtimeMetrics = this.getRealtimeMetrics(startTime, endTime);
      
      return this.combineMetrics(aggregatedMetrics, realtimeMetrics);
    } catch (error) {
      this.log('error', `Failed to get metrics: ${error}`);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get detailed performance analysis with bottleneck identification
   */
  async getPerformanceAnalysis(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<PerformanceAnalysis> {
    try {
      const currentMetrics = await this.getMetrics(timeRange);
      const previousMetrics = await this.getPreviousPeriodMetrics(timeRange);
      
      const analysis: PerformanceAnalysis = {
        overall_health_score: this.calculateHealthScore(currentMetrics),
        performance_trends: this.analyzeTrends(currentMetrics, previousMetrics),
        bottlenecks: await this.identifyBottlenecks(currentMetrics),
        predictions: await this.generatePredictions(currentMetrics)
      };

      return analysis;
    } catch (error) {
      this.log('error', `Failed to get performance analysis: ${error}`);
      throw error;
    }
  }

  /**
   * Get historical metrics breakdown
   */
  async getHistoricalMetrics(
    startDate: Date,
    endDate: Date,
    granularity: 'hour' | 'day' | 'week' = 'day'
  ): Promise<AggregatedMetrics[]> {
    try {
      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_historical_seranking_metrics',
          reason: 'ApiMetricsCollector retrieving historical metrics for performance analysis',
          source: 'ApiMetricsCollector.getHistoricalMetrics',
          metadata: {
            granularity,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            operationType: 'metrics_query'
          }
        },
        { table: 'indb_seranking_metrics_aggregated', operationType: 'select' },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_seranking_metrics_aggregated')
            .select('*')
            .eq('period_type', granularity)
            .gte('period', startDate.toISOString())
            .lte('period', endDate.toISOString())
            .order('period', { ascending: true });

          if (error) throw error;
          return data || [];
        }
      );

      return data.map(row => ({
        ...row,
        period: row.period,
        created_at: new Date(row.created_at)
      }));
    } catch (error) {
      this.log('error', `Failed to get historical metrics: ${error}`);
      return [];
    }
  }

  /**
   * Configure alerting thresholds
   */
  async configureAlerts(alerts: Partial<MetricsAlert>[]): Promise<void> {
    try {
      for (const alertConfig of alerts) {
        if (!alertConfig.id) continue;
        
        const alert: MetricsAlert = {
          id: alertConfig.id,
          type: alertConfig.type || 'error_rate',
          threshold: alertConfig.threshold || 5,
          period_minutes: alertConfig.period_minutes || 5,
          is_active: alertConfig.is_active !== false,
          escalation_count: alertConfig.escalation_count || 0
        };
        
        this.alerts.set(alert.id, alert);
      }
      
      // Persist alerts configuration
      await this.saveAlertsConfiguration();
      
      this.log('info', `Configured ${alerts.length} alert rules`);
    } catch (error) {
      this.log('error', `Failed to configure alerts: ${error}`);
      throw error;
    }
  }

  /**
   * Reset all metrics (use with caution)
   */
  async resetMetrics(): Promise<void> {
    try {
      // Clear realtime metrics
      this.realtimeMetrics.clear();
      
      // Clear database metrics (keep historical data)
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 1);
      
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'reset_seranking_metrics_raw',
          reason: 'ApiMetricsCollector clearing recent metrics data while preserving historical data',
          source: 'ApiMetricsCollector.resetMetrics',
          metadata: {
            cutoffDate: cutoffDate.toISOString(),
            hoursCleared: 1,
            operationType: 'metrics_cleanup'
          }
        },
        { table: 'indb_seranking_metrics_raw', operationType: 'delete' },
        async () => {
          await supabaseAdmin
            .from('indb_seranking_metrics_raw')
            .delete()
            .gte('timestamp', cutoffDate.toISOString());
          return true;
        }
      );
      
      this.log('info', 'Metrics reset successfully');
    } catch (error) {
      this.log('error', `Failed to reset metrics: ${error}`);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  
  private getRealTimeKey(): string {
    return new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  }

  private getRealtimeMetrics(startTime: Date, endTime: Date): ApiCallMetric[] {
    const metrics: ApiCallMetric[] = [];
    
    for (const [key, keyMetrics] of this.realtimeMetrics.entries()) {
      const keyTime = new Date(key);
      if (keyTime >= startTime && keyTime <= endTime) {
        metrics.push(...keyMetrics);
      }
    }
    
    return metrics;
  }

  private async persistMetric(metric: ApiCallMetric): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'persist_seranking_api_metric',
          reason: 'ApiMetricsCollector storing API call metrics for performance monitoring',
          source: 'ApiMetricsCollector.persistMetric',
          metadata: {
            endpoint: metric.endpoint,
            method: metric.method,
            status: metric.status,
            duration_ms: metric.duration_ms,
            user_id: metric.user_id,
            operationType: 'metrics_storage'
          }
        },
        { 
          table: 'indb_seranking_metrics_raw', 
          operationType: 'insert',
          data: {
            timestamp: metric.timestamp.toISOString(),
            endpoint: metric.endpoint,
            method: metric.method,
            status: metric.status,
            duration_ms: metric.duration_ms,
            cache_hit: metric.cache_hit,
            error_type: metric.error_type,
            error_message: metric.error_message,
            user_id: metric.user_id,
            quota_remaining: metric.quota_remaining,
            country_code: metric.country_code,
            keyword_count: metric.keyword_count,
            metadata: metric.metadata
          }
        },
        async () => {
          await supabaseAdmin
            .from('indb_seranking_metrics_raw')
            .insert({
              timestamp: metric.timestamp.toISOString(),
              endpoint: metric.endpoint,
              method: metric.method,
              status: metric.status,
              duration_ms: metric.duration_ms,
              cache_hit: metric.cache_hit,
              error_type: metric.error_type,
              error_message: metric.error_message,
              user_id: metric.user_id,
              quota_remaining: metric.quota_remaining,
              country_code: metric.country_code,
              keyword_count: metric.keyword_count,
              metadata: metric.metadata
            });
          return true;
        }
      );
    } catch (error) {
      this.log('error', `Failed to persist metric: ${error}`);
    }
  }

  private async checkAlertingThresholds(): Promise<void> {
    if (!this.config.enableDetailedLogging) return;

    try {
      const recentMetrics = this.getRealtimeMetrics(
        new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        new Date()
      );

      if (recentMetrics.length === 0) return;

      // Check error rate threshold
      const errorRate = recentMetrics.filter(m => m.status === 'error').length / recentMetrics.length * 100;
      if (errorRate > this.config.alertingThresholds.errorRatePercent) {
        await this.triggerAlert('error_rate', errorRate);
      }

      // Check response time threshold
      const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration_ms, 0) / recentMetrics.length;
      if (avgResponseTime > this.config.alertingThresholds.responseTimeMs) {
        await this.triggerAlert('response_time', avgResponseTime);
      }

      // Check cache miss rate
      const cacheMissRate = recentMetrics.filter(m => !m.cache_hit).length / recentMetrics.length * 100;
      if (cacheMissRate > this.config.alertingThresholds.cacheMissRatePercent) {
        await this.triggerAlert('cache_miss_rate', cacheMissRate);
      }
    } catch (error) {
      this.log('error', `Failed to check alerting thresholds: ${error}`);
    }
  }

  private async triggerAlert(type: string, value: number): Promise<void> {
    this.log('warn', `Alert triggered: ${type} = ${value}`);
    
    // Here you would integrate with your alerting system
    // (email, Slack, PagerDuty, etc.)
  }

  private calculateHealthScore(metrics: ApiMetrics): number {
    const successRate = metrics.total_requests > 0 ? 
      metrics.successful_requests / metrics.total_requests : 1;
    const cacheHitRate = (metrics.cache_hits + metrics.cache_misses) > 0 ?
      metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses) : 1;
    const responseTimeScore = Math.max(0, 1 - (metrics.average_response_time / 10000));
    
    return Math.round((successRate * 0.4 + cacheHitRate * 0.3 + responseTimeScore * 0.3) * 100);
  }

  private analyzeTrends(current: ApiMetrics, previous: ApiMetrics): PerformanceAnalysis['performance_trends'] {
    const responseTimeTrend = this.compareTrend(current.average_response_time, previous.average_response_time);
    const errorRateTrend = this.compareTrend(
      current.failed_requests / Math.max(current.total_requests, 1),
      previous.failed_requests / Math.max(previous.total_requests, 1)
    );
    const cacheHitTrend = this.compareTrend(
      current.cache_hits / Math.max(current.cache_hits + current.cache_misses, 1),
      previous.cache_hits / Math.max(previous.cache_hits + previous.cache_misses, 1)
    );

    return {
      response_time: responseTimeTrend,
      error_rate: errorRateTrend,
      cache_performance: cacheHitTrend
    };
  }

  private compareTrend(current: number, previous: number): 'improving' | 'stable' | 'degrading' {
    const change = (current - previous) / Math.max(previous, 0.001);
    if (change > 0.1) return 'degrading';
    if (change < -0.1) return 'improving';
    return 'stable';
  }

  private async identifyBottlenecks(metrics: ApiMetrics): Promise<PerformanceAnalysis['bottlenecks']> {
    const bottlenecks: PerformanceAnalysis['bottlenecks'] = [];

    const errorRate = metrics.total_requests > 0 ? 
      metrics.failed_requests / metrics.total_requests : 0;

    if (errorRate > 0.05) {
      bottlenecks.push({
        type: 'high_error_rate',
        severity: errorRate > 0.2 ? 'critical' : errorRate > 0.1 ? 'high' : 'medium',
        description: `Error rate is ${(errorRate * 100).toFixed(1)}%`,
        recommendations: [
          'Review error logs for common failure patterns',
          'Check API key validity and quota status',
          'Implement circuit breaker pattern'
        ]
      });
    }

    if (metrics.average_response_time > 5000) {
      bottlenecks.push({
        type: 'slow_response',
        severity: metrics.average_response_time > 15000 ? 'critical' : 'high',
        description: `Average response time is ${metrics.average_response_time}ms`,
        recommendations: [
          'Optimize API request batching',
          'Implement connection pooling',
          'Consider caching strategies'
        ]
      });
    }

    const cacheHitRate = (metrics.cache_hits + metrics.cache_misses) > 0 ?
      metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses) : 1;

    if (cacheHitRate < 0.7) {
      bottlenecks.push({
        type: 'poor_cache_hit',
        severity: cacheHitRate < 0.5 ? 'high' : 'medium',
        description: `Cache hit rate is ${(cacheHitRate * 100).toFixed(1)}%`,
        recommendations: [
          'Review cache expiration policies',
          'Implement cache preloading for popular keywords',
          'Analyze cache invalidation patterns'
        ]
      });
    }

    return bottlenecks;
  }

  private async generatePredictions(metrics: ApiMetrics): Promise<PerformanceAnalysis['predictions']> {
    // This would integrate with more sophisticated prediction algorithms
    return {
      cache_efficiency_trend: Math.random() * 0.1 - 0.05 // Placeholder
    };
  }

  private async getAggregatedMetrics(startTime: Date, endTime: Date): Promise<AggregatedMetrics[]> {
    try {
      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_aggregated_seranking_metrics',
          reason: 'ApiMetricsCollector retrieving aggregated metrics for analysis and reporting',
          source: 'ApiMetricsCollector.getAggregatedMetrics',
          metadata: {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            operationType: 'metrics_aggregation_query'
          }
        },
        { table: 'indb_seranking_metrics_aggregated', operationType: 'select' },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_seranking_metrics_aggregated')
            .select('*')
            .gte('period', startTime.toISOString())
            .lte('period', endTime.toISOString())
            .order('period', { ascending: true });

          if (error) throw error;
          return data || [];
        }
      );

      return data.map(row => ({
        ...row,
        created_at: new Date(row.created_at)
      }));
    } catch (error) {
      this.log('error', `Failed to get aggregated metrics: ${error}`);
      return [];
    }
  }

  private async getPreviousPeriodMetrics(timeRange: 'day' | 'week' | 'month'): Promise<ApiMetrics> {
    const endTime = new Date();
    const startTime = new Date();
    
    switch (timeRange) {
      case 'day':
        startTime.setDate(startTime.getDate() - 2);
        endTime.setDate(endTime.getDate() - 1);
        break;
      case 'week':
        startTime.setDate(startTime.getDate() - 14);
        endTime.setDate(endTime.getDate() - 7);
        break;
      case 'month':
        startTime.setMonth(startTime.getMonth() - 2);
        endTime.setMonth(endTime.getMonth() - 1);
        break;
    }

    const aggregatedMetrics = await this.getAggregatedMetrics(startTime, endTime);
    return this.combineMetrics(aggregatedMetrics, []);
  }

  private combineMetrics(aggregated: AggregatedMetrics[], realtime: ApiCallMetric[]): ApiMetrics {
    const aggregatedTotals = aggregated.reduce(
      (totals, metric) => ({
        total_requests: totals.total_requests + metric.total_requests,
        successful_requests: totals.successful_requests + metric.successful_requests,
        failed_requests: totals.failed_requests + metric.failed_requests,
        cache_hits: totals.cache_hits + metric.cache_hits,
        cache_misses: totals.cache_misses + metric.cache_misses,
        total_response_time: totals.total_response_time + (metric.average_response_time * metric.total_requests),
      }),
      { total_requests: 0, successful_requests: 0, failed_requests: 0, cache_hits: 0, cache_misses: 0, total_response_time: 0 }
    );

    const realtimeTotals = {
      total_requests: realtime.length,
      successful_requests: realtime.filter(m => m.status === 'success').length,
      failed_requests: realtime.filter(m => m.status === 'error').length,
      cache_hits: realtime.filter(m => m.cache_hit).length,
      cache_misses: realtime.filter(m => !m.cache_hit).length,
      total_response_time: realtime.reduce((sum, m) => sum + m.duration_ms, 0)
    };

    const combined = {
      total_requests: aggregatedTotals.total_requests + realtimeTotals.total_requests,
      successful_requests: aggregatedTotals.successful_requests + realtimeTotals.successful_requests,
      failed_requests: aggregatedTotals.failed_requests + realtimeTotals.failed_requests,
      cache_hits: aggregatedTotals.cache_hits + realtimeTotals.cache_hits,
      cache_misses: aggregatedTotals.cache_misses + realtimeTotals.cache_misses,
      total_response_time: aggregatedTotals.total_response_time + realtimeTotals.total_response_time
    };

    return {
      total_requests: combined.total_requests,
      successful_requests: combined.successful_requests,
      failed_requests: combined.failed_requests,
      average_response_time: combined.total_requests > 0 ? combined.total_response_time / combined.total_requests : 0,
      cache_hits: combined.cache_hits,
      cache_misses: combined.cache_misses,
      last_request_time: realtime.length > 0 ? realtime[realtime.length - 1].timestamp : undefined
    };
  }

  private getEmptyMetrics(): ApiMetrics {
    return {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      average_response_time: 0,
      cache_hits: 0,
      cache_misses: 0
    };
  }

  private startPeriodicAggregation(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }

    this.aggregationTimer = setInterval(async () => {
      try {
        await this.performPeriodicAggregation();
      } catch (error) {
        this.log('error', `Periodic aggregation failed: ${error}`);
      }
    }, this.config.aggregationIntervals.realtime);
  }

  private async performPeriodicAggregation(): Promise<void> {
    // Aggregate realtime metrics to database
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const realtimeMetrics = this.getRealtimeMetrics(hourAgo, now);
    if (realtimeMetrics.length === 0) return;

    // This would implement the aggregation logic
    // Store aggregated data and clean up old realtime data
    this.cleanupOldRealtimeMetrics();
  }

  private cleanupOldRealtimeMetrics(): void {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const cutoffKey = cutoff.toISOString().slice(0, 16);
    
    for (const key of this.realtimeMetrics.keys()) {
      if (key < cutoffKey) {
        this.realtimeMetrics.delete(key);
      }
    }
  }

  private async loadAlertsConfiguration(): Promise<void> {
    // Load from database or configuration file
  }

  private async saveAlertsConfiguration(): Promise<void> {
    // Save to database or configuration file
  }

  private async ensureMetricsTables(): Promise<void> {
    // This would ensure the required database tables exist
    // Implementation would depend on your database migration strategy
  }

  private log(level: string, message: string, ...args: any[]): void {
    if (this.shouldLog(level)) {
      const metadata = args.length > 0 ? { details: args } : {};
      const logMessage = `[ApiMetricsCollector] ${message}`;
      
      switch (level) {
        case 'debug':
          logger.debug(metadata, logMessage);
          break;
        case 'info':
          logger.info(metadata, logMessage);
          break;
        case 'warn':
          logger.warn(metadata, logMessage);
          break;
        case 'error':
          logger.error(metadata, logMessage);
          break;
        default:
          logger.info(metadata, logMessage);
      }
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  /**
   * Cleanup resources when shutting down
   */
  async shutdown(): Promise<void> {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    
    // Perform final aggregation
    await this.performPeriodicAggregation();
    
    this.log('info', 'ApiMetricsCollector service shut down successfully');
  }
}
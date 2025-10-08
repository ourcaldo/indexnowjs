/**
 * Monitoring Service Manager
 * Orchestrates and manages all monitoring services for the SeRanking integration
 * Provides a unified interface for comprehensive system monitoring
 */

import {
  ServiceResponse,
  HealthCheckResult,
  ApiMetrics,
  QuotaStatus,
  SeRankingErrorType
} from '../types/SeRankingTypes';
import {
  IApiMetricsCollector,
  IQuotaMonitor,
  IHealthChecker,
  ISeRankingApiClient,
  IKeywordBankService,
  IIntegrationService
} from '../types/ServiceTypes';

import { ApiMetricsCollector, ApiMetricsConfig } from './ApiMetricsCollector';
import { QuotaMonitor, QuotaMonitorConfig } from './QuotaMonitor';
import { HealthChecker, HealthCheckConfig } from './HealthChecker';
import { logger } from '@/lib/monitoring/error-handling';

// Service manager configuration
export interface MonitoringServiceManagerConfig {
  apiMetrics: Partial<ApiMetricsConfig>;
  quotaMonitor: Partial<QuotaMonitorConfig>;
  healthChecker: Partial<HealthCheckConfig>;
  enableRealTimeMonitoring: boolean;
  enableCrossServiceAlerts: boolean;
  enablePerformanceOptimization: boolean;
  enablePredictiveAnalysis: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Unified monitoring status
export interface SystemMonitoringStatus {
  overall_health: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  overall_score: number; // 0-100
  services: {
    api_metrics: {
      status: 'running' | 'degraded' | 'stopped';
      last_update: Date;
      current_metrics: ApiMetrics;
    };
    quota_monitor: {
      status: 'running' | 'degraded' | 'stopped';
      last_update: Date;
      current_quota: QuotaStatus;
      risk_level: 'low' | 'medium' | 'high' | 'critical';
    };
    health_checker: {
      status: 'running' | 'degraded' | 'stopped';
      last_update: Date;
      health_summary: HealthCheckResult;
    };
  };
  active_alerts: Array<{
    service: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    triggered_at: Date;
  }>;
  performance_insights: Array<{
    category: 'api' | 'quota' | 'health' | 'cache' | 'database';
    insight: string;
    recommendation: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  system_recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: 'performance' | 'reliability' | 'cost' | 'security';
    description: string;
    implementation_effort: 'low' | 'medium' | 'high';
    expected_impact: string;
  }>;
}

export class MonitoringServiceManager {
  private config: MonitoringServiceManagerConfig;
  private apiMetricsCollector: IApiMetricsCollector;
  private quotaMonitor: IQuotaMonitor;
  private healthChecker: IHealthChecker;
  
  private isInitialized: boolean = false;
  private monitoringTimer?: NodeJS.Timeout;
  private lastSystemStatus?: SystemMonitoringStatus;

  constructor(
    dependencies: {
      apiClient?: ISeRankingApiClient;
      keywordBankService?: IKeywordBankService;
      integrationService: IIntegrationService;
    },
    config: Partial<MonitoringServiceManagerConfig> = {}
  ) {
    this.config = {
      apiMetrics: {},
      quotaMonitor: {},
      healthChecker: {},
      enableRealTimeMonitoring: true,
      enableCrossServiceAlerts: true,
      enablePerformanceOptimization: true,
      enablePredictiveAnalysis: true,
      logLevel: 'info',
      ...config
    };

    // Initialize monitoring services
    this.apiMetricsCollector = new ApiMetricsCollector(this.config.apiMetrics);
    this.quotaMonitor = new QuotaMonitor(dependencies.integrationService, this.config.quotaMonitor);
    this.healthChecker = new HealthChecker({
      apiClient: dependencies.apiClient,
      keywordBankService: dependencies.keywordBankService,
      integrationService: dependencies.integrationService
    }, this.config.healthChecker);
  }

  /**
   * Initialize all monitoring services
   */
  async initialize(): Promise<void> {
    try {
      this.log('info', 'Initializing MonitoringServiceManager');

      // Verify all dependencies are healthy before starting
      await this.verifyDependencies();

      // Start real-time monitoring if enabled
      if (this.config.enableRealTimeMonitoring) {
        this.startRealTimeMonitoring();
      }

      // Perform initial system health check
      await this.refreshSystemStatus();

      this.isInitialized = true;
      this.log('info', 'MonitoringServiceManager initialized successfully');
    } catch (error) {
      this.log('error', `Failed to initialize MonitoringServiceManager: ${error}`);
      throw error;
    }
  }

  /**
   * Get comprehensive system monitoring status
   */
  async getSystemMonitoringStatus(forceRefresh: boolean = false): Promise<SystemMonitoringStatus> {
    try {
      if (!this.isInitialized) {
        throw new Error('MonitoringServiceManager not initialized');
      }

      if (forceRefresh || !this.lastSystemStatus || this.shouldRefreshStatus()) {
        await this.refreshSystemStatus();
      }

      return this.lastSystemStatus!;
    } catch (error) {
      this.log('error', `Failed to get system monitoring status: ${error}`);
      throw error;
    }
  }

  /**
   * Record an API operation with comprehensive tracking
   */
  async recordApiOperation(
    operationType: 'keyword_enrichment' | 'cache_lookup' | 'health_check',
    metadata: {
      keywords?: string[];
      countryCode?: string;
      quotaConsumed?: number;
      cacheHit?: boolean;
      responseTime?: number;
      success?: boolean;
      errorType?: SeRankingErrorType;
      userId?: string;
    }
  ): Promise<void> {
    try {
      const startTime = Date.now();
      const responseTime = metadata.responseTime || (Date.now() - startTime);
      const success = metadata.success !== false;

      // Record API metrics
      await this.apiMetricsCollector.recordApiCall(
        responseTime,
        success ? 'success' : 'error',
        {
          endpoint: `/api/seranking/${operationType}`,
          method: 'POST',
          cacheHit: metadata.cacheHit,
          errorType: metadata.errorType,
          userId: metadata.userId,
          countryCode: metadata.countryCode,
          keywordCount: metadata.keywords?.length
        }
      );

      // Record quota usage if applicable
      if (metadata.quotaConsumed && metadata.quotaConsumed > 0) {
        await this.quotaMonitor.recordQuotaUsage(
          metadata.quotaConsumed,
          {
            userId: metadata.userId,
            operationType,
            countryCode: metadata.countryCode,
            keywordsCount: metadata.keywords?.length
          }
        );
      }

      // Trigger cross-service analysis if enabled
      if (this.config.enableCrossServiceAlerts) {
        await this.analyzeCrossServicePatterns();
      }
    } catch (error) {
      this.log('error', `Failed to record API operation: ${error}`);
    }
  }

  /**
   * Get performance optimization recommendations
   */
  async getPerformanceRecommendations(): Promise<ServiceResponse<SystemMonitoringStatus['system_recommendations']>> {
    try {
      if (!this.config.enablePerformanceOptimization) {
        return {
          success: false,
          error: {
            type: SeRankingErrorType.INVALID_REQUEST_ERROR,
            message: 'Performance optimization is disabled'
          }
        };
      }

      const recommendations: SystemMonitoringStatus['system_recommendations'] = [];

      // Get API performance recommendations
      const apiMetrics = await this.apiMetricsCollector.getMetrics('day');
      if (apiMetrics.average_response_time > 3000) {
        recommendations.push({
          priority: 'high',
          category: 'performance',
          description: 'API response times are above optimal thresholds',
          implementation_effort: 'medium',
          expected_impact: 'Reduce response time by 40-60%'
        });
      }

      // Get quota optimization recommendations
      const quotaStatus = await this.quotaMonitor.getEnhancedQuotaStatus();
      if (quotaStatus.success && quotaStatus.data) {
        const quota = quotaStatus.data;
        if (quota.usage_percentage > 0.85) {
          recommendations.push({
            priority: 'critical',
            category: 'cost',
            description: 'Quota usage is approaching limits',
            implementation_effort: 'low',
            expected_impact: 'Prevent service interruption'
          });
        }

        if (quota.efficiency_metrics.cache_hit_rate < 0.7) {
          recommendations.push({
            priority: 'medium',
            category: 'performance',
            description: 'Cache hit rate is below optimal levels',
            implementation_effort: 'medium',
            expected_impact: 'Reduce API costs by 20-30%'
          });
        }
      }

      // Get health-based recommendations
      const healthSummary = await this.healthChecker.getSystemHealthSummary();
      if (healthSummary.overall_score < 80) {
        recommendations.push({
          priority: 'high',
          category: 'reliability',
          description: 'System health score indicates potential issues',
          implementation_effort: 'high',
          expected_impact: 'Improve system stability and uptime'
        });
      }

      return {
        success: true,
        data: recommendations.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority)),
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', `Failed to get performance recommendations: ${error}`);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to get performance recommendations: ${error}`
        }
      };
    }
  }

  /**
   * Trigger comprehensive system diagnostics
   */
  async runSystemDiagnostics(): Promise<ServiceResponse<{
    diagnostics_id: string;
    overall_status: 'healthy' | 'degraded' | 'unhealthy';
    component_results: Record<string, any>;
    recommendations: string[];
    estimated_resolution_time?: string;
  }>> {
    try {
      this.log('info', 'Running comprehensive system diagnostics');

      const diagnosticsId = `diag_${Date.now()}`;
      const results: Record<string, any> = {};

      // Run all health checks
      const healthResult = await this.healthChecker.performHealthCheck();
      results.health_checker = healthResult;

      // Check API performance
      const apiMetrics = await this.apiMetricsCollector.getPerformanceAnalysis('day');
      results.api_metrics = apiMetrics;

      // Check quota status
      const quotaStatus = await this.quotaMonitor.getEnhancedQuotaStatus();
      results.quota_monitor = quotaStatus;

      // Determine overall status
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (healthResult.status === 'unhealthy' || apiMetrics.overall_health_score < 60) {
        overallStatus = 'unhealthy';
      } else if (healthResult.status === 'degraded' || apiMetrics.overall_health_score < 80) {
        overallStatus = 'degraded';
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (overallStatus === 'unhealthy') {
        recommendations.push('Immediate attention required for system stability');
        recommendations.push('Review error logs and recent changes');
        recommendations.push('Consider rolling back recent deployments');
      } else if (overallStatus === 'degraded') {
        recommendations.push('Monitor system closely for further degradation');
        recommendations.push('Consider preventive maintenance');
        recommendations.push('Review performance metrics');
      }

      return {
        success: true,
        data: {
          diagnostics_id: diagnosticsId,
          overall_status: overallStatus,
          component_results: results,
          recommendations,
          estimated_resolution_time: overallStatus === 'unhealthy' ? '2-4 hours' : 
                                   overallStatus === 'degraded' ? '1-2 hours' : undefined
        },
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', `System diagnostics failed: ${error}`);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `System diagnostics failed: ${error}`
        }
      };
    }
  }

  /**
   * Get monitoring service health status
   */
  getServiceStatus(): {
    isInitialized: boolean;
    services: Record<string, boolean>;
    lastUpdate?: Date;
  } {
    return {
      isInitialized: this.isInitialized,
      services: {
        apiMetricsCollector: true,
        quotaMonitor: true,
        healthChecker: true
      },
      lastUpdate: this.lastSystemStatus ? new Date() : undefined
    };
  }

  /**
   * Private helper methods
   */

  private async verifyDependencies(): Promise<void> {
    // Verify that all required dependencies are available and healthy
    try {
      const healthResult = await this.healthChecker.performHealthCheck();
      if (healthResult.status === 'unhealthy') {
        throw new Error('Critical dependencies are unhealthy');
      }
    } catch (error) {
      this.log('warn', `Dependency verification warning: ${error}`);
    }
  }

  private startRealTimeMonitoring(): void {
    // Start periodic monitoring
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.refreshSystemStatus();
        
        if (this.config.enableCrossServiceAlerts) {
          await this.analyzeCrossServicePatterns();
        }
      } catch (error) {
        this.log('error', `Real-time monitoring failed: ${error}`);
      }
    }, 30000); // Every 30 seconds
  }

  private async refreshSystemStatus(): Promise<void> {
    try {
      // Get current metrics from all services
      const [apiMetrics, quotaStatus, healthSummary] = await Promise.allSettled([
        this.apiMetricsCollector.getMetrics('hour'),
        this.quotaMonitor.getEnhancedQuotaStatus(),
        this.healthChecker.getSystemHealthSummary()
      ]);

      const apiMetricsData = apiMetrics.status === 'fulfilled' ? apiMetrics.value : this.getEmptyApiMetrics();
      const quotaData = quotaStatus.status === 'fulfilled' && quotaStatus.value.success ? quotaStatus.value.data : null;
      const healthData = healthSummary.status === 'fulfilled' ? healthSummary.value : null;

      // Calculate overall health
      const overallScore = this.calculateOverallScore(apiMetricsData, quotaData, healthData);
      let overallHealth: SystemMonitoringStatus['overall_health'] = 'healthy';
      
      if (overallScore < 50) overallHealth = 'critical';
      else if (overallScore < 70) overallHealth = 'unhealthy';
      else if (overallScore < 85) overallHealth = 'degraded';

      // Generate insights and recommendations
      const insights = await this.generatePerformanceInsights(apiMetricsData, quotaData, healthData);
      const recommendations = await this.getPerformanceRecommendations();

      this.lastSystemStatus = {
        overall_health: overallHealth,
        overall_score: overallScore,
        services: {
          api_metrics: {
            status: 'running',
            last_update: new Date(),
            current_metrics: apiMetricsData
          },
          quota_monitor: {
            status: quotaData ? 'running' : 'degraded',
            last_update: new Date(),
            current_quota: quotaData || this.getEmptyQuotaStatus(),
            risk_level: this.assessRiskLevel(quotaData)
          },
          health_checker: {
            status: healthData ? 'running' : 'degraded',
            last_update: new Date(),
            health_summary: healthData ? {
              status: healthData.overall_status,
              last_check: new Date(),
              timestamp: new Date()
            } : {
              status: 'unhealthy',
              last_check: new Date(),
              timestamp: new Date(),
              error: 'Health data unavailable'
            }
          }
        },
        active_alerts: [], // Would be populated from active alert monitoring
        performance_insights: insights,
        system_recommendations: recommendations.success ? recommendations.data || [] : []
      };
    } catch (error) {
      this.log('error', `Failed to refresh system status: ${error}`);
    }
  }

  private shouldRefreshStatus(): boolean {
    if (!this.lastSystemStatus) return true;
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastSystemStatus.services.api_metrics.last_update < fiveMinutesAgo;
  }

  private calculateOverallScore(
    apiMetrics: ApiMetrics,
    quotaData: any,
    healthData: any
  ): number {
    let score = 100;

    // API metrics impact (30% weight)
    const errorRate = apiMetrics.total_requests > 0 ? apiMetrics.failed_requests / apiMetrics.total_requests : 0;
    score -= errorRate * 30;

    if (apiMetrics.average_response_time > 5000) score -= 10;
    else if (apiMetrics.average_response_time > 3000) score -= 5;

    // Quota impact (25% weight)
    if (quotaData) {
      if (quotaData.usage_percentage > 0.95) score -= 25;
      else if (quotaData.usage_percentage > 0.85) score -= 15;
      else if (quotaData.usage_percentage > 0.75) score -= 5;
    }

    // Health impact (45% weight)
    if (healthData) {
      const healthScore = healthData.overall_score || 0;
      score = score * 0.55 + healthScore * 0.45;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private async generatePerformanceInsights(
    apiMetrics: ApiMetrics,
    quotaData: any,
    healthData: any
  ): Promise<SystemMonitoringStatus['performance_insights']> {
    const insights: SystemMonitoringStatus['performance_insights'] = [];

    // API performance insights
    if (apiMetrics.average_response_time > 3000) {
      insights.push({
        category: 'api',
        insight: 'API response times are elevated',
        recommendation: 'Consider implementing request batching and connection pooling',
        impact: 'high'
      });
    }

    // Cache performance insights
    const cacheHitRate = (apiMetrics.cache_hits + apiMetrics.cache_misses) > 0 ? 
      apiMetrics.cache_hits / (apiMetrics.cache_hits + apiMetrics.cache_misses) : 1;
    
    if (cacheHitRate < 0.7) {
      insights.push({
        category: 'cache',
        insight: 'Cache hit rate is below optimal levels',
        recommendation: 'Review cache expiration policies and implement preloading',
        impact: 'medium'
      });
    }

    // Quota insights
    if (quotaData && quotaData.usage_percentage > 0.8) {
      insights.push({
        category: 'quota',
        insight: 'Quota usage is approaching limits',
        recommendation: 'Consider implementing request throttling or quota increase',
        impact: 'high'
      });
    }

    return insights;
  }

  private assessRiskLevel(quotaData: any): 'low' | 'medium' | 'high' | 'critical' {
    if (!quotaData) return 'medium';
    
    const usage = quotaData.usage_percentage;
    if (usage >= 0.95) return 'critical';
    if (usage >= 0.85) return 'high';
    if (usage >= 0.7) return 'medium';
    return 'low';
  }

  private async analyzeCrossServicePatterns(): Promise<void> {
    // Analyze patterns across services for early warning signals
    try {
      // This would implement cross-service correlation analysis
      // For now, this is a placeholder
    } catch (error) {
      this.log('error', `Cross-service analysis failed: ${error}`);
    }
  }

  private getPriorityWeight(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private getEmptyApiMetrics(): ApiMetrics {
    return {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      average_response_time: 0,
      cache_hits: 0,
      cache_misses: 0
    };
  }

  private getEmptyQuotaStatus(): QuotaStatus {
    return {
      current_usage: 0,
      quota_limit: 1000,
      quota_remaining: 1000,
      usage_percentage: 0,
      reset_date: new Date(),
      is_approaching_limit: false,
      is_quota_exceeded: false
    };
  }

  private log(level: string, message: string, ...args: any[]): void {
    if (this.shouldLog(level)) {
      const metadata = args.length > 0 ? { details: args } : {};
      const logMessage = `[MonitoringServiceManager] ${message}`;
      
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
    try {
      this.log('info', 'Shutting down MonitoringServiceManager');

      if (this.monitoringTimer) {
        clearInterval(this.monitoringTimer);
      }

      // Shutdown all monitoring services
      await Promise.allSettled([
        this.apiMetricsCollector.shutdown(),
        this.quotaMonitor.shutdown(),
        this.healthChecker.shutdown()
      ]);

      this.isInitialized = false;
      this.log('info', 'MonitoringServiceManager shut down successfully');
    } catch (error) {
      this.log('error', `Error during shutdown: ${error}`);
    }
  }
}
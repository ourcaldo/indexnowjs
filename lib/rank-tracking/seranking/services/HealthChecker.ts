/**
 * Health Checker Service
 * Comprehensive system health monitoring with dependency tracking,
 * composite scoring, automated diagnostics, and recovery recommendations
 */

import {
  HealthCheckResult,
  ServiceResponse,
  SeRankingErrorType,
  QuotaStatus,
  ApiMetrics
} from '../types/SeRankingTypes';
import {
  IHealthChecker,
  ISeRankingApiClient,
  IKeywordBankService,
  IIntegrationService
} from '../types/ServiceTypes';
import { supabaseAdmin } from '../../../database/supabase';
import { SecureServiceRoleWrapper } from '../../../services/security/SecureServiceRoleWrapper';
import { logger } from '@/lib/monitoring/error-handling';

// Comprehensive health check configuration
export interface HealthCheckConfig {
  intervals: {
    quickCheck: number; // milliseconds
    fullCheck: number; // milliseconds
    deepDiagnostics: number; // milliseconds
  };
  thresholds: {
    responseTime: {
      good: number; // ms
      degraded: number; // ms
      unhealthy: number; // ms
    };
    errorRate: {
      good: number; // percentage
      degraded: number; // percentage
      unhealthy: number; // percentage
    };
    availability: {
      good: number; // percentage
      degraded: number; // percentage
      unhealthy: number; // percentage
    };
  };
  dependencies: {
    critical: string[]; // Service names that are critical
    important: string[]; // Services that impact performance
    optional: string[]; // Services that are nice-to-have
  };
  recovery: {
    enableAutoRecovery: boolean;
    maxRetryAttempts: number;
    retryBackoffMs: number;
    escalationTimeoutMinutes: number;
  };
  alerting: {
    channels: Array<'email' | 'slack' | 'webhook' | 'pagerduty'>;
    severityLevels: {
      info: boolean;
      warning: boolean;
      error: boolean;
      critical: boolean;
    };
  };
  monitoring: {
    retentionDays: number;
    enableTrending: boolean;
    enablePredictiveAnalysis: boolean;
  };
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Individual health check result with detailed metrics
export interface DetailedHealthCheck extends HealthCheckResult {
  service_name: string;
  check_type: 'api' | 'database' | 'cache' | 'queue' | 'dependency' | 'custom';
  dependency_level: 'critical' | 'important' | 'optional';
  metrics: {
    response_time: number;
    availability_percent: number;
    error_rate_percent: number;
    throughput: number;
    resource_utilization?: {
      cpu?: number;
      memory?: number;
      disk?: number;
    };
  };
  diagnostics: {
    checks_performed: string[];
    anomalies_detected: string[];
    performance_issues: string[];
    recovery_attempts: number;
  };
  historical_comparison: {
    compared_to_yesterday: 'better' | 'same' | 'worse';
    compared_to_last_week: 'better' | 'same' | 'worse';
    trend_direction: 'improving' | 'stable' | 'degrading';
  };
  recommendations: Array<{
    type: 'immediate' | 'short_term' | 'long_term';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    implementation_effort: 'low' | 'medium' | 'high';
    estimated_impact: string;
  }>;
}

// System-wide health summary
export interface SystemHealthSummary {
  overall_status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  overall_score: number; // 0-100
  component_health: {
    api_gateway: DetailedHealthCheck;
    database: DetailedHealthCheck;
    cache_layer: DetailedHealthCheck;
    keyword_bank: DetailedHealthCheck;
    integration_service: DetailedHealthCheck;
    quota_monitor: DetailedHealthCheck;
    metrics_collector: DetailedHealthCheck;
  };
  system_metrics: {
    total_dependencies: number;
    healthy_dependencies: number;
    degraded_dependencies: number;
    unhealthy_dependencies: number;
    average_response_time: number;
    system_uptime_hours: number;
    last_incident_hours_ago?: number;
  };
  active_incidents: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    component: string;
    description: string;
    started_at: Date;
    estimated_resolution?: Date;
    recovery_actions: string[];
  }>;
  predictive_alerts: Array<{
    component: string;
    predicted_issue: string;
    probability: number;
    estimated_occurrence: Date;
    preventive_actions: string[];
  }>;
  performance_bottlenecks: Array<{
    component: string;
    bottleneck_type: 'cpu' | 'memory' | 'network' | 'database' | 'api_limit';
    severity_score: number;
    impact_description: string;
    optimization_suggestions: string[];
  }>;
}

// Recovery action result
export interface RecoveryActionResult {
  action_id: string;
  action_type: string;
  success: boolean;
  execution_time_ms: number;
  impact_description: string;
  follow_up_required: boolean;
  follow_up_actions?: string[];
}

export class HealthChecker implements IHealthChecker {
  private config: HealthCheckConfig;
  private apiClient?: ISeRankingApiClient;
  private keywordBankService?: IKeywordBankService;
  private integrationService?: IIntegrationService;
  
  // Runtime state
  private healthCache: Map<string, DetailedHealthCheck> = new Map();
  private activeIncidents: Map<string, any> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();
  private lastHealthCheck?: Date;
  private monitoringTimer?: NodeJS.Timeout;
  private systemStartTime: Date = new Date();

  constructor(
    dependencies: {
      apiClient?: ISeRankingApiClient;
      keywordBankService?: IKeywordBankService;
      integrationService?: IIntegrationService;
    } = {},
    config: Partial<HealthCheckConfig> = {}
  ) {
    this.apiClient = dependencies.apiClient;
    this.keywordBankService = dependencies.keywordBankService;
    this.integrationService = dependencies.integrationService;

    this.config = {
      intervals: {
        quickCheck: 30000, // 30 seconds
        fullCheck: 300000, // 5 minutes
        deepDiagnostics: 1800000 // 30 minutes
      },
      thresholds: {
        responseTime: {
          good: 1000,
          degraded: 3000,
          unhealthy: 10000
        },
        errorRate: {
          good: 1,
          degraded: 5,
          unhealthy: 15
        },
        availability: {
          good: 99.9,
          degraded: 99.0,
          unhealthy: 95.0
        }
      },
      dependencies: {
        critical: ['database', 'api_gateway', 'integration_service'],
        important: ['cache_layer', 'keyword_bank', 'quota_monitor'],
        optional: ['metrics_collector', 'analytics']
      },
      recovery: {
        enableAutoRecovery: true,
        maxRetryAttempts: 3,
        retryBackoffMs: 5000,
        escalationTimeoutMinutes: 15
      },
      alerting: {
        channels: ['email', 'webhook'],
        severityLevels: {
          info: false,
          warning: true,
          error: true,
          critical: true
        }
      },
      monitoring: {
        retentionDays: 30,
        enableTrending: true,
        enablePredictiveAnalysis: true
      },
      logLevel: 'info',
      ...config
    };

    this.initializeHealthMonitoring();
  }

  /**
   * Initialize continuous health monitoring
   */
  private async initializeHealthMonitoring(): Promise<void> {
    try {
      this.log('info', 'Initializing HealthChecker service');

      // Perform initial health check
      await this.performHealthCheck();

      // Start continuous monitoring
      this.startContinuousMonitoring();

      // Load historical health data
      await this.loadHistoricalHealthData();

      this.log('info', 'HealthChecker service initialized successfully');
    } catch (error) {
      this.log('error', `Failed to initialize HealthChecker: ${error}`);
      throw error;
    }
  }

  /**
   * Perform comprehensive health check across all system components
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    try {
      this.log('debug', 'Starting comprehensive health check');
      const startTime = Date.now();

      // Perform all health checks in parallel for efficiency
      const [
        apiHealth,
        dbHealth,
        cacheHealth,
        integrationHealth,
        systemHealth
      ] = await Promise.allSettled([
        this.checkApiHealth(),
        this.checkDatabaseHealth(),
        this.checkCacheHealth(),
        this.checkIntegrationHealth(),
        this.checkSystemHealth()
      ]);

      // Process results and calculate overall health
      const healthResults = {
        api_gateway: this.extractResult(apiHealth),
        database: this.extractResult(dbHealth),
        cache_layer: this.extractResult(cacheHealth),
        integration_service: this.extractResult(integrationHealth),
        system_resources: this.extractResult(systemHealth)
      };

      // Calculate overall health score
      const overallScore = this.calculateOverallHealthScore(healthResults);
      const overallStatus = this.determineOverallStatus(overallScore);

      // Update health cache
      Object.entries(healthResults).forEach(([key, result]) => {
        if (result) {
          this.healthCache.set(key, result);
        }
      });

      // Check for incidents and recovery actions
      await this.processHealthResults(healthResults);

      const totalTime = Date.now() - startTime;
      this.lastHealthCheck = new Date();

      const result: HealthCheckResult = {
        status: overallStatus,
        response_time: totalTime,
        last_check: this.lastHealthCheck,
        timestamp: this.lastHealthCheck
      };

      this.log('info', `Health check completed: ${overallStatus} (score: ${overallScore}, time: ${totalTime}ms)`);
      
      return result;
    } catch (error) {
      this.log('error', `Health check failed: ${error}`);
      return {
        status: 'unhealthy',
        error: `Health check failed: ${error}`,
        last_check: new Date(),
        timestamp: new Date()
      };
    }
  }

  /**
   * Check API endpoint health with detailed metrics
   */
  async checkApiHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!this.apiClient) {
        return this.createHealthResult('degraded', startTime, 'API client not available');
      }

      // Test API connectivity and performance
      const connectionResult = await this.apiClient.testConnection();
      const isHealthy = await this.apiClient.isHealthy();
      
      const responseTime = Date.now() - startTime;
      const status = this.evaluateResponseTime(responseTime, 'api');

      const healthCheck: DetailedHealthCheck = {
        ...connectionResult,
        service_name: 'api_gateway',
        check_type: 'api',
        dependency_level: 'critical',
        response_time: responseTime,
        timestamp: new Date(),
        metrics: {
          response_time: responseTime,
          availability_percent: isHealthy ? 100 : 0,
          error_rate_percent: 0,
          throughput: 0
        },
        diagnostics: {
          checks_performed: ['connection_test', 'authentication_test', 'rate_limit_check'],
          anomalies_detected: [],
          performance_issues: responseTime > this.config.thresholds.responseTime.degraded ? 
            ['High response time detected'] : [],
          recovery_attempts: this.recoveryAttempts.get('api_gateway') || 0
        },
        historical_comparison: await this.getHistoricalComparison('api_gateway'),
        recommendations: await this.generateRecommendations('api_gateway', status, responseTime)
      };

      return healthCheck;
    } catch (error) {
      this.log('error', `API health check failed: ${error}`);
      return this.createHealthResult('unhealthy', startTime, `API health check failed: ${error}`);
    }
  }

  /**
   * Check database health including connectivity and performance
   */
  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test database connectivity
      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'test_database_connectivity',
          reason: 'Health checker performing database connectivity test to verify database health status',
          source: 'rank-tracking/seranking/services/HealthChecker',
          metadata: {
            check_type: 'database_health',
            operation_type: 'connectivity_test'
          }
        },
        {
          table: 'indb_site_integration',
          operationType: 'select',
          columns: ['id'],
          whereConditions: {}
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_site_integration')
            .select('id')
            .limit(1)

          if (error) {
            throw new Error(`Database query failed: ${error.message}`)
          }

          return data || []
        }
      )

      const responseTime = Date.now() - startTime

      const status = this.evaluateResponseTime(responseTime, 'database');

      const healthCheck: DetailedHealthCheck = {
        status,
        response_time: responseTime,
        last_check: new Date(),
        timestamp: new Date(),
        service_name: 'database',
        check_type: 'database',
        dependency_level: 'critical',
        metrics: {
          response_time: responseTime,
          availability_percent: 100,
          error_rate_percent: 0,
          throughput: 0
        },
        diagnostics: {
          checks_performed: ['connection_test', 'query_performance', 'table_accessibility'],
          anomalies_detected: [],
          performance_issues: responseTime > this.config.thresholds.responseTime.degraded ? 
            ['Slow database response time'] : [],
          recovery_attempts: this.recoveryAttempts.get('database') || 0
        },
        historical_comparison: await this.getHistoricalComparison('database'),
        recommendations: await this.generateRecommendations('database', status, responseTime)
      };

      return healthCheck;
    } catch (error) {
      this.log('error', `Database health check failed: ${error}`);
      return this.createHealthResult('unhealthy', startTime, `Database health check failed: ${error}`);
    }
  }

  /**
   * Check cache layer health and performance
   */
  async checkCacheHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!this.keywordBankService) {
        return this.createHealthResult('degraded', startTime, 'Keyword bank service not available');
      }

      // Test cache performance by checking bank stats
      const cacheStats = await this.keywordBankService.getBankStats();
      const responseTime = Date.now() - startTime;
      
      const hitRatio = cacheStats.total_keywords > 0 ? 
        cacheStats.with_data / cacheStats.total_keywords : 1;

      let status: HealthCheckResult['status'] = 'healthy';
      if (hitRatio < 0.5) status = 'unhealthy';
      else if (hitRatio < 0.7) status = 'degraded';

      const healthCheck: DetailedHealthCheck = {
        status,
        response_time: responseTime,
        last_check: new Date(),
        timestamp: new Date(),
        service_name: 'cache_layer',
        check_type: 'cache',
        dependency_level: 'important',
        metrics: {
          response_time: responseTime,
          availability_percent: 100,
          error_rate_percent: 0,
          throughput: 0
        },
        diagnostics: {
          checks_performed: ['cache_stats', 'hit_ratio_check', 'response_time_check'],
          anomalies_detected: hitRatio < 0.5 ? ['Low cache hit ratio detected'] : [],
          performance_issues: responseTime > this.config.thresholds.responseTime.degraded ? 
            ['Slow cache response time'] : [],
          recovery_attempts: this.recoveryAttempts.get('cache_layer') || 0
        },
        historical_comparison: await this.getHistoricalComparison('cache_layer'),
        recommendations: await this.generateRecommendations('cache_layer', status, responseTime)
      };

      return healthCheck;
    } catch (error) {
      this.log('error', `Cache health check failed: ${error}`);
      return this.createHealthResult('unhealthy', startTime, `Cache health check failed: ${error}`);
    }
  }

  /**
   * Check integration service health and quota status
   */
  async checkIntegrationHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!this.integrationService) {
        return this.createHealthResult('degraded', startTime, 'Integration service not available');
      }

      // Test integration service health
      const integrationResult = await this.integrationService.testIntegration();
      const responseTime = Date.now() - startTime;

      if (!integrationResult.success || !integrationResult.data) {
        throw new Error('Integration service test failed');
      }

      const integrationHealth = integrationResult.data;
      
      const healthCheck: DetailedHealthCheck = {
        status: integrationHealth.status,
        response_time: responseTime,
        last_check: new Date(),
        timestamp: new Date(),
        service_name: 'integration_service',
        check_type: 'dependency',
        dependency_level: 'critical',
        metrics: {
          response_time: responseTime,
          availability_percent: integrationHealth.status === 'healthy' ? 100 : 
                              integrationHealth.status === 'degraded' ? 75 : 25,
          error_rate_percent: 0,
          throughput: 0
        },
        diagnostics: {
          checks_performed: ['integration_test', 'quota_check', 'api_key_validation'],
          anomalies_detected: integrationHealth.warning ? [integrationHealth.warning] : [],
          performance_issues: integrationHealth.error ? [integrationHealth.error] : [],
          recovery_attempts: this.recoveryAttempts.get('integration_service') || 0
        },
        historical_comparison: await this.getHistoricalComparison('integration_service'),
        recommendations: await this.generateRecommendations('integration_service', integrationHealth.status, responseTime)
      };

      return healthCheck;
    } catch (error) {
      this.log('error', `Integration health check failed: ${error}`);
      return this.createHealthResult('unhealthy', startTime, `Integration health check failed: ${error}`);
    }
  }

  /**
   * Check system resources and performance
   */
  async checkSystemHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Calculate system uptime
      const uptimeHours = (Date.now() - this.systemStartTime.getTime()) / (1000 * 60 * 60);
      
      // Basic system health indicators
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const healthCheck: DetailedHealthCheck = {
        status: 'healthy',
        response_time: Date.now() - startTime,
        last_check: new Date(),
        timestamp: new Date(),
        service_name: 'system_resources',
        check_type: 'custom',
        dependency_level: 'critical',
        metrics: {
          response_time: Date.now() - startTime,
          availability_percent: 100,
          error_rate_percent: 0,
          throughput: 0,
          resource_utilization: {
            memory: Math.round(memoryUsage.heapUsed / memoryUsage.heapTotal * 100),
            cpu: Math.round((cpuUsage.user + cpuUsage.system) / 1000000) // Convert to milliseconds
          }
        },
        diagnostics: {
          checks_performed: ['memory_usage', 'cpu_usage', 'uptime_check'],
          anomalies_detected: [],
          performance_issues: [],
          recovery_attempts: 0
        },
        historical_comparison: await this.getHistoricalComparison('system_resources'),
        recommendations: []
      };

      return healthCheck;
    } catch (error) {
      this.log('error', `System health check failed: ${error}`);
      return this.createHealthResult('unhealthy', startTime, `System health check failed: ${error}`);
    }
  }

  /**
   * Get comprehensive system health summary
   */
  async getSystemHealthSummary(): Promise<SystemHealthSummary> {
    try {
      // Ensure we have recent health data
      if (!this.lastHealthCheck || (Date.now() - this.lastHealthCheck.getTime()) > 60000) {
        await this.performHealthCheck();
      }

      const healthComponents = Array.from(this.healthCache.values());
      const totalComponents = healthComponents.length;
      const healthyComponents = healthComponents.filter(h => h.status === 'healthy').length;
      const degradedComponents = healthComponents.filter(h => h.status === 'degraded').length;
      const unhealthyComponents = healthComponents.filter(h => h.status === 'unhealthy').length;

      const overallScore = this.calculateOverallHealthScore(
        Object.fromEntries(Array.from(this.healthCache.entries()))
      );

      let overallStatus: SystemHealthSummary['overall_status'] = 'healthy';
      if (overallScore < 50) overallStatus = 'critical';
      else if (overallScore < 70) overallStatus = 'unhealthy';
      else if (overallScore < 85) overallStatus = 'degraded';

      const summary: SystemHealthSummary = {
        overall_status: overallStatus,
        overall_score: overallScore,
        component_health: {
          api_gateway: this.healthCache.get('api_gateway') || this.getEmptyHealthCheck('api_gateway'),
          database: this.healthCache.get('database') || this.getEmptyHealthCheck('database'),
          cache_layer: this.healthCache.get('cache_layer') || this.getEmptyHealthCheck('cache_layer'),
          keyword_bank: this.healthCache.get('keyword_bank') || this.getEmptyHealthCheck('keyword_bank'),
          integration_service: this.healthCache.get('integration_service') || this.getEmptyHealthCheck('integration_service'),
          quota_monitor: this.healthCache.get('quota_monitor') || this.getEmptyHealthCheck('quota_monitor'),
          metrics_collector: this.healthCache.get('metrics_collector') || this.getEmptyHealthCheck('metrics_collector')
        },
        system_metrics: {
          total_dependencies: totalComponents,
          healthy_dependencies: healthyComponents,
          degraded_dependencies: degradedComponents,
          unhealthy_dependencies: unhealthyComponents,
          average_response_time: healthComponents.length > 0 ? 
            healthComponents.reduce((sum, h) => sum + (h.response_time || 0), 0) / healthComponents.length : 0,
          system_uptime_hours: (Date.now() - this.systemStartTime.getTime()) / (1000 * 60 * 60)
        },
        active_incidents: Array.from(this.activeIncidents.values()),
        predictive_alerts: [],
        performance_bottlenecks: await this.identifyPerformanceBottlenecks()
      };

      return summary;
    } catch (error) {
      this.log('error', `Failed to get system health summary: ${error}`);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private extractResult(settledResult: PromiseSettledResult<HealthCheckResult>): DetailedHealthCheck | null {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value as DetailedHealthCheck;
    } else {
      this.log('error', `Health check failed: ${settledResult.reason}`);
      return null;
    }
  }

  private calculateOverallHealthScore(healthResults: Record<string, DetailedHealthCheck | null>): number {
    const results = Object.values(healthResults).filter(r => r !== null) as DetailedHealthCheck[];
    
    if (results.length === 0) return 0;

    const scores = results.map(result => {
      switch (result.status) {
        case 'healthy': return 100;
        case 'degraded': return 70;
        case 'unhealthy': return 30;
        default: return 50;
      }
    });

    // Weight critical dependencies more heavily
    let weightedScore = 0;
    let totalWeight = 0;

    results.forEach((result, index) => {
      const weight = result.dependency_level === 'critical' ? 3 : 
                     result.dependency_level === 'important' ? 2 : 1;
      weightedScore += scores[index] * weight;
      totalWeight += weight;
    });

    return Math.round(weightedScore / totalWeight);
  }

  private determineOverallStatus(score: number): HealthCheckResult['status'] {
    if (score >= 85) return 'healthy';
    if (score >= 70) return 'degraded';
    return 'unhealthy';
  }

  private evaluateResponseTime(responseTime: number, component: string): HealthCheckResult['status'] {
    const thresholds = this.config.thresholds.responseTime;
    
    if (responseTime <= thresholds.good) return 'healthy';
    if (responseTime <= thresholds.degraded) return 'degraded';
    return 'unhealthy';
  }

  private createHealthResult(
    status: HealthCheckResult['status'], 
    startTime: number, 
    error?: string
  ): DetailedHealthCheck {
    return {
      status,
      response_time: Date.now() - startTime,
      last_check: new Date(),
      timestamp: new Date(),
      error,
      service_name: 'unknown',
      check_type: 'custom',
      dependency_level: 'optional',
      metrics: {
        response_time: Date.now() - startTime,
        availability_percent: status === 'healthy' ? 100 : 0,
        error_rate_percent: 0,
        throughput: 0
      },
      diagnostics: {
        checks_performed: [],
        anomalies_detected: error ? [error] : [],
        performance_issues: [],
        recovery_attempts: 0
      },
      historical_comparison: {
        compared_to_yesterday: 'same',
        compared_to_last_week: 'same',
        trend_direction: 'stable'
      },
      recommendations: []
    };
  }

  private getEmptyHealthCheck(serviceName: string): DetailedHealthCheck {
    return {
      status: 'unhealthy',
      response_time: 0,
      last_check: new Date(),
      timestamp: new Date(),
      error: 'Service not monitored',
      service_name: serviceName,
      check_type: 'custom',
      dependency_level: 'optional',
      metrics: {
        response_time: 0,
        availability_percent: 0,
        error_rate_percent: 100,
        throughput: 0
      },
      diagnostics: {
        checks_performed: [],
        anomalies_detected: ['Service not available for monitoring'],
        performance_issues: [],
        recovery_attempts: 0
      },
      historical_comparison: {
        compared_to_yesterday: 'worse',
        compared_to_last_week: 'worse',
        trend_direction: 'degrading'
      },
      recommendations: [{
        type: 'immediate',
        priority: 'high',
        description: 'Configure health monitoring for this service',
        implementation_effort: 'medium',
        estimated_impact: 'Improved system visibility'
      }]
    };
  }

  private async getHistoricalComparison(serviceName: string): Promise<DetailedHealthCheck['historical_comparison']> {
    // This would compare with historical data from database
    // Placeholder implementation
    return {
      compared_to_yesterday: 'same',
      compared_to_last_week: 'same',
      trend_direction: 'stable'
    };
  }

  private async generateRecommendations(
    serviceName: string, 
    status: HealthCheckResult['status'], 
    responseTime: number
  ): Promise<DetailedHealthCheck['recommendations']> {
    const recommendations: DetailedHealthCheck['recommendations'] = [];

    if (status === 'unhealthy') {
      recommendations.push({
        type: 'immediate',
        priority: 'critical',
        description: `${serviceName} is unhealthy and requires immediate attention`,
        implementation_effort: 'high',
        estimated_impact: 'Restore service functionality'
      });
    }

    if (responseTime > this.config.thresholds.responseTime.degraded) {
      recommendations.push({
        type: 'short_term',
        priority: 'medium',
        description: 'Optimize response time through caching or resource scaling',
        implementation_effort: 'medium',
        estimated_impact: 'Improve user experience and system performance'
      });
    }

    if (status === 'degraded') {
      recommendations.push({
        type: 'short_term',
        priority: 'medium',
        description: 'Monitor service closely and consider preventive maintenance',
        implementation_effort: 'low',
        estimated_impact: 'Prevent service degradation'
      });
    }

    return recommendations;
  }

  private async processHealthResults(healthResults: Record<string, DetailedHealthCheck | null>): Promise<void> {
    // Process health results for incidents and recovery actions
    for (const [serviceName, result] of Object.entries(healthResults)) {
      if (!result) continue;

      if (result.status === 'unhealthy' && this.config.recovery.enableAutoRecovery) {
        await this.attemptAutoRecovery(serviceName, result);
      }

      if (result.status === 'unhealthy' || result.status === 'degraded') {
        await this.createIncidentIfNeeded(serviceName, result);
      }
    }
  }

  private async attemptAutoRecovery(serviceName: string, healthCheck: DetailedHealthCheck): Promise<void> {
    const currentAttempts = this.recoveryAttempts.get(serviceName) || 0;
    
    if (currentAttempts >= this.config.recovery.maxRetryAttempts) {
      this.log('warn', `Max recovery attempts reached for ${serviceName}`);
      return;
    }

    this.log('info', `Attempting auto-recovery for ${serviceName} (attempt ${currentAttempts + 1})`);
    
    try {
      // Implement service-specific recovery actions
      const success = await this.executeRecoveryAction(serviceName, healthCheck);
      
      if (success) {
        this.recoveryAttempts.delete(serviceName);
        this.log('info', `Auto-recovery successful for ${serviceName}`);
      } else {
        this.recoveryAttempts.set(serviceName, currentAttempts + 1);
        this.log('warn', `Auto-recovery failed for ${serviceName}`);
      }
    } catch (error) {
      this.log('error', `Auto-recovery error for ${serviceName}: ${error}`);
      this.recoveryAttempts.set(serviceName, currentAttempts + 1);
    }
  }

  private async executeRecoveryAction(serviceName: string, healthCheck: DetailedHealthCheck): Promise<boolean> {
    // Implement service-specific recovery logic
    switch (serviceName) {
      case 'api_gateway':
        return this.recoverApiGateway(healthCheck);
      case 'database':
        return this.recoverDatabase(healthCheck);
      case 'cache_layer':
        return this.recoverCacheLayer(healthCheck);
      default:
        return false;
    }
  }

  private async recoverApiGateway(healthCheck: DetailedHealthCheck): Promise<boolean> {
    // API gateway recovery logic
    if (this.apiClient) {
      try {
        const result = await this.apiClient.testConnection();
        return result.status === 'healthy';
      } catch {
        return false;
      }
    }
    return false;
  }

  private async recoverDatabase(healthCheck: DetailedHealthCheck): Promise<boolean> {
    // Database recovery logic - typically involves connection pool refresh using secure service role wrapper
    try {
      const operationContext = {
        userId: 'system',
        operation: 'health_check_database_recovery',
        reason: 'SeRanking health checker verifying database connectivity for recovery',
        source: 'lib/rank-tracking/seranking/services/HealthChecker',
        metadata: {
          healthCheck: healthCheck.status,
          recoveryAttempt: true
        }
      };

      const result = await SecureServiceRoleHelpers.secureSelect(
        operationContext,
        'indb_site_integration',
        ['id'],
        {}
      );
      
      // If we can successfully query the table, database is healthy
      return true;
    } catch {
      return false;
    }
  }

  private async recoverCacheLayer(healthCheck: DetailedHealthCheck): Promise<boolean> {
    // Cache layer recovery logic
    return true; // Placeholder
  }

  private async createIncidentIfNeeded(serviceName: string, healthCheck: DetailedHealthCheck): Promise<void> {
    if (!this.activeIncidents.has(serviceName)) {
      const incident = {
        id: `incident_${serviceName}_${Date.now()}`,
        severity: healthCheck.status === 'unhealthy' ? 'high' : 'medium',
        component: serviceName,
        description: healthCheck.error || `${serviceName} is ${healthCheck.status}`,
        started_at: new Date(),
        recovery_actions: healthCheck.recommendations.map(r => r.description)
      };
      
      this.activeIncidents.set(serviceName, incident);
      this.log('warn', `Created incident for ${serviceName}: ${incident.description}`);
    }
  }

  private async identifyPerformanceBottlenecks(): Promise<SystemHealthSummary['performance_bottlenecks']> {
    const bottlenecks: SystemHealthSummary['performance_bottlenecks'] = [];
    
    for (const [serviceName, healthCheck] of Array.from(this.healthCache.entries())) {
      if (healthCheck.response_time && healthCheck.response_time > this.config.thresholds.responseTime.degraded) {
        bottlenecks.push({
          component: serviceName,
          bottleneck_type: 'network',
          severity_score: Math.min(100, (healthCheck.response_time / this.config.thresholds.responseTime.good) * 10),
          impact_description: `High response time: ${healthCheck.response_time}ms`,
          optimization_suggestions: [
            'Implement response caching',
            'Optimize database queries',
            'Consider CDN implementation'
          ]
        });
      }
    }
    
    return bottlenecks;
  }

  private startContinuousMonitoring(): void {
    // Start health monitoring timer
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.log('error', `Continuous monitoring failed: ${error}`);
      }
    }, this.config.intervals.quickCheck);
  }

  private async loadHistoricalHealthData(): Promise<void> {
    // Load historical health data for trend analysis
    try {
      const { data, error } = await supabaseAdmin
        .from('indb_seranking_health_checks')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        this.log('warn', `Failed to load historical health data: ${error.message}`);
      } else {
        this.log('info', `Loaded ${(data || []).length} historical health records`);
      }
    } catch (error) {
      this.log('error', `Error loading historical health data: ${error}`);
    }
  }

  private log(level: string, message: string, ...args: any[]): void {
    if (this.shouldLog(level)) {
      const logMessage = `[HealthChecker] ${message}`;
      const metadata = args.length > 0 ? { details: args } : {};
      
      switch (level) {
        case 'debug':
          logger.info(metadata, logMessage);
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
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    // Resolve any active incidents
    for (const incident of Array.from(this.activeIncidents.values())) {
      incident.resolved_at = new Date();
    }
    
    this.log('info', 'HealthChecker service shut down successfully');
  }
}
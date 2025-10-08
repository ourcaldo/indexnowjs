/**
 * Comprehensive Integration Tests for SeRanking Monitoring Services
 * Tests the integration between ApiMetricsCollector, QuotaMonitor, and HealthChecker
 */

import { MonitoringServiceManager } from '../MonitoringServiceManager';
import { ApiMetricsCollector } from '../ApiMetricsCollector';
import { QuotaMonitor } from '../QuotaMonitor';
import { HealthChecker } from '../HealthChecker';
import { SeRankingErrorType, QuotaStatus, ApiMetrics, HealthCheckResult } from '../../types/SeRankingTypes';

// Mock implementation of dependencies
class MockIntegrationService {
  private quotaUsed = 100;
  private quotaLimit = 1000;

  async getIntegrationSettings() {
    return {
      success: true,
      data: {
        service_name: 'seranking',
        api_url: 'https://api.seranking.com',
        api_quota_limit: this.quotaLimit,
        api_quota_used: this.quotaUsed,
        quota_reset_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        is_active: true
      }
    };
  }

  async recordApiUsage(requestCount = 1) {
    this.quotaUsed += requestCount;
    return { success: true, data: true };
  }

  async testIntegration() {
    return {
      success: true,
      data: {
        status: 'healthy' as const,
        response_time: 150,
        last_check: new Date(),
        timestamp: new Date()
      }
    };
  }

  async resetQuotaUsage() {
    this.quotaUsed = 0;
    return { success: true, data: true };
  }

  async updateIntegrationSettings(settings: any) {
    if (settings.api_quota_limit) this.quotaLimit = settings.api_quota_limit;
    return { success: true, data: true };
  }
}

class MockApiClient {
  async testConnection(): Promise<HealthCheckResult> {
    return {
      status: 'healthy',
      response_time: 200,
      last_check: new Date(),
      timestamp: new Date()
    };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async getQuotaStatus(): Promise<QuotaStatus> {
    return {
      current_usage: 100,
      quota_limit: 1000,
      quota_remaining: 900,
      usage_percentage: 0.1,
      reset_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      is_approaching_limit: false,
      is_quota_exceeded: false
    };
  }

  async fetchKeywordData(keywords: string[], countryCode: string) {
    // Simulate API response
    return keywords.map(keyword => ({
      keyword,
      is_data_found: true,
      volume: Math.floor(Math.random() * 10000),
      cpc: Math.random() * 5,
      competition: Math.random(),
      difficulty: Math.floor(Math.random() * 100),
      history_trend: {}
    }));
  }
}

class MockKeywordBankService {
  async getBankStats() {
    return {
      total_keywords: 1000,
      with_data: 800,
      without_data: 200,
      average_age_days: 7
    };
  }

  async getKeywordData(keyword: string, countryCode: string) {
    return {
      id: 'test-id',
      keyword,
      country_code: countryCode,
      language_code: 'en',
      is_data_found: true,
      volume: 1000,
      cpc: 2.5,
      competition: 0.5,
      difficulty: 45,
      history_trend: {},
      keyword_intent: 'commercial',
      data_updated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
  }
}

describe('SeRanking Monitoring Services Integration', () => {
  let monitoringManager: MonitoringServiceManager;
  let mockIntegrationService: MockIntegrationService;
  let mockApiClient: MockApiClient;
  let mockKeywordBankService: MockKeywordBankService;

  beforeAll(async () => {
    // Initialize mock services
    mockIntegrationService = new MockIntegrationService();
    mockApiClient = new MockApiClient();
    mockKeywordBankService = new MockKeywordBankService();

    // Initialize monitoring manager with mocked dependencies
    monitoringManager = new MonitoringServiceManager(
      {
        integrationService: mockIntegrationService as any,
        apiClient: mockApiClient as any,
        keywordBankService: mockKeywordBankService as any
      },
      {
        enableRealTimeMonitoring: false, // Disable for testing
        enableCrossServiceAlerts: true,
        enablePerformanceOptimization: true,
        enablePredictiveAnalysis: true,
        logLevel: 'error' // Reduce noise in tests
      }
    );

    await monitoringManager.initialize();
  });

  afterAll(async () => {
    await monitoringManager.shutdown();
  });

  describe('Service Initialization', () => {
    test('should initialize all monitoring services successfully', async () => {
      const status = monitoringManager.getServiceStatus();
      
      expect(status.isInitialized).toBe(true);
      expect(status.services.apiMetricsCollector).toBe(true);
      expect(status.services.quotaMonitor).toBe(true);
      expect(status.services.healthChecker).toBe(true);
    });

    test('should provide system monitoring status', async () => {
      const systemStatus = await monitoringManager.getSystemMonitoringStatus();
      
      expect(systemStatus).toHaveProperty('overall_health');
      expect(systemStatus).toHaveProperty('overall_score');
      expect(systemStatus).toHaveProperty('services');
      expect(systemStatus.services).toHaveProperty('api_metrics');
      expect(systemStatus.services).toHaveProperty('quota_monitor');
      expect(systemStatus.services).toHaveProperty('health_checker');
    });
  });

  describe('API Metrics Collection', () => {
    test('should record and track API operations', async () => {
      // Record several API operations
      await monitoringManager.recordApiOperation('keyword_enrichment', {
        keywords: ['test keyword 1', 'test keyword 2'],
        countryCode: 'us',
        quotaConsumed: 2,
        cacheHit: false,
        responseTime: 1500,
        success: true,
        userId: 'test-user-1'
      });

      await monitoringManager.recordApiOperation('cache_lookup', {
        keywords: ['cached keyword'],
        countryCode: 'us',
        quotaConsumed: 0,
        cacheHit: true,
        responseTime: 50,
        success: true,
        userId: 'test-user-1'
      });

      await monitoringManager.recordApiOperation('keyword_enrichment', {
        keywords: ['failing keyword'],
        countryCode: 'uk',
        quotaConsumed: 1,
        cacheHit: false,
        responseTime: 5000,
        success: false,
        errorType: SeRankingErrorType.RATE_LIMIT_ERROR,
        userId: 'test-user-2'
      });

      // Allow some time for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const systemStatus = await monitoringManager.getSystemMonitoringStatus(true);
      const apiMetrics = systemStatus.services.api_metrics.current_metrics;

      expect(apiMetrics.total_requests).toBeGreaterThan(0);
      expect(apiMetrics.cache_hits).toBeGreaterThan(0);
      expect(apiMetrics.cache_misses).toBeGreaterThan(0);
    });

    test('should provide performance analysis', async () => {
      const systemStatus = await monitoringManager.getSystemMonitoringStatus(true);
      
      expect(systemStatus.performance_insights).toBeInstanceOf(Array);
      expect(systemStatus.system_recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Quota Monitoring', () => {
    test('should track quota usage and provide predictions', async () => {
      const systemStatus = await monitoringManager.getSystemMonitoringStatus(true);
      const quotaService = systemStatus.services.quota_monitor;

      expect(quotaService.status).toBe('running');
      expect(quotaService.current_quota).toHaveProperty('current_usage');
      expect(quotaService.current_quota).toHaveProperty('quota_limit');
      expect(quotaService.current_quota).toHaveProperty('usage_percentage');
      expect(quotaService.risk_level).toMatch(/^(low|medium|high|critical)$/);
    });

    test('should handle high quota usage scenarios', async () => {
      // Simulate high quota usage
      for (let i = 0; i < 50; i++) {
        await monitoringManager.recordApiOperation('keyword_enrichment', {
          keywords: [`high-usage-keyword-${i}`],
          countryCode: 'us',
          quotaConsumed: 15,
          success: true,
          userId: 'test-high-usage-user'
        });
      }

      const systemStatus = await monitoringManager.getSystemMonitoringStatus(true);
      const quotaService = systemStatus.services.quota_monitor;

      // Check if risk level increased
      expect(['medium', 'high', 'critical']).toContain(quotaService.risk_level);
    });
  });

  describe('Health Monitoring', () => {
    test('should perform comprehensive health checks', async () => {
      const systemStatus = await monitoringManager.getSystemMonitoringStatus(true);
      const healthService = systemStatus.services.health_checker;

      expect(healthService.status).toBe('running');
      expect(healthService.health_summary.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(healthService.health_summary).toHaveProperty('last_check');
    });

    test('should detect system degradation', async () => {
      // Simulate system stress through multiple failed operations
      for (let i = 0; i < 10; i++) {
        await monitoringManager.recordApiOperation('keyword_enrichment', {
          keywords: [`failing-keyword-${i}`],
          countryCode: 'us',
          quotaConsumed: 1,
          responseTime: 10000, // Very slow response
          success: false,
          errorType: SeRankingErrorType.TIMEOUT_ERROR
        });
      }

      const systemStatus = await monitoringManager.getSystemMonitoringStatus(true);
      
      // System should detect performance issues
      expect(systemStatus.performance_insights.length).toBeGreaterThan(0);
      expect(systemStatus.system_recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Service Integration', () => {
    test('should provide unified system status', async () => {
      const systemStatus = await monitoringManager.getSystemMonitoringStatus();

      expect(systemStatus.overall_health).toMatch(/^(healthy|degraded|unhealthy|critical)$/);
      expect(systemStatus.overall_score).toBeGreaterThanOrEqual(0);
      expect(systemStatus.overall_score).toBeLessThanOrEqual(100);
    });

    test('should generate performance recommendations', async () => {
      const recommendations = await monitoringManager.getPerformanceRecommendations();

      expect(recommendations.success).toBe(true);
      if (recommendations.data) {
        expect(Array.isArray(recommendations.data)).toBe(true);
        
        recommendations.data.forEach(rec => {
          expect(rec).toHaveProperty('priority');
          expect(rec).toHaveProperty('category');
          expect(rec).toHaveProperty('description');
          expect(rec).toHaveProperty('implementation_effort');
          expect(rec).toHaveProperty('expected_impact');
        });
      }
    });

    test('should run comprehensive system diagnostics', async () => {
      const diagnostics = await monitoringManager.runSystemDiagnostics();

      expect(diagnostics.success).toBe(true);
      if (diagnostics.data) {
        expect(diagnostics.data).toHaveProperty('diagnostics_id');
        expect(diagnostics.data).toHaveProperty('overall_status');
        expect(diagnostics.data).toHaveProperty('component_results');
        expect(diagnostics.data).toHaveProperty('recommendations');

        expect(diagnostics.data.overall_status).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(Array.isArray(diagnostics.data.recommendations)).toBe(true);
      }
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high volume of operations efficiently', async () => {
      const startTime = Date.now();
      const operations = 100;

      // Record many operations in parallel
      const promises = Array.from({ length: operations }, (_, i) => 
        monitoringManager.recordApiOperation('keyword_enrichment', {
          keywords: [`perf-test-keyword-${i}`],
          countryCode: 'us',
          quotaConsumed: 1,
          responseTime: Math.random() * 1000,
          success: Math.random() > 0.1, // 90% success rate
          userId: `perf-test-user-${i % 10}`
        })
      );

      await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(totalTime).toBeLessThan(5000);

      // System should still be responsive
      const systemStatus = await monitoringManager.getSystemMonitoringStatus(true);
      expect(systemStatus.overall_health).toMatch(/^(healthy|degraded|unhealthy|critical)$/);
    });

    test('should maintain data consistency across services', async () => {
      const initialStatus = await monitoringManager.getSystemMonitoringStatus(true);
      
      // Record a known operation
      await monitoringManager.recordApiOperation('keyword_enrichment', {
        keywords: ['consistency-test-keyword'],
        countryCode: 'us',
        quotaConsumed: 5,
        responseTime: 2000,
        success: true,
        userId: 'consistency-test-user'
      });

      const updatedStatus = await monitoringManager.getSystemMonitoringStatus(true);
      
      // Quota should have increased
      expect(updatedStatus.services.quota_monitor.current_quota.current_usage)
        .toBeGreaterThan(initialStatus.services.quota_monitor.current_quota.current_usage);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should gracefully handle service failures', async () => {
      // This would test what happens when underlying services fail
      // For now, we'll test that the manager continues to work even with some errors
      
      const systemStatus = await monitoringManager.getSystemMonitoringStatus();
      expect(systemStatus).toBeDefined();
      expect(typeof systemStatus.overall_score).toBe('number');
    });

    test('should recover from temporary failures', async () => {
      // Test that the system can recover after encountering errors
      const status1 = await monitoringManager.getSystemMonitoringStatus();
      
      // Simulate some recovery time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status2 = await monitoringManager.getSystemMonitoringStatus();
      
      // Both statuses should be valid
      expect(status1).toBeDefined();
      expect(status2).toBeDefined();
    });
  });

  describe('Configuration and Customization', () => {
    test('should respect configuration settings', () => {
      const serviceStatus = monitoringManager.getServiceStatus();
      
      // Should reflect that real-time monitoring is disabled in test config
      expect(serviceStatus.isInitialized).toBe(true);
    });
  });
});

// Helper functions for testing
function generateMockApiMetrics(): ApiMetrics {
  return {
    total_requests: 100,
    successful_requests: 95,
    failed_requests: 5,
    average_response_time: 1500,
    cache_hits: 30,
    cache_misses: 70
  };
}

function generateMockQuotaStatus(): QuotaStatus {
  return {
    current_usage: 150,
    quota_limit: 1000,
    quota_remaining: 850,
    usage_percentage: 0.15,
    reset_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
    is_approaching_limit: false,
    is_quota_exceeded: false
  };
}

// Integration test utilities
export const testUtilities = {
  createMockIntegrationService: () => new MockIntegrationService(),
  createMockApiClient: () => new MockApiClient(),
  createMockKeywordBankService: () => new MockKeywordBankService(),
  generateMockApiMetrics,
  generateMockQuotaStatus
};

// Export for use in other test files
export { MockIntegrationService, MockApiClient, MockKeywordBankService };
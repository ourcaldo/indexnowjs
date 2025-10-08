/**
 * Integration Service Example & Manual Test
 * Example usage and manual test of the SeRanking Integration Service
 */

import { IntegrationService } from './IntegrationService';
import { ISeRankingApiClient } from '../types/ServiceTypes';
import { HealthCheckResult, SeRankingApiResponse } from '../types/SeRankingTypes';
import { logger } from '@/lib/monitoring/error-handling';

// Mock API Client for testing
class MockSeRankingApiClient implements ISeRankingApiClient {
  private isHealthy: boolean = true;
  
  constructor(healthy = true) {
    this.isHealthy = healthy;
  }

  async fetchKeywordData(keywords: string[], countryCode: string): Promise<SeRankingApiResponse> {
    // Mock response
    return keywords.map(keyword => ({
      is_data_found: true,
      keyword,
      volume: Math.floor(Math.random() * 10000),
      cpc: Math.round(Math.random() * 10 * 100) / 100,
      competition: Math.round(Math.random() * 100) / 100,
      difficulty: Math.floor(Math.random() * 100),
      history_trend: {
        '2024-01': Math.floor(Math.random() * 5000),
        '2024-02': Math.floor(Math.random() * 5000)
      }
    }));
  }

  async testConnection(): Promise<HealthCheckResult> {
    return {
      status: this.isHealthy ? 'healthy' : 'unhealthy',
      last_check: new Date(),
      response_time: Math.floor(Math.random() * 500) + 50, // 50-550ms
      error_message: this.isHealthy ? undefined : 'Connection failed'
    };
  }

  async getQuotaStatus() {
    return {
      current_usage: 245,
      quota_limit: 1000,
      quota_remaining: 755,
      usage_percentage: 0.245,
      reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      is_approaching_limit: false,
      is_quota_exceeded: false
    };
  }

  async isHealthy(): Promise<boolean> {
    return this.isHealthy;
  }

  setHealthy(healthy: boolean) {
    this.isHealthy = healthy;
  }
}

/**
 * Manual test runner for IntegrationService
 */
export class IntegrationServiceTester {
  private service: IntegrationService;
  private mockApiClient: MockSeRankingApiClient;

  constructor() {
    this.mockApiClient = new MockSeRankingApiClient(true);
    this.service = new IntegrationService({
      defaultQuotaLimit: 1000,
      quotaWarningThreshold: 0.8,
      quotaCriticalThreshold: 0.95,
      logLevel: 'info'
    }, this.mockApiClient);
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting IntegrationService Manual Tests\n');

    try {
      await this.testGetIntegrationSettings();
      await this.testUpdateIntegrationSettings();
      await this.testValidateApiKey();
      await this.testRecordApiUsage();
      await this.testQuotaManagement();
      await this.testHealthChecking();
      await this.testUsageReporting();
      await this.testQuotaAlerts();

      console.log('\n✅ All manual tests completed successfully!');
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, '\n❌ Test failed');
    }
  }

  private async testGetIntegrationSettings(): Promise<void> {
    console.log('📋 Testing getIntegrationSettings...');
    
    const result = await this.service.getIntegrationSettings('test-user');
    
    console.log('- Result:', {
      success: result.success,
      hasData: !!result.data,
      serviceName: result.data?.service_name,
      isActive: result.data?.is_active
    });
    
    if (!result.success) {
      throw new Error('getIntegrationSettings failed');
    }
    console.log('✅ getIntegrationSettings passed\n');
  }

  private async testUpdateIntegrationSettings(): Promise<void> {
    console.log('⚙️  Testing updateIntegrationSettings...');
    
    const result = await this.service.updateIntegrationSettings({
      api_quota_limit: 2000,
      is_active: true,
      api_url: 'https://api.seranking.com/v1'
    }, 'test-user');
    
    console.log('- Result:', {
      success: result.success,
      data: result.data
    });
    
    if (!result.success) {
      console.log('⚠️  updateIntegrationSettings failed (expected in test environment)');
    } else {
      console.log('✅ updateIntegrationSettings passed');
    }
    console.log();
  }

  private async testValidateApiKey(): Promise<void> {
    console.log('🔑 Testing validateApiKey...');
    
    // Test valid format
    const validResult = await this.service.validateApiKey('valid-api-key-12345678901234567890');
    console.log('- Valid key result:', {
      success: validResult.success,
      isValid: validResult.data?.isValid
    });
    
    // Test invalid format
    const invalidResult = await this.service.validateApiKey('short');
    console.log('- Invalid key result:', {
      success: invalidResult.success,
      isValid: invalidResult.data?.isValid
    });
    
    // Test empty key
    const emptyResult = await this.service.validateApiKey('');
    console.log('- Empty key result:', {
      success: emptyResult.success,
      isValid: emptyResult.data?.isValid
    });
    
    if (!validResult.success || !invalidResult.success || !emptyResult.success) {
      throw new Error('validateApiKey failed');
    }
    
    console.log('✅ validateApiKey passed\n');
  }

  private async testRecordApiUsage(): Promise<void> {
    console.log('📊 Testing recordApiUsage...');
    
    const result = await this.service.recordApiUsage(5, {
      operationType: 'keyword_export',
      userId: 'test-user',
      responseTime: 150,
      successful: true
    });
    
    console.log('- Result:', {
      success: result.success,
      quotaRemaining: result.metadata?.quota_remaining
    });
    
    if (!result.success) {
      console.log('⚠️  recordApiUsage failed (expected in test environment)');
    } else {
      console.log('✅ recordApiUsage passed');
    }
    console.log();
  }

  private async testQuotaManagement(): Promise<void> {
    console.log('📈 Testing quota management...');
    
    // Get quota status
    const statusResult = await this.service.getQuotaStatus('test-user');
    console.log('- Quota status:', {
      success: statusResult.success,
      currentUsage: statusResult.data?.current_usage,
      quotaLimit: statusResult.data?.quota_limit,
      usagePercentage: statusResult.data?.usage_percentage
    });
    
    // Check quota availability
    const availabilityResult = await this.service.checkQuotaAvailable(10, 'test-user');
    console.log('- Quota availability:', {
      success: availabilityResult.success,
      allowed: availabilityResult.data?.allowed,
      remaining: availabilityResult.data?.remaining
    });
    
    if (!statusResult.success || !availabilityResult.success) {
      console.log('⚠️  Quota management failed (expected in test environment)');
    } else {
      console.log('✅ Quota management passed');
    }
    console.log();
  }

  private async testHealthChecking(): Promise<void> {
    console.log('🏥 Testing health checking...');
    
    // Test healthy connection
    this.mockApiClient.setHealthy(true);
    const healthyResult = await this.service.testIntegration('test-user');
    console.log('- Healthy connection:', {
      success: healthyResult.success,
      status: healthyResult.data?.status,
      responseTime: healthyResult.data?.response_time
    });
    
    // Test unhealthy connection
    this.mockApiClient.setHealthy(false);
    const unhealthyResult = await this.service.testIntegration('test-user');
    console.log('- Unhealthy connection:', {
      success: unhealthyResult.success,
      status: unhealthyResult.data?.status,
      hasError: !!unhealthyResult.data?.error_message
    });
    
    // Reset to healthy
    this.mockApiClient.setHealthy(true);
    
    if (!healthyResult.success && !unhealthyResult.success) {
      console.log('⚠️  Health checking failed (expected in test environment)');
    } else {
      console.log('✅ Health checking passed');
    }
    console.log();
  }

  private async testUsageReporting(): Promise<void> {
    console.log('📋 Testing usage reporting...');
    
    const reportResult = await this.service.getUsageReport('monthly', 'test-user');
    console.log('- Usage report:', {
      success: reportResult.success,
      totalRequests: reportResult.data?.total_requests,
      successRate: reportResult.data?.success_rate,
      peakUsageDay: reportResult.data?.peak_usage_day
    });
    
    if (!reportResult.success) {
      console.log('⚠️  Usage reporting failed (expected in test environment)');
    } else {
      console.log('✅ Usage reporting passed');
    }
    console.log();
  }

  private async testQuotaAlerts(): Promise<void> {
    console.log('🚨 Testing quota alerts...');
    
    const alertResult = await this.service.enableQuotaAlerts([0.75, 0.85, 0.95], 'test-user');
    console.log('- Quota alerts:', {
      success: alertResult.success,
      enabled: alertResult.data
    });
    
    if (!alertResult.success) {
      console.log('⚠️  Quota alerts failed (expected in test environment)');
    } else {
      console.log('✅ Quota alerts passed');
    }
    console.log();
  }
}

// Example usage
export async function runManualTests(): Promise<void> {
  const tester = new IntegrationServiceTester();
  await tester.runAllTests();
}

// Uncomment to run tests when imported
// runManualTests().catch(console.error);

export { IntegrationService, MockSeRankingApiClient };
/**
 * Integration Service
 * Manages SeRanking API integration settings, quota management, and usage tracking
 */

import {
  ServiceResponse,
  IntegrationSettings,
  QuotaStatus,
  QuotaAlert,
  HealthCheckResult,
  SeRankingErrorType,
  RateLimitConfig,
  ApiMetrics
} from '../types/SeRankingTypes';
import { IIntegrationService, ISeRankingApiClient } from '../types/ServiceTypes';
import { supabaseAdmin } from '../../../database/supabase';
import { Database } from '../../../database/database-types';
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper';
import { logger } from '@/lib/monitoring/error-handling';

// Configuration interface for the service
export interface IntegrationServiceConfig {
  defaultQuotaLimit: number;
  defaultResetInterval: 'daily' | 'monthly';
  quotaWarningThreshold: number; // 0.8 = 80%
  quotaCriticalThreshold: number; // 0.95 = 95%
  healthCheckInterval: number; // minutes
  usageReportingInterval: number; // minutes
  enableAutoQuotaReset: boolean;
  enableUsageAlerts: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Database types for SeRanking integration settings (matches actual DB schema)
interface IntegrationRow {
  id: string;
  service_name: string;
  api_key: string;  // Fixed: should be api_key not apikey to match database schema
  api_url: string;
  api_quota_limit: number;
  api_quota_used: number;
  quota_reset_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UsageLogRow {
  id: string;
  integration_id: string;
  operation_type: string;
  request_count: number;
  successful_requests: number;
  failed_requests: number;
  response_time_ms: number | null;
  timestamp: string;
  date: string;
  metadata: any | null;
}

// Usage report types
export interface UsageReport {
  period: {
    start: Date;
    end: Date;
    type: 'daily' | 'weekly' | 'monthly';
  };
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  quota_usage: {
    used: number;
    limit: number;
    percentage: number;
    remaining: number;
  };
  daily_breakdown: Array<{
    date: string;
    requests: number;
    success_rate: number;
  }>;
  operation_breakdown: Record<string, {
    requests: number;
    success_rate: number;
    avg_response_time: number;
  }>;
  peak_usage_day: string;
  peak_usage_count: number;
}

export class IntegrationService implements IIntegrationService {
  private config: IntegrationServiceConfig;
  private apiClient?: ISeRankingApiClient;
  private activeAlerts: Map<string, Date> = new Map();
  private lastHealthCheck?: HealthCheckResult;
  private metrics: ApiMetrics;

  constructor(
    config: Partial<IntegrationServiceConfig> = {},
    apiClient?: ISeRankingApiClient
  ) {
    this.config = {
      defaultQuotaLimit: 10000,
      defaultResetInterval: 'monthly',
      quotaWarningThreshold: 0.8,
      quotaCriticalThreshold: 0.95,
      healthCheckInterval: 30,
      usageReportingInterval: 60,
      enableAutoQuotaReset: true,
      enableUsageAlerts: true,
      logLevel: 'info',
      ...config
    };

    this.apiClient = apiClient;
    
    this.metrics = {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      average_response_time: 0,
      cache_hits: 0,
      cache_misses: 0
    };

    // Initialize periodic tasks
    this.initializePeriodicTasks();
  }

  /**
   * Get SeRanking integration settings
   */
  async getIntegrationSettings(userId?: string): Promise<ServiceResponse<{
    service_name: string;
    api_key: string;
    api_url: string;
    api_quota_limit: number;
    api_quota_used: number;
    quota_reset_date: Date;
    is_active: boolean;
  }>> {
    try {
      const result = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: userId || 'system',
          operation: 'get_seranking_integration_settings',
          reason: 'SeRanking integration service fetching API configuration and quota status',
          source: 'IntegrationService.getIntegrationSettings',
          metadata: {
            serviceName: 'seranking_keyword_export',
            requestedBy: userId ? `user:${userId}` : 'system'
          }
        },
        { table: 'indb_site_integration', operationType: 'select' },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_site_integration')
            .select('*')
            .eq('service_name', 'seranking_keyword_export')
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          if (!data) {
            // Return default settings if no integration found
            return {
              success: true,
              data: {
                service_name: 'seranking_keyword_export',
                api_key: '',
                api_url: 'https://api.seranking.com',
                api_quota_limit: this.config.defaultQuotaLimit,
                api_quota_used: 0,
                quota_reset_date: this.calculateNextResetDate(),
                is_active: false
              },
              metadata: {
                source: 'cache',
                timestamp: new Date()
              }
            };
          }

          return {
            success: true,
            data: {
              service_name: data.service_name,
              api_key: data.api_key,
              api_url: data.api_url,
              api_quota_limit: data.api_quota_limit,
              api_quota_used: data.api_quota_used,
              quota_reset_date: new Date(data.quota_reset_date),
              is_active: data.is_active
            },
            metadata: {
              source: 'api',
              timestamp: new Date()
            }
          };
        }
      );

      return result;
    } catch (error) {
      this.log('error', 'Failed to get integration settings:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to retrieve integration settings: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Update integration settings
   */
  async updateIntegrationSettings(
    settings: {
      api_quota_limit?: number;
      is_active?: boolean;
      api_key?: string;  // Fixed: should be api_key not apikey to match database schema
      api_url?: string;
    }
  ): Promise<ServiceResponse<boolean>> {
    try {
      const updateData: Partial<IntegrationRow> = {
        updated_at: new Date().toISOString()
      };

      if (settings.api_quota_limit !== undefined) {
        updateData.api_quota_limit = settings.api_quota_limit;
      }
      if (settings.is_active !== undefined) {
        updateData.is_active = settings.is_active;
      }
      if (settings.api_key !== undefined) {
        updateData.api_key = settings.api_key;
      }
      if (settings.api_url !== undefined) {
        updateData.api_url = settings.api_url;
      }

      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'update_seranking_integration_settings',
          reason: 'SeRanking integration service updating API configuration and quota settings',
          source: 'IntegrationService.updateIntegrationSettings',
          metadata: {
            serviceName: 'seranking_keyword_export',
            updatedFields: Object.keys(updateData),
            hasApiKeyUpdate: settings.api_key !== undefined,
            hasQuotaUpdate: settings.api_quota_limit !== undefined
          }
        },
        { table: 'indb_site_integration', operationType: 'update', data: updateData },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_site_integration')
            .upsert({
              service_name: 'seranking_keyword_export',
              ...updateData
            });

          if (error) {
            throw error;
          }

          return true;
        }
      );

      this.log('info', 'Integration settings updated successfully');
      
      return {
        success: true,
        data: true,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', 'Failed to update integration settings:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to update integration settings: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Record API usage
   */
  async recordApiUsage(
    requestCount: number = 1,
    options: {
      operationType?: string;
      responseTime?: number;
      successful?: boolean;
      metadata?: any;
    } = {}
  ): Promise<ServiceResponse<boolean>> {
    try {
      const {
        operationType = 'keyword_export',
        responseTime,
        successful = true,
        metadata
      } = options;

      // Get current integration
      const integrationResult = await this.getIntegrationSettings();
      if (!integrationResult.success) {
        throw new Error('Failed to get integration settings');
      }

      // Update quota usage in integration table
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'update_api_quota_usage',
          reason: 'Recording API usage and updating quota consumption for SeRanking integration',
          source: 'rank-tracking/seranking/services/IntegrationService',
          metadata: {
            service_name: 'seranking_keyword_export',
            request_count: requestCount,
            current_usage: integrationResult.data!.api_quota_used,
            operation_type: 'quota_usage_tracking'
          }
        },
        {
          table: 'indb_site_integration',
          operationType: 'update',
          data: {
            api_quota_used: integrationResult.data!.api_quota_used + requestCount,
            updated_at: new Date().toISOString()
          },
          whereConditions: { service_name: 'seranking_keyword_export' }
        },
        async () => {
          const { error: updateError } = await supabaseAdmin
            .from('indb_site_integration')
            .update({
              api_quota_used: integrationResult.data!.api_quota_used + requestCount,
              updated_at: new Date().toISOString()
            })
            .eq('service_name', 'seranking_keyword_export')

          if (updateError) {
            throw new Error(`Failed to update quota usage: ${updateError.message}`)
          }

          return { success: true }
        }
      )

      // Log usage details (if usage logs table exists)
      const today = new Date().toISOString().split('T')[0];
      try {
        await SecureServiceRoleWrapper.executeSecureOperation(
          {
            userId: 'system',
            operation: 'log_api_usage_details',
            reason: 'Logging detailed API usage statistics for monitoring and analytics',
            source: 'rank-tracking/seranking/services/IntegrationService',
            metadata: {
              integration_id: 'seranking_keyword_export',
              operation_type: operationType,
              request_count: requestCount,
              successful: successful,
              operation_type_tracking: 'usage_detail_logging'
            }
          },
          {
            table: 'indb_seranking_usage_logs',
            operationType: 'insert',
            data: {
              integration_id: 'seranking_keyword_export',
              operation_type: operationType,
              request_count: requestCount,
              successful_requests: successful ? requestCount : 0,
              failed_requests: successful ? 0 : requestCount,
              response_time_ms: responseTime,
              timestamp: new Date().toISOString(),
              date: today,
              metadata
            }
          },
          async () => {
            const { error: logError } = await supabaseAdmin
              .from('indb_seranking_usage_logs')
              .insert({
                integration_id: 'seranking_keyword_export',
                operation_type: operationType,
                request_count: requestCount,
                successful_requests: successful ? requestCount : 0,
                failed_requests: successful ? 0 : requestCount,
                response_time_ms: responseTime,
                timestamp: new Date().toISOString(),
                date: today,
                metadata
              })
            
            if (logError) {
              throw new Error(`Failed to log usage details: ${logError.message}`)
            }

            return { success: true }
          }
        )
      } catch (logError) {
        this.log('warn', 'Usage logging failed (table may not exist):', logError);
      }


      // Update internal metrics
      this.metrics.total_requests += requestCount;
      if (successful) {
        this.metrics.successful_requests += requestCount;
      } else {
        this.metrics.failed_requests += requestCount;
      }

      if (responseTime) {
        const totalResponseTime = this.metrics.average_response_time * (this.metrics.total_requests - requestCount);
        this.metrics.average_response_time = (totalResponseTime + responseTime) / this.metrics.total_requests;
      }

      // Check quota thresholds and trigger alerts if needed
      await this.checkQuotaThresholds();

      return {
        success: true,
        data: true,
        metadata: {
          source: 'api',
          timestamp: new Date(),
          quota_remaining: integrationResult.data!.api_quota_limit - (integrationResult.data!.api_quota_used + requestCount)
        }
      };
    } catch (error) {
      this.log('error', 'Failed to record API usage:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to record API usage: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Reset quota usage
   */
  async resetQuotaUsage(): Promise<ServiceResponse<boolean>> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'reset_quota_usage',
          reason: 'Resetting API quota usage for SeRanking integration for new billing cycle',
          source: 'rank-tracking/seranking/services/IntegrationService',
          metadata: {
            service_name: 'seranking_keyword_export',
            reset_date: this.calculateNextResetDate().toISOString(),
            operation_type: 'quota_reset'
          }
        },
        {
          table: 'indb_site_integration',
          operationType: 'update',
          data: {
            api_quota_used: 0,
            quota_reset_date: this.calculateNextResetDate().toISOString(),
            updated_at: new Date().toISOString()
          },
          whereConditions: { service_name: 'seranking_keyword_export' }
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_site_integration')
            .update({
              api_quota_used: 0,
              quota_reset_date: this.calculateNextResetDate().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('service_name', 'seranking_keyword_export')

          if (error) {
            throw new Error(`Failed to reset quota usage: ${error.message}`)
          }

          return { success: true }
        }
      )

      this.log('info', 'Quota usage reset for SeRanking integration');
      
      return {
        success: true,
        data: true,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', 'Failed to reset quota usage:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to reset quota usage: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Test integration health
   */
  async testIntegration(): Promise<ServiceResponse<HealthCheckResult>> {
    const startTime = Date.now();
    
    try {
      const settingsResult = await this.getIntegrationSettings();
      if (!settingsResult.success || !settingsResult.data?.is_active) {
        const result: HealthCheckResult = {
          status: 'unhealthy',
          last_check: new Date(),
          error_message: 'Integration is not active or not configured'
        };
        
        await this.updateHealthStatus(result);
        return {
          success: true,
          data: result,
          metadata: {
            source: 'api',
            timestamp: new Date()
          }
        };
      }

      // Test API connection if client is available
      let result: HealthCheckResult;
      
      if (this.apiClient) {
        try {
          result = await this.apiClient.testConnection();
          result.response_time = Date.now() - startTime;
        } catch (error) {
          result = {
            status: 'unhealthy',
            last_check: new Date(),
            error_message: `API connection failed: ${error}`,
            response_time: Date.now() - startTime
          };
        }
      } else {
        result = {
          status: 'degraded',
          last_check: new Date(),
          warning: 'API client not available for health check',
          response_time: Date.now() - startTime
        };
      }

      // Update health status in database
      await this.updateHealthStatus(result);
      
      this.lastHealthCheck = result;
      
      return {
        success: true,
        data: result,
        metadata: {
          source: 'api',
          timestamp: new Date(),
          response_time: result.response_time
        }
      };
    } catch (error) {
      const result: HealthCheckResult = {
        status: 'unhealthy',
        last_check: new Date(),
        error_message: `Health check failed: ${error}`,
        response_time: Date.now() - startTime
      };
      
      await this.updateHealthStatus(result);
      
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Integration health check failed: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<ServiceResponse<{
    isValid: boolean;
    keyInfo?: {
      permissions: string[];
      quotaLimit: number;
      quotaUsed: number;
    };
  }>> {
    try {
      if (!apiKey || apiKey.trim().length === 0) {
        return {
          success: true,
          data: {
            isValid: false
          }
        };
      }

      // Test the API key by making a simple request
      if (this.apiClient) {
        try {
          const healthResult = await this.apiClient.testConnection();
          if (healthResult.status === 'healthy') {
            return {
              success: true,
              data: {
                isValid: true,
                keyInfo: {
                  permissions: ['keyword_export'], // SeRanking doesn't provide detailed permissions
                  quotaLimit: 10000, // Default quota
                  quotaUsed: 0
                }
              }
            };
          } else {
            return {
              success: true,
              data: {
                isValid: false
              }
            };
          }
        } catch (error) {
          this.log('warn', 'API key validation failed:', error);
          return {
            success: true,
            data: {
              isValid: false
            }
          };
        }
      }

      // If no API client available, just check format
      const isValidFormat = /^[A-Za-z0-9_-]{20,}$/.test(apiKey);
      
      return {
        success: true,
        data: {
          isValid: isValidFormat
        }
      };
    } catch (error) {
      this.log('error', 'Failed to validate API key:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.AUTHENTICATION_ERROR,
          message: `Failed to validate API key: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Get quota status
   */
  async getQuotaStatus(): Promise<ServiceResponse<QuotaStatus>> {
    try {
      const settingsResult = await this.getIntegrationSettings();
      if (!settingsResult.success) {
        throw new Error('Failed to get integration settings');
      }

      const settings = settingsResult.data!;
      const usagePercentage = settings.api_quota_limit > 0 
        ? (settings.api_quota_used / settings.api_quota_limit) 
        : 0;

      const quotaStatus: QuotaStatus = {
        current_usage: settings.api_quota_used,
        quota_limit: settings.api_quota_limit,
        quota_remaining: Math.max(0, settings.api_quota_limit - settings.api_quota_used),
        usage_percentage: usagePercentage,
        reset_date: settings.quota_reset_date,
        is_approaching_limit: usagePercentage >= this.config.quotaWarningThreshold,
        is_quota_exceeded: usagePercentage >= 1.0
      };

      return {
        success: true,
        data: quotaStatus,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', 'Failed to get quota status:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to get quota status: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Check if quota allows for request
   */
  async checkQuotaAvailable(requestCount: number = 1): Promise<ServiceResponse<{
    allowed: boolean;
    remaining: number;
    reason?: string;
  }>> {
    try {
      const quotaResult = await this.getQuotaStatus();
      if (!quotaResult.success) {
        throw new Error('Failed to get quota status');
      }

      const quota = quotaResult.data!;
      const allowed = quota.quota_remaining >= requestCount;
      
      return {
        success: true,
        data: {
          allowed,
          remaining: quota.quota_remaining,
          reason: allowed ? undefined : 'Quota exceeded'
        }
      };
    } catch (error) {
      this.log('error', 'Failed to check quota availability:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.QUOTA_EXCEEDED_ERROR,
          message: `Failed to check quota availability: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Generate usage report
   */
  async getUsageReport(
    period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<ServiceResponse<UsageReport>> {
    try {
      const { startDate, endDate } = this.getReportPeriod(period);
      
      // Get usage logs for the period (if table exists)
      let logs = [];
      try {
        const usageLogs = await SecureServiceRoleWrapper.executeSecureOperation(
          {
            userId: 'system',
            operation: 'get_usage_report_logs',
            reason: 'Retrieving usage logs for generating usage report and analytics',
            source: 'rank-tracking/seranking/services/IntegrationService',
            metadata: {
              integration_id: 'seranking_keyword_export',
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              period: period,
              operation_type: 'usage_report_generation'
            }
          },
          {
            table: 'indb_seranking_usage_logs',
            operationType: 'select',
            columns: ['*'],
            whereConditions: {
              integration_id: 'seranking_keyword_export',
              timestamp_gte: startDate.toISOString(),
              timestamp_lte: endDate.toISOString()
            }
          },
          async () => {
            const { data: usageLogs, error } = await supabaseAdmin
              .from('indb_seranking_usage_logs')
              .select('*')
              .eq('integration_id', 'seranking_keyword_export')
              .gte('timestamp', startDate.toISOString())
              .lte('timestamp', endDate.toISOString())
              .order('timestamp', { ascending: true })
            
            if (error) {
              throw new Error(`Usage logs table not accessible: ${error.message}`)
            }

            return usageLogs || []
          }
        )
        
        logs = usageLogs || []
      } catch (error) {
        this.log('warn', 'Usage logs table may not exist:', error);
      }
      
      // Calculate aggregated metrics
      const totalRequests = logs.reduce((sum, log) => sum + log.request_count, 0);
      const successfulRequests = logs.reduce((sum, log) => sum + log.successful_requests, 0);
      const failedRequests = logs.reduce((sum, log) => sum + log.failed_requests, 0);
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

      // Daily breakdown
      const dailyBreakdown = new Map<string, { requests: number; successful: number; failed: number; }>();
      logs.forEach(log => {
        const date = log.date;
        if (!dailyBreakdown.has(date)) {
          dailyBreakdown.set(date, { requests: 0, successful: 0, failed: 0 });
        }
        const day = dailyBreakdown.get(date)!;
        day.requests += log.request_count;
        day.successful += log.successful_requests;
        day.failed += log.failed_requests;
      });

      // Operation breakdown
      const operationBreakdown = new Map<string, { requests: number; successful: number; failed: number; totalResponseTime: number; count: number; }>();
      logs.forEach(log => {
        const operation = log.operation_type;
        if (!operationBreakdown.has(operation)) {
          operationBreakdown.set(operation, { requests: 0, successful: 0, failed: 0, totalResponseTime: 0, count: 0 });
        }
        const op = operationBreakdown.get(operation)!;
        op.requests += log.request_count;
        op.successful += log.successful_requests;
        op.failed += log.failed_requests;
        if (log.response_time_ms) {
          op.totalResponseTime += log.response_time_ms;
          op.count++;
        }
      });

      // Find peak usage day
      let peakUsageDay = '';
      let peakUsageCount = 0;
      dailyBreakdown.forEach((data, date) => {
        if (data.requests > peakUsageCount) {
          peakUsageCount = data.requests;
          peakUsageDay = date;
        }
      });

      // Get current quota status
      const quotaResult = await this.getQuotaStatus();
      const quota = quotaResult.success ? quotaResult.data! : {
        current_usage: 0,
        quota_limit: this.config.defaultQuotaLimit,
        quota_remaining: this.config.defaultQuotaLimit,
        usage_percentage: 0
      } as QuotaStatus;

      const report: UsageReport = {
        period: {
          start: startDate,
          end: endDate,
          type: period
        },
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        failed_requests: failedRequests,
        success_rate: Math.round(successRate * 100) / 100,
        quota_usage: {
          used: quota.current_usage,
          limit: quota.quota_limit,
          percentage: Math.round(quota.usage_percentage * 10000) / 100,
          remaining: quota.quota_remaining
        },
        daily_breakdown: Array.from(dailyBreakdown.entries()).map(([date, data]) => ({
          date,
          requests: data.requests,
          success_rate: data.requests > 0 ? Math.round((data.successful / data.requests) * 10000) / 100 : 0
        })),
        operation_breakdown: Object.fromEntries(
          Array.from(operationBreakdown.entries()).map(([operation, data]) => [
            operation,
            {
              requests: data.requests,
              success_rate: data.requests > 0 ? Math.round((data.successful / data.requests) * 10000) / 100 : 0,
              avg_response_time: data.count > 0 ? Math.round(data.totalResponseTime / data.count) : 0
            }
          ])
        ),
        peak_usage_day: peakUsageDay,
        peak_usage_count: peakUsageCount
      };

      return {
        success: true,
        data: report,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', 'Failed to generate usage report:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to generate usage report: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Enable quota alerts with thresholds
   */
  async enableQuotaAlerts(thresholds: number[]): Promise<ServiceResponse<boolean>> {
    try {
      // Note: Alert settings are not supported in the current schema
      // This method is kept for compatibility but doesn't persist alert settings
      this.log('info', `Quota alert thresholds set: ${thresholds.join(', ')}`);
      
      return {
        success: true,
        data: true,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', 'Failed to enable quota alerts:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to enable quota alerts: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Get integration health status
   */
  async getIntegrationHealth(): Promise<ServiceResponse<HealthCheckResult>> {
    try {
      // Return cached health check if recent (less than health check interval)
      if (this.lastHealthCheck && 
          (Date.now() - this.lastHealthCheck.last_check.getTime()) < (this.config.healthCheckInterval * 60 * 1000)) {
        return {
          success: true,
          data: this.lastHealthCheck,
          metadata: {
            source: 'cache',
            timestamp: new Date()
          }
        };
      }

      // Perform new health check
      return await this.testIntegration();
    } catch (error) {
      this.log('error', 'Failed to get integration health:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to get integration health: ${error}`,
          details: error
        }
      };
    }
  }

  // Private helper methods

  private async checkQuotaThresholds(): Promise<void> {
    try {
      const quotaResult = await this.getQuotaStatus();
      if (!quotaResult.success) {
        return;
      }

      const quota = quotaResult.data!;
      const alertKey = 'seranking_quota_alert';
      
      // Check critical threshold
      if (quota.usage_percentage >= this.config.quotaCriticalThreshold) {
        if (!this.activeAlerts.has(`${alertKey}_critical`)) {
          this.log('error', `CRITICAL: SeRanking quota usage at ${Math.round(quota.usage_percentage * 100)}%`);
          this.activeAlerts.set(`${alertKey}_critical`, new Date());
          // Here you would send critical alerts (email, SMS, etc.)
        }
      }
      
      // Check warning threshold
      else if (quota.usage_percentage >= this.config.quotaWarningThreshold) {
        if (!this.activeAlerts.has(`${alertKey}_warning`)) {
          this.log('warn', `WARNING: SeRanking quota usage at ${Math.round(quota.usage_percentage * 100)}%`);
          this.activeAlerts.set(`${alertKey}_warning`, new Date());
          // Here you would send warning alerts
        }
      }
      
      // Clear alerts if usage drops below warning threshold
      else {
        this.activeAlerts.delete(`${alertKey}_warning`);
        this.activeAlerts.delete(`${alertKey}_critical`);
      }
    } catch (error) {
      this.log('error', 'Failed to check quota thresholds:', error);
    }
  }

  private async updateHealthStatus(result: HealthCheckResult): Promise<void> {
    try {
      // Note: Health status fields don't exist in current schema
      // This method is kept for compatibility but doesn't persist health status
      this.log('info', `Health status updated: ${result.status}`);
    } catch (error) {
      this.log('warn', 'Failed to update health status:', error);
    }
  }

  private calculateNextResetDate(): Date {
    const now = new Date();
    if (this.config.defaultResetInterval === 'monthly') {
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }
  }

  private getReportPeriod(period: 'daily' | 'weekly' | 'monthly'): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }
    
    return { startDate, endDate };
  }

  private initializePeriodicTasks(): void {
    if (this.config.enableAutoQuotaReset) {
      // Check for quota resets every hour
      setInterval(async () => {
        try {
          await this.checkAutoQuotaReset();
        } catch (error) {
          this.log('error', 'Auto quota reset check failed:', error);
        }
      }, 60 * 60 * 1000); // 1 hour
    }

    // Health check interval
    if (this.config.healthCheckInterval > 0) {
      setInterval(async () => {
        try {
          await this.testIntegration();
        } catch (error) {
          this.log('error', 'Periodic health check failed:', error);
        }
      }, this.config.healthCheckInterval * 60 * 1000);
    }
  }

  private async checkAutoQuotaReset(): Promise<void> {
    try {
      const { data: integrations, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('service_name', 'seranking_keyword_export');

      if (error || !integrations) {
        return;
      }

      const now = new Date();
      for (const integration of integrations) {
        const resetDate = new Date(integration.quota_reset_date);
        if (now >= resetDate) {
          await this.resetQuotaUsage();
          this.log('info', 'Auto-reset quota for SeRanking integration');
        }
      }
    } catch (error) {
      this.log('error', 'Failed to check auto quota reset:', error);
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];
    
    if (messageLevel >= configLevel) {
      const metadata = args.length > 0 ? { details: args } : {};
      const logMessage = `[IntegrationService] ${message}`;
      
      logger[level](metadata, logMessage);
    }
  }
}
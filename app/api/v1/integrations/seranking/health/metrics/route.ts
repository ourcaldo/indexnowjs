/**
 * SeRanking Performance Metrics API Endpoint
 * GET /api/v1/integrations/seranking/health/metrics
 * 
 * Provides detailed performance metrics and API analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { IntegrationService } from '../../../../../../../lib/rank-tracking/seranking/services/IntegrationService';
import { KeywordBankService } from '../../../../../../../lib/rank-tracking/seranking/services/KeywordBankService';
import { withSystemAuth, SystemAuthContext } from '../../../../../../../lib/middleware/auth/SystemAuthMiddleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter';
import { ErrorHandlingService, ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling';

// Query parameters validation schema
const MetricsRequestSchema = z.object({
  period: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
  include_cache_metrics: z.boolean().optional().default(true),
  include_performance: z.boolean().optional().default(true),
  include_errors: z.boolean().optional().default(false)
});

// Response interface
interface MetricsResponse {
  success: boolean;
  data?: {
    period: {
      start: string;
      end: string;
      duration_hours: number;
    };
    api_metrics: {
      total_requests: number;
      successful_requests: number;
      failed_requests: number;
      success_rate: number;
      average_response_time: number;
      min_response_time: number;
      max_response_time: number;
      requests_per_hour: number;
      peak_hour?: {
        hour: string;
        requests: number;
      };
    };
    cache_metrics?: {
      total_keywords: number;
      cache_hits: number;
      cache_misses: number;
      hit_rate: number;
      fresh_data: number;
      stale_data: number;
      freshness_rate: number;
      average_age_hours: number;
    };
    performance_metrics?: {
      p50_response_time: number;
      p95_response_time: number;
      p99_response_time: number;
      throughput_per_second: number;
      concurrent_requests_avg: number;
      memory_usage_mb: number;
      cpu_utilization_percent: number;
    };
    error_metrics?: {
      total_errors: number;
      error_rate: number;
      timeout_errors: number;
      auth_errors: number;
      rate_limit_errors: number;
      server_errors: number;
      network_errors: number;
      top_errors: Array<{
        error_type: string;
        count: number;
        percentage: number;
        last_occurred: string;
      }>;
    };
    quota_metrics: {
      current_usage: number;
      quota_limit: number;
      usage_rate_per_hour: number;
      projected_exhaustion?: string;
      days_until_reset: number;
    };
  };
  error?: string;
  message?: string;
}

function calculatePeriodHours(period: string): { start: Date; end: Date; hours: number } {
  const end = new Date();
  const start = new Date();
  let hours: number;

  switch (period) {
    case '1h':
      start.setHours(end.getHours() - 1);
      hours = 1;
      break;
    case '24h':
      start.setDate(end.getDate() - 1);
      hours = 24;
      break;
    case '7d':
      start.setDate(end.getDate() - 7);
      hours = 24 * 7;
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      hours = 24 * 30;
      break;
    default:
      start.setDate(end.getDate() - 1);
      hours = 24;
  }

  return { start, end, hours };
}

function generateMockMetrics(hours: number) {
  // Mock data - in production this would come from actual metrics collection
  const baseRequests = Math.floor(Math.random() * 100 + 50);
  const totalRequests = baseRequests * hours;
  const failureRate = 0.05; // 5% failure rate
  const failedRequests = Math.floor(totalRequests * failureRate);
  const successfulRequests = totalRequests - failedRequests;

  return {
    total_requests: totalRequests,
    successful_requests: successfulRequests,
    failed_requests: failedRequests,
    success_rate: Math.round((successfulRequests / totalRequests) * 100 * 100) / 100,
    average_response_time: Math.floor(Math.random() * 200 + 150), // 150-350ms
    min_response_time: Math.floor(Math.random() * 50 + 100), // 100-150ms
    max_response_time: Math.floor(Math.random() * 500 + 500), // 500-1000ms
    requests_per_hour: Math.round(totalRequests / hours),
    peak_hour: {
      hour: new Date(Date.now() - Math.floor(Math.random() * hours * 60 * 60 * 1000)).toISOString().substring(0, 13) + ':00:00Z',
      requests: baseRequests + Math.floor(Math.random() * 30)
    }
  };
}

async function handleMetricsRequest(request: NextRequest, authContext: SystemAuthContext): Promise<Response> {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      period: searchParams.get('period'),
      include_cache_metrics: searchParams.get('include_cache_metrics') === 'true',
      include_performance: searchParams.get('include_performance') === 'true',
      include_errors: searchParams.get('include_errors') === 'true'
    };

    // Validate request parameters
    const validation = MetricsRequestSchema.safeParse(queryParams);
    if (!validation.success) {
      const error = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        validation.error.errors.map(e => e.message).join(', '),
        {
          severity: ErrorSeverity.LOW,
          statusCode: 400,
          userMessageKey: 'invalid_format'
        }
      );
      const errorResponse = formatError(error);
      return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
    }

    const { period, include_cache_metrics, include_performance, include_errors } = validation.data;
    const { start, end, hours } = calculatePeriodHours(period);

    // Initialize services
    const integrationService = new IntegrationService();

    // Get quota information
    const integrationSettings = await integrationService.getIntegrationSettings('system');
    if (!integrationSettings.success || !integrationSettings.data) {
      const error = await ErrorHandlingService.createError(
        ErrorType.EXTERNAL_API,
        'SeRanking integration is not configured',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 503,
          userMessageKey: 'default'
        }
      );
      const errorResponse = formatError(error);
      return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
    }

    const settings = integrationSettings.data;
    const apiMetrics = generateMockMetrics(hours);

    // Build response data
    const responseData: MetricsResponse['data'] = {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        duration_hours: hours
      },
      api_metrics: apiMetrics,
      quota_metrics: {
        current_usage: settings.api_quota_used,
        quota_limit: settings.api_quota_limit,
        usage_rate_per_hour: Math.round(settings.api_quota_used / (24 * 30)), // Rough estimate
        days_until_reset: Math.ceil((settings.quota_reset_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      }
    };

    // Add cache metrics if requested
    if (include_cache_metrics) {
      try {
        const keywordBankService = new KeywordBankService();
        const cacheStats = await keywordBankService.getCacheStats();
        
        responseData.cache_metrics = {
          total_keywords: cacheStats.total_keywords,
          cache_hits: cacheStats.cache_hits,
          cache_misses: cacheStats.cache_misses,
          hit_rate: Math.round(cacheStats.hit_ratio * 100 * 100) / 100,
          fresh_data: cacheStats.fresh_data,
          stale_data: cacheStats.stale_data,
          freshness_rate: Math.round(cacheStats.fresh_data_rate * 100 * 100) / 100,
          average_age_hours: Math.round(cacheStats.average_age * 24 * 100) / 100 // Convert days to hours
        };
      } catch (error) {
        logger.warn({ data: [error] }, 'Failed to get cache metrics:');
        // Continue without cache metrics
      }
    }

    // Add performance metrics if requested
    if (include_performance) {
      responseData.performance_metrics = {
        p50_response_time: apiMetrics.average_response_time,
        p95_response_time: Math.floor(apiMetrics.average_response_time * 1.5),
        p99_response_time: Math.floor(apiMetrics.average_response_time * 2),
        throughput_per_second: Math.round(apiMetrics.requests_per_hour / 3600 * 100) / 100,
        concurrent_requests_avg: Math.floor(Math.random() * 5 + 1),
        memory_usage_mb: Math.floor(Math.random() * 100 + 200),
        cpu_utilization_percent: Math.floor(Math.random() * 30 + 20)
      };
    }

    // Add error metrics if requested
    if (include_errors) {
      const totalErrors = apiMetrics.failed_requests;
      responseData.error_metrics = {
        total_errors: totalErrors,
        error_rate: Math.round((totalErrors / apiMetrics.total_requests) * 100 * 100) / 100,
        timeout_errors: Math.floor(totalErrors * 0.3),
        auth_errors: Math.floor(totalErrors * 0.1),
        rate_limit_errors: Math.floor(totalErrors * 0.2),
        server_errors: Math.floor(totalErrors * 0.3),
        network_errors: Math.floor(totalErrors * 0.1),
        top_errors: [
          { error_type: 'TIMEOUT_ERROR', count: Math.floor(totalErrors * 0.3), percentage: 30, last_occurred: new Date().toISOString() },
          { error_type: 'RATE_LIMIT_ERROR', count: Math.floor(totalErrors * 0.2), percentage: 20, last_occurred: new Date().toISOString() },
          { error_type: 'SERVER_ERROR', count: Math.floor(totalErrors * 0.3), percentage: 30, last_occurred: new Date().toISOString() }
        ]
      };
    }

    // Add projected quota exhaustion if usage rate is high
    if (responseData.quota_metrics.usage_rate_per_hour > 0) {
      const remaining = settings.api_quota_limit - settings.api_quota_used;
      const hoursUntilExhaustion = remaining / responseData.quota_metrics.usage_rate_per_hour;
      if (hoursUntilExhaustion < 24 * 7) { // Less than a week
        responseData.quota_metrics.projected_exhaustion = new Date(Date.now() + hoursUntilExhaustion * 60 * 60 * 1000).toISOString();
      }
    }

    const successResponse = formatSuccess(responseData);
    return NextResponse.json(successResponse);

  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        userMessageKey: 'default'
      }
    );
    const errorResponse = formatError(structuredError);
    return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
  }
}

// Export wrapped with system authentication middleware
export const GET = withSystemAuth(handleMetricsRequest);
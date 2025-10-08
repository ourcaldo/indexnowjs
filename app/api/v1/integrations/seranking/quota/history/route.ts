/**
 * SeRanking Quota Usage History API Endpoint
 * GET /api/v1/integrations/seranking/quota/history
 * 
 * Provides historical quota usage data and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { IntegrationService } from '../../../../../../../lib/rank-tracking/seranking/services/IntegrationService';
import { withSystemAuth, SystemAuthContext } from '../../../../../../../lib/middleware/auth/SystemAuthMiddleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter';
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling';

// Query parameters validation schema
const QuotaHistoryRequestSchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily'),
  include_details: z.boolean().optional().default(false)
});

// Response interface
interface QuotaHistoryResponse {
  success: boolean;
  data?: {
    period: {
      start: string;
      end: string;
      requested_period: string;
      granularity: string;
    };
    summary: {
      total_requests: number;
      average_daily_usage: number;
      peak_daily_usage: number;
      peak_usage_date: string;
      quota_exceeded_days: number;
    };
    usage_data: Array<{
      date: string;
      usage: number;
      quota_limit: number;
      percentage: number;
      is_weekend?: boolean;
    }>;
    trends?: {
      daily_average_trend: 'increasing' | 'decreasing' | 'stable';
      weekly_comparison: number; // Percentage change from previous week
      monthly_projection: number; // Projected usage for the month
    };
    details?: Array<{
      date: string;
      operation_breakdown: Record<string, number>;
      hourly_distribution: Record<string, number>;
    }>;
  };
  error?: string;
  message?: string;
}

function calculateDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setDate(end.getDate() - 30);
  }

  return { start, end };
}

function calculateTrend(usageData: Array<{ date: string; usage: number }>): 'increasing' | 'decreasing' | 'stable' {
  if (usageData.length < 2) return 'stable';

  const firstHalf = usageData.slice(0, Math.floor(usageData.length / 2));
  const secondHalf = usageData.slice(Math.floor(usageData.length / 2));

  const firstAvg = firstHalf.reduce((sum, item) => sum + item.usage, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, item) => sum + item.usage, 0) / secondHalf.length;

  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (changePercent > 10) return 'increasing';
  if (changePercent < -10) return 'decreasing';
  return 'stable';
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

async function handleQuotaHistoryRequest(request: NextRequest, authContext: SystemAuthContext): Promise<Response> {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      period: searchParams.get('period'),
      granularity: searchParams.get('granularity'),
      include_details: searchParams.get('include_details') === 'true'
    };

    // Validate request parameters
    const validation = QuotaHistoryRequestSchema.safeParse(queryParams);
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

    const { period, granularity, include_details } = validation.data;

    // Initialize integration service
    const integrationService = new IntegrationService();

    // Get quota usage history (using mock data for now)
    const dateRange = calculateDateRange(period);

    // Mock usage data for demonstration (in real implementation, this would come from the database)
    const mockUsageData = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const usage = Math.floor(Math.random() * 500) + 100; // Random usage between 100-600
      
      return {
        date: date.toISOString().split('T')[0],
        usage,
        quota_limit: 10000,
        percentage: Math.round((usage / 10000) * 100 * 100) / 100,
        is_weekend: isWeekend(date)
      };
    });

    // Calculate summary statistics
    const totalRequests = mockUsageData.reduce((sum, item) => sum + item.usage, 0);
    const averageDailyUsage = Math.round(totalRequests / mockUsageData.length);
    const peakUsage = Math.max(...mockUsageData.map(item => item.usage));
    const peakUsageDate = mockUsageData.find(item => item.usage === peakUsage)?.date || '';
    const quotaExceededDays = mockUsageData.filter(item => item.percentage > 100).length;

    // Calculate trends
    const trend = calculateTrend(mockUsageData);
    const lastWeekUsage = mockUsageData.slice(-7).reduce((sum, item) => sum + item.usage, 0);
    const previousWeekUsage = mockUsageData.slice(-14, -7).reduce((sum, item) => sum + item.usage, 0);
    const weeklyComparison = previousWeekUsage > 0 
      ? Math.round(((lastWeekUsage - previousWeekUsage) / previousWeekUsage) * 100)
      : 0;

    const currentMonthDays = new Date().getDate();
    const currentMonthUsage = mockUsageData.slice(-currentMonthDays).reduce((sum, item) => sum + item.usage, 0);
    const monthlyProjection = Math.round((currentMonthUsage / currentMonthDays) * 30);

    const response: QuotaHistoryResponse = {
      success: true,
      data: {
        period: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
          requested_period: period,
          granularity
        },
        summary: {
          total_requests: totalRequests,
          average_daily_usage: averageDailyUsage,
          peak_daily_usage: peakUsage,
          peak_usage_date: peakUsageDate,
          quota_exceeded_days: quotaExceededDays
        },
        usage_data: mockUsageData,
        trends: {
          daily_average_trend: trend,
          weekly_comparison: weeklyComparison,
          monthly_projection: monthlyProjection
        }
      }
    };

    // Add detailed breakdown if requested
    if (include_details) {
      response.data!.details = mockUsageData.map(item => ({
        date: item.date,
        operation_breakdown: {
          'keyword_export': Math.floor(item.usage * 0.7),
          'bulk_enrichment': Math.floor(item.usage * 0.2),
          'cache_refresh': Math.floor(item.usage * 0.1)
        },
        hourly_distribution: Array.from({ length: 24 }, (_, hour) => 
          ({ [hour.toString()]: Math.floor(Math.random() * (item.usage / 24)) })
        ).reduce((acc, curr) => ({ ...acc, ...curr }), {})
      }));
    }

    const successResponse = formatSuccess(response.data);
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
export const GET = withSystemAuth(handleQuotaHistoryRequest);
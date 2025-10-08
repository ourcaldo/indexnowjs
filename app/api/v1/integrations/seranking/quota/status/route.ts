/**
 * SeRanking Quota Status API Endpoint
 * GET /api/v1/integrations/seranking/quota/status
 * 
 * Provides current quota usage status and limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { IntegrationService } from '../../../../../../../lib/rank-tracking/seranking/services/IntegrationService';
import { withSystemAuth, SystemAuthContext } from '../../../../../../../lib/middleware/auth/SystemAuthMiddleware'
import { logger, ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling';
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware';

// Response interface
interface QuotaStatusResponse {
  success: boolean;
  data?: {
    current_usage: number;
    quota_limit: number;
    quota_remaining: number;
    usage_percentage: number;
    reset_date: string;
    is_approaching_limit: boolean;
    is_quota_exceeded: boolean;
    reset_interval: string;
    days_until_reset: number;
  };
  error?: string;
  message?: string;
}

function calculateDaysUntilReset(resetDate: Date): number {
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  // Initialize integration service
  const integrationService = new IntegrationService();

  // Get integration settings with quota information
  const integrationSettings = await integrationService.getIntegrationSettings('system');
  if (!integrationSettings.success || !integrationSettings.data) {
    const error = await ErrorHandlingService.createError(
      ErrorType.EXTERNAL_API,
      'SeRanking integration is not configured',
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 503,
        userId: auth.userId,
        endpoint: '/api/v1/integrations/seranking/quota/status'
      }
    );
    return formatError(error);
  }

  const settings = integrationSettings.data;
  const currentUsage = settings.api_quota_used;
  const quotaLimit = settings.api_quota_limit;
  const quotaRemaining = Math.max(0, quotaLimit - currentUsage);
  const usagePercentage = quotaLimit > 0 ? (currentUsage / quotaLimit) * 100 : 0;
  
  // Determine alert states
  const isApproachingLimit = usagePercentage >= 80; // 80% threshold
  const isQuotaExceeded = quotaRemaining <= 0;
  
  const daysUntilReset = calculateDaysUntilReset(settings.quota_reset_date);

  return formatSuccess({
    current_usage: currentUsage,
    quota_limit: quotaLimit,
    quota_remaining: quotaRemaining,
    usage_percentage: Math.round(usagePercentage * 100) / 100, // Round to 2 decimal places
    reset_date: settings.quota_reset_date.toISOString(),
    is_approaching_limit: isApproachingLimit,
    is_quota_exceeded: isQuotaExceeded,
    reset_interval: 'monthly', // Default from integration service
    days_until_reset: daysUntilReset
  });
})
/**
 * SeRanking Single Keyword Intelligence API Endpoint
 * GET /api/v1/integrations/seranking/keyword-data
 * 
 * Provides keyword intelligence data with cache-first strategy
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { KeywordEnrichmentService } from '../../../../../../lib/rank-tracking/seranking/services/KeywordEnrichmentService';
import { KeywordBankService } from '../../../../../../lib/rank-tracking/seranking/services/KeywordBankService';
import { IntegrationService } from '../../../../../../lib/rank-tracking/seranking/services/IntegrationService';
import { SeRankingApiClient } from '../../../../../../lib/rank-tracking/seranking/client/SeRankingApiClient';
import { ErrorHandlingService as SeRankingErrorHandler } from '../../../../../../lib/rank-tracking/seranking/services/ErrorHandlingService';
import { withSystemAuth, SystemAuthContext } from '../../../../../../lib/middleware/auth/SystemAuthMiddleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter';
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling';

// Request validation schema
const KeywordDataRequestSchema = z.object({
  keyword: z.string().min(1).max(500),
  country_code: z.string().regex(/^[a-z]{2}$/i).optional().default('us'),
  language_code: z.string().regex(/^[a-z]{2}$/i).optional().default('en'),
  force_refresh: z.boolean().optional().default(false)
});

async function initializeServices(authContext: SystemAuthContext): Promise<{
  enrichmentService: KeywordEnrichmentService;
  integrationService: IntegrationService;
} | null> {
  const userId = authContext.userId || 'system';
  try {
    // Initialize services
    const keywordBankService = new KeywordBankService();
    const integrationService = new IntegrationService();
    const errorHandler = new SeRankingErrorHandler();

    // Get SeRanking integration settings with userId
    const integrationSettings = await integrationService.getIntegrationSettings(userId);
    
    if (!integrationSettings.success || !integrationSettings.data) {
      return null;
    }

    const { api_key, api_url } = integrationSettings.data;
    
    // Validate API key exists before proceeding
    if (!api_key || api_key.trim() === '') {
      return null;
    }

    // Initialize API client with stored API key
    const apiClient = new SeRankingApiClient({
      baseUrl: api_url,
      apiKey: api_key,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    });

    // Initialize enrichment service
    const enrichmentService = new KeywordEnrichmentService(
      keywordBankService,
      apiClient,
      errorHandler
    );

    return { enrichmentService, integrationService };
  } catch (error) {
    return null;
  }
}

async function handleKeywordDataRequest(request: NextRequest, authContext: SystemAuthContext): Promise<Response> {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      keyword: searchParams.get('keyword'),
      country_code: searchParams.get('country_code') || undefined,
      language_code: searchParams.get('language_code') || undefined,
      force_refresh: searchParams.get('force_refresh') === 'true'
    };

    // Validate request parameters
    const validation = KeywordDataRequestSchema.safeParse(queryParams);
    if (!validation.success) {
      const error = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        validation.error.errors.map(e => e.message).join(', '),
        {
          severity: ErrorSeverity.MEDIUM,
          statusCode: 400,
          userMessageKey: 'invalid_format'
        }
      );
      const errorResponse = formatError(error);
      return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
    }

    const { keyword, country_code, language_code, force_refresh } = validation.data;

    // Initialize services with authenticated context
    const services = await initializeServices(authContext);
    if (!services) {
      const error = await ErrorHandlingService.createError(
        ErrorType.EXTERNAL_API,
        'SeRanking integration not configured. Please configure SeRanking API credentials',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 503,
          userMessageKey: 'default'
        }
      );
      const errorResponse = formatError(error);
      return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
    }

    const { enrichmentService, integrationService } = services;

    // Get integration settings to check quota for authenticated user
    const integrationSettings = await integrationService.getIntegrationSettings(authContext.userId || 'system');
    if (!integrationSettings.success || !integrationSettings.data) {
      const error = await ErrorHandlingService.createError(
        ErrorType.EXTERNAL_API,
        'Unable to check quota status. Please try again later',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 503,
          userMessageKey: 'default'
        }
      );
      const errorResponse = formatError(error);
      return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
    }

    const quotaRemaining = integrationSettings.data.api_quota_limit - integrationSettings.data.api_quota_used;
    if (quotaRemaining <= 0) {
      const error = await ErrorHandlingService.createError(
        ErrorType.BUSINESS_LOGIC,
        `API quota limit reached. Resets on ${integrationSettings.data.quota_reset_date}`,
        {
          severity: ErrorSeverity.MEDIUM,
          statusCode: 429,
          userMessageKey: 'default',
          metadata: { quota_remaining: 0 }
        }
      );
      const errorResponse = formatError(error);
      return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
    }

    // Enrich keyword data
    const enrichmentResult = await enrichmentService.enrichKeyword(
      keyword,
      country_code,
      force_refresh
    );

    if (!enrichmentResult.success) {
      const error = await ErrorHandlingService.createError(
        ErrorType.EXTERNAL_API,
        enrichmentResult.error?.message || 'Failed to enrich keyword data',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 500,
          userMessageKey: 'default',
          metadata: {
            error_type: enrichmentResult.error?.type,
            quota_remaining: quotaRemaining
          }
        }
      );
      const errorResponse = formatError(error);
      return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
    }

    const keywordData = enrichmentResult.data;
    if (!keywordData) {
      const error = await ErrorHandlingService.createError(
        ErrorType.EXTERNAL_API,
        'No keyword data returned',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 500,
          userMessageKey: 'default',
          metadata: { quota_remaining: quotaRemaining }
        }
      );
      const errorResponse = formatError(error);
      return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
    }

    const successResponse = formatSuccess({
      keyword: keywordData.keyword,
      country_code: keywordData.country_id,
      is_data_found: keywordData.is_data_found,
      volume: keywordData.volume,
      cpc: keywordData.cpc,
      competition: keywordData.competition,
      difficulty: keywordData.difficulty,
      keyword_intent: keywordData.keyword_intent,
      history_trend: keywordData.history_trend,
      source: enrichmentResult.metadata?.source || 'api',
      last_updated: keywordData.data_updated_at.toISOString(),
      quota_remaining: quotaRemaining,
      cache_hit: enrichmentResult.metadata?.source === 'cache'
    });
    return NextResponse.json(successResponse, { status: 200 });

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
export const GET = withSystemAuth(handleKeywordDataRequest);

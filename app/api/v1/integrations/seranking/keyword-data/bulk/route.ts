/**
 * SeRanking Bulk Keyword Enrichment API Endpoint  
 * POST /api/v1/integrations/seranking/keyword-data/bulk
 * 
 * Handles bulk keyword enrichment with queue-based processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { KeywordEnrichmentService } from '../../../../../../../lib/rank-tracking/seranking/services/KeywordEnrichmentService';
import { KeywordBankService } from '../../../../../../../lib/rank-tracking/seranking/services/KeywordBankService';
import { IntegrationService } from '../../../../../../../lib/rank-tracking/seranking/services/IntegrationService';
import { SeRankingApiClient } from '../../../../../../../lib/rank-tracking/seranking/client/SeRankingApiClient';
import { ErrorHandlingService } from '../../../../../../../lib/rank-tracking/seranking/services/ErrorHandlingService';
import { withSystemAuth, SystemAuthContext } from '../../../../../../../lib/middleware/auth/SystemAuthMiddleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter';
import { ErrorHandlingService as GlobalErrorHandler, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling';

// Request validation schema
const BulkEnrichmentRequestSchema = z.object({
  keywords: z.array(z.object({
    keyword: z.string().min(1).max(500),
    country_code: z.string().regex(/^[a-z]{2}$/i).optional().default('us'),
    language_code: z.string().regex(/^[a-z]{2}$/i).optional().default('en')
  })).min(1).max(1000),
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).optional().default('NORMAL')
  // Removed callback_url to prevent SSRF attacks until proper verification is implemented
});

// Response interface
interface BulkEnrichmentResponse {
  success: boolean;
  results?: Array<{
    keyword: string;
    country_code: string;
    success: boolean;
    data?: {
      volume: number | null;
      cpc: number | null;
      competition: number | null;
      difficulty: number | null;
      keyword_intent: string | null;
      history_trend: Record<string, number> | null;
      source: 'cache' | 'api';
      last_updated: string;
    };
    error?: string;
  }>;
  total_keywords?: number;
  successful?: number;
  failed?: number;
  quota_used?: number;
  quota_available?: number;
  error?: string;
  message?: string;
}

async function initializeServices(authContext: SystemAuthContext): Promise<{
  enrichmentService: KeywordEnrichmentService;
  integrationService: IntegrationService;
} | null> {
  const userId = authContext.userId || 'system';
  try {
    // Initialize services
    const keywordBankService = new KeywordBankService();
    const integrationService = new IntegrationService();
    const errorHandler = new ErrorHandlingService();

    // Get SeRanking integration settings with userId
    const integrationSettings = await integrationService.getIntegrationSettings(userId);
    
    if (!integrationSettings.success || !integrationSettings.data) {
      logger.error({ error: 'SeRanking integration not configured' }, 'Error occurred');
      return null;
    }

    const { api_key, api_url } = integrationSettings.data;
    
    // Validate API key exists before proceeding
    if (!api_key || api_key.trim() === '') {
      logger.error({ error: 'SeRanking API key not configured' }, 'Error occurred');
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
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error initializing SeRanking services:');
    return null;
  }
}


async function handleBulkEnrichmentRequest(request: NextRequest, authContext: SystemAuthContext): Promise<Response> {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      const error = await GlobalErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid JSON in request body',
        {
          severity: ErrorSeverity.LOW,
          statusCode: 400,
          userMessageKey: 'invalid_format'
        }
      );
      const errorResponse = formatError(error);
      return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
    }

    // Check if body is empty or not an object
    if (!body || typeof body !== 'object') {
      const error = await GlobalErrorHandler.createError(
        ErrorType.VALIDATION,
        'Request body must be a JSON object',
        {
          severity: ErrorSeverity.LOW,
          statusCode: 400,
          userMessageKey: 'invalid_format'
        }
      );
      const errorResponse = formatError(error);
      return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
    }

    // Validate request
    const validation = BulkEnrichmentRequestSchema.safeParse(body);
    if (!validation.success) {
      const error = await GlobalErrorHandler.createError(
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

    const { keywords, priority } = validation.data;
    const totalKeywords = keywords.length;

    // Initialize services with authenticated context
    const services = await initializeServices(authContext);
    if (!services) {
      const error = await GlobalErrorHandler.createError(
        ErrorType.EXTERNAL_API,
        'Please configure SeRanking API credentials',
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

    // Get integration settings to check quota for the authenticated user
    const integrationSettings = await integrationService.getIntegrationSettings(authContext.userId || 'system');
    if (!integrationSettings.success || !integrationSettings.data) {
      const error = await GlobalErrorHandler.createError(
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

    const quotaRequired = totalKeywords; // Assume 1 quota per keyword
    const quotaAvailable = integrationSettings.data.api_quota_limit - integrationSettings.data.api_quota_used;

    if (quotaAvailable < quotaRequired) {
      const error = await GlobalErrorHandler.createError(
        ErrorType.BUSINESS_LOGIC,
        `Insufficient quota. Required: ${quotaRequired}, Available: ${quotaAvailable}`,
        {
          severity: ErrorSeverity.MEDIUM,
          statusCode: 429,
          userMessageKey: 'default',
          metadata: { quota_available: quotaAvailable }
        }
      );
      const errorResponse = formatError(error);
      return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
    }

    // Process each keyword synchronously using the enrichment service
    const results = [];
    let quotaUsed = 0;
    let successful = 0;
    let failed = 0;

    for (const keywordRequest of keywords) {
      try {
        const result = await enrichmentService.enrichKeyword(
          keywordRequest.keyword,
          keywordRequest.country_code,
          false // Don't force refresh, use cache-first strategy
        );

        if (result.success && result.data) {
          results.push({
            keyword: keywordRequest.keyword,
            country_code: result.data.country_id,
            success: true,
            data: {
              volume: result.data.volume,
              cpc: result.data.cpc,
              competition: result.data.competition,
              difficulty: result.data.difficulty,
              keyword_intent: result.data.keyword_intent,
              history_trend: result.data.history_trend,
              source: result.metadata?.source as 'cache' | 'api' || 'api',
              last_updated: result.data.data_updated_at?.toISOString() || new Date().toISOString()
            }
          });
          successful++;
          
          // Count quota usage (only for API calls, not cache hits)
          if (result.metadata?.source === 'api') {
            quotaUsed++;
          }
        } else {
          results.push({
            keyword: keywordRequest.keyword,
            country_code: keywordRequest.country_code,
            success: false,
            error: result.error?.message || 'Unknown error'
          });
          failed++;
        }
      } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, '`Error processing keyword ${keywordRequest.keyword}:`');
        results.push({
          keyword: keywordRequest.keyword,
          country_code: keywordRequest.country_code,
          success: false,
          error: 'Processing error'
        });
        failed++;
      }
    }

    // Update quota usage if any API calls were made
    if (quotaUsed > 0) {
      try {
        await integrationService.recordApiUsage(quotaUsed, { 
          operationType: 'bulk_enrichment',
          metadata: { userId: authContext.userId || 'system' }
        });
      } catch (error) {
        // Log but don't fail the request
        await GlobalErrorHandler.createError(
          ErrorType.SYSTEM,
          error as Error,
          {
            severity: ErrorSeverity.MEDIUM,
            statusCode: 500,
            userMessageKey: 'default',
            metadata: { context: 'record_quota_usage' }
          }
        );
      }
    }

    const successResponse = formatSuccess({
      results,
      total_keywords: totalKeywords,
      successful,
      failed,
      quota_used: quotaUsed,
      quota_available: quotaAvailable - quotaUsed
    });
    return NextResponse.json(successResponse);

  } catch (error) {
    const structuredError = await GlobalErrorHandler.createError(
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
export const POST = withSystemAuth(handleBulkEnrichmentRequest);
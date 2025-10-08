import { NextRequest } from 'next/server';
import { adminApiWrapper } from '@/lib/core/api-response-middleware';
import { formatSuccess } from '@/lib/core/api-response-formatter';
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper';
import { supabaseAdmin } from '@/lib/database/supabase';

/**
 * GET /api/v1/admin/errors
 * Retrieve paginated error list with comprehensive filtering
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 100, max: 200)
 * - severity: Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)
 * - type: Filter by error type (AUTHENTICATION, DATABASE, EXTERNAL_API, etc.)
 * - userId: Filter by user ID
 * - endpoint: Filter by endpoint (partial match)
 * - dateFrom: Filter errors from date (ISO 8601)
 * - dateTo: Filter errors to date (ISO 8601)
 * - status: Filter by resolution status (new, acknowledged, resolved)
 * - search: Full-text search in message and user_message
 * - sortBy: Sort field (default: created_at)
 * - sortOrder: Sort order (asc|desc, default: desc)
 */
export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const { searchParams } = new URL(request.url);
  const endpoint = new URL(request.url).pathname;
  
  // Parse pagination parameters
  const parsedPage = parseInt(searchParams.get('page') || '1');
  const parsedLimit = parseInt(searchParams.get('limit') || '100');
  const page = Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
  const limit = Number.isNaN(parsedLimit) ? 100 : Math.min(200, Math.max(1, parsedLimit));
  const offset = (page - 1) * limit;

  // Parse filter parameters
  const severity = searchParams.get('severity') || undefined;
  const errorType = searchParams.get('type') || undefined;
  const userId = searchParams.get('userId') || undefined;
  const endpointFilter = searchParams.get('endpoint') || undefined;
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;
  const status = searchParams.get('status') || undefined; // new, acknowledged, resolved
  const search = searchParams.get('search') || undefined;

  // Parse sort parameters
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const result = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: adminUser.id,
      operation: 'fetch_error_list',
      reason: 'Admin viewing paginated error list with filters',
      source: endpoint,
      metadata: { 
        page, 
        limit, 
        filters: {
          severity, 
          errorType, 
          userId, 
          status,
          hasSearch: !!search
        } 
      }
    },
    {
      table: 'indb_system_error_logs',
      operationType: 'select',
      columns: ['*'],
      whereConditions: { /* filters applied in query */ }
    },
    async () => {
      // Build base query
      let query = supabaseAdmin
        .from('indb_system_error_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (severity) {
        query = query.eq('severity', severity);
      }

      if (errorType) {
        query = query.eq('error_type', errorType);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (endpointFilter) {
        query = query.ilike('endpoint', `%${endpointFilter}%`);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      // Resolution status filtering
      if (status === 'resolved') {
        query = query.not('resolved_at', 'is', null);
      } else if (status === 'acknowledged') {
        query = query.not('acknowledged_at', 'is', null).is('resolved_at', null);
      } else if (status === 'new') {
        query = query.is('acknowledged_at', null).is('resolved_at', null);
      }

      // Full-text search in message fields
      if (search) {
        query = query.or(`message.ilike.%${search}%,user_message.ilike.%${search}%`);
      }

      // Apply sorting
      const ascending = sortOrder === 'asc';
      query = query.order(sortBy, { ascending });

      // Apply pagination and execute
      const { data: errors, error, count } = await query
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        errors: errors || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNextPage: (count || 0) > offset + limit,
          hasPrevPage: page > 1
        },
        filters: {
          severity,
          errorType,
          userId,
          endpoint: endpointFilter,
          dateFrom,
          dateTo,
          status,
          search
        },
        sort: {
          sortBy,
          sortOrder
        }
      };
    }
  );

  return formatSuccess(result);
});

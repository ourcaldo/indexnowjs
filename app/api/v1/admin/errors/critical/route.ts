/**
 * Critical Errors API Endpoint
 * Provides recent critical errors that need immediate attention
 * Updated for Phase 3: Shows ALL critical errors, not just rank-check errors
 */

import { NextRequest } from 'next/server'
import { adminApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database/supabase'

/**
 * GET /api/v1/admin/errors/critical
 * Query Parameters:
 * - limit: Maximum number of critical errors to return (default: 50, max: 200)
 */
export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const { searchParams } = new URL(request.url)
  const endpoint = new URL(request.url).pathname
  const parsedLimit = parseInt(searchParams.get('limit') || '50')
  const limit = Number.isNaN(parsedLimit) ? 50 : Math.min(200, Math.max(1, parsedLimit))

  const result = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: adminUser.id,
      operation: 'fetch_critical_errors',
      reason: 'Admin viewing unresolved critical errors',
      source: endpoint,
      metadata: { limit }
    },
    {
      table: 'indb_system_error_logs',
      operationType: 'select',
      columns: ['*'],
      whereConditions: { 
        severity: 'CRITICAL',
        resolved_at: null
      }
    },
    async () => {
      const { data: criticalErrors, error } = await supabaseAdmin
        .from('indb_system_error_logs')
        .select('*')
        .eq('severity', 'CRITICAL')
        .is('resolved_at', null) // Only unresolved critical errors
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return {
        criticalErrors: criticalErrors || [],
        count: criticalErrors?.length || 0,
        hasAlerts: (criticalErrors?.length || 0) > 0
      }
    }
  )

  return formatSuccess(result)
})
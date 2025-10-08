import { NextRequest } from 'next/server'
import { publicApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const GET = publicApiWrapper(async (request) => {
  try {
    if (!supabaseAdmin) {
      const systemError = await ErrorHandlingService.createError(
        ErrorType.SYSTEM,
        'Database connection not available',
        { severity: ErrorSeverity.CRITICAL, statusCode: 500 }
      )
      return formatError(systemError)
    }

    const countries = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'get_public_countries_list',
        source: 'rank-tracking/countries',
        reason: 'Public API providing list of available countries for rank tracking',
        metadata: { endpoint: '/api/v1/rank-tracking/countries', method: 'GET', isPublic: true },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_keyword_countries', operationType: 'select' },
      async () => {
        const { data, error } = await supabaseAdmin!
          .from('indb_keyword_countries')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (error) throw new Error(`Failed to fetch countries: ${error.message}`)
        return data || []
      }
    )

    return formatSuccess({ data: countries })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, endpoint: '/api/v1/rank-tracking/countries', method: 'GET', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

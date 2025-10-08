import { NextRequest } from 'next/server'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * SECURITY FIX: This endpoint now requires authentication
 * Previously had NO authentication check - critical security vulnerability fixed
 */
export const GET = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  // Fetch active payment gateways
  const { data: gateways, error } = await supabase
    .from('indb_payment_gateways')
    .select('*')
    .eq('is_active', true)
    .order('is_default', { ascending: false })

  if (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint: '/api/v1/billing/payment-gateways',
        method: 'GET',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }

  return formatSuccess({
    gateways: gateways || []
  })
})

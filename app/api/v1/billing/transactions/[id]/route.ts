import { NextRequest } from 'next/server'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth, context?: { params: Promise<any> }) => {
  const params = context?.params ? await context.params : null
  const transactionId = params?.id

  if (!transactionId) {
    const error = await ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      'Transaction ID is required',
      {
        severity: ErrorSeverity.LOW,
        userId: auth.userId,
        endpoint: '/api/v1/billing/transactions/[id]',
        statusCode: 400
      }
    )
    return formatError(error)
  }

  // Fetch transaction with related data
  const { data: transaction, error: dbError } = await supabase
    .from('indb_payment_transactions')
    .select(`
      *,
      package:indb_payment_packages(*),
      gateway:indb_payment_gateways(*)
    `)
    .eq('id', transactionId)
    .eq('user_id', auth.userId)
    .single()

  if (dbError) {
    // Check if this is a "not found" error vs actual database error
    if (dbError.code === 'PGRST116' || dbError.message?.includes('no rows returned')) {
      const error = await ErrorHandlingService.createError(
        ErrorType.DATABASE,
        'Transaction not found or access denied',
        {
          severity: ErrorSeverity.LOW,
          userId: auth.userId,
          endpoint: '/api/v1/billing/transactions/[id]',
          statusCode: 404,
          metadata: { transactionId }
        }
      )
      return formatError(error)
    }
    
    // Actual database/server error
    const error = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      dbError,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint: '/api/v1/billing/transactions/[id]',
        statusCode: 500,
        metadata: { transactionId }
      }
    )
    return formatError(error)
  }

  if (!transaction) {
    const error = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      'Transaction not found or access denied',
      {
        severity: ErrorSeverity.LOW,
        userId: auth.userId,
        endpoint: '/api/v1/billing/transactions/[id]',
        statusCode: 404,
        metadata: { transactionId }
      }
    )
    return formatError(error)
  }

  // Parse customer info from metadata
  const customerInfo = transaction.metadata?.customer_info || {}

  return formatSuccess({
    transaction: {
      ...transaction,
      customer_info: customerInfo
    }
  })
})

import { NextRequest } from 'next/server'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

// Normalized transaction interface combining both legacy and Paddle transactions
interface NormalizedBillingTransaction {
  id: string
  order_id: string
  source: 'legacy' | 'paddle'
  transaction_type: string
  transaction_status: string
  amount: number
  currency: string
  created_at: string
  updated_at: string | null
  processed_at: string | null
  verified_at: string | null
  notes: string | null
  payment_proof_url: string | null
  payment_method: string
  gateway_transaction_id: string | null
  package_name: string
  billing_period: string
  gateway_name?: string | null
  gateway_slug?: string | null
  paddle_transaction_id?: string | null
  subscription_id?: string | null
  receipt_url?: string | null
  invoice_number?: string | null
}

// Adapter function to map legacy transactions
function mapLegacyTransaction(tx: any, detail: string): NormalizedBillingTransaction {
  return {
    id: tx.id,
    order_id: tx.id,
    source: 'legacy',
    transaction_type: tx.transaction_type || 'purchase',
    transaction_status: tx.transaction_status,
    amount: parseFloat(tx.amount || '0'),
    currency: tx.currency || 'USD',
    created_at: tx.created_at,
    updated_at: tx.updated_at,
    processed_at: tx.processed_at,
    verified_at: tx.verified_at,
    notes: tx.notes,
    payment_proof_url: tx.payment_proof_url,
    payment_method: tx.payment_method || 'Unknown Method',
    gateway_transaction_id: tx.gateway_transaction_id,
    package_name: (Array.isArray(tx.package) ? tx.package[0]?.name : tx.package?.name) || 'Unknown Package',
    billing_period: detail === 'full' && tx.metadata?.billing_period 
      ? tx.metadata.billing_period 
      : 'monthly',
    gateway_name: tx.gateway?.name || 'Unknown Gateway',
    gateway_slug: tx.gateway?.slug || 'unknown',
  }
}

// Adapter function to map Paddle transactions
function mapPaddleTransaction(tx: any): NormalizedBillingTransaction {
  return {
    id: tx.id,
    order_id: tx.paddle_transaction_id || tx.id,
    source: 'paddle',
    transaction_type: 'subscription',
    transaction_status: tx.status || 'completed',
    amount: parseFloat(tx.amount || '0'),
    currency: tx.currency || 'USD',
    created_at: tx.created_at,
    updated_at: tx.updated_at || null,
    processed_at: tx.created_at,
    verified_at: tx.created_at,
    notes: null,
    payment_proof_url: tx.receipt_url,
    payment_method: tx.payment_method || 'card',
    gateway_transaction_id: tx.paddle_transaction_id,
    package_name: tx.metadata?.items?.[0]?.price?.description || 'Paddle Subscription',
    billing_period: 'monthly',
    gateway_name: 'Paddle',
    gateway_slug: 'paddle',
    paddle_transaction_id: tx.paddle_transaction_id,
    subscription_id: tx.subscription_id,
    receipt_url: tx.receipt_url,
    invoice_number: tx.invoice_number,
  }
}

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const status = url.searchParams.get('status')
  const type = url.searchParams.get('type')
  const detail = url.searchParams.get('detail') || 'basic'

  const offset = (page - 1) * limit
  
  const legacyBaseFields = [
    'id',
    'transaction_type',
    'transaction_status', 
    'amount',
    'currency',
    'payment_method',
    'gateway_transaction_id',
    'created_at',
    'updated_at',
    'processed_at',
    'verified_at',
    'notes',
    'payment_proof_url',
    'gateway:indb_payment_gateways(id, name, slug)',
    'package:indb_payment_packages(id, name, slug)'
  ]
  
  const legacySelectFields = detail === 'full' 
    ? [...legacyBaseFields, 'metadata', 'gateway_response'].join(',')
    : legacyBaseFields.join(',')

  const paddleSelectFields = [
    'id',
    'paddle_transaction_id',
    'status',
    'amount',
    'currency',
    'payment_method',
    'receipt_url',
    'invoice_number',
    'subscription_id',
    'metadata',
    'created_at',
    'updated_at'
  ].join(',')

  // Reasonable cap to prevent unbounded queries while supporting typical user transaction volumes
  const MAX_RECORDS_PER_SOURCE = 1000

  let legacyTransactions: any[] = []
  let paddleTransactions: any[] = []
  let legacyCount = 0
  let paddleCount = 0
  
  try {
    // Fetch both transaction sources in parallel
    const [legacyResult, paddleResult] = await Promise.all([
      // Fetch legacy transactions
      SecureServiceRoleWrapper.executeWithUserSession(
        auth.supabase,
        {
          userId: auth.userId,
          operation: 'get_billing_history_legacy',
          source: 'billing/history',
          reason: 'User fetching their legacy billing transaction history',
          metadata: { page, limit, status, type, detail, endpoint: '/api/v1/billing/history' },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_payment_transactions', operationType: 'select' },
        async (db) => {
          let query = db
            .from('indb_payment_transactions')
            .select(legacySelectFields, { count: 'exact' })
            .eq('user_id', auth.userId)

          if (status) {
            query = query.eq('transaction_status', status)
          }
          
          if (type) {
            query = query.eq('transaction_type', type)
          }

          const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .limit(MAX_RECORDS_PER_SOURCE)

          if (error) throw error
          
          return { data: data || [], count: count || 0 }
        }
      ),
      // Fetch Paddle transactions
      SecureServiceRoleWrapper.executeWithUserSession(
        auth.supabase,
        {
          userId: auth.userId,
          operation: 'get_billing_history_paddle',
          source: 'billing/history',
          reason: 'User fetching their Paddle billing transaction history',
          metadata: { page, limit, status, type, detail, endpoint: '/api/v1/billing/history' },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_paddle_transactions', operationType: 'select' },
        async (db) => {
          let query = db
            .from('indb_paddle_transactions')
            .select(paddleSelectFields, { count: 'exact' })
            .eq('user_id', auth.userId)

          // Map status parameter to Paddle status values
          if (status) {
            const paddleStatus = status === 'completed' ? 'completed' : status
            query = query.eq('status', paddleStatus)
          }

          const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .limit(MAX_RECORDS_PER_SOURCE)

          if (error) throw error
          
          return { data: data || [], count: count || 0 }
        }
      )
    ])
    
    legacyTransactions = legacyResult.data || []
    paddleTransactions = paddleResult.data || []
    legacyCount = legacyResult.count || 0
    paddleCount = paddleResult.count || 0
    
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error fetching transactions:')
    throw new Error('Failed to fetch billing history')
  }

  // Normalize and merge transactions
  const normalizedLegacy = legacyTransactions
    .filter(tx => tx && typeof tx === 'object' && !('error' in tx))
    .map(tx => mapLegacyTransaction(tx, detail))
  
  const normalizedPaddle = paddleTransactions
    .filter(tx => tx && typeof tx === 'object' && !('error' in tx))
    .map(tx => mapPaddleTransaction(tx))

  // Merge and sort by created_at (most recent first)
  const allTransactions = [...normalizedLegacy, ...normalizedPaddle]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Apply pagination to merged results
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedTransactions = allTransactions.slice(startIndex, endIndex)
  
  // Use the actual number of records we have (capped by MAX_RECORDS_PER_SOURCE)
  // This ensures pagination metadata is accurate for the data we're returning
  const totalCount = allTransactions.length
  
  // Note: If a user has more than MAX_RECORDS_PER_SOURCE transactions per source,
  // they'll only see their most recent records (sorted by date). This is acceptable
  // for a billing history UI where recent transactions are most relevant.

  // Calculate statistics from both sources
  let legacyStats = { total: 0, completed: 0, pending: 0, failed: 0, amounts: [] }
  let paddleStats = { total: 0, completed: 0, amounts: [] }
  
  try {
    const [legacyStatsResult, paddleStatsResult] = await Promise.all([
      // Legacy stats
      SecureServiceRoleWrapper.executeWithUserSession(
        auth.supabase,
        {
          userId: auth.userId,
          operation: 'get_billing_statistics_legacy',
          source: 'billing/history',
          reason: 'User fetching their legacy billing transaction statistics',
          metadata: { endpoint: '/api/v1/billing/history' },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_payment_transactions', operationType: 'select' },
        async (db) => {
          const [
            { count: total },
            { count: completed },
            { count: pending },
            { count: failed },
            { data: amounts }
          ] = await Promise.all([
            db.from('indb_payment_transactions')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', auth.userId),
            db.from('indb_payment_transactions')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', auth.userId)
              .eq('transaction_status', 'completed'),
            db.from('indb_payment_transactions')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', auth.userId)
              .in('transaction_status', ['pending', 'pending_3ds']),
            db.from('indb_payment_transactions')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', auth.userId)
              .eq('transaction_status', 'failed'),
            db.from('indb_payment_transactions')
              .select('amount')
              .eq('user_id', auth.userId)
              .eq('transaction_status', 'completed')
          ])
          
          return { total, completed, pending, failed, amounts }
        }
      ),
      // Paddle stats
      SecureServiceRoleWrapper.executeWithUserSession(
        auth.supabase,
        {
          userId: auth.userId,
          operation: 'get_billing_statistics_paddle',
          source: 'billing/history',
          reason: 'User fetching their Paddle billing transaction statistics',
          metadata: { endpoint: '/api/v1/billing/history' },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_paddle_transactions', operationType: 'select' },
        async (db) => {
          const [
            { count: total },
            { count: completed },
            { data: amounts }
          ] = await Promise.all([
            db.from('indb_paddle_transactions')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', auth.userId),
            db.from('indb_paddle_transactions')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', auth.userId)
              .eq('status', 'completed'),
            db.from('indb_paddle_transactions')
              .select('amount')
              .eq('user_id', auth.userId)
              .eq('status', 'completed')
          ])
          
          return { total, completed, amounts }
        }
      )
    ])
    
    legacyStats = legacyStatsResult
    paddleStats = paddleStatsResult
    
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error fetching billing statistics:')
  }

  // Combine statistics
  const summary = {
    total_transactions: (legacyStats.total || 0) + (paddleStats.total || 0),
    completed_transactions: (legacyStats.completed || 0) + (paddleStats.completed || 0),
    pending_transactions: legacyStats.pending || 0,
    failed_transactions: legacyStats.failed || 0,
    total_amount_spent: 
      ((legacyStats.amounts || []).reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0)) +
      ((paddleStats.amounts || []).reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0))
  }

  // Transform to final format expected by frontend
  const transformedTransactions = paginatedTransactions.map(tx => ({
    id: tx.id,
    order_id: tx.order_id,
    transaction_type: tx.transaction_type,
    transaction_status: tx.transaction_status,
    amount: tx.amount,
    currency: tx.currency,
    created_at: tx.created_at,
    updated_at: tx.updated_at,
    processed_at: tx.processed_at,
    verified_at: tx.verified_at,
    notes: tx.notes,
    payment_proof_url: tx.payment_proof_url,
    payment_method: tx.payment_method,
    gateway_transaction_id: tx.gateway_transaction_id,
    package_name: tx.package_name,
    billing_period: tx.billing_period,
    gateway: tx.source === 'paddle' 
      ? { name: 'Paddle', slug: 'paddle' }
      : { name: tx.gateway_name || 'Unknown', slug: tx.gateway_slug || 'unknown' },
    package: { name: tx.package_name, slug: 'unknown' },
    subscription: tx.source === 'paddle' ? { id: tx.subscription_id } : null,
    ...(tx.source === 'paddle' && {
      paddle_transaction_id: tx.paddle_transaction_id,
      receipt_url: tx.receipt_url,
      invoice_number: tx.invoice_number
    })
  }))

  const totalPages = Math.ceil(totalCount / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1
  
  // Check if results are capped (user has more records than we fetched)
  const actualTotalTransactions = (legacyCount || 0) + (paddleCount || 0)
  const isCapped = actualTotalTransactions > totalCount

  return formatSuccess({
    transactions: transformedTransactions,
    summary,
    pagination: {
      current_page: page,
      total_pages: totalPages,
      total_items: totalCount,
      items_per_page: limit,
      has_next: hasNext,
      has_prev: hasPrev,
      // Indicate if older records exist but are not included due to cap
      ...(isCapped && {
        capped: true,
        cap_message: `Showing most recent ${totalCount} transactions. ${actualTotalTransactions - totalCount} older transactions not displayed.`,
        actual_total: actualTotalTransactions
      })
    }
  })
})

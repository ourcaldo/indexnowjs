import { NextRequest } from 'next/server'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const status = url.searchParams.get('status')
  const type = url.searchParams.get('type')

  const offset = (page - 1) * limit

  const detail = url.searchParams.get('detail') || 'basic'
  
  const baseFields = [
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
  
  const selectFields = detail === 'full' 
    ? [...baseFields, 'metadata', 'gateway_response'].join(',')
    : baseFields.join(',')

  let transactions = null
  let count = 0
  
  try {
    const result = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_billing_history',
        source: 'billing/history',
        reason: 'User fetching their billing transaction history',
        metadata: { page, limit, status, type, detail, endpoint: '/api/v1/billing/history' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_payment_transactions', operationType: 'select' },
      async (db) => {
        let query = db
          .from('indb_payment_transactions')
          .select(selectFields, { count: 'exact' })

        if (status) {
          query = query.eq('transaction_status', status)
        }
        
        if (type) {
          query = query.eq('transaction_type', type)
        }

        const { data, error, count: resultCount } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error
        
        return { data, count: resultCount }
      }
    )
    
    transactions = result.data
    count = result.count || 0
    
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error fetching transactions:')
    throw new Error('Failed to fetch billing history')
  }

  let totalCount = 0
  let completedCount = 0
  let pendingCount = 0
  let failedCount = 0
  let amountStats = []
  
  try {
    const statsResult = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_billing_statistics',
        source: 'billing/history',
        reason: 'User fetching their billing transaction statistics',
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
            .select('*', { count: 'exact', head: true }),
          db.from('indb_payment_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('transaction_status', 'completed'),
          db.from('indb_payment_transactions')
            .select('*', { count: 'exact', head: true })
            .in('transaction_status', ['pending', 'pending_3ds']),
          db.from('indb_payment_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('transaction_status', 'failed'),
          db.from('indb_payment_transactions')
            .select('amount')
            .eq('transaction_status', 'completed')
        ])
        
        return { total, completed, pending, failed, amounts }
      }
    )
    
    totalCount = statsResult.total || 0
    completedCount = statsResult.completed || 0
    pendingCount = statsResult.pending || 0
    failedCount = statsResult.failed || 0
    amountStats = statsResult.amounts || []
    
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error fetching billing statistics:')
  }

  const summary = {
    total_transactions: totalCount || 0,
    completed_transactions: completedCount || 0,
    pending_transactions: pendingCount || 0,
    failed_transactions: failedCount || 0,
    total_amount_spent: amountStats?.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0) || 0
  }

  const transformedTransactions = (transactions || [])
    .map(transaction => {
      if (!transaction || typeof transaction !== 'object' || 'error' in transaction) {
        return null
      }
      
      const tx = transaction as any
      
      const baseData = {
        id: tx.id,
        order_id: tx.id,
        transaction_type: tx.transaction_type,
        transaction_status: tx.transaction_status,
        amount: parseFloat(tx.amount || '0'),
        currency: tx.currency,
        created_at: tx.created_at,
        updated_at: tx.updated_at,
        processed_at: tx.processed_at,
        verified_at: tx.verified_at,
        notes: tx.notes,
        payment_proof_url: tx.payment_proof_url,
        payment_method: tx.payment_method || 'Unknown Method',
        gateway_transaction_id: tx.gateway_transaction_id,
        package: tx.package || { name: 'Unknown Package', slug: 'unknown' },
        gateway: tx.gateway || { name: 'Unknown Gateway', slug: 'unknown' },
        subscription: null
      }
      
      if (detail === 'full' && tx.metadata) {
        return {
          ...baseData,
          billing_period: tx.metadata?.billing_period || 'monthly',
          package_name: tx.metadata?.package_name || 
            (Array.isArray(tx.package) ? tx.package[0]?.name : tx.package?.name) || 
            'Unknown Package',
          customer_info: tx.metadata?.customer_info,
          gateway_response: tx.gateway_response,
          full_metadata: tx.metadata
        }
      } else {
        return {
          ...baseData,
          billing_period: 'monthly',
          package_name: (Array.isArray(tx.package) ? tx.package[0]?.name : tx.package?.name) || 'Unknown Package'
        }
      }
    })
    .filter((tx): tx is NonNullable<typeof tx> => tx !== null)

  const totalPages = Math.ceil((count || 0) / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return formatSuccess({
    transactions: transformedTransactions,
    summary,
    pagination: {
      current_page: page,
      total_pages: totalPages,
      total_items: count || 0,
      items_per_page: limit,
      has_next: hasNext,
      has_prev: hasPrev
    }
  })
})

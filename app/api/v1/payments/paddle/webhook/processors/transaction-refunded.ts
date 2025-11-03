/**
 * Paddle Webhook Processor: transaction.refunded
 * Handles refund events for transactions
 * 
 * Architecture: 3-Table Pattern
 * 1. Update main transaction table (indb_payment_transactions) status to 'refunded'
 * 2. Update Paddle-specific table (indb_paddle_transactions) with refund details
 * 3. History table auto-logs status change via database trigger
 * 
 * Business Impact:
 * - Updates transaction status to reflect refund
 * - For full refunds: immediately revokes subscription access
 * - Logs refund for audit trail and financial reconciliation
 */

import { supabaseAdmin } from '@/lib/database'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export async function processTransactionRefunded(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid transaction data received')
  }

  const transaction_id = data.id
  const subscription_id = data.subscription_id
  const refund_amount = data.adjustment?.total || '0'
  const refund_reason = data.adjustment?.reason || 'unknown'

  if (!transaction_id) {
    throw new Error('Missing transaction_id in refund event')
  }

  const refundedAt = new Date().toISOString()

  const { data: existingTransaction, error: fetchTransactionError } = await supabaseAdmin
    .from('indb_paddle_transactions')
    .select('metadata')
    .eq('paddle_transaction_id', transaction_id)
    .maybeSingle()

  if (fetchTransactionError) {
    throw new Error(`Failed to fetch transaction: ${fetchTransactionError.message}`)
  }

  const updatedMetadata = {
    ...(existingTransaction?.metadata || {}),
    refund_details: {
      refund_amount,
      refund_reason,
      refunded_at: refundedAt,
    },
  }

  const { error: updateMainError } = await supabaseAdmin
    .from('indb_payment_transactions')
    .update({
      transaction_status: 'refunded',
      notes: `Refund: ${refund_reason}`,
      updated_at: refundedAt
    })
    .eq('gateway_transaction_id', transaction_id)

  if (updateMainError) {
    throw new Error(`Failed to update main transaction refund status: ${updateMainError.message}`)
  }

  const { error: updateError } = await supabaseAdmin
    .from('indb_paddle_transactions')
    .update({
      status: 'refunded',
      refund_amount: parseFloat(refund_amount) / 100,
      refund_reason: refund_reason,
      refunded_at: refundedAt,
      metadata: updatedMetadata,
      updated_at: refundedAt,
    })
    .eq('paddle_transaction_id', transaction_id)

  if (updateError) {
    throw new Error(`Failed to update Paddle transaction refund status: ${updateError.message}`)
  }

  if (subscription_id) {
    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from('indb_paddle_transactions')
      .select('user_id, amount')
      .eq('paddle_transaction_id', transaction_id)
      .maybeSingle()

    if (fetchError) {
      throw new Error(`Failed to fetch transaction: ${fetchError.message}`)
    }

    if (transaction) {
      const refundAmountNum = parseFloat(refund_amount) / 100
      const isFullRefund = refundAmountNum >= transaction.amount

      if (isFullRefund) {
        const { error: subscriptionError } = await supabaseAdmin
          .from('indb_payment_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: refundedAt,
            updated_at: refundedAt,
          })
          .eq('paddle_subscription_id', subscription_id)

        if (subscriptionError) {
          throw new Error(`Failed to cancel subscription after refund: ${subscriptionError.message}`)
        }

        const { error: profileError } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .update({
            subscription_active: false,
            package_id: null,
          })
          .eq('user_id', transaction.user_id)

        if (profileError) {
          throw new Error(`Failed to revoke user access after refund: ${profileError.message}`)
        }
      }

      await ErrorHandlingService.createError(
        ErrorType.BUSINESS_LOGIC,
        `Refund processed for transaction ${transaction_id}`,
        {
          severity: ErrorSeverity.LOW,
          metadata: {
            transaction_id,
            refund_amount: refundAmountNum,
            refund_reason,
            is_full_refund: isFullRefund,
            user_id: transaction.user_id,
          },
        }
      )
    }
  }
}

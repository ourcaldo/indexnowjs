/**
 * Paddle Webhook Processor: transaction.payment_failed
 * Handles failed payment transaction events
 */

import { supabaseAdmin } from '@/lib/database'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export async function processTransactionPaymentFailed(data: any) {
  const {
    id: transaction_id,
    customer_id,
    subscription_id,
    items,
    details,
    custom_data,
  } = data

  const userId = custom_data?.userId

  if (!userId) {
    throw new Error('User ID not found in failed transaction custom data')
  }

  let dbSubscriptionId = null
  if (subscription_id) {
    const { data: subscriptionData } = await supabaseAdmin
      .from('indb_subscriptions')
      .select('id')
      .eq('paddle_subscription_id', subscription_id)
      .single()

    dbSubscriptionId = subscriptionData?.id || null
  }

  const amount = details.totals.total
  const currency = details.totals.currency_code

  const { error } = await supabaseAdmin
    .from('indb_paddle_transactions')
    .insert({
      user_id: userId,
      subscription_id: dbSubscriptionId,
      paddle_transaction_id: transaction_id,
      amount: parseFloat(amount) / 100,
      currency: currency,
      status: 'failed',
      payment_method: 'unknown',
      metadata: { custom_data, items, failure_reason: 'payment_failed' },
    })

  if (error) {
    throw new Error(`Failed to log failed transaction: ${error.message}`)
  }

  await ErrorHandlingService.createError(
    ErrorType.EXTERNAL_API,
    `Payment failed for transaction ${transaction_id}`,
    {
      severity: ErrorSeverity.MEDIUM,
      statusCode: 400,
      metadata: {
        transaction_id,
        user_id: userId,
        subscription_id,
        amount: parseFloat(amount) / 100,
        currency,
      },
    }
  )
}

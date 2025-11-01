/**
 * Paddle Webhook Processor: transaction.completed
 * Handles completed transaction events
 */

import { supabaseAdmin } from '@/lib/database'

export async function processTransactionCompleted(data: any) {
  const {
    id: transaction_id,
    customer_id,
    subscription_id,
    items,
    details,
    payments,
    custom_data,
  } = data

  const userId = custom_data?.userId

  if (!userId) {
    throw new Error('User ID not found in transaction custom data')
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
  const paymentMethod = payments[0]?.method_details?.type || 'unknown'

  const { error } = await supabaseAdmin
    .from('indb_paddle_transactions')
    .insert({
      user_id: userId,
      subscription_id: dbSubscriptionId,
      paddle_transaction_id: transaction_id,
      amount: parseFloat(amount) / 100,
      currency: currency,
      status: 'completed',
      payment_method: paymentMethod,
      receipt_url: details.receipt_url || null,
      invoice_number: details.invoice_number || null,
      metadata: { custom_data, items },
    })

  if (error) {
    throw new Error(`Failed to log transaction: ${error.message}`)
  }
}

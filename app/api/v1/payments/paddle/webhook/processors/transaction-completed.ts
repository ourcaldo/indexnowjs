/**
 * Paddle Webhook Processor: transaction.completed
 * Handles completed transaction events
 */

import { supabaseAdmin } from '@/lib/database'
import { validateCustomData, safeGet } from './utils'

export async function processTransactionCompleted(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid transaction data received')
  }

  const transaction_id = data.id
  const customer_id = data.customer_id
  const subscription_id = data.subscription_id
  const items = data.items
  const details = data.details
  const payments = data.payments
  const custom_data = data.custom_data

  if (!transaction_id) {
    throw new Error('Missing transaction_id in completed transaction event')
  }

  const validatedData = validateCustomData(custom_data, transaction_id)
  if (!validatedData || !validatedData.userId) {
    throw new Error('Invalid or missing custom_data with userId')
  }

  const userId = validatedData.userId

  let dbSubscriptionId = null
  if (subscription_id) {
    const { data: subscriptionData } = await supabaseAdmin
      .from('indb_subscriptions')
      .select('id')
      .eq('paddle_subscription_id', subscription_id)
      .maybeSingle()

    dbSubscriptionId = subscriptionData?.id || null
  }

  if (!details?.totals) {
    throw new Error('Missing details.totals in transaction data')
  }

  const amount = details.totals.total
  const currency = details.totals.currency_code

  if (!amount || !currency) {
    throw new Error('Missing amount or currency in transaction totals')
  }

  const paymentMethod = Array.isArray(payments) && payments.length > 0
    ? safeGet(payments[0], 'method_details.type', 'unknown')
    : 'unknown'

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

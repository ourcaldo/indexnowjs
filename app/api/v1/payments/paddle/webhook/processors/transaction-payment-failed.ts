/**
 * Paddle Webhook Processor: transaction.payment_failed
 * Handles failed payment transaction events
 * 
 * Architecture: 3-Table Pattern
 * 1. Insert into main transaction table (indb_payment_transactions) with 'failed' status
 * 2. Insert into Paddle-specific table (indb_paddle_transactions) with failure details
 * 3. History table auto-populated via database trigger
 */

import { supabaseAdmin } from '@/lib/database'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import { validateCustomData, getPackageIdFromSubscription, getBillingPeriod, PADDLE_GATEWAY_ID } from './utils'

export async function processTransactionPaymentFailed(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid transaction data received')
  }

  const transaction_id = data.id
  const customer_id = data.customer_id
  const subscription_id = data.subscription_id
  const items = data.items
  const details = data.details
  const custom_data = data.custom_data

  if (!transaction_id) {
    throw new Error('Missing transaction_id in failed transaction event')
  }

  const validatedData = validateCustomData(custom_data, transaction_id)
  if (!validatedData || !validatedData.userId) {
    throw new Error('Invalid or missing custom_data with userId')
  }

  const userId = validatedData.userId

  let dbSubscriptionId = null
  if (subscription_id) {
    const { data: subscriptionData } = await supabaseAdmin
      .from('indb_payment_subscriptions')
      .select('id')
      .eq('paddle_subscription_id', subscription_id)
      .maybeSingle()

    dbSubscriptionId = subscriptionData?.id || null
  }

  if (!details?.totals) {
    throw new Error('Missing details.totals in failed transaction data')
  }

  const amount = details.totals.total
  const currency = details.totals.currency_code

  if (!amount || !currency) {
    throw new Error('Missing amount or currency in failed transaction totals')
  }

  const packageId = await getPackageIdFromSubscription(subscription_id, custom_data)
  const billingPeriod = getBillingPeriod(items)

  const { data: mainTransaction, error: mainError } = await supabaseAdmin
    .from('indb_payment_transactions')
    .insert({
      user_id: userId,
      subscription_id: dbSubscriptionId,
      package_id: packageId,
      gateway_id: PADDLE_GATEWAY_ID,
      transaction_type: subscription_id ? 'subscription' : 'one_time',
      transaction_status: 'failed',
      amount: parseFloat(amount) / 100,
      currency: currency,
      payment_method: 'unknown',
      gateway_transaction_id: transaction_id,
      gateway_response: data,
      notes: 'Payment failed',
      billing_period: billingPeriod,
      metadata: { custom_data, items, failure_reason: 'payment_failed' }
    })
    .select()
    .single()

  if (mainError) {
    throw new Error(`Failed to insert main transaction: ${mainError.message}`)
  }

  const { error: paddleError } = await supabaseAdmin
    .from('indb_paddle_transactions')
    .insert({
      transaction_id: mainTransaction.id,
      user_id: userId,
      subscription_id: dbSubscriptionId,
      paddle_transaction_id: transaction_id,
      amount: parseFloat(amount) / 100,
      currency: currency,
      status: 'failed',
      payment_method: 'unknown',
      metadata: { custom_data, items, failure_reason: 'payment_failed' },
    })

  if (paddleError) {
    throw new Error(`Failed to insert Paddle transaction: ${paddleError.message}`)
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

/**
 * Paddle Webhook Processor: subscription.updated
 * Handles subscription update events (plan changes, status changes)
 */

import { supabaseAdmin } from '@/lib/database'
import { safeGet } from './utils'

export async function processSubscriptionUpdated(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid subscription data received')
  }

  const subscription_id = data.id
  if (!subscription_id) {
    throw new Error('Missing subscription_id in update event')
  }

  const status = data.status || 'unknown'
  const items = data.items
  const current_billing_period = data.current_billing_period
  const paused_at = data.paused_at

  const priceId = Array.isArray(items) && items.length > 0 
    ? safeGet(items[0], 'price.id', null) 
    : null

  if (!current_billing_period?.starts_at || !current_billing_period?.ends_at) {
    throw new Error('Missing required billing period dates in subscription update')
  }

  const { error: subscriptionError } = await supabaseAdmin
    .from('indb_payment_subscriptions')
    .update({
      status: status,
      paddle_price_id: priceId,
      current_period_start: current_billing_period.starts_at,
      current_period_end: current_billing_period.ends_at,
      paused_at: paused_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)

  if (subscriptionError) {
    throw new Error(`Failed to update subscription: ${subscriptionError.message}`)
  }

  const { data: subscription, error: fetchError } = await supabaseAdmin
    .from('indb_payment_subscriptions')
    .select('user_id, id')
    .eq('paddle_subscription_id', subscription_id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(`Failed to fetch subscription: ${fetchError.message}`)
  }

  if (subscription) {
    const { error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        subscription_active: status === 'active',
        expires_at: current_billing_period?.ends_at || null,
      })
      .eq('user_id', subscription.user_id)

    if (profileError) {
      throw new Error(`Failed to update user profile: ${profileError.message}`)
    }
  }
}

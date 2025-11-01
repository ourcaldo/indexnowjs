/**
 * Paddle Webhook Processor: subscription.updated
 * Handles subscription update events (plan changes, status changes)
 */

import { supabaseAdmin } from '@/lib/database'

export async function processSubscriptionUpdated(data: any) {
  const { id: subscription_id, status, items, current_billing_period, paused_at } = data

  const { error: subscriptionError } = await supabaseAdmin
    .from('indb_subscriptions')
    .update({
      status: status,
      paddle_price_id: items[0]?.price?.id || null,
      current_period_start: current_billing_period?.starts_at,
      current_period_end: current_billing_period?.ends_at,
      paused_at: paused_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)

  if (subscriptionError) {
    throw new Error(`Failed to update subscription: ${subscriptionError.message}`)
  }

  const { data: subscription } = await supabaseAdmin
    .from('indb_subscriptions')
    .select('user_id, id')
    .eq('paddle_subscription_id', subscription_id)
    .single()

  if (subscription) {
    const { error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        subscription_active: status === 'active',
        expires_at: current_billing_period?.ends_at,
      })
      .eq('user_id', subscription.user_id)

    if (profileError) {
      throw new Error(`Failed to update user profile: ${profileError.message}`)
    }
  }
}

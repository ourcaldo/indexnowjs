/**
 * Paddle Webhook Processor: subscription.canceled
 * Handles subscription cancellation events
 */

import { supabaseAdmin } from '@/lib/database'

export async function processSubscriptionCanceled(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid subscription data received')
  }

  const subscription_id = data.id
  const canceled_at = data.canceled_at
  const current_billing_period = data.current_billing_period
  const scheduled_change = data.scheduled_change

  if (!subscription_id) {
    throw new Error('Missing subscription_id in cancel event')
  }

  const cancelAtPeriodEnd = scheduled_change?.action === 'cancel'

  const { error: subscriptionError } = await supabaseAdmin
    .from('indb_subscriptions')
    .update({
      status: cancelAtPeriodEnd ? 'active' : 'canceled',
      canceled_at: canceled_at || new Date().toISOString(),
      cancel_at_period_end: cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)

  if (subscriptionError) {
    throw new Error(`Failed to update subscription cancellation: ${subscriptionError.message}`)
  }

  const { data: subscription, error: fetchError } = await supabaseAdmin
    .from('indb_subscriptions')
    .select('user_id')
    .eq('paddle_subscription_id', subscription_id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(`Failed to fetch subscription: ${fetchError.message}`)
  }

  if (subscription) {
    const { error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        subscription_active: cancelAtPeriodEnd ? true : false,
        expires_at: current_billing_period?.ends_at || null,
      })
      .eq('user_id', subscription.user_id)

    if (profileError) {
      throw new Error(`Failed to update user profile on cancellation: ${profileError.message}`)
    }
  }
}

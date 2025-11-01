/**
 * Paddle Webhook Processor: subscription.canceled
 * Handles subscription cancellation events
 */

import { supabaseAdmin } from '@/lib/database'

export async function processSubscriptionCanceled(data: any) {
  const { id: subscription_id, canceled_at, current_billing_period, scheduled_change } = data

  const cancelAtPeriodEnd = scheduled_change?.action === 'cancel'

  const { error: subscriptionError } = await supabaseAdmin
    .from('indb_subscriptions')
    .update({
      status: cancelAtPeriodEnd ? 'active' : 'canceled',
      canceled_at: canceled_at,
      cancel_at_period_end: cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)

  if (subscriptionError) {
    throw new Error(`Failed to update subscription cancellation: ${subscriptionError.message}`)
  }

  const { data: subscription } = await supabaseAdmin
    .from('indb_subscriptions')
    .select('user_id')
    .eq('paddle_subscription_id', subscription_id)
    .single()

  if (subscription) {
    const { error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        subscription_active: cancelAtPeriodEnd ? true : false,
        expires_at: current_billing_period?.ends_at,
      })
      .eq('user_id', subscription.user_id)

    if (profileError) {
      throw new Error(`Failed to update user profile on cancellation: ${profileError.message}`)
    }
  }
}

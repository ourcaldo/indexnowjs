/**
 * Paddle Webhook Processor: subscription.paused
 * Handles subscription pause events
 */

import { supabaseAdmin } from '@/lib/database'

export async function processSubscriptionPaused(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid subscription data received')
  }

  const subscription_id = data.id
  const paused_at = data.paused_at

  if (!subscription_id) {
    throw new Error('Missing subscription_id in pause event')
  }

  const { error: subscriptionError } = await supabaseAdmin
    .from('indb_payment_subscriptions')
    .update({
      status: 'paused',
      paused_at: paused_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)

  if (subscriptionError) {
    throw new Error(`Failed to update subscription pause: ${subscriptionError.message}`)
  }

  const { data: subscription, error: fetchError } = await supabaseAdmin
    .from('indb_payment_subscriptions')
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
        subscription_active: false,
      })
      .eq('user_id', subscription.user_id)

    if (profileError) {
      throw new Error(`Failed to update user profile on pause: ${profileError.message}`)
    }
  }
}

/**
 * Paddle Webhook Processor: subscription.paused
 * Handles subscription pause events
 */

import { supabaseAdmin } from '@/lib/database'

export async function processSubscriptionPaused(data: any) {
  const { id: subscription_id, paused_at } = data

  const { error: subscriptionError } = await supabaseAdmin
    .from('indb_subscriptions')
    .update({
      status: 'paused',
      paused_at: paused_at,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)

  if (subscriptionError) {
    throw new Error(`Failed to update subscription pause: ${subscriptionError.message}`)
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
        subscription_active: false,
      })
      .eq('user_id', subscription.user_id)

    if (profileError) {
      throw new Error(`Failed to update user profile on pause: ${profileError.message}`)
    }
  }
}

/**
 * Paddle Webhook Processor: subscription.resumed
 * Handles subscription resume events
 */

import { supabaseAdmin } from '@/lib/database'

export async function processSubscriptionResumed(data: any) {
  const { id: subscription_id, current_billing_period } = data

  const { error: subscriptionError } = await supabaseAdmin
    .from('indb_subscriptions')
    .update({
      status: 'active',
      paused_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)

  if (subscriptionError) {
    throw new Error(`Failed to update subscription resume: ${subscriptionError.message}`)
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
        subscription_active: true,
        expires_at: current_billing_period?.ends_at,
      })
      .eq('user_id', subscription.user_id)

    if (profileError) {
      throw new Error(`Failed to update user profile on resume: ${profileError.message}`)
    }
  }
}

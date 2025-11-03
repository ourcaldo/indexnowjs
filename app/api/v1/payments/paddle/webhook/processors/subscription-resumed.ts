/**
 * Paddle Webhook Processor: subscription.resumed
 * Handles subscription resume events
 */

import { supabaseAdmin } from '@/lib/database'

export async function processSubscriptionResumed(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid subscription data received')
  }

  const subscription_id = data.id
  const current_billing_period = data.current_billing_period

  if (!subscription_id) {
    throw new Error('Missing subscription_id in resume event')
  }

  const { error: subscriptionError } = await supabaseAdmin
    .from('indb_payment_subscriptions')
    .update({
      status: 'active',
      paused_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)

  if (subscriptionError) {
    throw new Error(`Failed to update subscription resume: ${subscriptionError.message}`)
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
        subscription_active: true,
        expires_at: current_billing_period?.ends_at || null,
      })
      .eq('user_id', subscription.user_id)

    if (profileError) {
      throw new Error(`Failed to update user profile on resume: ${profileError.message}`)
    }
  }
}

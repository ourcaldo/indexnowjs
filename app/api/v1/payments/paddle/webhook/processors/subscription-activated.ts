/**
 * Paddle Webhook Processor: subscription.activated
 * Handles subscription activation events
 * 
 * Fires when:
 * - Trial period ends and subscription becomes active
 * - Payment retry succeeds after past_due status
 * - Paused subscription reactivates
 * 
 * Business Impact:
 * - Restores user access after successful payment recovery
 * - Handles trial-to-paid transitions
 */

import { supabaseAdmin } from '@/lib/database'

export async function processSubscriptionActivated(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid subscription data received')
  }

  const subscription_id = data.id
  const current_billing_period = data.current_billing_period

  if (!subscription_id) {
    throw new Error('Missing subscription_id in activated event')
  }

  if (!current_billing_period?.starts_at || !current_billing_period?.ends_at) {
    throw new Error('Missing required billing period dates in subscription activation')
  }

  const { error: subscriptionError } = await supabaseAdmin
    .from('indb_payment_subscriptions')
    .update({
      status: 'active',
      current_period_start: current_billing_period.starts_at,
      current_period_end: current_billing_period.ends_at,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)

  if (subscriptionError) {
    throw new Error(`Failed to activate subscription: ${subscriptionError.message}`)
  }

  const { data: subscription, error: fetchError } = await supabaseAdmin
    .from('indb_payment_subscriptions')
    .select('user_id, plan_id')
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
      throw new Error(`Failed to enable user access: ${profileError.message}`)
    }
  }
}

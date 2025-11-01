/**
 * Paddle Webhook Processor: subscription.created
 * Handles new subscription creation events
 */

import { supabaseAdmin } from '@/lib/database'

export async function processSubscriptionCreated(data: any) {
  const { id: subscription_id, customer_id, items, custom_data, current_billing_period } = data

  const userId = custom_data?.userId
  const packageSlug = custom_data?.packageSlug
  const billingPeriod = custom_data?.billingPeriod || 'monthly'

  if (!userId) {
    throw new Error('User ID not found in subscription custom data')
  }

  const { data: packageData, error: packageError } = await supabaseAdmin
    .from('indb_payment_packages')
    .select('*')
    .eq('slug', packageSlug)
    .single()

  if (packageError) {
    throw new Error(`Failed to fetch package data: ${packageError.message}`)
  }

  const { data: subscription, error: subscriptionError } = await supabaseAdmin
    .from('indb_subscriptions')
    .insert({
      user_id: userId,
      paddle_subscription_id: subscription_id,
      paddle_customer_id: customer_id,
      status: 'active',
      plan_id: `${packageSlug}_${billingPeriod}`,
      paddle_price_id: items[0].price.id,
      current_period_start: current_billing_period.starts_at,
      current_period_end: current_billing_period.ends_at,
      metadata: { custom_data },
    })
    .select()
    .single()

  if (subscriptionError) {
    throw new Error(`Failed to create subscription record: ${subscriptionError.message}`)
  }

  const { error: profileError } = await supabaseAdmin
    .from('indb_auth_user_profiles')
    .update({
      package_id: packageData.id,
      subscribed_at: new Date().toISOString(),
      expires_at: current_billing_period.ends_at,
      subscription_tier: packageSlug,
      subscription_active: true,
      subscription_id: subscription.id,
    })
    .eq('user_id', userId)

  if (profileError) {
    throw new Error(`Failed to update user profile: ${profileError.message}`)
  }
}

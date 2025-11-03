/**
 * Paddle Webhook Processor: subscription.created
 * Handles new subscription creation events
 */

import { supabaseAdmin } from '@/lib/database'
import { validateCustomData, safeGet } from './utils'

export async function processSubscriptionCreated(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid subscription data received')
  }

  const subscription_id = data.id
  const customer_id = data.customer_id
  const items = data.items
  const custom_data = data.custom_data
  const current_billing_period = data.current_billing_period

  if (!subscription_id || !customer_id) {
    throw new Error('Missing required fields: subscription_id or customer_id')
  }

  const validatedData = validateCustomData(custom_data, subscription_id)
  if (!validatedData || !validatedData.userId) {
    throw new Error('Invalid or missing custom_data with userId')
  }

  const userId = validatedData.userId
  const packageSlug = validatedData.packageSlug
  const billingPeriod = validatedData.billingPeriod || 'monthly'

  if (!packageSlug) {
    throw new Error('Missing packageSlug in custom_data')
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Missing or invalid items array in subscription')
  }

  const priceId = safeGet(items[0], 'price.id', null)
  if (!priceId) {
    throw new Error('Missing price ID in subscription items')
  }

  if (!current_billing_period?.starts_at || !current_billing_period?.ends_at) {
    throw new Error('Missing or invalid current_billing_period')
  }

  const { data: packageData, error: packageError } = await supabaseAdmin
    .from('indb_payment_packages')
    .select('*')
    .eq('slug', packageSlug)
    .single()

  if (packageError || !packageData) {
    throw new Error(`Failed to fetch package data for ${packageSlug}: ${packageError?.message || 'not found'}`)
  }

  const { data: subscription, error: subscriptionError } = await supabaseAdmin
    .from('indb_payment_subscriptions')
    .insert({
      user_id: userId,
      paddle_subscription_id: subscription_id,
      paddle_customer_id: customer_id,
      status: 'active',
      plan_id: `${packageSlug}_${billingPeriod}`,
      package_id: packageData.id,
      paddle_price_id: priceId,
      current_period_start: current_billing_period.starts_at,
      current_period_end: current_billing_period.ends_at,
      metadata: { custom_data },
    })
    .select()
    .single()

  if (subscriptionError || !subscription) {
    throw new Error(`Failed to create subscription record: ${subscriptionError?.message || 'unknown error'}`)
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

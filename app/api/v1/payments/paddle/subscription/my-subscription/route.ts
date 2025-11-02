/**
 * Get User's Paddle Subscription API
 * Returns the user's current Paddle subscription details
 */

import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess } from '@/lib/core/api-response-middleware'
import { supabaseAdmin } from '@/lib/database'

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const { data: subscription, error } = await supabaseAdmin
    .from('indb_subscriptions')
    .select('*')
    .eq('user_id', auth.userId)
    .in('status', ['active', 'past_due', 'paused'])
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch subscription: ${error.message}`)
  }

  if (!subscription) {
    return formatSuccess({
      subscription: null,
      hasSubscription: false,
    })
  }

  return formatSuccess({
    subscription: {
      id: subscription.id,
      paddle_subscription_id: subscription.paddle_subscription_id,
      paddle_customer_id: subscription.paddle_customer_id,
      status: subscription.status,
      plan_id: subscription.plan_id,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at,
      paused_at: subscription.paused_at,
      created_at: subscription.created_at,
    },
    hasSubscription: true,
  })
})

/**
 * Get User's Subscription API
 * Returns the user's current subscription details (both Paddle and legacy)
 */

import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess } from '@/lib/core/api-response-middleware'
import { supabaseAdmin } from '@/lib/database'

type SubscriptionData = {
  id: any
  paddle_subscription_id: string | null
  paddle_customer_id: string | null
  status: string
  plan_id: any
  current_period_start: any
  current_period_end: any
  cancel_at_period_end: boolean
  canceled_at: any
  paused_at: any
  created_at: any
  subscription_type: 'paddle' | 'legacy'
}

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  // First, check for Paddle subscription
  const { data: paddleSubscription, error: paddleError } = await supabaseAdmin
    .from('indb_payment_subscriptions')
    .select('*')
    .eq('user_id', auth.userId)
    .in('status', ['active', 'past_due', 'paused'])
    .maybeSingle()

  if (paddleError) {
    throw new Error(`Failed to fetch Paddle subscription: ${paddleError.message}`)
  }

  if (paddleSubscription) {
    return formatSuccess({
      subscription: {
        id: paddleSubscription.id,
        paddle_subscription_id: paddleSubscription.paddle_subscription_id,
        paddle_customer_id: paddleSubscription.paddle_customer_id,
        status: paddleSubscription.status,
        plan_id: paddleSubscription.plan_id,
        current_period_start: paddleSubscription.current_period_start,
        current_period_end: paddleSubscription.current_period_end,
        cancel_at_period_end: paddleSubscription.cancel_at_period_end,
        canceled_at: paddleSubscription.canceled_at,
        paused_at: paddleSubscription.paused_at,
        created_at: paddleSubscription.created_at,
        subscription_type: 'paddle' as const,
      } as SubscriptionData,
      hasSubscription: true,
    })
  }

  // If no Paddle subscription, check for legacy subscription
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('indb_auth_user_profiles')
    .select('package_id, subscribed_at, expires_at')
    .eq('user_id', auth.userId)
    .single()

  if (profileError) {
    throw new Error(`Failed to fetch user profile: ${profileError.message}`)
  }

  // Check if user has an active legacy subscription
  if (userProfile?.package_id && userProfile?.expires_at) {
    const expiresAt = new Date(userProfile.expires_at)
    const now = new Date()
    const isActive = expiresAt > now

    if (isActive) {
      return formatSuccess({
        subscription: {
          id: userProfile.package_id,
          paddle_subscription_id: null,
          paddle_customer_id: null,
          status: 'active',
          plan_id: userProfile.package_id,
          current_period_start: userProfile.subscribed_at,
          current_period_end: userProfile.expires_at,
          cancel_at_period_end: false,
          canceled_at: null,
          paused_at: null,
          created_at: userProfile.subscribed_at,
          subscription_type: 'legacy' as const,
        } as SubscriptionData,
        hasSubscription: true,
      })
    }
  }

  // No subscription found
  return formatSuccess({
    subscription: null as SubscriptionData | null,
    hasSubscription: false,
  })
})

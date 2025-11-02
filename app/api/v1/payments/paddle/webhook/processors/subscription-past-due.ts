/**
 * Paddle Webhook Processor: subscription.past_due
 * Handles subscription past_due events (payment failure)
 * 
 * Business Impact:
 * - Prevents users from accessing premium features when payment fails
 * - Triggers error logging for admin monitoring
 * - Keeps subscription record for potential recovery when payment succeeds
 */

import { supabaseAdmin } from '@/lib/database'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export async function processSubscriptionPastDue(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid subscription data received')
  }

  const subscription_id = data.id
  const current_billing_period = data.current_billing_period

  if (!subscription_id) {
    throw new Error('Missing subscription_id in past_due event')
  }

  const { error: subscriptionError } = await supabaseAdmin
    .from('indb_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)

  if (subscriptionError) {
    throw new Error(`Failed to update subscription to past_due: ${subscriptionError.message}`)
  }

  const { data: subscription, error: fetchError } = await supabaseAdmin
    .from('indb_subscriptions')
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
        subscription_active: false,
      })
      .eq('user_id', subscription.user_id)

    if (profileError) {
      throw new Error(`Failed to disable user access: ${profileError.message}`)
    }

    await ErrorHandlingService.createError(
      ErrorType.EXTERNAL_API,
      `Payment failed for subscription ${subscription_id}`,
      {
        severity: ErrorSeverity.HIGH,
        metadata: {
          subscription_id,
          user_id: subscription.user_id,
          plan_id: subscription.plan_id,
          next_billing_period: current_billing_period,
        },
      }
    )
  }
}

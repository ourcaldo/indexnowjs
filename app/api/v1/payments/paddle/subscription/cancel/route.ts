/**
 * Paddle Subscription Cancellation API
 * Allows authenticated users to cancel their subscription
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { PaddleSubscriptionService } from '@/lib/services/payments/paddle'
import { supabaseAdmin } from '@/lib/database'

const cancelRequestSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  effectiveFrom: z.enum(['immediately', 'next_billing_period']).optional().default('next_billing_period'),
})

export const POST = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const body = await request.json()
  
  const validationResult = cancelRequestSchema.safeParse(body)
  if (!validationResult.success) {
    return formatError(validationResult.error.errors[0].message, 400)
  }

  const { subscriptionId, effectiveFrom } = validationResult.data

  const { data: subscription, error: fetchError } = await supabaseAdmin
    .from('indb_subscriptions')
    .select('user_id, paddle_subscription_id')
    .eq('paddle_subscription_id', subscriptionId)
    .single()

  if (fetchError || !subscription) {
    return formatError('Subscription not found', 404)
  }

  if (subscription.user_id !== auth.userId) {
    return formatError('You do not have permission to cancel this subscription', 403)
  }

  const result = await PaddleSubscriptionService.cancelSubscription(
    subscriptionId,
    effectiveFrom
  )

  return formatSuccess({
    subscription: result,
    message: effectiveFrom === 'immediately' 
      ? 'Subscription cancelled immediately' 
      : 'Subscription will be cancelled at the end of billing period',
  })
})

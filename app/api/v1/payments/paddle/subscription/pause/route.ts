/**
 * Paddle Subscription Pause API
 * Allows authenticated users to pause their subscription
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { PaddleSubscriptionService } from '@/lib/services/payments/paddle'
import { supabaseAdmin } from '@/lib/database'

const pauseRequestSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  effectiveFrom: z.string().optional(),
})

export const POST = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const body = await request.json()
  
  const validationResult = pauseRequestSchema.safeParse(body)
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
    return formatError('You do not have permission to pause this subscription', 403)
  }

  const options = effectiveFrom ? { effectiveFrom } : undefined

  const result = await PaddleSubscriptionService.pauseSubscription(
    subscriptionId,
    options
  )

  return formatSuccess({
    subscription: result,
    message: 'Subscription paused successfully',
  })
})

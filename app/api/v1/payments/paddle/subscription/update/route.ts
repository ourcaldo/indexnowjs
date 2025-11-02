/**
 * Paddle Subscription Update API
 * Allows authenticated users to update their subscription (e.g., change plan)
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { PaddleSubscriptionService } from '@/lib/services/payments/paddle'
import { supabaseAdmin } from '@/lib/database'

const updateRequestSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  newPriceId: z.string().min(1, 'New price ID is required'),
})

export const POST = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const body = await request.json()
  
  const validationResult = updateRequestSchema.safeParse(body)
  if (!validationResult.success) {
    return formatError(validationResult.error.errors[0].message, 400)
  }

  const { subscriptionId, newPriceId } = validationResult.data

  const { data: subscription, error: fetchError } = await supabaseAdmin
    .from('indb_subscriptions')
    .select('user_id, paddle_subscription_id')
    .eq('paddle_subscription_id', subscriptionId)
    .single()

  if (fetchError || !subscription) {
    return formatError('Subscription not found', 404)
  }

  if (subscription.user_id !== auth.userId) {
    return formatError('You do not have permission to update this subscription', 403)
  }

  const result = await PaddleSubscriptionService.updateSubscription(
    subscriptionId,
    newPriceId
  )

  return formatSuccess({
    subscription: result,
    message: 'Subscription updated successfully',
  })
})

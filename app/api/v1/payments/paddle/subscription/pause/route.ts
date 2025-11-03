/**
 * Paddle Subscription Pause API
 * Allows authenticated users to pause their subscription
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { PaddleSubscriptionService } from '@/lib/services/payments/paddle'
import { supabaseAdmin } from '@/lib/database'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

const pauseRequestSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  effectiveFrom: z.enum(['immediately', 'next_billing_period']).optional(),
})

export const POST = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const body = await request.json()
  
  const validationResult = pauseRequestSchema.safeParse(body)
  if (!validationResult.success) {
    const error = await ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      validationResult.error.errors[0].message,
      { severity: ErrorSeverity.LOW, statusCode: 400 }
    )
    return formatError(error)
  }

  const { subscriptionId, effectiveFrom } = validationResult.data

  const { data: subscription, error: fetchError } = await supabaseAdmin
    .from('indb_payment_subscriptions')
    .select('user_id, paddle_subscription_id')
    .eq('paddle_subscription_id', subscriptionId)
    .single()

  if (fetchError || !subscription) {
    const error = await ErrorHandlingService.createError(
      ErrorType.BUSINESS_LOGIC,
      'Subscription not found',
      { severity: ErrorSeverity.LOW, statusCode: 404, userId: auth.userId }
    )
    return formatError(error)
  }

  if (subscription.user_id !== auth.userId) {
    const error = await ErrorHandlingService.createError(
      ErrorType.AUTHORIZATION,
      'You do not have permission to pause this subscription',
      { severity: ErrorSeverity.MEDIUM, statusCode: 403, userId: auth.userId }
    )
    return formatError(error)
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

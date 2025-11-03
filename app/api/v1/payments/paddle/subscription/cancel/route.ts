/**
 * Paddle Subscription Cancellation API
 * Allows authenticated users to cancel their subscription
 * 
 * Auto-applies 7-day refund policy:
 * - ≤7 days from purchase: Full refund + immediate cancellation
 * - >7 days: No refund + scheduled cancellation (access until period end)
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { PaddleCancellationService } from '@/lib/services/payments/paddle'
import { supabaseAdmin } from '@/lib/database'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

const cancelRequestSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
})

export const POST = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const body = await request.json()
  
  const validationResult = cancelRequestSchema.safeParse(body)
  if (!validationResult.success) {
    const error = await ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      validationResult.error.errors[0].message,
      { severity: ErrorSeverity.LOW, statusCode: 400 }
    )
    return formatError(error)
  }

  const { subscriptionId } = validationResult.data

  const { data: subscription, error: fetchError } = await supabaseAdmin
    .from('indb_payment_subscriptions')
    .select('user_id')
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
      'You do not have permission to cancel this subscription',
      { severity: ErrorSeverity.MEDIUM, statusCode: 403, userId: auth.userId }
    )
    return formatError(error)
  }

  const result = await PaddleCancellationService.cancelWithRefundPolicy(
    subscriptionId,
    auth.userId
  )

  return formatSuccess({
    action: result.action,
    daysActive: result.daysActive,
    refundEligible: result.refundEligible,
    subscription: result.subscription,
    refund: result.refund,
    message: result.message,
  })
})

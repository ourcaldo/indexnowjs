/**
 * Paddle Refund Window Info API
 * Returns refund eligibility information for a subscription
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { PaddleCancellationService } from '@/lib/services/payments/paddle'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

const refundWindowRequestSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
})

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const { searchParams } = new URL(request.url)
  const subscriptionId = searchParams.get('subscriptionId')

  const validationResult = refundWindowRequestSchema.safeParse({ subscriptionId })
  if (!validationResult.success) {
    const error = await ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      validationResult.error.errors[0].message,
      { severity: ErrorSeverity.LOW, statusCode: 400 }
    )
    return formatError(error)
  }

  try {
    const refundInfo = await PaddleCancellationService.getRefundWindowInfo(
      validationResult.data.subscriptionId,
      auth.userId
    )

    return formatSuccess(refundInfo)
  } catch (error) {
    const err = await ErrorHandlingService.createError(
      ErrorType.BUSINESS_LOGIC,
      error instanceof Error ? error.message : 'Failed to get refund window info',
      { severity: ErrorSeverity.LOW, statusCode: 400, userId: auth.userId }
    )
    return formatError(err)
  }
})

/**
 * Shared utilities for Paddle webhook processors
 */

import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export interface CustomData {
  userId?: string
  packageSlug?: string
  billingPeriod?: string
}

export function validateCustomData(customData: any, eventId: string): CustomData | null {
  if (!customData || typeof customData !== 'object') {
    ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      `Missing or invalid custom_data in webhook event ${eventId}`,
      {
        severity: ErrorSeverity.MEDIUM,
        metadata: { event_id: eventId, custom_data: customData },
      }
    )
    return null
  }

  if (!customData.userId) {
    ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      `Missing userId in custom_data for webhook event ${eventId}`,
      {
        severity: ErrorSeverity.MEDIUM,
        metadata: { event_id: eventId, custom_data: customData },
      }
    )
    return null
  }

  return customData as CustomData
}

export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current == null || typeof current !== 'object' || !(key in current)) {
      return defaultValue
    }
    current = current[key]
  }

  return current !== undefined && current !== null ? current : defaultValue
}

export async function logProcessorError(
  eventId: string,
  eventType: string,
  error: Error,
  metadata?: Record<string, any>
) {
  await ErrorHandlingService.createError(
    ErrorType.EXTERNAL_API,
    `Paddle webhook processor error for ${eventType}`,
    {
      severity: ErrorSeverity.HIGH,
      metadata: {
        event_id: eventId,
        event_type: eventType,
        error_message: error.message,
        error_stack: error.stack,
        ...metadata,
      },
    }
  )
}

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

const updateUserSettingsSchema = z.object({
  timeout_duration: z.number().optional(),
  retry_attempts: z.number().optional(),
  email_job_completion: z.boolean().optional(),
  email_job_failure: z.boolean().optional(),
  email_quota_alerts: z.boolean().optional(),
  default_schedule: z.string().optional(),
  email_daily_report: z.boolean().optional()
})

export const GET = authenticatedApiWrapper(async (request, auth) => {
  try {
    const settings = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_user_settings',
        source: 'auth/user/settings',
        reason: 'User retrieving their own settings for display',
        metadata: { endpoint: '/api/v1/auth/user/settings', method: 'GET' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_auth_user_settings', operationType: 'select' },
      async (db) => {
        const { data: settings, error: settingsError } = await db
          .from('indb_auth_user_settings')
          .select('*')
          .eq('user_id', auth.userId)
          .single()

        if (settingsError) {
          if (settingsError.code === 'PGRST116') {
            const { data: newSettings, error: createError } = await db
              .from('indb_auth_user_settings')
              .insert({
                user_id: auth.userId,
                timeout_duration: 30000,
                retry_attempts: 3,
                email_job_completion: true,
                email_job_failure: true,
                email_quota_alerts: true,
                default_schedule: 'one-time',
                email_daily_report: true,
              })
              .select()
              .single()

            if (createError) throw new Error('Failed to create default settings')
            return newSettings
          }
          throw new Error('Failed to fetch settings')
        }
        return settings
      }
    )

    return formatSuccess({ settings })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/auth/user/settings', method: 'GET', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

export const PUT = authenticatedApiWrapper(async (request, auth) => {
  try {
    const body = await request.json()
    const validation = updateUserSettingsSchema.safeParse(body)

    if (!validation.success) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        'Invalid input',
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400, metadata: { details: validation.error.errors } }
      )
      return formatError(validationError)
    }

    const settings = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'update_user_settings',
        source: 'auth/user/settings',
        reason: 'User updating their own settings',
        metadata: { endpoint: '/api/v1/auth/user/settings', method: 'PUT', updatedFields: Object.keys(validation.data) },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_auth_user_settings', operationType: 'update' },
      async (db) => {
        const { data: settings, error: updateError } = await db
          .from('indb_auth_user_settings')
          .update(validation.data)
          .eq('user_id', auth.userId)
          .select()
          .single()

        if (updateError) throw new Error('Failed to update settings')
        return settings
      }
    )

    try {
      const changedFields = Object.keys(validation.data).join(', ')
      await ActivityLogger.logProfileActivity(
        auth.userId,
        ActivityEventTypes.SETTINGS_CHANGE,
        `Updated: ${changedFields}`,
        request,
        { updated_fields: validation.data, fields_changed: Object.keys(validation.data) }
      )
    } catch (logError) {}

    return formatSuccess({ settings, message: 'Settings updated successfully' })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/auth/user/settings', method: 'PUT', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

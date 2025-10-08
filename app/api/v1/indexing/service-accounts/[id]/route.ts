import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const DELETE = authenticatedApiWrapper(async (request, auth, { params }) => {
  try {
    const { id: serviceAccountId } = await params

    // Check if service account exists and delete using SecureWrapper
    const serviceAccount = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'delete_service_account',
        source: 'indexing/service-accounts/[id]',
        reason: 'User deleting their service account',
        metadata: {
          serviceAccountId,
          endpoint: '/api/v1/indexing/service-accounts/[id]',
          method: 'DELETE'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_google_service_accounts', operationType: 'delete' },
      async (db) => {
        // Check if service account exists and belongs to user
        const { data: serviceAccount, error: fetchError } = await db
          .from('indb_google_service_accounts')
          .select('*')
          .eq('id', serviceAccountId)
          .eq('user_id', auth.userId)
          .single()

        if (fetchError || !serviceAccount) {
          const notFoundError = await ErrorHandlingService.createError(
            ErrorType.NOT_FOUND,
            'Service account not found',
            {
              severity: ErrorSeverity.LOW,
              userId: auth.userId,
              endpoint: '/api/v1/indexing/service-accounts/[id]',
              statusCode: 404,
              metadata: { serviceAccountId }
            }
          )
          throw notFoundError
        }

        // Delete service account
        const { error: deleteError } = await db
          .from('indb_google_service_accounts')
          .delete()
          .eq('id', serviceAccountId)
          .eq('user_id', auth.userId)

        if (deleteError) {
          throw new Error('Failed to delete service account')
        }

        return serviceAccount
      }
    )

    // Log service account deletion activity
    try {
      await ActivityLogger.logServiceAccountActivity(
        auth.userId,
        ActivityEventTypes.SERVICE_ACCOUNT_DELETE,
        serviceAccountId,
        `Deleted Google service account: ${serviceAccount.name} (${serviceAccount.email})`,
        request,
        {
          serviceAccountName: serviceAccount.name,
          serviceAccountEmail: serviceAccount.email,
          wasActive: serviceAccount.is_active
        }
      )
    } catch (logError) {
      // Non-critical error, log but continue
      await ErrorHandlingService.createError(
        ErrorType.SYSTEM,
        logError as Error,
        {
          severity: ErrorSeverity.LOW,
          userId: auth.userId,
          endpoint: '/api/v1/indexing/service-accounts/[id]',
          metadata: { operation: 'log_activity', serviceAccountId }
        }
      )
    }

    return formatSuccess({
      message: 'Service account deleted successfully'
    })

  } catch (error: any) {
    // Handle specific error types
    if (error.type === ErrorType.NOT_FOUND) {
      return formatError(error)
    }

    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint: '/api/v1/indexing/service-accounts/[id]',
        method: 'DELETE',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }
})

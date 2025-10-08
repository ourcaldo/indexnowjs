import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = authenticatedApiWrapper(async (request, auth) => {
  try {
    const stoppedJobs = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'stop_all_user_jobs',
        source: 'indexing/jobs/stop-all',
        reason: 'User stopping all their running/pending indexing jobs',
        metadata: { endpoint: '/api/v1/indexing/jobs/stop-all', method: 'POST' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_indexing_jobs', operationType: 'update' },
      async (db) => {
        const { data, error } = await db
          .from('indb_indexing_jobs')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .eq('user_id', auth.userId)
          .in('status', ['running', 'pending'])
          .select()

        if (error) {
          throw new Error('Failed to stop jobs')
        }

        return data
      }
    )

    return formatSuccess({ 
      success: true,
      message: `Stopped ${stoppedJobs?.length || 0} jobs`,
      stopped_jobs: stoppedJobs?.length || 0
    })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint: '/api/v1/indexing/jobs/stop-all',
        method: 'POST',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }
})

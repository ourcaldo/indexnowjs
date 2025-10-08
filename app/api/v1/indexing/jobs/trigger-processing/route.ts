import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { IndexingService } from '@/lib/services/indexing'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = authenticatedApiWrapper(async (request, auth) => {
  try {
    const pendingJobs = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_pending_jobs_for_processing',
        source: 'indexing/jobs/trigger-processing',
        reason: 'User triggering processing of their pending indexing jobs',
        metadata: { endpoint: '/api/v1/indexing/jobs/trigger-processing', method: 'POST' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_indexing_jobs', operationType: 'select' },
      async (db) => {
        const { data: pendingJobs, error } = await db
          .from('indb_indexing_jobs')
          .select('id, name')
          .eq('user_id', auth.userId)
          .eq('status', 'pending')
          .is('locked_at', null)
          .limit(3)

        if (error) {
          throw new Error('Failed to fetch jobs')
        }

        return pendingJobs
      }
    )

    if (!pendingJobs || pendingJobs.length === 0) {
      return formatSuccess({ message: 'No pending jobs found', timestamp: new Date().toISOString() })
    }

    const indexingService = IndexingService.getInstance()
    const results = []

    for (const job of pendingJobs) {
      try {
        const result = await indexingService.processIndexingJob(job.id)
        results.push({
          jobId: job.id,
          name: job.name,
          success: result.success,
          error: result.error
        })
      } catch (error) {
        results.push({
          jobId: job.id,
          name: job.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return formatSuccess({ 
      message: `Processed ${pendingJobs.length} jobs`,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint: '/api/v1/indexing/jobs/trigger-processing',
        method: 'POST',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }
})

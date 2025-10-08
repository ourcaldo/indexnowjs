import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const GET = authenticatedApiWrapper(async (request, auth, { params }) => {
  try {
    const { id: jobId } = await params
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const submissionsData = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_job_submissions',
        source: 'indexing/jobs/[id]/submissions',
        reason: 'User retrieving submissions for their indexing job',
        metadata: { jobId, page, limit, endpoint: '/api/v1/indexing/jobs/[id]/submissions', method: 'GET' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_indexing_jobs', operationType: 'select' },
      async (db) => {
        const { data: job, error: jobError } = await db
          .from('indb_indexing_jobs')
          .select('id')
          .eq('id', jobId)
          .eq('user_id', auth.userId)
          .single()

        if (jobError || !job) {
          throw new Error('Job not found')
        }

        const { data: submissions, error, count } = await db
          .from('indb_indexing_url_submissions')
          .select('*', { count: 'exact' })
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) {
          throw new Error('Failed to fetch submissions')
        }

        return { submissions: submissions || [], count: count || 0 }
      }
    )

    return formatSuccess({ 
      submissions: submissionsData.submissions, 
      count: submissionsData.count,
      page,
      limit 
    })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint: '/api/v1/indexing/jobs/[id]/submissions',
        method: 'GET',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }
})

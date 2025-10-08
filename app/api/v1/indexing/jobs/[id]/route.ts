import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database'
import { JobLoggingService } from '@/lib/job-management/job-logging-service'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const GET = authenticatedApiWrapper(async (request, auth, { params }) => {
  try {
    const { id: jobId } = await params

    const jobResult = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_indexing_job_details',
        source: 'indexing/jobs/[id]',
        reason: 'User retrieving their own indexing job details',
        metadata: { jobId, endpoint: '/api/v1/indexing/jobs/[id]', method: 'GET' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_indexing_jobs', operationType: 'select', columns: ['*'], whereConditions: { id: jobId, user_id: auth.userId } },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_indexing_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('user_id', auth.userId)
          .single()
        return { data, error }
      }
    )

    const { data: job, error } = jobResult
    if (error) {
      if (error.code === 'PGRST116') {
        const notFoundError = await ErrorHandlingService.createError(
          ErrorType.NOT_FOUND,
          'Job not found',
          { severity: ErrorSeverity.LOW, userId: auth.userId, endpoint: '/api/v1/indexing/jobs/[id]', statusCode: 404 }
        )
        return formatError(notFoundError)
      }
      throw new Error('Failed to fetch job')
    }

    return formatSuccess({ job })
  } catch (error: any) {
    if (error.type === ErrorType.NOT_FOUND) return formatError(error)
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE, error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/indexing/jobs/[id]', method: 'GET', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

export const PUT = authenticatedApiWrapper(async (request, auth, { params }) => {
  try {
    const { id: jobId } = await params
    const body = await request.json()

    const validStatuses = ['pending', 'running', 'completed', 'failed', 'paused', 'cancelled']
    if (!validStatuses.includes(body.status)) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION, 'Invalid status value',
        { severity: ErrorSeverity.LOW, userId: auth.userId, endpoint: '/api/v1/indexing/jobs/[id]', statusCode: 400 }
      )
      return formatError(validationError)
    }

    const currentJobResult = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId, operation: 'get_job_status_for_update', source: 'indexing/jobs/[id]',
        reason: 'User checking job status before updating',
        metadata: { jobId, newStatus: body.status }, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_indexing_jobs', operationType: 'select' },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_indexing_jobs')
          .select('status,type,source_data')
          .eq('id', jobId)
          .eq('user_id', auth.userId)
          .single()
        return { data, error }
      }
    )

    const { data: currentJob } = currentJobResult
    const isRetry = (currentJob?.status === 'completed' || currentJob?.status === 'failed') && body.status === 'pending'
    const isResume = currentJob?.status === 'paused' && body.status === 'running'

    const updateData: any = { status: body.status, updated_at: new Date().toISOString() }

    if (body.action === 're-run' && currentJob?.status !== 'running') {
      if (currentJob?.type === 'sitemap' && currentJob?.source_data?.parsed_urls) {
        updateData.source_data = { ...currentJob.source_data, parsed_urls: undefined, last_parsed: undefined, total_parsed: undefined }
        const jobLogger = JobLoggingService.getInstance()
        await jobLogger.logJobEvent({
          job_id: jobId, level: 'INFO',
          message: 'Re-run requested - cleared parsed URL cache for fresh sitemap parsing',
          metadata: { event_type: 'url_cache_cleared', user_id: auth.userId, action: 're-run' }
        })
      }
    }

    if (isRetry) {
      Object.assign(updateData, {
        progress_percentage: 0, processed_urls: 0, successful_urls: 0, failed_urls: 0,
        started_at: null, completed_at: null, error_message: null
      })
      const jobLogger = JobLoggingService.getInstance()
      await jobLogger.logJobEvent({
        job_id: jobId, level: 'INFO',
        message: 'Job marked for retry - preserving URL submission history',
        metadata: { event_type: 'job_retry', user_id: auth.userId }
      })
    } else if (isResume) {
      const jobLogger = JobLoggingService.getInstance()
      await jobLogger.logJobEvent({
        job_id: jobId, level: 'INFO',
        message: 'Job resumed - continuing from last processed URL',
        metadata: { event_type: 'job_resume', user_id: auth.userId }
      })
    }

    const updateJobResult = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId, operation: 'update_indexing_job_status', source: 'indexing/jobs/[id]',
        reason: `User updating job status from ${currentJob?.status} to ${body.status}`,
        metadata: { jobId, previousStatus: currentJob?.status, newStatus: body.status },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_indexing_jobs', operationType: 'update' },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_indexing_jobs')
          .update(updateData)
          .eq('id', jobId)
          .eq('user_id', auth.userId)
          .select()
          .single()
        return { data, error }
      }
    )

    const { data: job, error } = updateJobResult
    if (error) {
      if (error.code === 'PGRST116') {
        const notFoundError = await ErrorHandlingService.createError(
          ErrorType.NOT_FOUND, 'Job not found',
          { severity: ErrorSeverity.LOW, userId: auth.userId, endpoint: '/api/v1/indexing/jobs/[id]', statusCode: 404 }
        )
        return formatError(notFoundError)
      }
      throw new Error('Failed to update job')
    }

    return formatSuccess({ job })
  } catch (error: any) {
    if (error.type === ErrorType.NOT_FOUND) return formatError(error)
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE, error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/indexing/jobs/[id]', method: 'PUT', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

export const PATCH = authenticatedApiWrapper(async (request, auth, { params }) => {
  try {
    const { id: jobId } = await params
    const body = await request.json()

    if (body.action === 'force-refresh-urls') {
      const jobForRefreshResult = await SecureServiceRoleWrapper.executeWithUserSession(
        auth.supabase,
        { userId: auth.userId, operation: 'get_job_for_force_refresh', source: 'indexing/jobs/[id]',
          reason: 'User getting job data for force refresh URLs action', metadata: { jobId, action: 'force-refresh-urls' },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(), userAgent: request.headers.get('user-agent') },
        { table: 'indb_indexing_jobs', operationType: 'select' },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .select('source_data, type, status')
            .eq('id', jobId)
            .eq('user_id', auth.userId)
            .single()
          return { data, error }
        }
      )

      const { data: job } = jobForRefreshResult
      if (!job) {
        const notFoundError = await ErrorHandlingService.createError(
          ErrorType.NOT_FOUND, 'Job not found',
          { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 404 }
        )
        return formatError(notFoundError)
      }

      if (job.type !== 'sitemap') {
        const validationError = await ErrorHandlingService.createError(
          ErrorType.VALIDATION, 'Force refresh URLs only available for sitemap jobs',
          { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
        )
        return formatError(validationError)
      }

      if (job.status === 'running') {
        const validationError = await ErrorHandlingService.createError(
          ErrorType.VALIDATION, 'Cannot refresh URLs while job is running',
          { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
        )
        return formatError(validationError)
      }

      const clearedSourceData = { ...job.source_data, parsed_urls: undefined, last_parsed: undefined, total_parsed: undefined }
      await SecureServiceRoleWrapper.executeWithUserSession(
        auth.supabase,
        { userId: auth.userId, operation: 'force_refresh_job_urls', source: 'indexing/jobs/[id]',
          reason: 'User forcing URL cache refresh for sitemap job', metadata: { jobId, action: 'force-refresh-urls' },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(), userAgent: request.headers.get('user-agent') },
        { table: 'indb_indexing_jobs', operationType: 'update' },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .update({ source_data: clearedSourceData, updated_at: new Date().toISOString() })
            .eq('id', jobId)
            .eq('user_id', auth.userId)
          return { error }
        }
      )

      const jobLogger = JobLoggingService.getInstance()
      await jobLogger.logJobEvent({
        job_id: jobId, level: 'INFO',
        message: 'User requested force refresh URLs - cleared parsed URL cache',
        metadata: { event_type: 'force_refresh_urls', user_id: auth.userId }
      })

      return formatSuccess({ message: 'URL cache cleared successfully. Next job run will fetch fresh URLs from sitemap.', action: 'force-refresh-urls' })
    }

    const validationError = await ErrorHandlingService.createError(
      ErrorType.VALIDATION, 'Invalid action',
      { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
    )
    return formatError(validationError)

  } catch (error: any) {
    if (error.type) return formatError(error)
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE, error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/indexing/jobs/[id]', method: 'PATCH', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

export const DELETE = authenticatedApiWrapper(async (request, auth, { params }) => {
  try {
    const { id: jobId } = await params

    const jobWithDependencies = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      { userId: auth.userId, operation: 'delete_indexing_job_with_dependencies', source: 'indexing/jobs/[id]',
        reason: 'User deleting their indexing job and related submissions',
        metadata: { jobId }, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent') },
      { table: 'indb_indexing_jobs', operationType: 'delete' },
      async () => {
        const { data: job, error: jobError } = await supabaseAdmin
          .from('indb_indexing_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('user_id', auth.userId)
          .single()

        if (jobError) throw new Error('Job not found')

        await supabaseAdmin.from('indb_indexing_url_submissions').delete().eq('job_id', jobId)
        await supabaseAdmin.from('indb_indexing_jobs').delete().eq('id', jobId).eq('user_id', auth.userId)

        const jobLogger = JobLoggingService.getInstance()
        await jobLogger.logJobEvent({
          job_id: jobId, level: 'INFO',
          message: `Job deleted: ${job.name}`,
          metadata: { event_type: 'job_deleted', user_id: auth.userId }
        })

        return { job }
      }
    )

    return formatSuccess({ message: 'Job and related submissions deleted successfully' })
  } catch (error: any) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE, error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/indexing/jobs/[id]', method: 'DELETE', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

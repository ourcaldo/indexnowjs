import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { JobLoggingService } from '@/lib/job-management/job-logging-service'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import { SubscriptionValidator } from '@/lib/services/validation/SubscriptionValidator'

export const GET = authenticatedApiWrapper(async (request, auth) => {
  try {
    // Get query parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const schedule = url.searchParams.get('schedule') || ''

    const offset = (page - 1) * limit

    // Fetch jobs using user session security wrapper
    const jobsResult = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_user_indexing_jobs',
        source: 'indexing',
        reason: 'User fetching their indexing jobs',
        metadata: {
          endpoint: '/api/v1/indexing/jobs',
          filters: { search, status, schedule },
          pagination: { page, limit }
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_indexing_jobs', operationType: 'select' },
      async (db) => {
        let query = db
          .from('indb_indexing_jobs')
          .select('*', { count: 'exact' })

        // Apply filters (RLS automatically filters by user)
        if (search) {
          query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%`)
        }
        if (status && status !== 'All Status') {
          query = query.eq('status', status)
        }
        if (schedule && schedule !== 'All Schedules') {
          query = query.eq('schedule_type', schedule)
        }

        // Apply pagination and ordering
        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return { data, error, count }
      }
    )

    const { data, error, count } = jobsResult

    if (error) {
      throw new Error('Failed to fetch jobs')
    }

    // Get total count for next job number using user session security wrapper
    const allJobs = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_jobs_count',
        source: 'indexing',
        reason: 'User getting total jobs count for next job number calculation',
        metadata: {
          endpoint: '/api/v1/indexing/jobs',
          operation: 'count_all_jobs'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_indexing_jobs', operationType: 'select' },
      async (db) => {
        const { data } = await db
          .from('indb_indexing_jobs')
          .select('id')
        return data
      }
    )

    return formatSuccess({ 
      jobs: data || [],
      count: count || 0,
      page,
      limit,
      nextJobNumber: (allJobs?.length || 0) + 1
    })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint: '/api/v1/indexing/jobs',
        method: 'GET',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }
})

export const POST = authenticatedApiWrapper(async (request, auth) => {
  try {
    const body = await request.json()
    const { name, type, urls, sitemapUrl, scheduleType, startTime } = body

    // Validate request body
    const jobSchema = z.object({
      name: z.string().min(1),
      type: z.enum(['manual', 'sitemap']),
      urls: z.array(z.string().url()).optional(),
      sitemapUrl: z.string().url().optional(),
      scheduleType: z.string().optional(),
      startTime: z.string().optional()
    })

    const validated = jobSchema.safeParse(body)
    if (!validated.success) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        'Invalid job data',
        {
          severity: ErrorSeverity.LOW,
          userId: auth.userId,
          endpoint: '/api/v1/indexing/jobs',
          statusCode: 400,
          metadata: { errors: validated.error.errors }
        }
      )
      return formatError(validationError)
    }

    const subscriptionCheck = await SubscriptionValidator.validateActiveSubscription(
      auth.supabase,
      auth.userId,
      {
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent') || undefined,
        endpoint: '/api/v1/indexing/jobs',
        operation: 'create_job'
      }
    )

    if (!subscriptionCheck.isValid) {
      const subscriptionError = await ErrorHandlingService.createError(
        ErrorType.AUTHORIZATION,
        subscriptionCheck.error || 'Subscription required',
        { severity: ErrorSeverity.MEDIUM, userId: auth.userId, statusCode: 403 }
      )
      return formatError(subscriptionError)
    }

    // Import QuotaService for quota enforcement
    const { QuotaService } = await import('@/lib/monitoring/quota-service')

    // Process URLs for manual jobs
    const processedUrls = type === 'manual' 
      ? Array.from(new Set(urls || [])) // Remove duplicates
      : []
    
    // Check user's quota before creating job
    const urlCount = processedUrls.length
    
    if (urlCount > 0) {
      const quotaCheck = await QuotaService.canSubmitUrls(auth.userId, urlCount)
      if (!quotaCheck.canSubmit) {
        const quotaError = await ErrorHandlingService.createError(
          ErrorType.QUOTA_EXCEEDED,
          quotaCheck.message || 'Quota exceeded. Upgrade your package to submit more URLs.',
          {
            severity: ErrorSeverity.LOW,
            userId: auth.userId,
            endpoint: '/api/v1/indexing/jobs',
            statusCode: 403,
            metadata: { 
              quotaExhausted: quotaCheck.quotaExhausted, 
              remainingQuota: quotaCheck.remainingQuota 
            }
          }
        )
        return formatError(quotaError)
      }
    }
      
    const jobData = {
      user_id: auth.userId,
      name,
      type,
      status: 'pending',
      schedule_type: scheduleType || 'one-time',
      source_data: type === 'manual' 
        ? { urls: processedUrls } 
        : { sitemap_url: sitemapUrl },
      total_urls: type === 'manual' ? processedUrls.length : 0,
      processed_urls: 0,
      successful_urls: 0,
      failed_urls: 0,
      progress_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (scheduleType !== 'one-time' && startTime) {
      (jobData as any).next_run_at = startTime
    }

    // Insert job using user session security wrapper
    const insertResult = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'create_indexing_job',
        source: 'indexing',
        reason: 'User creating new indexing job',
        metadata: {
          endpoint: '/api/v1/indexing/jobs',
          jobName: name,
          jobType: type,
          scheduleType: scheduleType,
          urlCount: type === 'manual' ? processedUrls.length : 0
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_indexing_jobs', operationType: 'insert' },
      async (db) => {
        const { data, error } = await db
          .from('indb_indexing_jobs')
          .insert([jobData])
          .select()
          .single()
        return { data, error }
      }
    )

    const { data, error } = insertResult

    if (error) {
      throw new Error('Failed to create job')
    }

    // Log job creation
    const jobLogger = JobLoggingService.getInstance();
    await jobLogger.logJobEvent({
      job_id: data.id,
      level: 'INFO',
      message: `Job created: ${data.name}`,
      metadata: {
        event_type: 'job_created',
        user_id: auth.userId,
        job_type: data.type,
        schedule_type: data.schedule_type,
        total_urls: data.total_urls,
        created_via: 'api_endpoint'
      }
    });

    return formatSuccess({ job: data }, 201)
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint: '/api/v1/indexing/jobs',
        method: 'POST',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }
})

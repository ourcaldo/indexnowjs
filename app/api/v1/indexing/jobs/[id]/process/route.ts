import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = authenticatedApiWrapper(async (request, auth, { params }) => {
  try {
    const { id: jobId } = await params

    const result = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'process_indexing_job',
        source: 'indexing/jobs/[id]/process',
        reason: 'User starting processing of their indexing job',
        metadata: { jobId, endpoint: '/api/v1/indexing/jobs/[id]/process', method: 'POST' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_indexing_jobs', operationType: 'update' },
      async (db) => {
        const { data: job, error: jobError } = await db
          .from('indb_indexing_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('user_id', auth.userId)
          .single()

        if (jobError || !job) {
          throw new Error('Job not found')
        }

        if (job.status === 'running' && job.locked_at) {
          throw new Error('Job is already running')
        }

        await createUrlSubmissions(job, db)

        const { error: updateError } = await db
          .from('indb_indexing_jobs')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', jobId)

        if (updateError) {
          throw new Error('Failed to start job')
        }

        return { jobId, status: 'pending' }
      }
    )

    return formatSuccess({ message: 'Job processing started', jobId: result.jobId, status: result.status })

  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint: '/api/v1/indexing/jobs/[id]/process',
        method: 'POST',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }
})

async function createUrlSubmissions(job: any, db: any) {
  const { data: existingSubmissions } = await db
    .from('indb_indexing_url_submissions')
    .select('id')
    .eq('job_id', job.id)

  const runCount = (existingSubmissions?.length || 0) > 0 ? 
    Math.floor((existingSubmissions?.length || 0) / (job.source_data?.urls?.length || 1)) + 1 : 1

  let urls: string[] = []

  if (job.type === 'manual' && job.source_data?.urls) {
    urls = job.source_data.urls
  } else if (job.type === 'sitemap' && job.source_data?.sitemap_url) {
    urls = await parseSitemapUrls(job.source_data.sitemap_url)
  }

  if (urls.length === 0) return

  const submissions = urls.map((url, index) => ({
    job_id: job.id,
    url,
    status: 'pending',
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    response_data: { run_number: runCount, batch_index: index }
  }))

  await db.from('indb_indexing_url_submissions').insert(submissions)
  
  await db
    .from('indb_indexing_jobs')
    .update({
      total_urls: urls.length,
      processed_urls: 0,
      successful_urls: 0,
      failed_urls: 0,
      progress_percentage: 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id)
}

async function parseSitemapUrls(sitemapUrl: string): Promise<string[]> {
  const response = await fetch(sitemapUrl)
  if (!response.ok) throw new Error(`Failed to fetch sitemap: ${response.status}`)

  const xmlContent = await response.text()
  const xml2js = await import('xml2js')
  const parser = new xml2js.Parser()
  const parsedXml = await parser.parseStringPromise(xmlContent)

  const urls: string[] = []
  
  if (parsedXml.urlset?.url) {
    parsedXml.urlset.url.forEach((urlEntry: any) => {
      if (urlEntry.loc?.[0]) urls.push(urlEntry.loc[0])
    })
  }
  
  if (parsedXml.sitemapindex?.sitemap) {
    for (const sitemapEntry of parsedXml.sitemapindex.sitemap) {
      if (sitemapEntry.loc?.[0]) {
        const nestedUrls = await parseSitemapUrls(sitemapEntry.loc[0])
        urls.push(...nestedUrls)
      }
    }
  }

  return urls
}

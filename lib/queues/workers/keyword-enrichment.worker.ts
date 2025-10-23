import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { KeywordEnrichmentJob, KeywordEnrichmentJobSchema } from '../types'
import { logger } from '@/lib/monitoring/error-handling'

async function processKeywordEnrichment(job: Job<KeywordEnrichmentJob>): Promise<{
  processed: boolean
}> {
  logger.info({ jobId: job.id }, 'Processing keyword enrichment job')

  try {
    const validatedData = KeywordEnrichmentJobSchema.parse(job.data)

    const { KeywordEnrichmentWorker } = await import('@/lib/job-management/keyword-enrichment-worker')
    const worker = await KeywordEnrichmentWorker.getInstance()
    
    await worker.processEnrichmentJob()

    logger.info({ jobId: job.id }, 'Keyword enrichment job completed')

    return { processed: true }
  } catch (error) {
    logger.error(
      { jobId: job.id, error: error instanceof Error ? error.message : 'Unknown error' },
      'Keyword enrichment job failed'
    )
    throw error
  }
}

export async function initializeKeywordEnrichmentWorker(): Promise<void> {
  const queueName = 'keyword-enrichment'

  await queueManager.registerWorker(queueName, processKeywordEnrichment, {
    concurrency: 1,
  })

  const queue = await queueManager.getQueue(queueName)
  
  const existingJobs = await queue.getRepeatableJobs()
  const jobId = 'keyword-enrichment-check'
  const existingJob = existingJobs.find(j => j.name === jobId)
  
  if (existingJob) {
    logger.info({ queue: queueName, jobId }, 'Repeatable job already exists, skipping creation')
    return
  }

  await queue.add(
    jobId,
    { scheduledAt: new Date().toISOString() },
    {
      jobId,
      repeat: {
        pattern: '30 * * * *',
      },
    }
  )

  logger.info({ queue: queueName, schedule: '30 * * * *' }, 'Keyword enrichment worker initialized')
}

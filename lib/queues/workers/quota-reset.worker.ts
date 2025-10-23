import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { QuotaResetJob, QuotaResetJobSchema } from '../types'
import { logger } from '@/lib/monitoring/error-handling'

async function processQuotaReset(job: Job<QuotaResetJob>): Promise<{
  processed: boolean
}> {
  logger.info({ jobId: job.id }, 'Processing quota reset job')

  try {
    const validatedData = QuotaResetJobSchema.parse(job.data)

    const { QuotaResetMonitor } = await import('@/lib/monitoring/quota-reset-monitor')
    const monitor = QuotaResetMonitor.getInstance()
    
    await monitor.checkAndReactivateAccounts()

    logger.info({ jobId: job.id }, 'Quota reset job completed')

    return { processed: true }
  } catch (error) {
    logger.error(
      { jobId: job.id, error: error instanceof Error ? error.message : 'Unknown error' },
      'Quota reset job failed'
    )
    throw error
  }
}

export async function initializeQuotaResetWorker(): Promise<void> {
  const queueName = 'quota-reset'

  await queueManager.registerWorker(queueName, processQuotaReset, {
    concurrency: 1,
  })

  const queue = await queueManager.getQueue(queueName)
  
  const existingJobs = await queue.getRepeatableJobs()
  const jobId1 = 'quota-reset-hourly'
  const jobId2 = 'quota-reset-midnight'
  
  const existingJob1 = existingJobs.find(j => j.name === jobId1)
  const existingJob2 = existingJobs.find(j => j.name === jobId2)
  
  if (!existingJob1) {
    await queue.add(
      jobId1,
      { scheduledAt: new Date().toISOString() },
      {
        jobId: jobId1,
        repeat: {
          pattern: '5 * * * *',
        },
      }
    )
  } else {
    logger.info({ queue: queueName, jobId: jobId1 }, 'Repeatable job already exists, skipping creation')
  }

  if (!existingJob2) {
    await queue.add(
      jobId2,
      { scheduledAt: new Date().toISOString() },
      {
        jobId: jobId2,
        repeat: {
          pattern: '*/15 23,0 * * *',
        },
      }
    )
  } else {
    logger.info({ queue: queueName, jobId: jobId2 }, 'Repeatable job already exists, skipping creation')
  }

  logger.info({ queue: queueName, schedules: ['5 * * * *', '*/15 23,0 * * *'] }, 'Quota reset worker initialized')
}

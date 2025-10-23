import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { IndexingMonitorJob, IndexingMonitorJobSchema } from '../types'
import { JobMonitor } from '@/lib/job-management/job-monitor'
import { logger } from '@/lib/monitoring/error-handling'

async function processIndexingMonitor(job: Job<IndexingMonitorJob>): Promise<{
  processed: boolean
}> {
  logger.info({ jobId: job.id }, 'Processing indexing monitor job')

  try {
    const validatedData = IndexingMonitorJobSchema.parse(job.data)

    const monitor = JobMonitor.getInstance()
    await monitor.triggerNow()

    logger.info({ jobId: job.id }, 'Indexing monitor job completed')

    return { processed: true }
  } catch (error) {
    logger.error(
      { jobId: job.id, error: error instanceof Error ? error.message : 'Unknown error' },
      'Indexing monitor job failed'
    )
    throw error
  }
}

export async function initializeIndexingMonitorWorker(): Promise<void> {
  const queueName = 'indexing-monitor'

  await queueManager.registerWorker(queueName, processIndexingMonitor, {
    concurrency: 2,
  })

  const queue = await queueManager.getQueue(queueName)
  
  const existingJobs = await queue.getRepeatableJobs()
  const jobId = 'indexing-monitor-check'
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
        pattern: '* * * * *',
      },
    }
  )

  logger.info({ queue: queueName, schedule: '* * * * *' }, 'Indexing monitor worker initialized')
}

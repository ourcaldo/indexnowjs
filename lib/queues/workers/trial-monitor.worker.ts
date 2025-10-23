import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { TrialMonitorJob, TrialMonitorJobSchema } from '../types'
import { TrialMonitorService } from '@/lib/job-management/trial-monitor'
import { logger } from '@/lib/monitoring/error-handling'

async function processTrialMonitor(job: Job<TrialMonitorJob>): Promise<{
  processed: boolean
}> {
  logger.info({ jobId: job.id }, 'Processing trial monitor job')

  try {
    const validatedData = TrialMonitorJobSchema.parse(job.data)

    await TrialMonitorService.runTrialMonitorJob()

    logger.info({ jobId: job.id }, 'Trial monitor job completed')

    return { processed: true }
  } catch (error) {
    logger.error(
      { jobId: job.id, error: error instanceof Error ? error.message : 'Unknown error' },
      'Trial monitor job failed'
    )
    throw error
  }
}

export async function initializeTrialMonitorWorker(): Promise<void> {
  const queueName = 'trial-monitor'

  await queueManager.registerWorker(queueName, processTrialMonitor, {
    concurrency: 1,
  })

  const queue = await queueManager.getQueue(queueName)
  
  const existingJobs = await queue.getRepeatableJobs()
  const jobId = 'trial-monitor-check'
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
        pattern: '*/15 * * * *',
      },
    }
  )

  logger.info({ queue: queueName, schedule: '*/15 * * * *' }, 'Trial monitor worker initialized')
}

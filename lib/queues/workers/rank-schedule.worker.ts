import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { DailyRankCheckJob, DailyRankCheckJobSchema } from '../types'
import { BatchProcessor } from '@/lib/job-management/batch-processor'
import { logger } from '@/lib/monitoring/error-handling'

async function processDailyRankCheck(job: Job<DailyRankCheckJob>): Promise<{
  checkedToday: number
  completionRate: string
}> {
  logger.info({ jobId: job.id }, 'Processing daily rank check job')

  try {
    const validatedData = DailyRankCheckJobSchema.parse(job.data)

    const batchProcessor = new BatchProcessor()
    
    const initialStats = await batchProcessor.getProcessingStats()
    await batchProcessor.processDailyRankChecks()
    const finalStats = await batchProcessor.getProcessingStats()

    logger.info(
      { 
        jobId: job.id, 
        checkedToday: finalStats.checkedToday,
        completionRate: finalStats.completionRate 
      },
      'Daily rank check completed'
    )

    return {
      checkedToday: finalStats.checkedToday,
      completionRate: finalStats.completionRate,
    }
  } catch (error) {
    logger.error(
      { jobId: job.id, error: error instanceof Error ? error.message : 'Unknown error' },
      'Daily rank check failed'
    )
    throw error
  }
}

export async function initializeDailyRankCheckWorker(): Promise<void> {
  const queueName = 'rank-schedule'

  await queueManager.registerWorker(queueName, processDailyRankCheck, {
    concurrency: 1,
  })

  const queue = await queueManager.getQueue(queueName)
  
  const existingJobs = await queue.getRepeatableJobs()
  const jobId = 'daily-rank-check'
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
        pattern: '0 2 * * *',
      },
    }
  )

  logger.info({ queue: queueName, schedule: '0 2 * * *' }, 'Daily rank check worker initialized')
}

import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { HourlyRankRetryJob, HourlyRankRetryJobSchema } from '../types'
import { BatchProcessor } from '@/lib/job-management/batch-processor'
import { logger } from '@/lib/monitoring/error-handling'

async function processHourlyRankRetry(job: Job<HourlyRankRetryJob>): Promise<{
  checkedNow: number
  completionRate: string
}> {
  const currentHour = new Date().getUTCHours()
  
  if (currentHour === 2) {
    logger.info({ jobId: job.id, hour: currentHour }, 'Skipping hourly rank retry - reserved for daily check at 2 AM')
    return {
      checkedNow: 0,
      completionRate: '0'
    }
  }

  logger.info({ jobId: job.id, hour: currentHour }, 'Processing hourly rank retry job')

  try {
    const validatedData = HourlyRankRetryJobSchema.parse(job.data)

    const batchProcessor = new BatchProcessor()
    
    const initialStats = await batchProcessor.getProcessingStats()
    
    if (initialStats.pendingChecks > 0) {
      logger.info(
        { 
          jobId: job.id, 
          pendingChecks: initialStats.pendingChecks 
        },
        'Found unchecked keywords - starting retry process'
      )
      
      await batchProcessor.processDailyRankChecks()
      const finalStats = await batchProcessor.getProcessingStats()

      logger.info(
        { 
          jobId: job.id, 
          checkedNow: finalStats.checkedToday - initialStats.checkedToday,
          totalCheckedToday: finalStats.checkedToday,
          completionRate: finalStats.completionRate 
        },
        'Hourly rank retry completed'
      )

      return {
        checkedNow: finalStats.checkedToday - initialStats.checkedToday,
        completionRate: finalStats.completionRate,
      }
    } else {
      logger.info({ jobId: job.id }, 'No unchecked keywords found - skipping')
      return {
        checkedNow: 0,
        completionRate: initialStats.completionRate
      }
    }
  } catch (error) {
    logger.error(
      { jobId: job.id, error: error instanceof Error ? error.message : 'Unknown error' },
      'Hourly rank retry failed'
    )
    throw error
  }
}

export async function initializeHourlyRankRetryWorker(): Promise<void> {
  const queueName = 'hourly-rank-retry'

  await queueManager.registerWorker(queueName, processHourlyRankRetry, {
    concurrency: 1,
  })

  const queue = await queueManager.getQueue(queueName)
  
  const existingJobs = await queue.getRepeatableJobs()
  const jobId = 'hourly-rank-retry'
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
        pattern: '0 0,1,3-23 * * *',
      },
    }
  )

  logger.info(
    { queue: queueName, schedule: '0 0,1,3-23 * * *', excludedHour: '2 AM' }, 
    'Hourly rank retry worker initialized - runs every hour except 2 AM UTC'
  )
}

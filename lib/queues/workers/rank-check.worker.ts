import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { queueConfig } from '../config'
import { ImmediateRankCheckJob, ImmediateRankCheckJobSchema } from '../types'
import { RankTracker } from '@/lib/rank-tracking/rank-tracker'
import { logger } from '@/lib/monitoring/error-handling'

async function processRankCheck(job: Job<ImmediateRankCheckJob>): Promise<{
  success: boolean
  rank?: number
  error?: string
}> {
  const { keywordId, userId } = job.data

  logger.info({ jobId: job.id, keywordId, userId }, 'Processing rank check job')

  try {
    const validatedData = ImmediateRankCheckJobSchema.parse(job.data)

    const rankTracker = new RankTracker()

    const keywordData = await rankTracker.getKeywordWithDetails(
      validatedData.keywordId,
      validatedData.userId
    )

    if (!keywordData) {
      throw new Error('Keyword not found or not accessible')
    }

    await rankTracker.trackKeyword(keywordData)

    logger.info({ jobId: job.id, keywordId }, 'Rank check completed successfully')

    return { success: true }
  } catch (error) {
    logger.error(
      { jobId: job.id, keywordId, error: error instanceof Error ? error.message : 'Unknown error' },
      'Rank check failed'
    )

    throw error
  }
}

export function initializeRankCheckWorker(): void {
  const { concurrency, limiter } = queueConfig.rankCheck

  queueManager.registerWorker(
    queueConfig.rankCheck.name,
    processRankCheck,
    { concurrency, limiter }
  )

  logger.info(
    { queue: queueConfig.rankCheck.name, concurrency, limiter },
    'Rank check worker initialized'
  )
}

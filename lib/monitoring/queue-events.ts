import type { QueueEvents } from 'bullmq'
import { logger } from './error-handling'

export class QueueMetricsCollector {
  private queueEvents: Map<string, QueueEvents> = new Map()
  private static instance: QueueMetricsCollector

  private constructor() {}

  static getInstance(): QueueMetricsCollector {
    if (!QueueMetricsCollector.instance) {
      QueueMetricsCollector.instance = new QueueMetricsCollector()
    }
    return QueueMetricsCollector.instance
  }

  async initialize(queueNames: string[]): Promise<void> {
    if (process.env.ENABLE_BULLMQ !== 'true') {
      logger.info({}, 'BullMQ disabled - skipping queue metrics collector')
      return
    }

    for (const queueName of queueNames) {
      try {
        const bullmq = await import('bullmq')
        const { redisConnection } = await import('@/lib/queues/config')
        
        const queueEvents = new bullmq.QueueEvents(queueName, {
          connection: redisConnection,
        })

        queueEvents.on('completed', ({ jobId, returnvalue }) => {
          logger.info({ queueName, jobId, returnvalue }, 'Job completed')
        })

        queueEvents.on('failed', ({ jobId, failedReason }) => {
          logger.error({ queueName, jobId, failedReason }, 'Job failed')
        })

        queueEvents.on('stalled', ({ jobId }) => {
          logger.warn({ queueName, jobId }, 'Job stalled')
        })

        queueEvents.on('progress', ({ jobId, data }) => {
          logger.info({ queueName, jobId, progress: data }, 'Job progress')
        })

        this.queueEvents.set(queueName, queueEvents)
        logger.info({ queueName }, 'Queue events listener initialized')
      } catch (error) {
        logger.error(
          { queueName, error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to initialize queue events listener'
        )
      }
    }

    logger.info({ queueCount: queueNames.length }, 'Queue metrics collector initialized')
  }

  async shutdown(): Promise<void> {
    for (const [queueName, queueEvents] of Array.from(this.queueEvents.entries())) {
      await queueEvents.close()
      logger.info({ queueName }, 'Queue events closed')
    }
  }
}

export const queueMetricsCollector = QueueMetricsCollector.getInstance()

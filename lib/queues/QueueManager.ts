import type { Queue, Worker, QueueEvents, Job } from 'bullmq'
import { logger } from '@/lib/monitoring/error-handling'

export class QueueManager {
  private static instance: QueueManager
  private queues: Map<string, Queue> = new Map()
  private workers: Map<string, Worker> = new Map()
  private queueEvents: Map<string, QueueEvents> = new Map()
  private bullmqModule: typeof import('bullmq') | null = null

  private constructor() {}

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager()
    }
    return QueueManager.instance
  }

  private async ensureBullMQLoaded(): Promise<typeof import('bullmq')> {
    if (process.env.ENABLE_BULLMQ !== 'true') {
      throw new Error('BullMQ is not enabled. Set ENABLE_BULLMQ=true to use queue features.')
    }

    if (!this.bullmqModule) {
      try {
        this.bullmqModule = await import('bullmq')
        logger.info({}, 'BullMQ module loaded successfully')
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to load BullMQ module'
        )
        throw new Error('Failed to load BullMQ. Ensure Redis is available and ENABLE_BULLMQ=true')
      }
    }
    return this.bullmqModule
  }

  async getQueue(queueName: string): Promise<Queue> {
    if (!this.queues.has(queueName)) {
      const bullmq = await this.ensureBullMQLoaded()
      const { redisConnection, defaultJobOptions } = await import('./config')

      const queue = new bullmq.Queue(queueName, {
        connection: redisConnection,
        defaultJobOptions,
      })

      this.queues.set(queueName, queue)
      logger.info({ queueName }, 'Queue created')
    }

    return this.queues.get(queueName)!
  }

  async registerWorker(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    options: {
      concurrency?: number
      limiter?: { max: number; duration: number }
    } = {}
  ): Promise<Worker> {
    if (this.workers.has(queueName)) {
      logger.warn({ queueName }, 'Worker already registered for queue')
      return this.workers.get(queueName)!
    }

    const bullmq = await this.ensureBullMQLoaded()
    const { redisConnection } = await import('./config')

    const worker = new bullmq.Worker(queueName, processor, {
      connection: redisConnection,
      concurrency: options.concurrency || 1,
      limiter: options.limiter,
    })

    worker.on('completed', (job: Job) => {
      logger.info(
        { jobId: job.id, queueName, returnValue: job.returnvalue },
        'Job completed'
      )
    })

    worker.on('failed', (job: Job | undefined, err: Error) => {
      logger.error(
        { jobId: job?.id, queueName, error: err.message },
        'Job failed'
      )
    })

    worker.on('error', (err: Error) => {
      logger.error({ queueName, error: err.message }, 'Worker error')
    })

    this.workers.set(queueName, worker)
    logger.info({ queueName, ...options }, 'Worker registered')

    return worker
  }

  async enqueueJob(
    queueName: string,
    jobName: string,
    data: any,
    options: any = {}
  ): Promise<string> {
    const queue = await this.getQueue(queueName)
    const job = await queue.add(jobName, data, options)

    logger.info(
      { jobId: job.id, queueName, jobName },
      'Job enqueued'
    )

    return job.id!
  }

  async shutdown(): Promise<void> {
    logger.info({}, 'Starting graceful shutdown of queues and workers')

    for (const [queueName, worker] of Array.from(this.workers.entries())) {
      await worker.close()
      logger.info({ queueName }, 'Worker closed')
    }

    for (const [queueName, queue] of Array.from(this.queues.entries())) {
      await queue.close()
      logger.info({ queueName }, 'Queue closed')
    }

    for (const [queueName, queueEvents] of Array.from(this.queueEvents.entries())) {
      await queueEvents.close()
      logger.info({ queueName }, 'Queue events closed')
    }

    logger.info({}, 'All queues and workers shut down successfully')
  }
}

export const queueManager = QueueManager.getInstance()

export async function enqueueJob(
  queueName: string,
  jobName: string,
  data: any,
  options: any = {}
): Promise<string> {
  return queueManager.enqueueJob(queueName, jobName, data, options)
}

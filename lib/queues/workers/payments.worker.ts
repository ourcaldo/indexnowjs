import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { queueConfig } from '../config'
import { PaymentWebhookJob, PaymentWebhookJobSchema } from '../types'
import { logger } from '@/lib/monitoring/error-handling'

async function processPaymentWebhook(job: Job<PaymentWebhookJob>): Promise<{
  success: boolean
  error?: string
}> {
  const { orderId, transactionId, status } = job.data

  logger.info({ jobId: job.id, orderId, transactionId, status }, 'Processing payment webhook job')

  try {
    const validatedData = PaymentWebhookJobSchema.parse(job.data)

    logger.info(
      { jobId: job.id, orderId, transactionId, status },
      'Payment webhook processed successfully'
    )

    return { success: true }
  } catch (error) {
    logger.error(
      { jobId: job.id, orderId, error: error instanceof Error ? error.message : 'Unknown error' },
      'Payment webhook processing failed'
    )

    throw error
  }
}

export function initializePaymentWorker(): void {
  const { concurrency } = queueConfig.payments

  queueManager.registerWorker(
    queueConfig.payments.name,
    processPaymentWebhook,
    { concurrency }
  )

  logger.info(
    { queue: queueConfig.payments.name, concurrency },
    'Payment webhook worker initialized'
  )
}

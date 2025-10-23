import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { queueConfig } from '../config'
import { EmailJob, EmailJobSchema } from '../types'
import { emailService } from '@/lib/email/emailService'
import { logger } from '@/lib/monitoring/error-handling'

async function processEmail(job: Job<EmailJob>): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  const { to, subject, template, data } = job.data

  logger.info({ jobId: job.id, to, template }, 'Processing email job')

  try {
    const validatedData = EmailJobSchema.parse(job.data)

    const emailOptions: any = {
      to: validatedData.to,
      subject: validatedData.subject,
      template: validatedData.template,
      data: validatedData.data
    }

    await emailService.sendEmail(emailOptions)

    logger.info({ jobId: job.id, to, template }, 'Email sent successfully')

    return { success: true }
  } catch (error) {
    logger.error(
      { jobId: job.id, to, template, error: error instanceof Error ? error.message : 'Unknown error' },
      'Email sending failed'
    )

    throw error
  }
}

export function initializeEmailWorker(): void {
  const { concurrency, limiter } = queueConfig.email

  queueManager.registerWorker(
    queueConfig.email.name,
    processEmail,
    { concurrency, limiter }
  )

  logger.info(
    { queue: queueConfig.email.name, concurrency, limiter },
    'Email worker initialized'
  )
}

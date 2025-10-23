import { emailService } from './emailService'
import { logger } from '@/lib/monitoring/error-handling'

export async function sendEmailAsync(options: {
  to: string
  subject: string
  template: string
  data: Record<string, any>
}): Promise<void> {
  if (process.env.ENABLE_BULLMQ === 'true') {
    try {
      const { enqueueJob } = await import('@/lib/queues/QueueManager')
      const { queueConfig } = await import('@/lib/queues/config')
      
      await enqueueJob(
        queueConfig.email.name,
        'send-email',
        {
          to: options.to,
          subject: options.subject,
          template: options.template,
          data: options.data,
        },
        {
          priority: options.template === 'login_notification' ? 1 : 3,
        }
      )
      
      logger.info({ to: options.to, template: options.template }, 'Email job enqueued')
    } catch (error) {
      logger.error(
        { to: options.to, template: options.template, error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to enqueue email job'
      )
      throw error
    }
  } else {
    await emailService.sendEmail(options)
  }
}

export { EmailService } from './emailService'
export { LoginNotificationService } from './login-notification-service'
export { emailService }
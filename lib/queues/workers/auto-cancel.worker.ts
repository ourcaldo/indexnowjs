import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { AutoCancelJob, AutoCancelJobSchema } from '../types'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { emailService } from '@/lib/email/emailService'
import { logger } from '@/lib/monitoring/error-handling'

async function processAutoCancel(job: Job<AutoCancelJob>): Promise<{
  successCount: number
  errorCount: number
  totalFound: number
}> {
  logger.info({ jobId: job.id }, 'Processing auto-cancel job')

  try {
    const validatedData = AutoCancelJobSchema.parse(job.data)

    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const expiredTransactions = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'get_expired_payment_transactions',
        reason: 'Auto-cancel service finding payment transactions older than 24 hours',
        source: 'auto-cancel.worker',
        metadata: { cutoffTime: twentyFourHoursAgo.toISOString() }
      },
      { table: 'indb_payment_transactions', operationType: 'select' },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_transactions')
          .select('*')
          .eq('transaction_status', 'pending')
          .lt('created_at', twentyFourHoursAgo.toISOString())

        if (error) throw error
        return data
      }
    )

    if (!expiredTransactions || expiredTransactions.length === 0) {
      return { successCount: 0, errorCount: 0, totalFound: 0 }
    }

    let successCount = 0
    let errorCount = 0

    for (const transaction of expiredTransactions) {
      try {
        await supabaseAdmin
          .from('indb_payment_transactions')
          .update({
            transaction_status: 'cancelled',
            processed_at: new Date().toISOString(),
          })
          .eq('id', transaction.id)

        await emailService.sendEmail({
          to: transaction.user_email,
          subject: 'Order Expired',
          template: 'order_expired',
          data: {
            customerName: transaction.customer_name,
            orderId: transaction.order_id,
            packageName: transaction.package_name,
            billingPeriod: transaction.billing_period,
            amount: transaction.gross_amount,
            status: 'expired',
            expiredDate: new Date().toISOString(),
            subscribeUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://indexnow.studio'
          },
        })

        successCount++
      } catch (error) {
        errorCount++
        logger.error(
          { transactionId: transaction.id, error: error instanceof Error ? error.message : 'Unknown' },
          'Failed to cancel transaction'
        )
      }
    }

    logger.info(
      { jobId: job.id, successCount, errorCount, totalFound: expiredTransactions.length },
      'Auto-cancel job completed'
    )

    return { successCount, errorCount, totalFound: expiredTransactions.length }
  } catch (error) {
    logger.error(
      { jobId: job.id, error: error instanceof Error ? error.message : 'Unknown error' },
      'Auto-cancel job failed'
    )
    throw error
  }
}

export async function initializeAutoCancelWorker(): Promise<void> {
  const queueName = 'auto-cancel'

  await queueManager.registerWorker(queueName, processAutoCancel, {
    concurrency: 1,
  })

  const queue = await queueManager.getQueue(queueName)
  
  const existingJobs = await queue.getRepeatableJobs()
  const jobId = 'auto-cancel-expired-transactions'
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
        pattern: '0 * * * *',
      },
    }
  )

  logger.info({ queue: queueName, schedule: '0 * * * *' }, 'Auto-cancel worker initialized')
}

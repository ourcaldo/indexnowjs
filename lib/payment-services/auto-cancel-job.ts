import cron from 'node-cron'
import { supabaseAdmin } from '@/lib/database'
import { emailService } from '@/lib/email/emailService'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { JobErrorHandler } from '../job-management/JobErrorHandler'
import { logger } from '@/lib/monitoring/error-handling'

/**
 * Auto-cancel service for expired payment transactions
 * 
 * Automatically cancels transactions older than 24 hours that are still pending
 */
export class AutoCancelJob {
  private isRunning: boolean = false
  private cronJob: any | null = null

  constructor() {
    // Don't setup job during build time
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      this.setupJob()
    }
  }

  private setupJob() {
    // Run every hour to check for expired transactions
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.executeJob()
    })

    logger.info({ schedule: '0 * * * *' }, 'Auto-cancel job scheduled to run every hour')
    logger.info({}, 'Auto-cancel scheduler: ACTIVE')
    logger.debug({}, 'Next scheduled run: Checks for transactions older than 24 hours')
  }

  async executeJob() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    const jobId = `auto-cancel-${Date.now()}`

    const result = await JobErrorHandler.withJobErrorHandling(
      async () => {
        const twentyFourHoursAgo = new Date()
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

        const expiredTransactions = await SecureServiceRoleWrapper.executeSecureOperation(
          {
            userId: 'system',
            operation: 'get_expired_payment_transactions',
            reason: 'Auto-cancel service finding payment transactions older than 24 hours for automatic cancellation',
            source: 'AutoCancelJob.executeJob',
            metadata: {
              cutoffTime: twentyFourHoursAgo.toISOString(),
              targetStatus: 'pending',
              operation_type: 'expired_transaction_lookup'
            }
          },
          { table: 'indb_payment_transactions', operationType: 'select' },
          async () => {
            const { data: expiredTransactions, error } = await supabaseAdmin
              .from('indb_payment_transactions')
              .select('*')
              .eq('transaction_status', 'pending')
              .lt('created_at', twentyFourHoursAgo.toISOString())

            if (error) {
              throw error
            }

            return expiredTransactions
          }
        )

        if (!expiredTransactions || expiredTransactions.length === 0) {
          return { successCount: 0, errorCount: 0, totalFound: 0 }
        }

        let successCount = 0
        let errorCount = 0

        for (const transaction of expiredTransactions) {
          try {
            await this.cancelTransaction(transaction)
            successCount++
          } catch (cancelError) {
            errorCount++
          }
        }

        return { successCount, errorCount, totalFound: expiredTransactions.length }
      },
      {
        jobId,
        jobType: 'auto_cancel_expired_transactions',
        jobName: 'Auto-Cancel Expired Transactions',
        metadata: { schedule: '0 * * * *' }
      }
    )

    this.isRunning = false
    return result
  }

  /**
   * Cancel an individual transaction
   */
  private async cancelTransaction(transaction: any): Promise<void> {
    try {
      logger.info({ transactionId: transaction.id }, 'Cancelling transaction')

      // Update transaction status and log history using SecureWrapper
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'cancel_expired_transaction',
          reason: 'Auto-cancel service updating payment transaction status to cancelled and logging history',
          source: 'AutoCancelJob.cancelTransaction',
          metadata: {
            transactionId: transaction.id,
            userId: transaction.user_id,
            reason: 'auto_expired',
            hoursExpired: Math.floor((Date.now() - new Date(transaction.created_at).getTime()) / (1000 * 60 * 60)),
            operation_type: 'transaction_cancellation'
          }
        },
        { table: 'indb_payment_transactions', operationType: 'update' },
        async () => {
          // Update transaction status to cancelled
          const { error: updateError } = await supabaseAdmin
            .from('indb_payment_transactions')
            .update({
              transaction_status: 'cancelled',
              processed_at: new Date().toISOString(),
              gateway_response: {
                ...transaction.gateway_response,
                cancellation_data: {
                  reason: 'auto_expired',
                  cancelled_at: new Date().toISOString(),
                  original_created_at: transaction.created_at,
                  hours_expired: Math.floor((Date.now() - new Date(transaction.created_at).getTime()) / (1000 * 60 * 60))
                }
              },
              notes: transaction.notes ? 
                `${transaction.notes}\n[AUTO-CANCEL] Transaction auto-cancelled after 24 hours` :
                '[AUTO-CANCEL] Transaction auto-cancelled after 24 hours'
            })
            .eq('id', transaction.id)

          if (updateError) {
            throw new Error(`Failed to update transaction status: ${updateError.message}`)
          }

          // Log to transaction history
          const { error: historyError } = await supabaseAdmin
            .from('indb_payment_transactions_history')
            .insert({
              transaction_id: transaction.id,
              old_status: transaction.transaction_status,
              new_status: 'cancelled',
              action_type: 'auto_cancel',
              action_description: 'Transaction automatically cancelled after 24 hours',
              changed_by_type: 'system',
              notes: 'Auto-cancelled by background service due to 24-hour expiry',
              metadata: {
                auto_cancel: true,
                original_created_at: transaction.created_at,
                cancelled_at: new Date().toISOString(),
                reason: 'expired_24_hours'
              }
            })

          if (historyError) {
            logger.warn({ transactionId: transaction.id, error: historyError.message }, 'Failed to log transaction history')
            throw historyError
          }
        }
      )

      // Log activity if user_id exists
      if (transaction.user_id) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'
          const activityResponse = await fetch(`${baseUrl}${ADMIN_ENDPOINTS.ACTIVITY}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SYSTEM_API_KEY || 'system'}`
            },
            credentials: 'include',
            body: JSON.stringify({
              user_id: transaction.user_id,
              event_type: 'payment_cancelled',
              action: `Payment transaction auto-cancelled after 24 hours - ID: ${transaction.id}`,
              metadata: {
                transaction_id: transaction.id,
                payment_method: transaction.payment_method,
                amount: transaction.amount,
                currency: transaction.currency,
                auto_cancelled: true,
                cancellation_reason: 'expired_24_hours'
              }
            })
          })

          if (!activityResponse.ok) {
            logger.warn({ transactionId: transaction.id }, 'Failed to log activity for transaction')
          }
        } catch (activityError) {
          logger.warn({ transactionId: transaction.id, error: activityError instanceof Error ? activityError.message : 'Unknown error' }, 'Activity logging error')
        }
      }

      // Send order expired email using SecureWrapper
      try {
        const emailData = await SecureServiceRoleWrapper.executeSecureOperation(
          {
            userId: 'system',
            operation: 'get_user_and_package_for_expired_email',
            reason: 'Auto-cancel service getting user and package data for sending expiration notification email',
            source: 'AutoCancelJob.cancelTransaction',
            metadata: {
              transactionId: transaction.id,
              userId: transaction.user_id,
              packageId: transaction.package_id,
              operation_type: 'email_notification_data'
            }
          },
          { table: 'indb_auth_user_profiles', operationType: 'select' },
          async () => {
            const { data: userData } = await supabaseAdmin
              .from('indb_auth_user_profiles')
              .select('full_name, email')
              .eq('user_id', transaction.user_id)
              .single()

            const { data: packageData } = await supabaseAdmin
              .from('indb_payment_packages')
              .select('name')
              .eq('id', transaction.package_id)
              .single()

            return { userData, packageData }
          }
        )

        const { userData, packageData } = emailData

        if (userData && packageData) {
          await emailService.sendOrderExpired(userData.email, {
            customerName: userData.full_name || 'Customer',
            orderId: transaction.order_id || transaction.id,
            packageName: packageData.name,
            billingPeriod: transaction.billing_period || 'monthly',
            amount: `IDR ${Number(transaction.amount).toLocaleString('id-ID')}`,
            status: 'Expired',
            expiredDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            subscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://indexnow.studio'}/dashboard/settings/plans-billing`
          })
          logger.info({ transactionId: transaction.id }, 'Order expired email sent')
        }
      } catch (emailError) {
        logger.warn({ transactionId: transaction.id, error: emailError instanceof Error ? emailError.message : 'Unknown error' }, 'Failed to send order expired email')
      }

      logger.info({ transactionId: transaction.id }, 'Transaction cancelled successfully')

    } catch (error) {
      logger.error({ transactionId: transaction.id, error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to cancel transaction')
      throw error
    }
  }

  start() {
    if (this.cronJob) {
      this.cronJob.start()
      logger.info({}, 'Auto-cancel job started')
    }
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop()
      logger.info({}, 'Auto-cancel job stopped')
    }
  }

  getStatus() {
    return {
      isScheduled: !!this.cronJob,
      isRunning: this.isRunning,
      schedule: '0 * * * *', // Every hour
      description: 'Auto-cancels payment transactions older than 24 hours'
    }
  }

  // Manual trigger for testing
  async triggerManually() {
    logger.info({}, 'Manually triggering auto-cancel job')
    await this.executeJob()
  }
}

// Export singleton instance following project pattern
export const autoCancelJob = new AutoCancelJob()
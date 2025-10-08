import * as cron from 'node-cron'
import { BILLING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { JobErrorHandler } from '@/lib/job-management/JobErrorHandler'

export class RecurringBillingJob {
  private cronJob: cron.ScheduledTask | null = null
  private isRunning = false

  constructor() {
    this.setupJob()
  }

  private setupJob() {
    this.cronJob = cron.schedule('0 6 * * *', async () => {
      await this.executeJob()
    })
  }

  async executeJob() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    const jobId = `recurring-billing-${Date.now()}`

    const result = await JobErrorHandler.withJobErrorHandling(
      async () => {
        const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5000'
        const response = await globalThis.fetch(`${apiUrl}${BILLING_ENDPOINTS.MIDTRANS_PROCESS_RECURRING}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SYSTEM_API_KEY || 'system'}`
          },
          credentials: 'include'
        })

        const result = await response.json() as {
          processed?: number
          failed?: number
          error?: string
        }

        if (!response.ok) {
          throw new Error(result.error || 'Recurring billing failed')
        }

        return {
          processed: result.processed || 0,
          failed: result.failed || 0
        }
      },
      {
        jobId,
        jobType: 'recurring_billing',
        jobName: 'Recurring Billing Job',
        metadata: { schedule: '0 6 * * *' }
      }
    )

    this.isRunning = false
    return result
  }

  start() {
    if (this.cronJob) {
      this.cronJob.start()
    }
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop()
    }
  }

  getStatus() {
    return {
      isScheduled: !!this.cronJob,
      isRunning: this.isRunning,
      schedule: '0 6 * * *',
      description: 'Processes recurring payments for active subscriptions'
    }
  }

  async triggerManually() {
    await this.executeJob()
  }
}

export const recurringBillingJob = new RecurringBillingJob()

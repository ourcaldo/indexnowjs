import * as cron from 'node-cron'
import { TrialMonitorService } from './trial-monitor'
import { JobErrorHandler } from './JobErrorHandler'

export class TrialMonitorJob {
  private cronJob: cron.ScheduledTask | null = null
  private isRunning = false

  constructor() {
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      this.setupJob()
    }
  }

  private setupJob() {
    this.cronJob = cron.schedule('*/15 * * * *', async () => {
      await this.executeJob()
    })
  }

  async executeJob() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    const jobId = `trial-monitor-${Date.now()}`

    const result = await JobErrorHandler.withJobErrorHandling(
      async () => {
        await TrialMonitorService.runTrialMonitorJob()
        return { processed: true }
      },
      {
        jobId,
        jobType: 'trial_monitoring',
        jobName: 'Trial Monitoring Job',
        metadata: { schedule: '*/15 * * * *' }
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
      isScheduled: this.cronJob ? true : false,
      isRunning: this.isRunning,
      schedule: '*/15 * * * *',
      description: 'Processes expired trials and sends notifications every 15 minutes'
    }
  }

  async runManually(): Promise<void> {
    await this.executeJob()
  }
}

export const trialMonitorJob = new TrialMonitorJob()

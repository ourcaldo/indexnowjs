import * as cron from 'node-cron'
import { BatchProcessor } from '../job-management/batch-processor'
import { JobErrorHandler } from '../job-management/JobErrorHandler'

export class DailyRankCheckJob {
  private batchProcessor: BatchProcessor
  private isRunning: boolean = false
  private cronJob: any | null = null

  constructor() {
    try {
      this.batchProcessor = new BatchProcessor()
    } catch (error) {
      this.batchProcessor = null as any
    }
  }

  start(): void {
    try {
      if (!this.batchProcessor) {
        return
      }

      this.cronJob = cron.schedule('0 2 * * *', async () => {
        await this.executeJob()
      }, {
        timezone: 'UTC'
      })
    } catch (error) {
      this.cronJob = null
    }
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop()
      this.cronJob = null
    }
  }

  private async executeJob(): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    const jobId = `rank-check-${Date.now()}`
    const startTime = Date.now()
    
    const result = await JobErrorHandler.withJobErrorHandling(
      async () => {
        const initialStats = await this.batchProcessor.getProcessingStats()
        await this.batchProcessor.processDailyRankChecks()
        const finalStats = await this.batchProcessor.getProcessingStats()
        const duration = Math.round((Date.now() - startTime) / 1000)

        return {
          duration,
          initialPending: initialStats.pendingChecks,
          checkedToday: finalStats.checkedToday,
          completionRate: finalStats.completionRate
        }
      },
      {
        jobId,
        jobType: 'daily_rank_check',
        jobName: 'Daily Rank Check Job',
        metadata: { schedule: '0 2 * * *', timezone: 'UTC' }
      }
    )

    this.isRunning = false
  }

  async runManually(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Daily rank check already running')
    }
    await this.executeJob()
  }

  getStatus(): { 
    isScheduled: boolean
    isRunning: boolean
    nextRun: string | null
  } {
    return {
      isScheduled: this.cronJob !== null,
      isRunning: this.isRunning,
      nextRun: this.cronJob ? 'Daily at 2:00 AM UTC' : null
    }
  }

  async getStats(): Promise<any> {
    try {
      if (!this.batchProcessor) {
        return {
          totalKeywords: 0,
          pendingChecks: 0,
          checkedToday: 0,
          completionRate: '0'
        }
      }
      return await this.batchProcessor.getProcessingStats()
    } catch (error) {
      return {
        totalKeywords: 0,
        pendingChecks: 0,
        checkedToday: 0,
        completionRate: '0'
      }
    }
  }
}

export const dailyRankCheckJob = new DailyRankCheckJob()

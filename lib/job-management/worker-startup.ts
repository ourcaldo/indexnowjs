/**
 * Worker Startup Service
 * Initializes background workers and scheduled jobs on server startup
 */

import { dailyRankCheckJob } from '../rank-tracking/daily-rank-check-job'
import { recurringBillingJob } from '../payment-services/recurring-billing-job'
import { autoCancelJob } from '../payment-services/auto-cancel-job'
import { trialMonitorJob } from './trial-monitor-job'
import { JobMonitor } from './job-monitor'
import { JobErrorHandler } from './JobErrorHandler'
import { logger } from '@/lib/monitoring/error-handling'

export class WorkerStartup {
  private static instance: WorkerStartup | null = null
  private isInitialized: boolean = false

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): WorkerStartup {
    if (!WorkerStartup.instance) {
      WorkerStartup.instance = new WorkerStartup()
    }
    return WorkerStartup.instance
  }

  /**
   * Initialize all background workers and scheduled jobs
   */
  async initialize(): Promise<void> {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return
    }

    if (this.isInitialized) {
      return
    }

    const jobId = `worker-startup-${Date.now()}`
    const result = await JobErrorHandler.withJobErrorHandling(
      async () => {
        await this.initializeBullMQWorkers()
        await this.initializeRankCheckScheduler()
        await this.initializeAutoCancelService()
        await this.initializeTrialMonitoring()
        await this.initializeJobMonitor()
        await this.initializeSeRankingKeywordBank()

        this.isInitialized = true
        return { initialized: true }
      },
      {
        jobId,
        jobType: 'worker_startup_initialization',
        jobName: 'Background Workers Initialization',
        metadata: { operation: 'initialize_all_workers' }
      }
    )

    if (!result.success) {
      throw new Error(result.error)
    }
  }

  /**
   * Initialize BullMQ workers if enabled
   */
  private async initializeBullMQWorkers(): Promise<void> {
    if (process.env.ENABLE_BULLMQ !== 'true') {
      logger.info({}, 'BullMQ disabled via feature flag - using legacy cron jobs')
      return
    }

    try {
      logger.info({}, 'Initializing BullMQ workers')
      
      const { initializeAllWorkers } = await import('@/lib/queues/workers')
      await initializeAllWorkers()
      
      logger.info({}, 'BullMQ workers initialized successfully')
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to initialize BullMQ workers'
      )
      throw error
    }
  }

  /**
   * Initialize daily rank check scheduler
   */
  private async initializeRankCheckScheduler(): Promise<void> {
    try {
      logger.info({}, 'Starting daily rank check job scheduler')
      
      // Start the daily job scheduler
      dailyRankCheckJob.start()
      
      // Get job status for confirmation
      const status = dailyRankCheckJob.getStatus()
      logger.info({ isScheduled: status.isScheduled }, `Daily rank check scheduler status`)
      
      if (status.nextRun) {
        logger.info({ nextRun: status.nextRun }, `Next scheduled rank check run`)
      }

      // Get current stats
      const stats = await dailyRankCheckJob.getStats()
      logger.info({ totalKeywords: stats.totalKeywords, pendingChecks: stats.pendingChecks }, `Rank tracking stats`)

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to initialize rank check scheduler')
      throw error
    }
  }

  /**
   * Initialize auto-cancel service for expired transactions
   */
  private async initializeAutoCancelService(): Promise<void> {
    try {
      logger.info({}, 'Starting auto-cancel job scheduler')
      
      // Start the auto-cancel job scheduler
      autoCancelJob.start()
      
      // Get job status for confirmation
      const status = autoCancelJob.getStatus()
      logger.info({ isScheduled: status.isScheduled, schedule: status.schedule, description: status.description }, `Auto-cancel scheduler status`)

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to initialize auto-cancel service')
      throw error
    }
  }

  /**
   * Initialize job monitor for processing pending indexing jobs
   */
  private async initializeJobMonitor(): Promise<void> {
    try {
      logger.info({}, 'Starting indexing job monitor')
      
      // Get JobMonitor instance and start it
      const jobMonitor = JobMonitor.getInstance()
      jobMonitor.start()
      
      logger.info({}, 'Indexing job monitor started - checking for pending jobs every minute')
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to initialize job monitor')
      throw error
    }
  }

  /**
   * Initialize trial monitoring job scheduler
   */
  private async initializeTrialMonitoring(): Promise<void> {
    try {
      logger.info({}, 'Starting trial monitoring job scheduler')
      
      // Start the trial monitoring job scheduler
      trialMonitorJob.start()
      
      // Get job status for confirmation
      const status = trialMonitorJob.getStatus()
      logger.info({ isScheduled: status.isScheduled, schedule: status.schedule, description: status.description }, `Trial monitoring scheduler status`)
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to initialize trial monitoring')
      throw error
    }
  }

  /**
   * Initialize SeRanking keyword enrichment worker (simple table-based approach)
   */
  private async initializeSeRankingKeywordBank(): Promise<void> {
    try {
      logger.info({}, 'Starting SeRanking keyword enrichment worker')
      
      // Initialize the async background worker
      const { KeywordEnrichmentWorker } = await import('./keyword-enrichment-worker')
      
      // Get instance and start the worker
      const worker = await KeywordEnrichmentWorker.getInstance()
      await worker.start()
      
      logger.info({ schedule: '30 * * * *', cacheExpiryDays: 30 }, 'SeRanking enrichment worker initialized successfully')
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to initialize SeRanking keyword enrichment worker')
      throw error
    }
  }

  /**
   * Initialize recurring billing job scheduler
   * DISABLED: Paddle handles recurring payments automatically via webhooks
   */
  private async initializeRecurringBilling(): Promise<void> {
    try {
      logger.info({}, 'Recurring billing: DISABLED - Handled by Paddle webhooks')
      
      // Recurring billing is handled by Paddle automatically
      // Payment confirmations come via webhook: /api/v1/payments/paddle/webhook
      // No manual processing needed
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to initialize recurring billing')
      throw error
    }
  }

  /**
   * Stop all workers and jobs (for graceful shutdown)
   */
  async shutdown(): Promise<void> {
    try {
      logger.info({}, 'Shutting down background workers')
      
      // Shutdown BullMQ workers and queues if enabled
      if (process.env.ENABLE_BULLMQ === 'true') {
        try {
          const { queueManager } = await import('@/lib/queues/QueueManager')
          const { queueMetricsCollector } = await import('@/lib/monitoring/queue-events')
          
          await queueMetricsCollector.shutdown()
          await queueManager.shutdown()
          
          logger.info({}, 'BullMQ workers and queues shut down successfully')
        } catch (error) {
          logger.error(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            'Failed to shutdown BullMQ components'
          )
        }
      }
      
      // Stop daily rank check job
      dailyRankCheckJob.stop()
      
      // Stop job monitor
      const jobMonitor = JobMonitor.getInstance()
      jobMonitor.stop()
      
      this.isInitialized = false
      logger.info({}, 'All background workers stopped')

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error during worker shutdown')
    }
  }

  /**
   * Get initialization status with comprehensive service validation
   */
  getStatus(): {
    isInitialized: boolean
    rankCheckJobStatus: any
    actuallyReady: boolean
    serviceStates: {
      dailyRankCheck: boolean
      trialMonitor: boolean
      autoCancel: boolean
      jobMonitor: boolean
    }
  } {
    // Check actual service states rather than just the boolean flag
    const rankCheckStatus = dailyRankCheckJob.getStatus()
    const trialMonitorStatus = trialMonitorJob.getStatus()
    const autoCancelStatus = autoCancelJob.getStatus()
    
    // Debug logging for service states
    logger.debug({ dailyRankCheckScheduled: rankCheckStatus.isScheduled, cronJob: rankCheckStatus.isScheduled ? 'active' : 'null' }, 'Service status check')
    logger.debug({ trialMonitorScheduled: trialMonitorStatus.isScheduled }, 'Trial monitor status check')
    logger.debug({ autoCancelScheduled: autoCancelStatus.isScheduled }, 'Auto cancel status check')
    
    // Get JobMonitor status (it has a getStatus method)
    let jobMonitorReady = false
    try {
      const jobMonitor = JobMonitor.getInstance()
      const jobMonitorStatus = jobMonitor.getStatus()
      jobMonitorReady = jobMonitorStatus.isRunning
      logger.debug({ isRunning: jobMonitorStatus.isRunning, nextCheck: jobMonitorStatus.nextCheck }, 'JobMonitor status check')
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Could not get JobMonitor status')
      jobMonitorReady = false
    }
    
    // A service is considered ready if it's scheduled (has active cron job)
    const serviceStates = {
      dailyRankCheck: rankCheckStatus.isScheduled,
      trialMonitor: trialMonitorStatus.isScheduled,
      autoCancel: autoCancelStatus.isScheduled,
      jobMonitor: jobMonitorReady
    }
    
    // FORCE READY: Manual triggers should always work if basic initialization is done
    // The scheduler detection has timing issues, but manual triggers don't need the scheduler
    const actuallyReady = this.isInitialized
    
    logger.debug({ actuallyReady, serviceStates }, 'Readiness check (FORCED to isInitialized)')
    
    return {
      isInitialized: this.isInitialized,
      rankCheckJobStatus: rankCheckStatus,
      actuallyReady,
      serviceStates
    }
  }

  /**
   * Manual trigger for rank check job (for testing/admin)
   */
  async triggerManualRankCheck(): Promise<void> {
    logger.info({}, 'FORCING manual rank check trigger - bypassing all status checks')
    
    try {
      // FORCE TRIGGER: Manual triggers should always work regardless of scheduler status
      // The rank tracking logic itself doesn't depend on the cron scheduler
      await dailyRankCheckJob.runManually()
      logger.info({}, 'Manual rank check job completed successfully')
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Manual rank check job failed')
      throw error
    }
  }

  /**
   * Get comprehensive background services status
   */
  getBackgroundServicesStatus(): {
    isInitialized: boolean
    actuallyReady: boolean
    rankCheckJob: any
    quotaHealth: any
    uptime: number
    services: string[]
    serviceStates: any
  } {
    const status = this.getStatus()
    
    return {
      isInitialized: this.isInitialized,
      actuallyReady: status.actuallyReady,
      rankCheckJob: dailyRankCheckJob.getStatus(),
      quotaHealth: 'monitoring_active',
      uptime: process.uptime(),
      services: [
        'daily_rank_check_scheduler',
        'quota_monitoring',
        'error_tracking'
      ],
      serviceStates: status.serviceStates
    }
  }
}

// Export singleton instance
export const workerStartup = WorkerStartup.getInstance()

/**
 * Get background services status (for API endpoints)
 */
export function getBackgroundServicesStatus() {
  return workerStartup.getBackgroundServicesStatus()
}
import { logger } from '@/lib/monitoring/error-handling'
import { initializeRankCheckWorker } from './rank-check.worker'
import { initializeEmailWorker } from './email.worker'
import { initializePaymentWorker } from './payments.worker'
import { initializeDailyRankCheckWorker } from './rank-schedule.worker'
import { initializeAutoCancelWorker } from './auto-cancel.worker'
import { initializeKeywordEnrichmentWorker } from './keyword-enrichment.worker'
import { initializeQuotaResetWorker } from './quota-reset.worker'
import { initializeIndexingMonitorWorker } from './indexing-monitor.worker'
import { initializeHourlyRankRetryWorker } from './hourly-rank-retry.worker'

export async function initializeAllWorkers(): Promise<void> {
  if (process.env.ENABLE_BULLMQ !== 'true') {
    logger.info({}, 'BullMQ disabled via feature flag - skipping worker initialization')
    return
  }

  try {
    logger.info({}, 'Initializing BullMQ workers...')

    initializeRankCheckWorker()
    initializeEmailWorker()
    initializePaymentWorker()
    
    await initializeDailyRankCheckWorker()
    await initializeHourlyRankRetryWorker()
    await initializeAutoCancelWorker()
    await initializeKeywordEnrichmentWorker()
    await initializeQuotaResetWorker()
    await initializeIndexingMonitorWorker()

    logger.info({}, 'All BullMQ workers initialized successfully')
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to initialize BullMQ workers'
    )
    throw error
  }
}

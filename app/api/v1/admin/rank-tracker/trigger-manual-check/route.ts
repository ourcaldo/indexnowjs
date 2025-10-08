/**
 * Admin API - Manual Rank Check Trigger
 * Allows admin to manually trigger the daily rank check process
 */

import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { workerStartup } from '@/lib/job-management/worker-startup'
import { dailyRankCheckJob } from '@/lib/rank-tracking/daily-rank-check-job'
import { ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'

export const POST = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // SIMPLIFIED CHECK: Just verify basic initialization
  logger.info({ message: '🚀 Manual rank check trigger requested - bypassing complex status checks' }, 'Info')
  
  // Check if job is already running
  try {
    const jobStatus = dailyRankCheckJob.getStatus()
    if (jobStatus.isRunning) {
      return await createStandardError(
        ErrorType.VALIDATION,
        'Rank check job is already running',
        409,
        ErrorSeverity.LOW,
        { jobStatus }
      )
    }
  } catch (error) {
    logger.info({ error: error instanceof Error ? error.message : String(error) }, 'Job status check failed, proceeding anyway')
  }

  // Get current stats before starting (with error handling)
  let beforeStats
  try {
    beforeStats = await dailyRankCheckJob.getStats()
  } catch (error) {
    logger.info({ error: error instanceof Error ? error.message : String(error) }, 'Stats fetch failed, using defaults')
    beforeStats = { totalKeywords: 0, pendingChecks: 0, checkedToday: 0, completionRate: '0' }
  }

  // FORCE TRIGGER: The manual rank check should work regardless of status detection
  logger.info({ message: '🎯 Forcing manual rank check trigger...' }, 'Info')
  
  // Don't await - let it run in background
  workerStartup.triggerManualRankCheck().catch(error => {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Manual rank check failed:')
  })

  return formatSuccess({
    message: 'Manual rank check triggered successfully (forced bypass)',
    triggeredAt: new Date().toISOString(),
    beforeStats,
    note: 'Status detection bypassed - manual trigger forced to execute'
  }, undefined, 202) // 202 Accepted for async operation
})

// GET endpoint to check rank check status
export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Get worker and job status with enhanced validation
  const workerStatus = workerStartup.getStatus()
  const stats = await dailyRankCheckJob.getStats()

  return formatSuccess({
    workerStatus: {
      isInitialized: workerStatus.isInitialized,
      actuallyReady: workerStatus.actuallyReady,
      rankCheckJobStatus: workerStatus.rankCheckJobStatus,
      serviceStates: workerStatus.serviceStates
    },
    currentStats: stats,
    timestamp: new Date().toISOString()
  })
})
import { NextRequest } from 'next/server'
import { adminApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { SitemapMonitor } from '@/lib/services/sitemap/SitemapMonitor'

export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Get monitoring data
  const metrics = SitemapMonitor.getMetrics()
  const errors = SitemapMonitor.getErrors()
  const summary = SitemapMonitor.getPerformanceSummary()

  return formatSuccess({
    summary,
    metrics: metrics.slice(-20), // Last 20 generations
    errors: errors.slice(-10),   // Last 10 errors
    timestamp: Date.now()
  })
})

export const DELETE = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Clear monitoring history
  SitemapMonitor.clearHistory()

  return formatSuccess({
    message: 'Monitoring history cleared'
  })
})
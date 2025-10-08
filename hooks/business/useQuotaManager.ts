'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabaseBrowser } from '@/lib/database'
import { AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface QuotaInfo {
  user_id: string
  daily_quota_limit: number
  daily_quota_used: number
  daily_quota_remaining: number
  daily_quota_reset_date: string
  monthly_quota_limit?: number
  monthly_quota_used?: number
  monthly_quota_remaining?: number
  is_unlimited: boolean
  package_id: string
  package_name: string
  reset_hours_remaining: number
}

interface QuotaUsageHistory {
  date: string
  quota_used: number
  quota_limit: number
  usage_percentage: number
  api_calls: number
  successful_calls: number
  failed_calls: number
}

interface QuotaAlert {
  id: string
  user_id: string
  alert_type: 'warning' | 'critical' | 'exhausted'
  threshold: number
  triggered_at: string
  acknowledged: boolean
  message: string
}

interface UseQuotaManagerReturn {
  // Core data
  quotaInfo: QuotaInfo | null
  usageHistory: QuotaUsageHistory[]
  quotaAlerts: QuotaAlert[]
  
  // State
  loading: boolean
  error: string | null
  
  // Status checks
  isQuotaExhausted: boolean
  isQuotaNearLimit: boolean // >80%
  isQuotaCritical: boolean // >95%
  canPerformAction: (requiredQuota: number) => boolean
  
  // Actions
  fetchQuotaInfo: () => Promise<void>
  fetchUsageHistory: (days?: number) => Promise<void>
  fetchQuotaAlerts: () => Promise<void>
  acknowledgeAlert: (alertId: string) => Promise<{ success: boolean; error?: string }>
  requestQuotaIncrease: (reason: string, requestedAmount: number) => Promise<{ success: boolean; error?: string }>
  
  // Utilities
  getUsagePercentage: () => number
  getHoursUntilReset: () => number
  getProjectedUsage: () => number // Based on current usage trend
  formatQuotaDisplay: () => string
  getUsageTrend: (days?: number) => 'increasing' | 'decreasing' | 'stable'
}

export function useQuotaManager(): UseQuotaManagerReturn {
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null)
  const [usageHistory, setUsageHistory] = useState<QuotaUsageHistory[]>([])
  const [quotaAlerts, setQuotaAlerts] = useState<QuotaAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const lastFetchTime = useRef<number>(0)
  const CACHE_DURATION = 30 * 1000 // 30 seconds for quota info

  // Fetch current quota information
  const fetchQuotaInfo = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check cache for quota info
      const now = Date.now()
      if (now - lastFetchTime.current < CACHE_DURATION && quotaInfo) {
        setLoading(false)
        return
      }

      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(AUTH_ENDPOINTS.QUOTA, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch quota info: ${response.status}`)
      }

      const data = await response.json()
      setQuotaInfo(data.quota)
      
      lastFetchTime.current = now
    } catch (err) {
      console.error('Error fetching quota info:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch quota info')
    } finally {
      setLoading(false)
    }
  }, [quotaInfo])

  // Fetch quota usage history
  const fetchUsageHistory = useCallback(async (days = 30) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(AUTH_ENDPOINTS.QUOTA_HISTORY(days), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setUsageHistory(data.history || [])
      }
    } catch (err) {
      console.error('Error fetching usage history:', err)
    }
  }, [])

  // Fetch quota alerts
  const fetchQuotaAlerts = useCallback(async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(AUTH_ENDPOINTS.QUOTA_ALERTS, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setQuotaAlerts(data.alerts || [])
      }
    } catch (err) {
      console.error('Error fetching quota alerts:', err)
    }
  }, [])

  // Acknowledge quota alert
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(AUTH_ENDPOINTS.QUOTA_ALERT_ACKNOWLEDGE(alertId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Failed to acknowledge alert: ${response.status}` }
      }

      // Update local state
      setQuotaAlerts(prevAlerts =>
        prevAlerts.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      )

      return { success: true }
    } catch (err) {
      console.error('Error acknowledging alert:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to acknowledge alert' }
    }
  }, [])

  // Request quota increase
  const requestQuotaIncrease = useCallback(async (reason: string, requestedAmount: number) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(AUTH_ENDPOINTS.QUOTA_INCREASE_REQUEST, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ reason, requestedAmount })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Failed to request quota increase: ${response.status}` }
      }

      return { success: true }
    } catch (err) {
      console.error('Error requesting quota increase:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to request quota increase' }
    }
  }, [])

  // Computed properties
  const isQuotaExhausted = Boolean(quotaInfo && quotaInfo.daily_quota_remaining <= 0 && !quotaInfo.is_unlimited)
  const isQuotaNearLimit = Boolean(quotaInfo && !quotaInfo.is_unlimited && (quotaInfo.daily_quota_used / quotaInfo.daily_quota_limit) > 0.8)
  const isQuotaCritical = Boolean(quotaInfo && !quotaInfo.is_unlimited && (quotaInfo.daily_quota_used / quotaInfo.daily_quota_limit) > 0.95)

  // Check if user can perform action
  const canPerformAction = useCallback((requiredQuota: number) => {
    if (!quotaInfo) return false
    if (quotaInfo.is_unlimited) return true
    return quotaInfo.daily_quota_remaining >= requiredQuota
  }, [quotaInfo])

  // Utility functions
  const getUsagePercentage = useCallback(() => {
    if (!quotaInfo || quotaInfo.is_unlimited) return 0
    return Math.min(100, (quotaInfo.daily_quota_used / quotaInfo.daily_quota_limit) * 100)
  }, [quotaInfo])

  const getHoursUntilReset = useCallback(() => {
    return quotaInfo?.reset_hours_remaining || 0
  }, [quotaInfo])

  const getProjectedUsage = useCallback(() => {
    if (!quotaInfo || !usageHistory.length || quotaInfo.is_unlimited) return 0

    // Calculate average daily usage from last 7 days
    const recentHistory = usageHistory.slice(0, 7)
    const averageDailyUsage = recentHistory.reduce((sum, day) => sum + day.quota_used, 0) / recentHistory.length

    // Project usage based on current trend
    const hoursInDay = 24
    const hoursElapsed = hoursInDay - quotaInfo.reset_hours_remaining
    const currentRate = quotaInfo.daily_quota_used / Math.max(1, hoursElapsed)

    return Math.round(currentRate * hoursInDay)
  }, [quotaInfo, usageHistory])

  const formatQuotaDisplay = useCallback(() => {
    if (!quotaInfo) return 'Loading...'
    if (quotaInfo.is_unlimited) return 'Unlimited'
    
    return `${quotaInfo.daily_quota_used.toLocaleString()} / ${quotaInfo.daily_quota_limit.toLocaleString()}`
  }, [quotaInfo])

  const getUsageTrend = useCallback((days = 7) => {
    if (usageHistory.length < days) return 'stable'

    const recentPeriod = usageHistory.slice(0, Math.floor(days / 2))
    const olderPeriod = usageHistory.slice(Math.floor(days / 2), days)

    const recentAverage = recentPeriod.reduce((sum, day) => sum + day.usage_percentage, 0) / recentPeriod.length
    const olderAverage = olderPeriod.reduce((sum, day) => sum + day.usage_percentage, 0) / olderPeriod.length

    const difference = recentAverage - olderAverage

    if (difference > 5) return 'increasing'
    if (difference < -5) return 'decreasing'
    return 'stable'
  }, [usageHistory])

  // Initial load and periodic refresh
  useEffect(() => {
    fetchQuotaInfo()
    fetchUsageHistory()
    fetchQuotaAlerts()

    // Refresh quota info every 30 seconds
    const quotaInterval = setInterval(fetchQuotaInfo, 30000)
    
    // Refresh usage history every 5 minutes
    const historyInterval = setInterval(() => fetchUsageHistory(), 5 * 60 * 1000)
    
    // Refresh alerts every 2 minutes
    const alertsInterval = setInterval(fetchQuotaAlerts, 2 * 60 * 1000)

    return () => {
      clearInterval(quotaInterval)
      clearInterval(historyInterval)
      clearInterval(alertsInterval)
    }
  }, [fetchQuotaInfo, fetchUsageHistory, fetchQuotaAlerts])

  return {
    quotaInfo,
    usageHistory,
    quotaAlerts,
    loading,
    error,
    isQuotaExhausted,
    isQuotaNearLimit,
    isQuotaCritical,
    canPerformAction,
    fetchQuotaInfo,
    fetchUsageHistory,
    fetchQuotaAlerts,
    acknowledgeAlert,
    requestQuotaIncrease,
    getUsagePercentage,
    getHoursUntilReset,
    getProjectedUsage,
    formatQuotaDisplay,
    getUsageTrend
  }
}
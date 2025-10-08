'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/database'
import { DASHBOARD_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface QuotaInfo {
  daily_quota_used: number
  daily_quota_limit: number
  is_unlimited: boolean
  quota_exhausted: boolean
  daily_limit_reached: boolean
  package_name: string
  remaining_quota: number
  total_quota_used: number
  total_quota_limit: number
  service_account_count: number
}

interface QuotaNotification {
  id: string
  type: string
  title: string
  message: string
  metadata: {
    service_account_name: string
    service_account_email: string
    quota_reset_time: string
  }
  created_at: string
}

interface QuotaData {
  quotaInfo: QuotaInfo | null
  notifications: QuotaNotification[]
  loading: boolean
  lastFetchTime: number
}

// Global quota state that persists across components
let globalQuotaData: QuotaData = {
  quotaInfo: null,
  notifications: [],
  loading: false,
  lastFetchTime: 0
}

// Subscribers for quota updates
const quotaSubscribers = new Set<(data: QuotaData) => void>()

// Minimum time between API calls (30 seconds)
const MIN_FETCH_INTERVAL = 30000

export function useGlobalQuotaManager() {
  const [quotaData, setQuotaData] = useState<QuotaData>(globalQuotaData)
  const fetchTimeoutRef = useRef<NodeJS.Timeout>()

  // Subscribe to global quota updates
  useEffect(() => {
    const updateSubscriber = (data: QuotaData) => setQuotaData(data)
    quotaSubscribers.add(updateSubscriber)
    
    return () => {
      quotaSubscribers.delete(updateSubscriber)
    }
  }, [])

  // Notify all subscribers of quota updates
  const notifySubscribers = useCallback((data: QuotaData) => {
    globalQuotaData = data
    quotaSubscribers.forEach(subscriber => subscriber(data))
  }, [])

  // Fetch quota data with intelligent caching
  const fetchQuotaData = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    
    // Skip if we fetched recently and not forcing refresh
    if (!forceRefresh && (now - globalQuotaData.lastFetchTime) < MIN_FETCH_INTERVAL) {
      return globalQuotaData
    }

    // Skip if already loading
    if (globalQuotaData.loading) {
      return globalQuotaData
    }

    try {
      const newData = { ...globalQuotaData, loading: true, lastFetchTime: now }
      notifySubscribers(newData)

      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        const errorData = { ...globalQuotaData, loading: false }
        notifySubscribers(errorData)
        return errorData
      }

      // Use merged dashboard endpoint for better performance
      const dashboardResponse = await fetch(DASHBOARD_ENDPOINTS.MAIN, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      let quotaInfo = globalQuotaData.quotaInfo
      let notifications = globalQuotaData.notifications

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json()
        quotaInfo = dashboardData.user?.quota || quotaInfo
        notifications = dashboardData.notifications || notifications
      }

      const updatedData = {
        quotaInfo,
        notifications,
        loading: false,
        lastFetchTime: now
      }

      notifySubscribers(updatedData)
      return updatedData

    } catch (error) {
      console.error('Failed to fetch quota data:', error)
      const errorData = { ...globalQuotaData, loading: false }
      notifySubscribers(errorData)
      return errorData
    }
  }, [notifySubscribers])

  // Fetch quota only when specifically requested
  const refreshQuota = useCallback(() => {
    return fetchQuotaData(true)
  }, [fetchQuotaData])

  // Check if quota allows job creation
  const canCreateJob = useCallback((urlCount: number = 1) => {
    if (!globalQuotaData.quotaInfo) return { allowed: true, reason: null }
    
    const { quota_exhausted, daily_limit_reached, remaining_quota, is_unlimited } = globalQuotaData.quotaInfo
    
    if (quota_exhausted || daily_limit_reached) {
      return { allowed: false, reason: 'Daily quota limit reached' }
    }
    
    if (!is_unlimited && remaining_quota < urlCount) {
      return { allowed: false, reason: `Insufficient quota. Need ${urlCount}, have ${remaining_quota}` }
    }
    
    return { allowed: true, reason: null }
  }, [])

  return {
    quotaInfo: quotaData.quotaInfo,
    notifications: quotaData.notifications,
    loading: quotaData.loading,
    refreshQuota,
    canCreateJob,
    lastFetchTime: quotaData.lastFetchTime
  }
}

// WebSocket quota update handler (to be called from global WebSocket)
export function updateQuotaFromWebSocket(quotaUpdate: Partial<QuotaInfo>) {
  if (globalQuotaData.quotaInfo) {
    const updatedQuotaInfo = { ...globalQuotaData.quotaInfo, ...quotaUpdate }
    const updatedData = { ...globalQuotaData, quotaInfo: updatedQuotaInfo }
    globalQuotaData = updatedData
    quotaSubscribers.forEach(subscriber => subscriber(updatedData))
  }
}
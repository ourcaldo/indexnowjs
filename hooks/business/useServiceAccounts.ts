'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabaseBrowser } from '@/lib/database'
import { GOOGLE_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface ServiceAccount {
  id: string
  user_id: string
  name: string
  email: string
  project_id: string
  private_key_id: string
  is_active: boolean
  daily_quota_limit: number
  minute_quota_limit: number
  daily_quota_used: number
  minute_quota_used: number
  last_used_at?: string
  created_at: string
  updated_at: string
  health_status: 'healthy' | 'warning' | 'error' | 'unknown'
  last_error?: string
  total_requests: number
  successful_requests: number
  failed_requests: number
}

interface ServiceAccountUsage {
  service_account_id: string
  date: string
  requests_made: number
  requests_successful: number
  requests_failed: number
  quota_used: number
  errors: Array<{
    error_code: string
    error_message: string
    count: number
  }>
}

interface ServiceAccountStats {
  total_accounts: number
  active_accounts: number
  healthy_accounts: number
  warning_accounts: number
  error_accounts: number
  total_requests_today: number
  success_rate: number
  average_quota_usage: number
}

interface UseServiceAccountsReturn {
  // Core data
  serviceAccounts: ServiceAccount[]
  accountStats: ServiceAccountStats | null
  usageHistory: ServiceAccountUsage[]
  
  // State
  loading: boolean
  error: string | null
  
  // Actions
  fetchServiceAccounts: () => Promise<void>
  addServiceAccount: (accountData: FormData) => Promise<{ success: boolean; accountId?: string; error?: string }>
  updateServiceAccount: (accountId: string, updates: Partial<ServiceAccount>) => Promise<{ success: boolean; error?: string }>
  deleteServiceAccount: (accountId: string) => Promise<{ success: boolean; error?: string }>
  toggleServiceAccount: (accountId: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>
  testServiceAccount: (accountId: string) => Promise<{ success: boolean; error?: string }>
  
  // Quota management
  resetQuota: (accountId: string) => Promise<{ success: boolean; error?: string }>
  updateQuotaLimits: (accountId: string, dailyLimit: number, minuteLimit: number) => Promise<{ success: boolean; error?: string }>
  
  // Analytics
  fetchUsageHistory: (accountId?: string, days?: number) => Promise<void>
  fetchAccountStats: () => Promise<void>
  
  // Utilities
  getHealthyAccounts: () => ServiceAccount[]
  getAccountsWithErrors: () => ServiceAccount[]
  getBestPerformingAccount: () => ServiceAccount | null
  getAccountUsagePercentage: (accountId: string) => number
  canAccountHandleRequest: (accountId: string, requestCount?: number) => boolean
  getNextAvailableAccount: () => ServiceAccount | null
}

export function useServiceAccounts(): UseServiceAccountsReturn {
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([])
  const [accountStats, setAccountStats] = useState<ServiceAccountStats | null>(null)
  const [usageHistory, setUsageHistory] = useState<ServiceAccountUsage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const lastFetchTime = useRef<number>(0)
  const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

  // Fetch all service accounts
  const fetchServiceAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check cache
      const now = Date.now()
      if (now - lastFetchTime.current < CACHE_DURATION && serviceAccounts.length > 0) {
        setLoading(false)
        return
      }

      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(GOOGLE_ENDPOINTS.SERVICE_ACCOUNTS, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch service accounts: ${response.status}`)
      }

      const data = await response.json()
      setServiceAccounts(data.accounts || [])
      
      lastFetchTime.current = now
    } catch (err) {
      console.error('Error fetching service accounts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch service accounts')
    } finally {
      setLoading(false)
    }
  }, [serviceAccounts.length])

  // Add new service account
  const addServiceAccount = useCallback(async (accountData: FormData) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(GOOGLE_ENDPOINTS.SERVICE_ACCOUNTS, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: accountData,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Failed to add service account: ${response.status}` }
      }

      const data = await response.json()
      
      // Refresh service accounts list
      await fetchServiceAccounts()
      
      return { success: true, accountId: data.account?.id }
    } catch (err) {
      console.error('Error adding service account:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add service account' }
    }
  }, [fetchServiceAccounts])

  // Update service account
  const updateServiceAccount = useCallback(async (accountId: string, updates: Partial<ServiceAccount>) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(GOOGLE_ENDPOINTS.SERVICE_ACCOUNT_BY_ID(accountId), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Failed to update service account: ${response.status}` }
      }

      // Update local state
      setServiceAccounts(prevAccounts =>
        prevAccounts.map(account =>
          account.id === accountId ? { ...account, ...updates } : account
        )
      )

      return { success: true }
    } catch (err) {
      console.error('Error updating service account:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update service account' }
    }
  }, [])

  // Delete service account
  const deleteServiceAccount = useCallback(async (accountId: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(GOOGLE_ENDPOINTS.SERVICE_ACCOUNT_BY_ID(accountId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Failed to delete service account: ${response.status}` }
      }

      // Remove from local state
      setServiceAccounts(prevAccounts => 
        prevAccounts.filter(account => account.id !== accountId)
      )

      return { success: true }
    } catch (err) {
      console.error('Error deleting service account:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete service account' }
    }
  }, [])

  // Toggle service account active status
  const toggleServiceAccount = useCallback(async (accountId: string, isActive: boolean) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(GOOGLE_ENDPOINTS.SERVICE_ACCOUNT_TOGGLE(accountId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Failed to toggle service account: ${response.status}` }
      }

      // Update local state
      setServiceAccounts(prevAccounts =>
        prevAccounts.map(account =>
          account.id === accountId ? { ...account, is_active: isActive } : account
        )
      )

      return { success: true }
    } catch (err) {
      console.error('Error toggling service account:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to toggle service account' }
    }
  }, [])

  // Test service account connectivity
  const testServiceAccount = useCallback(async (accountId: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(GOOGLE_ENDPOINTS.SERVICE_ACCOUNT_TEST(accountId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Service account test failed: ${response.status}` }
      }

      // Refresh service accounts to get updated health status
      await fetchServiceAccounts()

      return { success: true }
    } catch (err) {
      console.error('Error testing service account:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to test service account' }
    }
  }, [fetchServiceAccounts])

  // Reset service account quota
  const resetQuota = useCallback(async (accountId: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(GOOGLE_ENDPOINTS.SERVICE_ACCOUNT_RESET_QUOTA(accountId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Failed to reset quota: ${response.status}` }
      }

      // Refresh service accounts to get updated quota usage
      await fetchServiceAccounts()

      return { success: true }
    } catch (err) {
      console.error('Error resetting quota:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to reset quota' }
    }
  }, [fetchServiceAccounts])

  // Update quota limits
  const updateQuotaLimits = useCallback(async (accountId: string, dailyLimit: number, minuteLimit: number) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(GOOGLE_ENDPOINTS.SERVICE_ACCOUNT_QUOTA_LIMITS(accountId), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dailyLimit, minuteLimit }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Failed to update quota limits: ${response.status}` }
      }

      // Update local state
      setServiceAccounts(prevAccounts =>
        prevAccounts.map(account =>
          account.id === accountId 
            ? { ...account, daily_quota_limit: dailyLimit, minute_quota_limit: minuteLimit }
            : account
        )
      )

      return { success: true }
    } catch (err) {
      console.error('Error updating quota limits:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update quota limits' }
    }
  }, [])

  // Fetch usage history
  const fetchUsageHistory = useCallback(async (accountId?: string, days = 30) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const queryParams = new URLSearchParams({ days: days.toString() })
      if (accountId) queryParams.append('accountId', accountId)

      const response = await fetch(`${GOOGLE_ENDPOINTS.SERVICE_ACCOUNT_USAGE}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setUsageHistory(data.usage || [])
      }
    } catch (err) {
      console.error('Error fetching usage history:', err)
    }
  }, [])

  // Fetch account statistics
  const fetchAccountStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(GOOGLE_ENDPOINTS.SERVICE_ACCOUNT_STATS, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setAccountStats(data.stats)
      }
    } catch (err) {
      console.error('Error fetching account stats:', err)
    }
  }, [])

  // Utility functions
  const getHealthyAccounts = useCallback(() => {
    return serviceAccounts.filter(account => 
      account.is_active && account.health_status === 'healthy'
    )
  }, [serviceAccounts])

  const getAccountsWithErrors = useCallback(() => {
    return serviceAccounts.filter(account => 
      account.health_status === 'error' || account.health_status === 'warning'
    )
  }, [serviceAccounts])

  const getBestPerformingAccount = useCallback(() => {
    const healthyAccounts = getHealthyAccounts()
    if (healthyAccounts.length === 0) return null

    // Find account with lowest quota usage percentage
    return healthyAccounts.reduce((best, account) => {
      const accountUsage = (account.daily_quota_used / account.daily_quota_limit) * 100
      const bestUsage = (best.daily_quota_used / best.daily_quota_limit) * 100
      return accountUsage < bestUsage ? account : best
    })
  }, [getHealthyAccounts])

  const getAccountUsagePercentage = useCallback((accountId: string) => {
    const account = serviceAccounts.find(acc => acc.id === accountId)
    if (!account) return 0
    return Math.min(100, (account.daily_quota_used / account.daily_quota_limit) * 100)
  }, [serviceAccounts])

  const canAccountHandleRequest = useCallback((accountId: string, requestCount = 1) => {
    const account = serviceAccounts.find(acc => acc.id === accountId)
    if (!account || !account.is_active || account.health_status === 'error') return false
    
    return (account.daily_quota_limit - account.daily_quota_used) >= requestCount
  }, [serviceAccounts])

  const getNextAvailableAccount = useCallback(() => {
    const healthyAccounts = getHealthyAccounts()
    if (healthyAccounts.length === 0) return null

    // Find account with most remaining quota
    return healthyAccounts.reduce((best, account) => {
      const accountRemaining = account.daily_quota_limit - account.daily_quota_used
      const bestRemaining = best.daily_quota_limit - best.daily_quota_used
      return accountRemaining > bestRemaining ? account : best
    })
  }, [getHealthyAccounts])

  // Initial load and periodic refresh
  useEffect(() => {
    fetchServiceAccounts()
    fetchAccountStats()
    fetchUsageHistory()

    // Refresh every 2 minutes
    const refreshInterval = setInterval(() => {
      fetchServiceAccounts()
      fetchAccountStats()
    }, 2 * 60 * 1000)

    return () => {
      clearInterval(refreshInterval)
    }
  }, [fetchServiceAccounts, fetchAccountStats, fetchUsageHistory])

  return {
    serviceAccounts,
    accountStats,
    usageHistory,
    loading,
    error,
    fetchServiceAccounts,
    addServiceAccount,
    updateServiceAccount,
    deleteServiceAccount,
    toggleServiceAccount,
    testServiceAccount,
    resetQuota,
    updateQuotaLimits,
    fetchUsageHistory,
    fetchAccountStats,
    getHealthyAccounts,
    getAccountsWithErrors,
    getBestPerformingAccount,
    getAccountUsagePercentage,
    canAccountHandleRequest,
    getNextAvailableAccount
  }
}
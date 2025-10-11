'use client'

import { useState, useEffect, useCallback } from 'react'
import { ADMIN_ENDPOINTS, BILLING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface UserProfile {
  id: string
  user_id: string
  full_name: string | null
  role: string
  email_notifications: boolean
  created_at: string
  updated_at: string
  phone_number: string | null
  package_id?: string
  subscribed_at?: string
  subscription_ends_at?: string
  daily_quota_used?: number
  daily_quota_limit?: number
  daily_quota_reset_date?: string
  package?: {
    id: string
    name: string
    slug: string
    description: string
    price: number
    currency: string
    billing_period: string
    features: string[]
  }
  email?: string
  email_confirmed_at?: string
  last_sign_in_at?: string
}

interface ActivityLog {
  id: string
  event_type: string
  event_description: string
  ip_address?: string
  user_agent?: string
  metadata?: any
  created_at: string
}

interface SecurityData {
  ipAddresses: Array<{
    ip: string
    lastUsed: string
    usageCount: number
  }>
  locations: string[]
  loginAttempts: {
    total: number
    successful: number
    failed: number
    recent: Array<{
      success: boolean
      timestamp: string
      ip_address?: string
      device_info?: any
    }>
  }
  activity: {
    lastActivity: string | null
    firstSeen: string | null
    totalActivities: number
  }
  securityScore: number
  riskLevel: 'low' | 'medium' | 'high'
}

interface Package {
  id: string
  name: string
  slug: string
  description: string
  price: number
  currency: string
  billing_period: string
}

interface UseUserDataReturn {
  user: UserProfile | null
  activityLogs: ActivityLog[]
  securityData: SecurityData | null
  availablePackages: Package[]
  loading: boolean
  activityLoading: boolean
  securityLoading: boolean
  fetchUser: () => Promise<void>
  fetchUserActivity: () => Promise<void>
  fetchUserSecurity: () => Promise<void>
}

export function useUserData(userId: string): UseUserDataReturn {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [securityData, setSecurityData] = useState<SecurityData | null>(null)
  const [availablePackages, setAvailablePackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(false)
  const [securityLoading, setSecurityLoading] = useState(false)

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(ADMIN_ENDPOINTS.USER_BY_ID(userId), {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.data?.user)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchUserActivity = useCallback(async () => {
    try {
      setActivityLoading(true)
      const response = await fetch(`${ADMIN_ENDPOINTS.USER_BY_ID(userId)}/activity?limit=10`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setActivityLogs(data.data?.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch user activity:', error)
    } finally {
      setActivityLoading(false)
    }
  }, [userId])

  const fetchUserSecurity = useCallback(async () => {
    try {
      setSecurityLoading(true)
      const response = await fetch(ADMIN_ENDPOINTS.USER_SECURITY(userId), {
        credentials: 'include' // Essential for cross-subdomain authentication
      })
      if (response.ok) {
        const data = await response.json()
        setSecurityData(data.data?.security)
      }
    } catch (error) {
      console.error('Failed to fetch user security data:', error)
    } finally {
      setSecurityLoading(false)
    }
  }, [userId])

  const fetchAvailablePackages = useCallback(async () => {
    try {
      const response = await fetch(ADMIN_ENDPOINTS.PACKAGES, {
        credentials: 'include' // Essential for cross-subdomain authentication
      })
      if (response.ok) {
        const data = await response.json()
        setAvailablePackages(data.data?.packages || [])
      }
    } catch (error) {
      // Error already handled by API, no need to log to user console
    }
  }, [])

  useEffect(() => {
    if (userId) {
      fetchUser()
      fetchUserActivity()
      fetchUserSecurity()
      fetchAvailablePackages()
    }
  }, [userId, fetchUser, fetchUserActivity, fetchUserSecurity, fetchAvailablePackages])

  return {
    user,
    activityLogs,
    securityData,
    availablePackages,
    loading,
    activityLoading,
    securityLoading,
    fetchUser,
    fetchUserActivity,
    fetchUserSecurity
  }
}
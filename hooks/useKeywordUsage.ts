'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/database'
import { RANK_TRACKING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export interface KeywordUsageData {
  keywords_used: number
  keywords_limit: number
  is_unlimited: boolean
  remaining_quota: number
  period_start: string | null
  period_end: string | null
}

export function useKeywordUsage() {
  const [keywordUsage, setKeywordUsage] = useState<KeywordUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchKeywordUsage()
  }, [])

  const fetchKeywordUsage = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setKeywordUsage(null)
        return
      }

      // Fetch keyword usage data
      const response = await fetch(RANK_TRACKING_ENDPOINTS.KEYWORD_USAGE, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch keyword usage: ${response.status}`)
      }

      const data = await response.json()
      setKeywordUsage(data)
    } catch (err) {
      console.error('Error fetching keyword usage:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch keyword usage')
    } finally {
      setLoading(false)
    }
  }

  return { 
    keywordUsage, 
    loading, 
    error, 
    refetch: fetchKeywordUsage 
  }
}
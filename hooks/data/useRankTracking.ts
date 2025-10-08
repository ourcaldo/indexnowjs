'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabaseBrowser } from '@/lib/database'
import { RANK_TRACKING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface Keyword {
  id: string
  user_id: string
  domain: string
  keyword: string
  target_url: string
  country_code: string
  location: string
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  current_ranking?: RankingData
  ranking_history: RankingData[]
}

interface RankingData {
  id: string
  keyword_id: string
  position: number | null
  previous_position: number | null
  position_change: number
  search_volume: number | null
  competition: 'low' | 'medium' | 'high' | null
  cpc: number | null
  serp_features: string[]
  checked_at: string
  top_10_results?: SerpResult[]
}

interface SerpResult {
  position: number
  title: string
  url: string
  snippet: string
  domain: string
}

interface RankTrackingStats {
  total_keywords: number
  active_keywords: number
  domains: number
  average_position: number
  keywords_improved: number
  keywords_declined: number
  keywords_unchanged: number
  top_10_count: number
  top_3_count: number
  position_1_count: number
  last_check_date: string
}

interface CompetitorAnalysis {
  domain: string
  keywords_competing: number
  average_position: number
  visibility_score: number
  top_keywords: Array<{
    keyword: string
    position: number
    search_volume: number
  }>
}

interface UseRankTrackingReturn {
  // Core data
  keywords: Keyword[]
  rankingStats: RankTrackingStats | null
  competitors: CompetitorAnalysis[]
  
  // State
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  
  // Filters
  filters: {
    domain?: string
    country?: string
    tags?: string[]
    position_min?: number
    position_max?: number
    status?: 'improved' | 'declined' | 'unchanged'
  }
  
  // Actions
  fetchKeywords: (page?: number, limit?: number) => Promise<void>
  addKeyword: (keywordData: Partial<Keyword>) => Promise<{ success: boolean; keywordId?: string; error?: string }>
  updateKeyword: (keywordId: string, updates: Partial<Keyword>) => Promise<{ success: boolean; error?: string }>
  deleteKeyword: (keywordId: string) => Promise<{ success: boolean; error?: string }>
  bulkAddKeywords: (keywords: Partial<Keyword>[]) => Promise<{ success: boolean; added: number; failed: number; errors?: string[] }>
  
  // Ranking operations
  checkRankings: (keywordIds?: string[]) => Promise<{ success: boolean; error?: string }>
  fetchRankingHistory: (keywordId: string, days?: number) => Promise<RankingData[]>
  
  // Analytics
  fetchRankingStats: (domain?: string, dateRange?: { from: string; to: string }) => Promise<void>
  fetchCompetitorAnalysis: (domain: string) => Promise<void>
  exportRankings: (format: 'csv' | 'xlsx', filters?: any) => Promise<{ success: boolean; downloadUrl?: string; error?: string }>
  
  // Filters and utilities  
  setFilters: (newFilters: Partial<{
    domain?: string
    country?: string
    tags?: string[]
    position_min?: number
    position_max?: number
    status?: 'improved' | 'declined' | 'unchanged'
  }>) => void
  clearFilters: () => void
  getKeywordsByDomain: (domain: string) => Keyword[]
  getKeywordsByTag: (tag: string) => Keyword[]
  getTopPerformingKeywords: (limit?: number) => Keyword[]
  getUnderperformingKeywords: (limit?: number) => Keyword[]
}

export function useRankTracking(): UseRankTrackingReturn {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [rankingStats, setRankingStats] = useState<RankTrackingStats | null>(null)
  const [competitors, setCompetitors] = useState<CompetitorAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState<{
    domain?: string
    country?: string
    tags?: string[]
    position_min?: number
    position_max?: number
    status?: 'improved' | 'declined' | 'unchanged'
  }>({})

  const lastFetchTime = useRef<number>(0)
  const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

  // Fetch keywords with filters and pagination
  const fetchKeywords = useCallback(async (page = 1, limit = 20) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        setError('Authentication required')
        return
      }

      // Build query parameters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })

      // Add filters to query
      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(`${key}[]`, v.toString()))
          } else {
            queryParams.append(key, value.toString())
          }
        }
      })

      const response = await fetch(`${RANK_TRACKING_ENDPOINTS.KEYWORDS}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch keywords: ${response.status}`)
      }

      const data = await response.json()
      setKeywords(data.keywords || [])
      setPagination({
        page: data.pagination?.page || page,
        limit: data.pagination?.limit || limit,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0
      })

      lastFetchTime.current = Date.now()
    } catch (err) {
      console.error('Error fetching keywords:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch keywords')
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Add single keyword
  const addKeyword = useCallback(async (keywordData: Partial<Keyword>) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(RANK_TRACKING_ENDPOINTS.KEYWORDS, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(keywordData),
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Keyword creation failed: ${response.status}` }
      }

      const data = await response.json()
      
      // Refresh keywords list
      await fetchKeywords(pagination.page, pagination.limit)
      
      return { success: true, keywordId: data.keyword?.id }
    } catch (err) {
      console.error('Error adding keyword:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add keyword' }
    }
  }, [fetchKeywords, pagination.page, pagination.limit])

  // Update keyword
  const updateKeyword = useCallback(async (keywordId: string, updates: Partial<Keyword>) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(RANK_TRACKING_ENDPOINTS.KEYWORD_BY_ID(keywordId), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates),
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Keyword update failed: ${response.status}` }
      }

      // Update local state
      setKeywords(prevKeywords =>
        prevKeywords.map(keyword =>
          keyword.id === keywordId ? { ...keyword, ...updates } : keyword
        )
      )

      return { success: true }
    } catch (err) {
      console.error('Error updating keyword:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update keyword' }
    }
  }, [])

  // Delete keyword
  const deleteKeyword = useCallback(async (keywordId: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(RANK_TRACKING_ENDPOINTS.KEYWORD_BY_ID(keywordId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Keyword deletion failed: ${response.status}` }
      }

      // Remove from local state
      setKeywords(prevKeywords => prevKeywords.filter(keyword => keyword.id !== keywordId))

      return { success: true }
    } catch (err) {
      console.error('Error deleting keyword:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete keyword' }
    }
  }, [])

  // Bulk add keywords
  const bulkAddKeywords = useCallback(async (keywordsData: Partial<Keyword>[]) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, added: 0, failed: keywordsData.length, errors: ['Authentication required'] }
      }

      const response = await fetch(RANK_TRACKING_ENDPOINTS.KEYWORDS_BULK, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keywords: keywordsData }),
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { 
          success: false, 
          added: 0, 
          failed: keywordsData.length, 
          errors: [errorData.error || `Bulk operation failed: ${response.status}`] 
        }
      }

      const data = await response.json()
      
      // Refresh keywords list
      await fetchKeywords(pagination.page, pagination.limit)
      
      return { 
        success: true, 
        added: data.added || 0, 
        failed: data.failed || 0, 
        errors: data.errors || [] 
      }
    } catch (err) {
      console.error('Error bulk adding keywords:', err)
      return { 
        success: false, 
        added: 0, 
        failed: keywordsData.length, 
        errors: [err instanceof Error ? err.message : 'Failed to add keywords'] 
      }
    }
  }, [fetchKeywords, pagination.page, pagination.limit])

  // Check rankings for keywords
  const checkRankings = useCallback(async (keywordIds?: string[]) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(RANK_TRACKING_ENDPOINTS.RANKINGS_CHECK, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keywordIds }),
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Ranking check failed: ${response.status}` }
      }

      // Refresh keywords to get updated rankings
      await fetchKeywords(pagination.page, pagination.limit)
      
      return { success: true }
    } catch (err) {
      console.error('Error checking rankings:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to check rankings' }
    }
  }, [fetchKeywords, pagination.page, pagination.limit])

  // Fetch ranking history for a keyword
  const fetchRankingHistory = useCallback(async (keywordId: string, days = 30) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return []

      const response = await fetch(`${RANK_TRACKING_ENDPOINTS.KEYWORD_HISTORY(keywordId)}?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (response.ok) {
        const data = await response.json()
        return data.history || []
      }
      
      return []
    } catch (err) {
      console.error('Error fetching ranking history:', err)
      return []
    }
  }, [])

  // Fetch ranking statistics
  const fetchRankingStats = useCallback(async (domain?: string, dateRange?: { from: string; to: string }) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const queryParams = new URLSearchParams()
      if (domain) queryParams.append('domain', domain)
      if (dateRange) {
        queryParams.append('from', dateRange.from)
        queryParams.append('to', dateRange.to)
      }

      const response = await fetch(`${RANK_TRACKING_ENDPOINTS.STATS}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (response.ok) {
        const data = await response.json()
        setRankingStats(data.stats)
      }
    } catch (err) {
      console.error('Error fetching ranking stats:', err)
    }
  }, [])

  // Fetch competitor analysis
  const fetchCompetitorAnalysis = useCallback(async (domain: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`${RANK_TRACKING_ENDPOINTS.COMPETITORS}?domain=${domain}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (response.ok) {
        const data = await response.json()
        setCompetitors(data.competitors || [])
      }
    } catch (err) {
      console.error('Error fetching competitor analysis:', err)
    }
  }, [])

  // Export rankings
  const exportRankings = useCallback(async (format: 'csv' | 'xlsx', exportFilters?: any) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(RANK_TRACKING_ENDPOINTS.EXPORT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ format, filters: exportFilters || filters || {} }),
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Export failed: ${response.status}` }
      }

      const data = await response.json()
      return { success: true, downloadUrl: data.downloadUrl }
    } catch (err) {
      console.error('Error exporting rankings:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to export rankings' }
    }
  }, [filters])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  // Utility functions
  const getKeywordsByDomain = useCallback((domain: string) => {
    return keywords.filter(keyword => keyword.domain === domain)
  }, [keywords])

  const getKeywordsByTag = useCallback((tag: string) => {
    return keywords.filter(keyword => keyword.tags.includes(tag))
  }, [keywords])

  const getTopPerformingKeywords = useCallback((limit = 10) => {
    return keywords
      .filter(keyword => keyword.current_ranking?.position)
      .sort((a, b) => (a.current_ranking?.position || 999) - (b.current_ranking?.position || 999))
      .slice(0, limit)
  }, [keywords])

  const getUnderperformingKeywords = useCallback((limit = 10) => {
    return keywords
      .filter(keyword => keyword.current_ranking?.position && keyword.current_ranking.position > 50)
      .sort((a, b) => (b.current_ranking?.position || 0) - (a.current_ranking?.position || 0))
      .slice(0, limit)
  }, [keywords])

  // Initial load and periodic refresh
  useEffect(() => {
    fetchKeywords()
    fetchRankingStats()
  }, [fetchKeywords, fetchRankingStats])

  // Refetch when filters change
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      fetchKeywords(1, pagination.limit) // Reset to page 1 when filters change
    }
  }, [filters, fetchKeywords, pagination.limit])

  return {
    keywords,
    rankingStats,
    competitors,
    loading,
    error,
    pagination,
    filters,
    fetchKeywords,
    addKeyword,
    updateKeyword,
    deleteKeyword,
    bulkAddKeywords,
    checkRankings,
    fetchRankingHistory,
    fetchRankingStats,
    fetchCompetitorAnalysis,
    exportRankings,
    setFilters,
    clearFilters,
    getKeywordsByDomain,
    getKeywordsByTag,
    getTopPerformingKeywords,
    getUnderperformingKeywords
  }
}
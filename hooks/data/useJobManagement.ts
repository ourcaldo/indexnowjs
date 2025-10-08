'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabaseBrowser } from '@/lib/database'
import { INDEXING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface Job {
  id: string
  user_id: string
  name: string
  urls: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  schedule_type: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  schedule_data?: any
  success_count: number
  failed_count: number
  total_urls: number
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
  error_message?: string
  service_account_id?: string
  service_account_email?: string
  priority: number
}

interface JobStats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  success_rate: number
}

interface UseJobManagementReturn {
  jobs: Job[]
  jobStats: JobStats
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  // Actions
  fetchJobs: (page?: number, limit?: number) => Promise<void>
  createJob: (jobData: Partial<Job>) => Promise<{ success: boolean; jobId?: string; error?: string }>
  cancelJob: (jobId: string) => Promise<{ success: boolean; error?: string }>
  deleteJob: (jobId: string) => Promise<{ success: boolean; error?: string }>
  retryJob: (jobId: string) => Promise<{ success: boolean; error?: string }>
  refreshJobStats: () => Promise<void>
  // Real-time updates
  subscribeToJobUpdates: (jobId: string, callback: (job: Job) => void) => () => void
  // Utilities
  getJobById: (jobId: string) => Job | undefined
  getJobsByStatus: (status: Job['status']) => Job[]
}

export function useJobManagement(): UseJobManagementReturn {
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobStats, setJobStats] = useState<JobStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    success_rate: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  const jobUpdateSubscriptions = useRef<Map<string, (job: Job) => void>>(new Map())

  // Fetch jobs with pagination
  const fetchJobs = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(`${INDEXING_ENDPOINTS.JOBS}?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status}`)
      }

      const data = await response.json()
      setJobs(data.jobs || [])
      setPagination({
        page: data.pagination?.page || page,
        limit: data.pagination?.limit || limit,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0
      })
    } catch (err) {
      console.error('Error fetching jobs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs')
    } finally {
      setLoading(false)
    }
  }, [])

  // Create new job
  const createJob = useCallback(async (jobData: Partial<Job>) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(INDEXING_ENDPOINTS.JOBS, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData),
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Job creation failed: ${response.status}` }
      }

      const data = await response.json()
      
      // Refresh jobs list and stats
      await fetchJobs(pagination.page, pagination.limit)
      await refreshJobStats()
      
      return { success: true, jobId: data.job?.id }
    } catch (err) {
      console.error('Error creating job:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create job' }
    }
  }, [fetchJobs, pagination.page, pagination.limit])

  // Cancel job
  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(INDEXING_ENDPOINTS.JOB_CANCEL(jobId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Job cancellation failed: ${response.status}` }
      }

      // Update local job status
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId ? { ...job, status: 'cancelled' as const } : job
        )
      )
      
      await refreshJobStats()
      return { success: true }
    } catch (err) {
      console.error('Error cancelling job:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to cancel job' }
    }
  }, [])

  // Delete job
  const deleteJob = useCallback(async (jobId: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(INDEXING_ENDPOINTS.JOB_BY_ID(jobId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Job deletion failed: ${response.status}` }
      }

      // Remove job from local state
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId))
      
      await refreshJobStats()
      return { success: true }
    } catch (err) {
      console.error('Error deleting job:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete job' }
    }
  }, [])

  // Retry failed job
  const retryJob = useCallback(async (jobId: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(INDEXING_ENDPOINTS.JOB_RETRY(jobId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Job retry failed: ${response.status}` }
      }

      // Update local job status
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId ? { ...job, status: 'pending' as const } : job
        )
      )
      
      await refreshJobStats()
      return { success: true }
    } catch (err) {
      console.error('Error retrying job:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to retry job' }
    }
  }, [])

  // Refresh job statistics
  const refreshJobStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(INDEXING_ENDPOINTS.JOB_STATS, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (response.ok) {
        const data = await response.json()
        setJobStats(data.stats || jobStats)
      }
    } catch (err) {
      console.error('Error fetching job stats:', err)
    }
  }, [jobStats])

  // Subscribe to real-time job updates
  const subscribeToJobUpdates = useCallback((jobId: string, callback: (job: Job) => void) => {
    jobUpdateSubscriptions.current.set(jobId, callback)
    
    return () => {
      jobUpdateSubscriptions.current.delete(jobId)
    }
  }, [])

  // Utility functions
  const getJobById = useCallback((jobId: string) => {
    return jobs.find(job => job.id === jobId)
  }, [jobs])

  const getJobsByStatus = useCallback((status: Job['status']) => {
    return jobs.filter(job => job.status === status)
  }, [jobs])

  // Initial load
  useEffect(() => {
    fetchJobs()
    refreshJobStats()
  }, [fetchJobs, refreshJobStats])

  return {
    jobs,
    jobStats,
    loading,
    error,
    pagination,
    fetchJobs,
    createJob,
    cancelJob,
    deleteJob,
    retryJob,
    refreshJobStats,
    subscribeToJobUpdates,
    getJobById,
    getJobsByStatus
  }
}
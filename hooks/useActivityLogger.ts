/**
 * Frontend Activity Logging Hook
 * Provides convenient methods to log user activities from client-side
 */

import { useEffect, useRef } from 'react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/database'
import { ACTIVITY_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface ActivityLogRequest {
  eventType: string
  actionDescription: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, any>
}

export const useActivityLogger = () => {
  const pageViewLogged = useRef<string | null>(null)

  const logActivity = async (request: ActivityLogRequest) => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      await fetch(ACTIVITY_ENDPOINTS.LOG, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', // Essential for cross-subdomain authentication
        body: JSON.stringify(request)
      })
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }

  const logPageView = async (pagePath: string, pageTitle?: string, metadata?: Record<string, any>) => {
    // Avoid duplicate page view logs for the same page
    const currentPage = `${pagePath}-${pageTitle || ''}`
    if (pageViewLogged.current === currentPage) return
    
    pageViewLogged.current = currentPage

    await logActivity({
      eventType: 'page_view',
      actionDescription: `Visited ${pageTitle || pagePath}`,
      metadata: {
        pagePath,
        pageTitle,
        pageView: true,
        ...metadata
      }
    })
  }

  const logDashboardActivity = async (eventType: string, details?: string, metadata?: Record<string, any>) => {
    await logActivity({
      eventType,
      actionDescription: details || eventType,
      metadata: {
        dashboardActivity: true,
        ...metadata
      }
    })
  }

  const logBillingActivity = async (eventType: string, details: string, metadata?: Record<string, any>) => {
    await logActivity({
      eventType,
      actionDescription: details,
      metadata: {
        billingActivity: true,
        ...metadata
      }
    })
  }

  const logJobActivity = async (eventType: string, jobId?: string, details?: string, metadata?: Record<string, any>) => {
    await logActivity({
      eventType,
      actionDescription: details || eventType,
      targetType: jobId ? 'job' : undefined,
      targetId: jobId,
      metadata: {
        jobActivity: true,
        ...metadata
      }
    })
  }

  const logServiceAccountActivity = async (eventType: string, serviceAccountId?: string, details?: string, metadata?: Record<string, any>) => {
    await logActivity({
      eventType,
      actionDescription: details || eventType,
      targetType: serviceAccountId ? 'service_account' : undefined,
      targetId: serviceAccountId,
      metadata: {
        serviceAccountActivity: true,
        ...metadata
      }
    })
  }

  return {
    logActivity,
    logPageView,
    logDashboardActivity,
    logBillingActivity,
    logJobActivity,
    logServiceAccountActivity
  }
}

/**
 * Hook to automatically log page views when component mounts
 */
export const usePageViewLogger = (pagePath: string, pageTitle?: string, metadata?: Record<string, any>) => {
  const { logPageView } = useActivityLogger()

  useEffect(() => {
    logPageView(pagePath, pageTitle, metadata)
  }, [pagePath, pageTitle]) // Re-log if page changes

  return { logPageView }
}
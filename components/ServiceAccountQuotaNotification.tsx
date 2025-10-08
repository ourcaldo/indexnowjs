'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X, Clock } from 'lucide-react'
import { useGlobalQuotaManager } from '@/hooks/useGlobalQuotaManager'
import { NOTIFICATION_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

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

export default function ServiceAccountQuotaNotification() {
  const { notifications } = useGlobalQuotaManager()
  const [localNotifications, setLocalNotifications] = useState<QuotaNotification[]>([])

  // Initialize notifications from global manager
  useEffect(() => {
    if (notifications) {
      setLocalNotifications(notifications)
    }
  }, [notifications])

  // Note: Real-time updates via WebSocket removed - notifications are now handled manually



  const dismissNotification = async (notificationId: string) => {
    try {
      const response = await fetch(NOTIFICATION_ENDPOINTS.DISMISS(notificationId), {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        // Remove from local state
        setLocalNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error)
    }
  }

  if (localNotifications.length === 0) return null

  return (
    <div className="sticky top-0 left-0 right-0 z-40 bg-destructive text-white shadow-lg">
      {localNotifications.map((notification) => (
        <div key={notification.id} className="w-full">
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm">
                        {notification.title}
                      </span>
                      <span className="hidden lg:inline text-sm opacity-90 ml-2">
                        - Service account "{notification.metadata.service_account_name}" has exhausted its daily quota.
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs opacity-90 mt-1 lg:mt-0 flex-shrink-0">
                      <span className="whitespace-nowrap">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Resets: {notification.metadata.quota_reset_time}
                      </span>
                      <span className="hidden sm:inline whitespace-nowrap">Jobs will auto-resume</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="flex-shrink-0 ml-3 p-1 rounded hover:bg-white/10 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
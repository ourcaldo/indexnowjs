'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { authService } from '@/lib/auth'
import { updateQuotaFromWebSocket } from './useGlobalQuotaManager'
import { WEBSOCKET_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface WebSocketMessage {
  type: string
  jobId?: string
  status?: string
  progress?: {
    progress_percentage: number
    processed_urls: number
    successful_urls: number
    failed_urls: number
  }
  quota?: {
    daily_quota_used: number
    remaining_quota: number
    quota_exhausted: boolean
    daily_limit_reached: boolean
  }
  notification?: any
}

// Global WebSocket instance
let globalSocket: Socket | null = null
let connectionPromise: Promise<Socket> | null = null

// Event subscribers
const jobUpdateSubscribers = new Set<(message: WebSocketMessage) => void>()
const quotaUpdateSubscribers = new Set<(quota: any) => void>()
const notificationSubscribers = new Set<(notification: any) => void>()
const errorNotificationSubscribers = new Set<(error: any) => void>()

// Initialize global WebSocket connection
async function initializeGlobalWebSocket(): Promise<Socket> {
  if (globalSocket?.connected) {
    return globalSocket
  }

  if (connectionPromise) {
    return connectionPromise
  }

  connectionPromise = new Promise(async (resolve, reject) => {
    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') {
        reject(new Error('WebSocket can only be initialized on client side'))
        return
      }

      // Add retry mechanism for user authentication
      let user = await authService.getCurrentUser()
      if (!user) {
        // Try to wait a bit for authentication to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
        user = await authService.getCurrentUser()
      }
      
      if (!user) {
        // Instead of rejecting immediately, log the error and try to reconnect later
        setTimeout(() => {
          connectionPromise = null
          if (typeof window !== 'undefined') {
            initializeGlobalWebSocket().catch(() => {}) // Silently catch to prevent unhandled rejection
          }
        }, 10000) // Increased delay to 10 seconds to reduce log spam
        reject(new Error('User not authenticated'))
        return
      }

      // Disconnect existing socket if any
      if (globalSocket) {
        globalSocket.disconnect()
      }

      globalSocket = io({
        path: WEBSOCKET_ENDPOINTS.SOCKETIO,
        auth: { userId: user.id },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      })

      globalSocket.on('connect', () => {
        resolve(globalSocket!)
      })

      globalSocket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          setTimeout(() => initializeGlobalWebSocket(), 5000)
        }
      })

      globalSocket.on('connect_error', (error) => {
        console.error('🔗 Global WebSocket connection error:', error)
        reject(error)
      })

      // Job update events
      globalSocket.on('job_update', (message: WebSocketMessage) => {
        jobUpdateSubscribers.forEach(subscriber => subscriber(message))
      })

      globalSocket.on('job_completed', (message: WebSocketMessage) => {
        jobUpdateSubscribers.forEach(subscriber => subscriber({ ...message, type: 'job_completed' }))
        
        // Refresh quota after job completion
        if (message.quota) {
          updateQuotaFromWebSocket(message.quota)
          quotaUpdateSubscribers.forEach(subscriber => subscriber(message.quota))
        }
      })

      globalSocket.on('job_failed', (message: WebSocketMessage) => {
        jobUpdateSubscribers.forEach(subscriber => subscriber({ ...message, type: 'job_failed' }))
      })

      // Quota update events
      globalSocket.on('quota_update', (quota: any) => {
        updateQuotaFromWebSocket(quota)
        quotaUpdateSubscribers.forEach(subscriber => subscriber(quota))
      })

      globalSocket.on('quota_exhausted', (quota: any) => {
        updateQuotaFromWebSocket({ ...quota, quota_exhausted: true })
        quotaUpdateSubscribers.forEach(subscriber => subscriber(quota))
      })

      // Notification events
      globalSocket.on('new_notification', (notification: any) => {
        notificationSubscribers.forEach(subscriber => subscriber(notification))
      })

      // Error notification events (for admin users)
      globalSocket.on('critical_error', (error: any) => {
        errorNotificationSubscribers.forEach(subscriber => subscriber(error))
      })

      globalSocket.on('error_resolved', (data: any) => {
        errorNotificationSubscribers.forEach(subscriber => subscriber({ type: 'error_resolved', ...data }))
      })

    } catch (error) {
      console.error('🔗 Failed to initialize global WebSocket:', error)
      reject(error)
    }
  })

  return connectionPromise
}

// Global WebSocket hook
export function useGlobalWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current || typeof window === 'undefined') return
    initRef.current = true

    initializeGlobalWebSocket()
      .then(socket => {
        setIsConnected(socket.connected)
        
        socket.on('connect', () => setIsConnected(true))
        socket.on('disconnect', () => setIsConnected(false))
      })
      .catch(error => {
        console.error('Failed to initialize global WebSocket:', error)
        setIsConnected(false)
      })

    return () => {
      // Don't disconnect on unmount - keep global connection alive
    }
  }, [])

  return { isConnected }
}

// Hook for subscribing to job updates
export function useJobUpdates(onJobUpdate?: (message: WebSocketMessage) => void) {
  useEffect(() => {
    if (onJobUpdate) {
      jobUpdateSubscribers.add(onJobUpdate)
      return () => {
        jobUpdateSubscribers.delete(onJobUpdate)
      }
    }
  }, [onJobUpdate])
}

// Hook for subscribing to quota updates
export function useQuotaUpdates(onQuotaUpdate?: (quota: any) => void) {
  useEffect(() => {
    if (onQuotaUpdate) {
      quotaUpdateSubscribers.add(onQuotaUpdate)
      return () => {
        quotaUpdateSubscribers.delete(onQuotaUpdate)
      }
    }
  }, [onQuotaUpdate])
}

// Hook for subscribing to notifications
export function useNotificationUpdates(onNotification?: (notification: any) => void) {
  useEffect(() => {
    if (onNotification) {
      notificationSubscribers.add(onNotification)
      return () => {
        notificationSubscribers.delete(onNotification)
      }
    }
  }, [onNotification])
}

// Hook for subscribing to error notifications (admin only)
export function useErrorNotifications(onError?: (error: any) => void) {
  useEffect(() => {
    if (onError) {
      errorNotificationSubscribers.add(onError)
      return () => {
        errorNotificationSubscribers.delete(onError)
      }
    }
  }, [onError])
}

// Cleanup function (call when user logs out)
export function disconnectGlobalWebSocket() {
  if (globalSocket) {
    globalSocket.disconnect()
    globalSocket = null
    connectionPromise = null
  }
}
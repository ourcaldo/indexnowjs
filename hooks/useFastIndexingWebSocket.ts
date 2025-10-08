'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { authService } from '@/lib/auth'
import { WEBSOCKET_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface FastIndexingMessage {
  type: string
  jobId?: string
  status?: string
  progress?: {
    progress_percentage: number
    processed_urls: number
    successful_urls: number
    failed_urls: number
  }
  current_url?: string
  timestamp?: string
}

// FastIndexing WebSocket instance
let fastIndexingSocket: Socket | null = null
let connectionPromise: Promise<Socket> | null = null

// Event subscribers for job events only
const jobUpdateSubscribers = new Set<(message: FastIndexingMessage) => void>()

// Initialize FastIndexing WebSocket connection
async function initializeFastIndexingWebSocket(): Promise<Socket> {
  if (fastIndexingSocket?.connected) {
    return fastIndexingSocket
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
        reject(new Error('User not authenticated'))
        return
      }

      // Disconnect existing socket if any
      if (fastIndexingSocket) {
        fastIndexingSocket.disconnect()
      }

      fastIndexingSocket = io({
        path: WEBSOCKET_ENDPOINTS.SOCKETIO,
        auth: { userId: user.id },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      })

      fastIndexingSocket.on('connect', () => {
        console.log('🚀 FastIndexing WebSocket connected')
        resolve(fastIndexingSocket!)
      })

      fastIndexingSocket.on('disconnect', (reason) => {
        console.log('🔌 FastIndexing WebSocket disconnected:', reason)
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          setTimeout(() => initializeFastIndexingWebSocket(), 5000)
        }
      })

      fastIndexingSocket.on('connect_error', (error) => {
        console.error('🔗 FastIndexing WebSocket connection error:', error)
        reject(error)
      })

      // Job update events (FastIndexing specific)
      fastIndexingSocket.on('job_update', (message: FastIndexingMessage) => {
        console.log('📡 Job update received:', message)
        jobUpdateSubscribers.forEach(subscriber => subscriber(message))
      })

      fastIndexingSocket.on('job_progress', (message: FastIndexingMessage) => {
        console.log('📊 Job progress received:', message)
        jobUpdateSubscribers.forEach(subscriber => subscriber({ ...message, type: 'job_progress' }))
      })

      fastIndexingSocket.on('job_completed', (message: FastIndexingMessage) => {
        console.log('✅ Job completed:', message)
        jobUpdateSubscribers.forEach(subscriber => subscriber({ ...message, type: 'job_completed' }))
      })

      fastIndexingSocket.on('job_failed', (message: FastIndexingMessage) => {
        console.log('❌ Job failed:', message)
        jobUpdateSubscribers.forEach(subscriber => subscriber({ ...message, type: 'job_failed' }))
      })

    } catch (error) {
      console.error('🔗 Failed to initialize FastIndexing WebSocket:', error)
      reject(error)
    }
  })

  return connectionPromise
}

// FastIndexing WebSocket hook
export function useFastIndexingWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current || typeof window === 'undefined') return
    initRef.current = true

    initializeFastIndexingWebSocket()
      .then(socket => {
        setIsConnected(socket.connected)
        
        socket.on('connect', () => setIsConnected(true))
        socket.on('disconnect', () => setIsConnected(false))
      })
      .catch(error => {
        console.error('Failed to initialize FastIndexing WebSocket:', error)
        setIsConnected(false)
      })

    return () => {
      // Don't disconnect on unmount - keep connection alive for other FastIndexing components
    }
  }, [])

  return { isConnected }
}

// Hook for subscribing to job updates (FastIndexing only)
export function useFastIndexingJobUpdates(onJobUpdate?: (message: FastIndexingMessage) => void) {
  useEffect(() => {
    if (onJobUpdate) {
      jobUpdateSubscribers.add(onJobUpdate)
      return () => {
        jobUpdateSubscribers.delete(onJobUpdate)
      }
    }
  }, [onJobUpdate])
}

// Join job room for specific job updates
export function joinJobRoom(jobId: string) {
  if (fastIndexingSocket?.connected) {
    fastIndexingSocket.emit('join_job_room', { jobId })
    console.log(`📡 Joined job room: job-${jobId}`)
  }
}

// Leave job room
export function leaveJobRoom(jobId: string) {
  if (fastIndexingSocket?.connected) {
    fastIndexingSocket.emit('leave_job_room', { jobId })
    console.log(`📡 Left job room: job-${jobId}`)
  }
}

// Cleanup function (call when leaving FastIndexing area)
export function disconnectFastIndexingWebSocket() {
  if (fastIndexingSocket) {
    console.log('🔌 Disconnecting FastIndexing WebSocket')
    fastIndexingSocket.disconnect()
    fastIndexingSocket = null
    connectionPromise = null
  }
}
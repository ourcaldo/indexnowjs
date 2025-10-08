'use client'

import { useEffect, useState } from 'react'
import { useGlobalWebSocket } from '@/hooks/useGlobalWebSocket'

export default function GlobalWebSocketProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize WebSocket only after mount and on dashboard pages
  const { isConnected } = useGlobalWebSocket()

  useEffect(() => {
    if (mounted && typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
    }
  }, [isConnected, mounted])

  return <>{children}</>
}
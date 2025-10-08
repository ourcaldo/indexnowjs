'use client'

import { useEffect, useState } from 'react'
import { useFastIndexingWebSocket } from '@/hooks/useFastIndexingWebSocket'

export default function FastIndexingWebSocketProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize FastIndexing WebSocket only after mount and only on FastIndexing pages
  const { isConnected } = useFastIndexingWebSocket()

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const isFastIndexingPage = window.location.pathname.startsWith('/dashboard/tools/fastindexing')
      
      if (isFastIndexingPage) {
        console.log('🚀 FastIndexing WebSocket Provider initialized for:', window.location.pathname)
      } else {
        console.warn('⚠️ FastIndexingWebSocketProvider loaded on non-FastIndexing page:', window.location.pathname)
      }
    }
  }, [isConnected, mounted])

  return <>{children}</>
}
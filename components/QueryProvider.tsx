'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useState } from 'react'

// Client-side query client provider
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create a stable QueryClient instance that won't be recreated on re-renders
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time of 5 minutes - data is considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Cache time of 10 minutes - data stays in cache for 10 minutes after being unused
        gcTime: 10 * 60 * 1000, 
        // Retry failed requests 1 time (instead of default 3)
        retry: 1,
        // Don't refetch on window focus for better UX
        refetchOnWindowFocus: false,
        // Don't refetch on reconnect automatically
        refetchOnReconnect: false,
      },
      mutations: {
        // Retry failed mutations 1 time
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
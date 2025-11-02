'use client'

import { createContext, useEffect, useState, useContext } from 'react'
import { initializePaddle, Paddle } from '@paddle/paddle-js'
import { useRouter } from 'next/navigation'

interface PaddleContextType {
  paddle: Paddle | null
  isLoading: boolean
}

const PaddleContext = createContext<PaddleContextType>({
  paddle: null,
  isLoading: true,
})

export function PaddleProvider({ children }: { children: React.ReactNode }) {
  const [paddle, setPaddle] = useState<Paddle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initPaddle = async () => {
      try {
        // CRITICAL: Load Paddle configuration from DATABASE (not environment variables)
        // This prevents exposing sensitive credentials via NEXT_PUBLIC_* variables
        // IMPORTANT: Use API subdomain (api.domain.com) instead of current domain (dashboard.domain.com)
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
        const configUrl = apiBaseUrl ? `${apiBaseUrl}/api/v1/payments/paddle/config` : '/api/v1/payments/paddle/config'
        const configResponse = await fetch(configUrl)
        
        if (!configResponse.ok) {
          const errorData = await configResponse.json()
          throw new Error(errorData.error || 'Failed to load Paddle configuration')
        }

        const configResult = await configResponse.json()
        
        if (!configResult.success || !configResult.data) {
          throw new Error('Invalid Paddle configuration response')
        }

        const { clientToken, environment } = configResult.data

        if (!clientToken) {
          throw new Error('Paddle client token not found in database configuration')
        }

        const paddleInstance = await initializePaddle({
          environment: environment || 'sandbox',
          token: clientToken,
          eventCallback: (data) => {
            // Handle Paddle checkout events
            switch (data.name) {
              case 'checkout.completed':
                // Payment successful - Paddle handles redirect via successUrl
                // But we can also track it here if needed
                break

              case 'checkout.closed':
                // User closed the checkout overlay (cancelled/abandoned)
                // Redirect to dashboard with cancelled status
                if (typeof window !== 'undefined') {
                  window.location.href = '/dashboard?subscription=cancelled'
                }
                break

              case 'checkout.error':
                // Payment failed or error occurred
                // Redirect to dashboard with failed status
                if (typeof window !== 'undefined') {
                  window.location.href = '/dashboard?subscription=failed'
                }
                break

              default:
                // Other events (checkout.warning, etc.)
                break
            }
          }
        })

        if (paddleInstance) {
          setPaddle(paddleInstance)
        }
      } catch (error) {
        // Silently fail - don't log errors to user's console
        // Errors are tracked server-side via ErrorHandlingService
      } finally {
        setIsLoading(false)
      }
    }

    initPaddle()
  }, [router])

  return (
    <PaddleContext.Provider value={{ paddle, isLoading }}>
      {children}
    </PaddleContext.Provider>
  )
}

export const usePaddle = () => useContext(PaddleContext)

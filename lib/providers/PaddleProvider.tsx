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
        const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
        const environment = process.env.NEXT_PUBLIC_PADDLE_ENV as 'production' | 'sandbox'

        if (!clientToken) {
          setIsLoading(false)
          return
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
        console.error('[PaddleProvider] Failed to initialize Paddle:', error)
        console.error('[PaddleProvider] Environment variables check:', {
          hasClientToken: !!process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
          clientTokenPreview: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.substring(0, 10) + '...',
          environment: process.env.NEXT_PUBLIC_PADDLE_ENV,
        })
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

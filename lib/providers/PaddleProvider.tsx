'use client'

import { createContext, useEffect, useState, useContext } from 'react'
import { initializePaddle, Paddle } from '@paddle/paddle-js'

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
        })

        if (paddleInstance) {
          setPaddle(paddleInstance)
        }
      } catch (error) {
        
      } finally {
        setIsLoading(false)
      }
    }

    initPaddle()
  }, [])

  return (
    <PaddleContext.Provider value={{ paddle, isLoading }}>
      {children}
    </PaddleContext.Provider>
  )
}

export const usePaddle = () => useContext(PaddleContext)

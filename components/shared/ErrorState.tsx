'use client'

import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/utils'

interface ErrorStateProps {
  title: string
  message: string
  onRetry?: () => void
  errorId?: string
  showHomeButton?: boolean
  className?: string
}

export const ErrorState = ({
  title,
  message,
  onRetry,
  errorId,
  showHomeButton = false,
  className
}: ErrorStateProps) => {
  const router = useRouter()

  return (
    <div 
      className={cn("flex flex-col items-center justify-center py-12 px-4", className)}
      data-testid="error-state"
    >
      <div className="flex flex-col items-center space-y-4 max-w-md text-center">
        <AlertCircle 
          className="w-16 h-16 text-muted-foreground" 
          data-testid="icon-error"
        />
        
        <h3 
          className="text-lg font-semibold text-foreground"
          data-testid="text-error-title"
        >
          {title}
        </h3>
        
        <p 
          className="text-muted-foreground"
          data-testid="text-error-message"
        >
          {message}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {onRetry && (
            <Button 
              onClick={onRetry}
              variant="default"
              className="inline-flex items-center gap-2"
              data-testid="button-retry"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
          
          {showHomeButton && (
            <Button 
              onClick={() => router.push('/')}
              variant="outline"
              className="inline-flex items-center gap-2"
              data-testid="button-home"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          )}
        </div>

        {errorId && (
          <p 
            className="text-xs text-muted-foreground mt-4"
            data-testid="text-error-id"
          >
            Error ID: {errorId}
          </p>
        )}
      </div>
    </div>
  )
}

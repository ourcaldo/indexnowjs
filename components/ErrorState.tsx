'use client'

import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

interface ErrorStateProps {
  /**
   * Error title displayed prominently
   */
  title?: string
  
  /**
   * Detailed error message
   */
  message?: string
  
  /**
   * Optional error ID for tracking/support
   */
  errorId?: string
  
  /**
   * Callback function when user clicks retry button
   */
  onRetry?: () => void
  
  /**
   * Show home button to navigate back
   */
  showHomeButton?: boolean
  
  /**
   * Custom retry button label
   */
  retryLabel?: string
  
  /**
   * Display variant - 'card' for full card layout, 'inline' for compact display
   */
  variant?: 'card' | 'inline'
}

/**
 * ErrorState Component
 * 
 * Standardized error display component for consistent error UX across the application.
 * Supports both full-page card layout and inline compact display.
 * 
 * Features:
 * - Consistent error messaging
 * - Optional retry functionality
 * - Error ID display for support/debugging
 * - Navigation options (home button)
 * - Responsive design
 * 
 * @example
 * // Full page error with retry
 * <ErrorState
 *   title="Failed to load data"
 *   message="Unable to fetch dashboard statistics"
 *   errorId="err_123456"
 *   onRetry={() => refetch()}
 *   showHomeButton
 * />
 * 
 * @example
 * // Inline compact error
 * <ErrorState
 *   variant="inline"
 *   message="Failed to load comments"
 *   onRetry={refetch}
 * />
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  errorId,
  onRetry,
  showHomeButton = false,
  retryLabel = 'Try Again',
  variant = 'card'
}: ErrorStateProps) {
  
  const handleCopyErrorId = () => {
    if (errorId && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(errorId)
        .then(() => {
          // Visual feedback could be added here (toast notification)
        })
        .catch(() => {
          // Silently fail
        })
    }
  }

  // Inline variant - compact display
  if (variant === 'inline') {
    return (
      <Alert variant="destructive" className="my-4" data-testid="error-state-inline">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="ml-2 flex-1">
          <div className="flex items-center justify-between">
            <span data-testid="error-message">{message}</span>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="ml-4"
                data-testid="button-retry"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                {retryLabel}
              </Button>
            )}
          </div>
          {errorId && (
            <button
              onClick={handleCopyErrorId}
              className="text-xs text-muted-foreground hover:text-foreground mt-2 underline cursor-pointer"
              data-testid="button-copy-error-id"
            >
              Error ID: {errorId} (click to copy)
            </button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // Card variant - full page display
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4" data-testid="error-state-card">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" data-testid="icon-error" />
          </div>
          <CardTitle className="text-xl" data-testid="error-title">{title}</CardTitle>
          <CardDescription className="mt-2" data-testid="error-message">
            {message}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error ID display */}
          {errorId && (
            <div className="rounded-md bg-muted p-3 text-center">
              <p className="text-sm text-muted-foreground">Error ID</p>
              <button
                onClick={handleCopyErrorId}
                className="text-sm font-mono text-foreground hover:text-primary underline cursor-pointer"
                data-testid="button-copy-error-id"
                title="Click to copy error ID"
              >
                {errorId}
              </button>
              <p className="text-xs text-muted-foreground mt-1">Click to copy</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="default"
                className="w-full sm:w-auto"
                data-testid="button-retry"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {retryLabel}
              </Button>
            )}
            
            {showHomeButton && (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full"
                  data-testid="button-home"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
            )}
          </div>

          {/* Help text */}
          <p className="text-xs text-center text-muted-foreground">
            If this problem persists, please contact support
            {errorId && ' with the error ID above'}.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

import { useToast } from '@/hooks/use-toast'
import { ApiError } from '@/lib/core/queryClient'

/**
 * Hook for consistent API error handling with toast notifications
 * 
 * Integrates with standardized ApiResponse format from Phase 2 error handling
 * Automatically extracts error details (message, ID, severity) and displays
 * user-friendly toast notifications with optional error ID copying.
 * 
 * @example
 * const { handleApiError } = useApiError()
 * 
 * const mutation = useMutation({
 *   mutationFn: createPost,
 *   onError: handleApiError,
 *   onSuccess: () => {
 *     toast({ title: 'Success', description: 'Post created' })
 *   }
 * })
 */
export function useApiError() {
  const { addToast } = useToast()

  /**
   * Handle API errors with toast notifications
   * - Parses errors from different sources (ApiError, Error, string, unknown)
   * - Displays toast with error message
   * - Includes "Copy Error ID" button if error has ID
   * - Shows success toast when error ID is copied
   */
  const handleApiError = (error: unknown) => {
    // Extract error details from different error types
    let message = 'An unexpected error occurred'
    let errorId: string | undefined
    let severity: string | undefined

    if (error instanceof ApiError) {
      message = error.message
      errorId = error.id
      severity = error.severity
    } else if (error instanceof Error) {
      message = error.message
    } else if (typeof error === 'string') {
      message = error
    }

    // Determine toast variant based on severity
    const toastType = severity === 'CRITICAL' || severity === 'HIGH' 
      ? 'error' 
      : 'error' // Using 'error' for all error severities

    // Show error toast (using 'error' type as equivalent to 'destructive' variant)
    addToast({
      title: 'Error',
      description: message,
      type: toastType,
      duration: 6000,
      // Include "Copy Error ID" button if error has ID
      ...(errorId && {
        action: {
          label: 'Copy Error ID',
          onClick: () => {
            // Copy error ID to clipboard
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(errorId).then(() => {
                // Show success toast after copying
                addToast({
                  title: 'Error ID copied',
                  description: 'Error ID has been copied to clipboard',
                  type: 'success',
                  duration: 3000
                })
              }).catch(() => {
                // Silently fail clipboard copy
              })
            }
          }
        }
      })
    })
  }

  return { handleApiError }
}

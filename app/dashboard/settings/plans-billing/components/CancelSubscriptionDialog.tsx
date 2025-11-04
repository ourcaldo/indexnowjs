'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { supabase } from '@/lib/database'

interface RefundWindowInfo {
  daysActive: number
  daysRemaining: number
  refundEligible: boolean
  refundWindowDays: number
  createdAt: string
}

interface CancelSubscriptionDialogProps {
  subscriptionId: string
  onClose: () => void
  onSuccess: () => void
}

export function CancelSubscriptionDialog({
  subscriptionId,
  onClose,
  onSuccess,
}: CancelSubscriptionDialogProps) {
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refundInfo, setRefundInfo] = useState<RefundWindowInfo | null>(null)

  useEffect(() => {
    if (subscriptionId) {
      loadRefundInfo()
    } else {
      setLoading(false)
    }
  }, [subscriptionId])

  const loadRefundInfo = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('No authentication token')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/payments/paddle/subscription/refund-window-info?subscriptionId=${subscriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      )

      if (!response.ok) throw new Error('Failed to load refund information')

      const result = await response.json()
      if (result.success && result.data) {
        setRefundInfo(result.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load refund information')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      setCanceling(true)
      setError(null)

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('No authentication token')

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/payments/paddle/subscription/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ subscriptionId }),
      })

      if (!response.ok) throw new Error('Failed to cancel subscription')

      const result = await response.json()
      if (result.success) {
        onSuccess()
      } else {
        throw new Error(result.message || 'Failed to cancel subscription')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription')
    } finally {
      setCanceling(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="dialog-cancel-subscription">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Cancel Subscription
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            We're sorry to see you go. Please review the cancellation details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4" data-testid="alert-error">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          ) : refundInfo ? (
            <>
              {refundInfo.refundEligible ? (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4" data-testid="alert-refund-eligible">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Full Refund Eligible</h3>
                      <p className="mt-1 text-sm text-green-700">
                        Your subscription will be canceled immediately and the payment will be refunded to your original payment method.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4" data-testid="alert-no-refund">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">No Refund Available</h3>
                      <p className="mt-1 text-sm text-amber-700">
                        You've exceeded the refund window. Your subscription will be canceled at the end of the current billing period, and you can continue using it until then.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4" data-testid="alert-info">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Note:</span> This action cannot be undone. You can always subscribe again later if you change your mind.
                </p>
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-3 pt-6">
          <button
            onClick={onClose}
            disabled={canceling}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-cancel-dialog"
          >
            Go Back
          </button>
          <button
            onClick={handleCancel}
            disabled={loading || canceling}
            className="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-confirm-cancel"
          >
            {canceling ? 'Canceling...' : 'Yes, Cancel Subscription'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

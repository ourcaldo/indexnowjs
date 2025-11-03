'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
      <DialogContent className="max-w-md" data-testid="dialog-cancel-subscription">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel your subscription?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : error ? (
            <Alert className="border-destructive/50 bg-destructive/10" data-testid="alert-error">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          ) : refundInfo ? (
            <>
              {refundInfo.refundEligible ? (
                <Alert className="border-success/50 bg-success/10" data-testid="alert-refund-eligible">
                  <AlertCircle className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success">
                    <strong>You're within the 7-day refund window</strong>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>• Subscription will be canceled immediately</p>
                      <p>• You'll receive a full refund</p>
                      <p>• You had {refundInfo.daysActive} day{refundInfo.daysActive === 1 ? '' : 's'} of access</p>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-warning/50 bg-warning/10" data-testid="alert-no-refund">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning">
                    <strong>No refund available</strong>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>• You've had {refundInfo.daysActive} days of access (refund window: {refundInfo.refundWindowDays} days)</p>
                      <p>• Your subscription will be canceled at the end of the current billing period</p>
                      <p>• You'll keep access until then</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Alert className="border-muted" data-testid="alert-info">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  This action cannot be undone. You can always subscribe again later.
                </AlertDescription>
              </Alert>
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={canceling}
            data-testid="button-cancel-dialog"
          >
            Go Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading || canceling}
            data-testid="button-confirm-cancel"
          >
            {canceling ? 'Canceling...' : 'Yes, Cancel Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

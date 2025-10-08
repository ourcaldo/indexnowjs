'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, CreditCard, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabaseBrowser } from '@/lib/database'
import { AUTH_ENDPOINTS, BILLING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface TrialStatusData {
  has_trial: boolean;
  trial_status: 'none' | 'active' | 'ended' | 'converted';
  trial_started_at?: string;
  trial_ends_at?: string;
  days_remaining?: number;
  hours_remaining?: number;
  next_billing_date?: string;
  auto_billing_enabled: boolean;
  trial_package?: any;
  subscription_info?: any;
}

export default function TrialStatusCard() {
  const [trialData, setTrialData] = useState<TrialStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  useEffect(() => {
    fetchTrialStatus()
  }, [])

  const fetchTrialStatus = async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(AUTH_ENDPOINTS.TRIAL_STATUS, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (response.ok) {
        const result = await response.json()
        setTrialData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch trial status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelTrial = async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(BILLING_ENDPOINTS.CANCEL_TRIAL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (response.ok) {
        addToast({
          title: "Trial cancelled",
          description: "Your free trial has been cancelled successfully.",
          type: "success"
        })
        fetchTrialStatus() // Refresh data
      } else {
        throw new Error('Failed to cancel trial')
      }
    } catch (error) {
      addToast({
        title: "Error",
        description: "Failed to cancel trial. Please try again.",
        type: "error"
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!trialData?.has_trial) {
    return null // Don't show card if user has no trial
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success-foreground'
      case 'ended': return 'bg-muted text-muted-foreground'
      case 'converted': return 'bg-info/10 text-info-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active Trial'
      case 'ended': return 'Trial Ended'
      case 'converted': return 'Converted to Paid'
      default: return 'Unknown'
    }
  }

  return (
    <Card className="border-info/20 bg-info/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-info-foreground">
            Free Trial Status
          </CardTitle>
          <Badge className={`${getStatusColor(trialData.trial_status)} border-0`}>
            {getStatusText(trialData.trial_status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {trialData.trial_status === 'active' && (
          <>
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-info" />
              <div>
                <p className="font-medium text-foreground">
                  {trialData.days_remaining || 0} days remaining
                </p>
                <p className="text-sm text-muted-foreground">
                  {trialData.hours_remaining || 0} hours left in your trial
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-info" />
              <div>
                <p className="font-medium text-foreground">Trial ends</p>
                <p className="text-sm text-muted-foreground">
                  {trialData.trial_ends_at ? 
                    new Date(trialData.trial_ends_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Unknown'}
                </p>
              </div>
            </div>

            {trialData.auto_billing_enabled && trialData.next_billing_date && (
              <div className="flex items-center space-x-3">
                <CreditCard className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium text-foreground">Next billing</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(trialData.next_billing_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warning-foreground">
                    Auto-billing enabled
                  </p>
                  <p className="text-sm text-warning/80 mt-1">
                    Your card will be automatically charged when the trial ends. 
                    You can cancel anytime before the trial expires.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <Button
                variant="outline"
                onClick={handleCancelTrial}
                className="flex-1 border-error/20 text-error hover:bg-error/10"
              >
                Cancel Trial
              </Button>
            </div>
          </>
        )}

        {trialData.trial_status === 'ended' && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Your free trial has ended. You're now on a paid subscription.
            </p>
            {trialData.next_billing_date && (
              <p className="text-sm text-muted-foreground/80 mt-2">
                Next billing: {new Date(trialData.next_billing_date).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {trialData.trial_package && (
          <div className="text-sm text-muted-foreground pt-2 border-t">
            <p>
              <span className="font-medium">Plan:</span> {trialData.trial_package.name}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
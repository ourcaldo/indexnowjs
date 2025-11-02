'use client'

/**
 * Subscription Management Component
 * Provides a button for users to manage their subscription via Paddle Customer Portal
 */

import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'

interface SubscriptionManagementProps {
  className?: string
}

export function SubscriptionManagement({ className }: SubscriptionManagementProps) {
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const handleManageSubscription = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/v1/payments/paddle/customer-portal')
      
      if (!response.ok) {
        throw new Error('Failed to get customer portal URL')
      }

      const { data } = await response.json()
      
      if (data?.portal_url) {
        window.open(data.portal_url, '_blank')
      } else {
        throw new Error('Portal URL not found in response')
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to open customer portal',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleManageSubscription}
      disabled={loading}
      data-testid="button-manage-subscription"
      className={className}
    >
      {loading ? 'Loading...' : 'Manage Subscription'}
    </Button>
  )
}

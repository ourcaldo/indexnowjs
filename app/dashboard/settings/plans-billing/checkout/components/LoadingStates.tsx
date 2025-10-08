import React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const CheckoutLoading = () => {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="text-muted-foreground">Loading checkout...</span>
      </div>
    </div>
  )
}

export const PackageNotFound = () => {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">Package not found</h2>
        <p className="text-muted-foreground mb-4">The selected package could not be found.</p>
        <Button 
          onClick={() => router.push('/dashboard/settings/plans-billing')} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Back to Billing
        </Button>
      </div>
    </div>
  )
}
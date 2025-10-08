import React from 'react'
import { Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CheckoutSubmitButtonProps {
  paymentMethod: string
  submitting: boolean
  onSubmit: (e: React.FormEvent) => Promise<void>
}

export const CheckoutSubmitButton = ({ 
  paymentMethod, 
  submitting, 
  onSubmit 
}: CheckoutSubmitButtonProps) => {
  if (!paymentMethod) {
    return null
  }

  return (
    <div className="mt-6">
      <Button
        type="submit"
        disabled={submitting || !paymentMethod}
        onClick={onSubmit}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 h-12 transition-colors duration-150"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Building2 className="h-4 w-4 mr-2" />
            Complete Order
          </>
        )}
      </Button>
    </div>
  )
}
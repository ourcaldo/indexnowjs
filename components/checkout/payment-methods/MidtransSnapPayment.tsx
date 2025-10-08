'use client'

import { Card } from '@/components/ui/card'
import { CreditCard, Shield } from 'lucide-react'

interface MidtransSnapPaymentProps {
  gateway: any
}

export default function MidtransSnapPayment({ gateway }: MidtransSnapPaymentProps) {
  return (
    <div className="ml-8 mt-4">
      <div className="p-4 bg-secondary rounded-lg border border-border">
        <div className="flex items-center mb-3">
          <CreditCard className="h-5 w-5 text-accent mr-2" />
          <span className="font-medium text-foreground">Credit/Debit Card Payment</span>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Pay securely with your credit or debit card through Midtrans secure payment gateway.</p>
          
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="text-xs">
              <span className="font-medium text-foreground">Accepted Cards:</span>
              <div className="mt-1 text-muted-foreground">Visa, Mastercard, JCB</div>
            </div>
            <div className="text-xs">
              <span className="font-medium text-foreground">Processing Time:</span>
              <div className="mt-1 text-muted-foreground">Instant</div>
            </div>
          </div>

          <div className="flex items-center text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            <Shield className="h-4 w-4 mr-2 text-success" />
            Secured by Midtrans with 3D Secure authentication
          </div>
        </div>
      </div>
    </div>
  )
}
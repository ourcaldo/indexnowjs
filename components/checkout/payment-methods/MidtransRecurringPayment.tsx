'use client'

import { Card } from '@/components/ui/card'
import { CreditCard, RefreshCw, Shield } from 'lucide-react'
import MidtransCreditCardForm from '@/components/MidtransCreditCardForm'

interface MidtransRecurringPaymentProps {
  gateway: any
  onCreditCardSubmit?: (cardData: any) => Promise<void>
  loading?: boolean
}

export default function MidtransRecurringPayment({ 
  gateway, 
  onCreditCardSubmit, 
  loading = false 
}: MidtransRecurringPaymentProps) {
  return (
    <div className="ml-8 mt-4">
      <div className="p-4 bg-secondary rounded-lg border border-border">
        <div className="flex items-center mb-3">
          <RefreshCw className="h-5 w-5 text-accent mr-2" />
          <span className="font-medium text-foreground">Recurring Credit Card Payment</span>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Set up automatic recurring payments with your credit card. Your card will be securely saved for future payments.</p>
          
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="text-xs">
              <span className="font-medium text-foreground">Payment Method:</span>
              <div className="mt-1 text-muted-foreground">Credit/Debit Card</div>
            </div>
            <div className="text-xs">
              <span className="font-medium text-foreground">Billing Cycle:</span>
              <div className="mt-1 text-muted-foreground">Automatic Renewal</div>
            </div>
          </div>

          <div className="bg-accent/10 rounded-lg p-3 mt-3">
            <div className="text-xs text-foreground">
              <span className="font-medium">How it works:</span>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>• Enter your card details securely</li>
                <li>• Complete initial payment with 3D Secure</li>
                <li>• Card is saved for automatic renewals</li>
                <li>• Cancel anytime from your dashboard</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            <Shield className="h-4 w-4 mr-2 text-success" />
            PCI DSS compliant with advanced tokenization security
          </div>
        </div>

        {/* Credit Card Form */}
        {onCreditCardSubmit && (
          <div className="mt-4">
            <MidtransCreditCardForm
              onSubmit={onCreditCardSubmit}
              loading={loading}
              disabled={loading}
            />
          </div>
        )}
      </div>
    </div>
  )
}
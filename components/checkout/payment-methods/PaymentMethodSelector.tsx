'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Building2 } from 'lucide-react'
import PaymentErrorBoundary from '@/components/checkout/PaymentErrorBoundary'
import MidtransCreditCardForm from '@/components/MidtransCreditCardForm'

interface PaymentMethodSelectorProps {
  paymentGateways: any[]
  selectedMethod: string
  onMethodChange: (method: string) => void
  onCreditCardSubmit?: (cardData: any) => Promise<void>
  loading?: boolean
}

export default function PaymentMethodSelector({ 
  paymentGateways, 
  selectedMethod, 
  onMethodChange,
  onCreditCardSubmit,
  loading = false
}: PaymentMethodSelectorProps) {
  
  return (
    <PaymentErrorBoundary>
      <Card className="border-border bg-background">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-brand-primary">Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
        <RadioGroup value={selectedMethod} onValueChange={onMethodChange}>
          {paymentGateways.map((gateway) => (
            <div key={gateway.id} className="space-y-4">
              <div className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedMethod === gateway.id 
                  ? 'border-brand-accent bg-brand-accent/5 shadow-sm' 
                  : 'border-border hover:border-brand-accent hover:bg-secondary'
              }`}>
                <RadioGroupItem 
                  value={gateway.id} 
                  id={gateway.id}
                  className={selectedMethod === gateway.id ? 'border-brand-accent text-brand-accent' : 'border-border text-brand-text'}
                />
                <div className="flex-1">
                  <Label htmlFor={gateway.id} className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center">
                      {gateway.slug === 'bank_transfer' && (
                        <Building2 className="h-5 w-5 text-brand-text mr-3" />
                      )}
                      <div className="font-medium text-brand-primary">{gateway.name}</div>
                    </div>
                    {gateway.is_default && (
                      <span className="text-xs bg-warning text-white px-2 py-1 rounded-full font-medium">
                        Recommended
                      </span>
                    )}
                  </Label>
                </div>
              </div>

              {/* Credit card form with proper spacing and styling */}
              {selectedMethod === gateway.id && gateway.slug === 'midtrans' && onCreditCardSubmit && (
                <div className="ml-8 mt-4 mb-8 p-4 bg-secondary rounded-lg border border-border">
                  <MidtransCreditCardForm
                    onSubmit={onCreditCardSubmit}
                    loading={loading}
                    disabled={loading}
                  />
                </div>
              )}

            </div>
          ))}
        </RadioGroup>
        </CardContent>
      </Card>
    </PaymentErrorBoundary>
  )
}
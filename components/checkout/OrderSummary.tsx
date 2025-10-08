'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Shield, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface OrderSummaryProps {
  selectedPackage: any
  billingPeriod: string
  userCurrency: 'USD' | 'IDR'
  isTrialFlow?: boolean
}

export default function OrderSummary({ selectedPackage, billingPeriod, userCurrency, isTrialFlow = false }: OrderSummaryProps) {
  const [idrAmount, setIdrAmount] = useState<number | null>(null)
  const [conversionRate, setConversionRate] = useState<number | null>(null)

  useEffect(() => {
    const fetchConversionRate = async () => {
      if (userCurrency === 'USD') {
        try {
          const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
          if (response.ok) {
            const data = await response.json()
            const rate = data.rates?.IDR
            if (rate && typeof rate === 'number') {
              setConversionRate(rate)
              const usdPrice = calculatePrice().price
              setIdrAmount(Math.round(usdPrice * rate))
            }
          }
        } catch (error) {
          // Use fallback rate
          const fallbackRate = 15800
          setConversionRate(fallbackRate)
          const usdPrice = calculatePrice().price
          setIdrAmount(Math.round(usdPrice * fallbackRate))
        }
      }
    }

    fetchConversionRate()
  }, [selectedPackage, billingPeriod, userCurrency])

  if (!selectedPackage) return null

  const calculatePrice = () => {
    if (selectedPackage.pricing_tiers?.[billingPeriod]?.[userCurrency]) {
      const currencyTier = selectedPackage.pricing_tiers[billingPeriod][userCurrency]
      const price = currencyTier.promo_price || currencyTier.regular_price
      const originalPrice = currencyTier.regular_price
      const discount = currencyTier.promo_price 
        ? Math.round(((originalPrice - currencyTier.promo_price) / originalPrice) * 100) 
        : 0
      const periodLabel = currencyTier.period_label || billingPeriod

      return { price, discount, originalPrice, periodLabel }
    }

    return { price: 0, discount: 0, originalPrice: 0, periodLabel: billingPeriod }
  }

  const { price, discount, originalPrice, periodLabel } = calculatePrice()

  // Calculate trial pricing and billing date
  const getTrialPricing = () => {
    if (!isTrialFlow) return null

    // Trial charge is always $1 USD equivalent
    const trialChargeUSD = 1
    const trialChargeIDR = Math.round(trialChargeUSD * (conversionRate || 15800)) // Use current rate or fallback

    // Future billing date (3 days from now)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 3)
    const futureDateStr = futureDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    return {
      trialAmount: userCurrency === 'USD' ? trialChargeUSD : trialChargeIDR,
      futureBillingDate: futureDateStr,
      futureAmount: price
    }
  }

  const trialInfo = getTrialPricing()

  return (
    <Card className="sticky top-8 border-border bg-background">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Package Details */}
        <div className="p-4 bg-secondary rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-foreground">{selectedPackage.name} Plan</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {periodLabel} billing
              </p>
            </div>
            {discount > 0 && (
              <span className="bg-warning text-white text-xs px-2 py-1 rounded-full font-medium">
                Save {discount}%
              </span>
            )}
          </div>
          <div className="space-y-2">
            {selectedPackage.features?.slice(0, 3).map((feature: string, index: number) => (
              <div key={index} className="flex items-center text-sm">
                <Check className="h-4 w-4 text-success mr-2 flex-shrink-0" />
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
            {selectedPackage.features?.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{selectedPackage.features.length - 3} more features
              </div>
            )}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="space-y-3">
          {isTrialFlow && trialInfo ? (
            <>
              {/* Trial Pricing Section */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Today's charge:</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(trialInfo.trialAmount, userCurrency)}
                </span>
              </div>

              <hr className="border-border" />

              {/* Future Billing Info */}
              <div className="text-sm text-muted-foreground">
                After trial ends
              </div>
              <div className="text-sm text-muted-foreground">
                On {trialInfo.futureBillingDate} you'll be charged{' '}
                <span className="font-medium text-foreground">
                  {formatCurrency(trialInfo.futureAmount, userCurrency)}
                </span>
                {' '}for your {periodLabel} subscription.
              </div>

              <hr className="border-border" />

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">Total today:</span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(trialInfo.trialAmount, userCurrency)}
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Regular Pricing Section */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(originalPrice, userCurrency)}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Discount ({discount}%):</span>
                  <span className="font-medium text-warning">
                    -{formatCurrency(originalPrice - price, userCurrency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tax:</span>
                <span className="font-medium text-foreground">{formatCurrency(0, userCurrency)}</span>
              </div>

              <hr className="border-border" />

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">Total:</span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(price, userCurrency)}
                </span>
              </div>
            </>
          )}

          {/* Currency Conversion Display for USD users */}
          {userCurrency === 'USD' && conversionRate && (
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Payment will be processed in IDR</div>
              <div>Conversion rate: 1 USD = {conversionRate.toLocaleString()} IDR</div>
              <div className="font-medium text-foreground">
                You will pay: {formatCurrency(
                  isTrialFlow && trialInfo 
                    ? Math.round(trialInfo.trialAmount * conversionRate)
                    : (idrAmount || Math.round((calculatePrice().price) * conversionRate)), 
                  'IDR'
                )}
              </div>
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="flex items-center justify-center text-xs text-muted-foreground mt-4">
          <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
          Secure checkout. Your information is protected.
        </div>
      </CardContent>
    </Card>
  )
}
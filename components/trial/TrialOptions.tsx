'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, CreditCard, CheckCircle, Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabaseBrowser } from '@/lib/database'
import { AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface TrialEligibility {
  eligible: boolean;
  reason?: string;
  message: string;
  available_packages?: any[];
}

interface TrialOptionsProps {}

export default function TrialOptions({}: TrialOptionsProps) {
  const [eligibility, setEligibility] = useState<TrialEligibility | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingTrial, setStartingTrial] = useState<string | null>(null)
  const { addToast } = useToast()
  const router = useRouter()

  useEffect(() => {
    checkTrialEligibility()
  }, [])

  const checkTrialEligibility = async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(AUTH_ENDPOINTS.TRIAL_ELIGIBILITY, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (response.ok) {
        const result = await response.json()
        setEligibility(result)
      }
    } catch (error) {
      console.error('Failed to check trial eligibility:', error)
    } finally {
      setLoading(false)
    }
  }

  const startTrial = async (packageId: string, packageSlug: string) => {
    setStartingTrial(packageId)
    
    try {
      // Redirect to checkout with trial parameter
      router.push(`/dashboard/settings/plans-billing/checkout?package=${packageId}&period=monthly&trial=true`)
    } catch (error) {
      addToast({
        title: "Error",
        description: "Failed to start trial. Please try again.",
        type: "error"
      })
    } finally {
      setStartingTrial(null)
    }
  }

  const calculatePrice = (pkg: any, period: string = 'monthly') => {
    if (!pkg.pricing_tiers) return { price: 0, originalPrice: 0 }

    // Use flat USD pricing structure (Paddle handles currency conversion)
    if (pkg.pricing_tiers[period]) {
      const tier = pkg.pricing_tiers[period]
      return {
        price: tier.promo_price || tier.regular_price,
        originalPrice: (tier.regular_price && tier.regular_price > 0 && tier.regular_price !== (tier.promo_price || tier.regular_price)) ? tier.regular_price : 0
      }
    }

    // No pricing found
    return { price: 0, originalPrice: 0 }
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
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

  if (!eligibility?.eligible) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Free Trial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="mb-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">{eligibility?.message}</p>
              {eligibility?.reason === 'already_used' && (
                <p className="text-sm text-muted-foreground">
                  Each user can only use the free trial once per lifetime.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-info/20 bg-gradient-to-br from-info/10 to-info/5">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-2">
          <Star className="h-6 w-6 text-info mr-2" />
          <CardTitle className="text-xl font-bold text-info-foreground">
            3-Day Free Trial
          </CardTitle>
        </div>
        <p className="text-info/80">
          Try our Premium or Pro plans risk-free for 3 days
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-info/10 border border-info/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-info" />
            <div>
              <p className="font-medium text-info-foreground">What's included:</p>
              <ul className="text-sm text-info/80 mt-1 space-y-1">
                <li>• Full access to all plan features</li>
                <li>• No charges for 3 days</li>
                <li>• Cancel anytime during trial</li>
                <li>• Automatic billing after trial (if not cancelled)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {eligibility.available_packages?.map((pkg: any) => {
            const pricing = calculatePrice(pkg, 'monthly')
            return (
              <div 
                key={pkg.id} 
                className="border border-border rounded-lg p-4 bg-background hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-foreground">{pkg.name}</h3>
                      {pkg.is_popular && (
                        <Badge className="bg-info/10 text-info-foreground border-info/20">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                    
                    <div className="flex items-baseline space-x-2 mb-3">
                      <span className="text-2xl font-bold text-foreground">
                        {formatCurrency(pricing.price)}
                      </span>
                      <span className="text-sm text-muted-foreground">/month</span>
                      {pricing.originalPrice > 0 && pricing.originalPrice > pricing.price && (
                        <span className="text-sm text-muted-foreground/60 line-through">
                          {formatCurrency(pricing.originalPrice)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center text-sm text-success mb-4">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="font-medium">Free for 3 days, then {formatCurrency(pricing.price)}/month</span>
                    </div>

                    <div className="flex items-center text-sm text-warning mb-4">
                      <CreditCard className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>Credit card required - auto-billing after trial</span>
                    </div>
                  </div>
                  
                  <div className="ml-6">
                    <Button
                      onClick={() => startTrial(pkg.id, pkg.slug)}
                      disabled={startingTrial === pkg.id}
                      className="bg-info hover:bg-info/90 text-info-foreground px-6 py-2"
                    >
                      {startingTrial === pkg.id ? (
                        <>Starting...</>
                      ) : (
                        <>Start 3-Day Trial</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CreditCard className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warning-foreground mb-1">
                Important: Credit Card Required
              </p>
              <p className="text-sm text-warning/80">
                A valid credit card is required to start your free trial. You'll be charged automatically 
                when the trial ends unless you cancel before then.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
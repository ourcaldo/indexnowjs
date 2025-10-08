'use client'

import { useState, useEffect } from 'react'
import { 
  Check, 
  Crown, 
  Star, 
  ArrowRight,
  Package,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/database'
import { BILLING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface PackageFeature {
  name: string
  included: boolean
  limit?: string
}

interface PricingTier {
  name: string
  regular_price: number
  promo_price?: number
  discount_percentage?: number
}

interface PaymentPackage {
  id: string
  name: string
  slug: string
  description: string
  price: number
  currency: string
  billing_period: string
  features: string[]
  quota_limits: {
    daily_quota_limit: number
    service_accounts_limit: number
    concurrent_jobs_limit: number
  }
  is_popular: boolean
  is_current: boolean
  pricing_tiers: Record<string, PricingTier>
}

interface PackagesData {
  packages: PaymentPackage[]
  current_package_id: string | null
  expires_at: string | null
}

export default function PlansPage() {
  const [packagesData, setPackagesData] = useState<PackagesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('monthly')
  const [subscribing, setSubscribing] = useState<string | null>(null)

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(BILLING_ENDPOINTS.PACKAGES, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to load packages')
      }

      const data = await response.json()
      setPackagesData(data)
    } catch (error) {
      console.error('Error loading packages:', error)
      setError(error instanceof Error ? error.message : 'Failed to load packages')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: 'IDR' | 'USD' = 'USD') => {
    const locale = currency === 'IDR' ? 'id-ID' : 'en-US'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getBillingPeriodPrice = (pkg: PaymentPackage, period: string): { price: number, originalPrice?: number, discount?: number } => {
    const tier = pkg.pricing_tiers?.[period]
    if (tier) {
      return {
        price: tier.promo_price || tier.regular_price,
        originalPrice: tier.promo_price ? tier.regular_price : undefined,
        discount: tier.discount_percentage
      }
    }
    return { price: 0 }
  }

  const handleSubscribe = async (packageId: string) => {
    try {
      setSubscribing(packageId)
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Redirect to unified checkout page with selected package and billing period
      // This prevents duplicate transaction creation by using only the checkout API
      const checkoutUrl = `/dashboard/settings/plans-billing/checkout?package=${packageId}&period=${selectedBillingPeriod}`
      window.location.href = checkoutUrl

    } catch (error) {
      console.error('Error redirecting to checkout:', error)
      alert(error instanceof Error ? error.message : 'Failed to proceed to checkout')
      setSubscribing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Plans</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={loadPackages}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const billingPeriods = [
    { key: 'monthly', label: 'Monthly', suffix: '/month' },
    { key: '3-month', label: '3 Months', suffix: '/3 months' },
    { key: '6-month', label: '6 Months', suffix: '/6 months' },
    { key: 'annual', label: 'Annual', suffix: '/year' }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">Choose Your Plan</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Select the perfect plan for your URL indexing needs. All plans include access to Google Indexing API and premium features.
        </p>
      </div>

      {/* Billing Period Toggle */}
      <div className="flex justify-center">
        <div className="flex bg-secondary p-1 rounded-lg">
          {billingPeriods.map((period) => (
            <button
              key={period.key}
              onClick={() => setSelectedBillingPeriod(period.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedBillingPeriod === period.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {period.label}
              {period.key === 'annual' && (
                <span className="ml-1 text-xs bg-success text-success-foreground px-1.5 py-0.5 rounded-full">
                  Save 20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {packagesData?.packages.map((pkg) => {
          const pricingInfo = getBillingPeriodPrice(pkg, selectedBillingPeriod)
          const currentPeriod = billingPeriods.find(p => p.key === selectedBillingPeriod)

          return (
            <div
              key={pkg.id}
              className={`relative bg-card rounded-xl border-2 p-8 transition-all hover:shadow-lg ${
                pkg.is_popular 
                  ? 'border-accent shadow-md' 
                  : pkg.is_current
                  ? 'border-success'
                  : 'border-border hover:border-accent'
              }`}
            >
              {/* Popular Badge */}
              {pkg.is_popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-medium">
                    <Star className="h-4 w-4 mr-1" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Current Plan Badge */}
              {pkg.is_current && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center bg-success text-success-foreground px-4 py-2 rounded-full text-sm font-medium">
                    <Crown className="h-4 w-4 mr-1" />
                    Current Plan
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">{pkg.name}</h3>
                <p className="text-muted-foreground mb-6">{pkg.description}</p>

                <div className="mb-6">
                  {pricingInfo.originalPrice && (
                    <div className="text-muted-foreground line-through text-lg mb-1">
                      {formatCurrency(pricingInfo.originalPrice, pkg.currency)}
                    </div>
                  )}
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-foreground">
                      {formatCurrency(pricingInfo.price, pkg.currency)}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      {currentPeriod?.suffix}
                    </span>
                  </div>
                  {pricingInfo.discount && (
                    <div className="text-success text-sm font-medium mt-1">
                      Save {pricingInfo.discount}%
                    </div>
                  )}
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-4 mb-8">
                {(pkg.features || []).map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-success mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}

                {/* Quota Limits */}
                <div className="pt-4 border-t border-border">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily Quota:</span>
                      <span className="font-medium text-foreground">
                        {pkg.quota_limits?.daily_quota_limit === -1 ? 'Unlimited' : pkg.quota_limits?.daily_quota_limit?.toLocaleString() || 0} URLs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Accounts:</span>
                      <span className="font-medium text-foreground">
                        {pkg.quota_limits?.service_accounts_limit === -1 ? 'Unlimited' : pkg.quota_limits?.service_accounts_limit || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Concurrent Jobs:</span>
                      <span className="font-medium text-foreground">
                        {pkg.quota_limits?.concurrent_jobs_limit === -1 ? 'Unlimited' : pkg.quota_limits?.concurrent_jobs_limit || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleSubscribe(pkg.id)}
                disabled={pkg.is_current || subscribing === pkg.id}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
                  pkg.is_current
                    ? 'bg-success/10 text-success cursor-not-allowed'
                    : pkg.is_popular
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-md'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
                } ${subscribing === pkg.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {subscribing === pkg.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : pkg.is_current ? (
                  'Current Plan'
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Additional Info */}
      <div className="text-center py-8">
        <div className="bg-secondary rounded-lg p-6 max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-foreground mb-2">Need Help Choosing?</h3>
          <p className="text-muted-foreground mb-4">
            All plans include 24/7 support, real-time indexing monitoring, and access to our premium dashboard features.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-success mr-1" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-success mr-1" />
              <span>Secure payments</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-success mr-1" />
              <span>Instant activation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
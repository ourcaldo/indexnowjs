'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Check, 
  Crown, 
  Star, 
  ArrowRight,
  Package,
  AlertCircle,
  Loader2,
  CheckCircle,
  X,
  Clock
} from 'lucide-react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/database'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AUTH_ENDPOINTS, BILLING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface PackageFeature {
  name: string
  included: boolean
  limit?: string
}

interface PricingTier {
  period: string
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
    daily_urls?: number
    daily_quota_limit?: number
    service_accounts?: number
    service_accounts_limit?: number
    concurrent_jobs?: number
    concurrent_jobs_limit?: number
  }
  is_popular: boolean
  is_current: boolean
  free_trial_enabled?: boolean
  pricing_tiers: Record<string, PricingTier> | Array<{
    period: string
    period_label: string
    regular_price: number
    promo_price?: number
  }>
}

interface PackagesData {
  packages: PaymentPackage[]
  current_package_id: string | null
  expires_at: string | null
}

export default function PlansTab() {
  const searchParams = useSearchParams()
  const [packagesData, setPackagesData] = useState<PackagesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('monthly')
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [startingTrial, setStartingTrial] = useState<string | null>(null)
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({})
  const [showComparePlans, setShowComparePlans] = useState(false)
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null)

  // Check for checkout success
  useEffect(() => {
    if (searchParams?.get('checkout') === 'success') {
      setShowSuccessNotification(true)
      // Remove the query parameter
      window.history.replaceState({}, '', '/dashboard/settings/plans-billing')
    }
  }, [searchParams])

  useEffect(() => {
    loadPackages()
    checkTrialEligibility()
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

      const result = await response.json()
      // API now returns: { success: true, data: {...}, timestamp: "..." }
      if (result.success === true && result.data) {
        setPackagesData(result.data)
      } else {
        throw new Error(result.error?.message || 'Failed to load packages')
      }
    } catch (error) {
      console.error('Error loading packages:', error)
      setError(error instanceof Error ? error.message : 'Failed to load packages')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const getBillingPeriodPrice = (pkg: PaymentPackage, period: string): { price: number, originalPrice?: number, discount?: number } => {
    // Handle pricing_tiers as array format from database
    if (Array.isArray(pkg.pricing_tiers)) {
      const tier = pkg.pricing_tiers.find((t: any) => t.period === period)
      if (tier) {
        return {
          price: tier.promo_price || tier.regular_price,
          originalPrice: tier.promo_price ? tier.regular_price : undefined,
          discount: tier.promo_price ? Math.round(((tier.regular_price - tier.promo_price) / tier.regular_price) * 100) : undefined
        }
      }
    }
    // Handle pricing_tiers as object format (fallback)
    else if (pkg.pricing_tiers?.[period]) {
      const tier = pkg.pricing_tiers[period]
      return {
        price: tier.promo_price || tier.regular_price,
        originalPrice: tier.promo_price ? tier.regular_price : undefined,
        discount: tier.discount_percentage
      }
    }
    return { price: pkg.price }
  }



  const checkTrialEligibility = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch(AUTH_ENDPOINTS.TRIAL_ELIGIBILITY, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        // API now returns: { success: true, data: {...}, timestamp: "..." }
        if (result.success === true && result.data) {
          setTrialEligible(result.data.eligible)
        } else {
          setTrialEligible(false)
        }
      } else {
        setTrialEligible(false)
      }
    } catch (error) {
      setTrialEligible(false)
    }
  }

  const handleSubscribe = async (packageId: string) => {
    try {
      setSubscribing(packageId)

      // Redirect to checkout page with package and billing period
      const checkoutUrl = `/dashboard/settings/plans-billing/checkout?package=${packageId}&period=${selectedBillingPeriod}`
      window.location.href = checkoutUrl

    } catch (error) {
      console.error('Error subscribing:', error)
      alert(error instanceof Error ? error.message : 'Failed to redirect to checkout')
    } finally {
      setSubscribing(null)
    }
  }

  const handleStartTrial = async (packageId: string) => {
    try {
      setStartingTrial(packageId)

      // Redirect to checkout page with trial parameter
      const checkoutUrl = `/dashboard/settings/plans-billing/checkout?package=${packageId}&period=monthly&trial=true`
      window.location.href = checkoutUrl

    } catch (error) {
      console.error('Error starting trial:', error)
      alert(error instanceof Error ? error.message : 'Failed to start trial')
    } finally {
      setStartingTrial(null)
    }
  }

  // Check if package is eligible for trial (based on database configuration)
  const isTrialEligiblePackage = (pkg: PaymentPackage) => {
    return pkg.free_trial_enabled === true
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
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
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
    { key: 'monthly', label: 'Monthly' },
    { key: 'annual', label: 'Annual', suffix: '/year' }
  ]

  // Get features directly from database - ONLY from database, no hardcoded features
  const getFeaturesForPlan = (pkg: PaymentPackage): string[] => {
    // Return ONLY the features from database, nothing else
    return Array.isArray(pkg.features) ? pkg.features : []
  }

  const toggleComparePlans = () => {
    const newShowComparePlans = !showComparePlans
    setShowComparePlans(newShowComparePlans)

    if (newShowComparePlans) {
      // Show all plan details when comparing
      const allExpanded: Record<string, boolean> = {}
      packagesData?.packages.forEach(pkg => {
        allExpanded[pkg.id] = true
      })
      setExpandedPlans(allExpanded)
    } else {
      // Hide all details when not comparing
      setExpandedPlans({})
    }
  }

  const togglePlanDetails = (planId: string) => {
    // Don't allow individual toggle when compare mode is active
    if (showComparePlans) return

    // Only toggle the specific plan, clear all others
    setExpandedPlans({
      [planId]: !expandedPlans[planId]
    })
  }

  return (
    <div className="space-y-8">
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-success mr-3" />
            <div>
              <h3 className="font-semibold text-foreground">Order submitted successfully!</h3>
              <p className="text-sm text-muted-foreground">Payment instructions have been sent to your email. We'll activate your subscription once payment is confirmed.</p>
            </div>
          </div>
          <button
            onClick={() => setShowSuccessNotification(false)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground">Select the perfect plan for your URL indexing needs</p>

        {/* Compare Plans Button */}
        <div className="mt-4">
          <button 
            onClick={toggleComparePlans}
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            {showComparePlans ? 'Hide comparison' : 'Compare plans'}
          </button>
        </div>
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
                  ? 'bg-background text-foreground shadow-sm backdrop-blur-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {period.label}
              {period.key === 'annual' && (
                <span className="ml-1 text-xs bg-success text-success-foreground px-1.5 py-0.5 rounded-full">
                  Save 80%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-end">
        {packagesData?.packages.map((pkg) => {
          const pricingInfo = getBillingPeriodPrice(pkg, selectedBillingPeriod)
          const currentPeriod = billingPeriods.find(p => p.key === selectedBillingPeriod)

          return (
            <div
              key={`plan-${pkg.id}-${selectedBillingPeriod}`}
              className={`relative bg-card rounded-xl border-2 p-8 transition-all hover:shadow-lg flex flex-col h-full ${
                pkg.is_popular 
                  ? 'border-foreground shadow-md' 
                  : pkg.is_current
                  ? 'border-success'
                  : 'border-border hover:border-accent'
              }`}
            >
              {/* Popular Badge */}
              {pkg.is_popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium">
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
                      {formatCurrency(pricingInfo.originalPrice)}
                    </div>
                  )}
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-foreground">
                      {formatCurrency(pricingInfo.price)}
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
              <div className="space-y-3 mb-8 flex-grow">
                {getFeaturesForPlan(pkg).map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-success mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>



              {/* Expanded Details */}
              {expandedPlans[pkg.id] && (
                <div className="mb-6 p-4 bg-secondary rounded-lg border border-border">
                  <div className="space-y-3">
                    {pkg.quota_limits?.daily_quota_limit && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Daily URLs:</span>
                        <span className="text-foreground font-medium">
                          {pkg.quota_limits.daily_quota_limit === -1 ? 'Unlimited' : pkg.quota_limits.daily_quota_limit.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {pkg.quota_limits?.service_accounts_limit && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service Accounts:</span>
                        <span className="text-foreground font-medium">
                          {pkg.quota_limits.service_accounts_limit === -1 ? 'Unlimited' : pkg.quota_limits.service_accounts_limit}
                        </span>
                      </div>
                    )}
                    {pkg.quota_limits?.concurrent_jobs_limit && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Concurrent Jobs:</span>
                        <span className="text-foreground font-medium">
                          {pkg.quota_limits.concurrent_jobs_limit === -1 ? 'Unlimited' : pkg.quota_limits.concurrent_jobs_limit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!pkg.is_current && (
                <div className="space-y-3">
                  {/* Regular Subscription Button */}
                  <button
                    onClick={() => handleSubscribe(pkg.id)}
                    disabled={subscribing === pkg.id}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center h-12 ${
                      pkg.is_popular
                        ? 'bg-foreground text-background hover:bg-foreground/80 hover:shadow-md'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
                    } ${subscribing === pkg.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {subscribing === pkg.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Upgrade'
                    )}
                  </button>

                  {/* Free Trial Button - Only show for eligible users and eligible packages */}
                  {trialEligible && isTrialEligiblePackage(pkg) && (
                    <button
                      onClick={() => handleStartTrial(pkg.id)}
                      disabled={startingTrial === pkg.id}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center h-12 border-2 ${
                        pkg.is_popular
                          ? 'border-foreground text-foreground hover:bg-accent hover:text-accent-foreground'
                          : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                      } ${startingTrial === pkg.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {startingTrial === pkg.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          Start 3-Day Free Trial
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Additional Info */}
      <div className="text-center py-8">
        <div className="bg-secondary rounded-lg p-6">
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
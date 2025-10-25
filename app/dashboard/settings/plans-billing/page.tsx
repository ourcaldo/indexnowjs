'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, Download } from 'lucide-react'
import { supabase } from '@/lib/database'
import { authService } from '@/lib/auth'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { useToast } from '@/hooks/use-toast'
import { useApiError } from '@/hooks/useApiError'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { BILLING_ENDPOINTS, PUBLIC_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

// Type definitions
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
  pricing_tiers: any
  free_trial_enabled?: boolean
}

interface Transaction {
  id: string
  transaction_type: string
  transaction_status: string
  amount: number
  currency: string
  payment_method: string
  gateway_transaction_id: string
  created_at: string
  processed_at: string | null
  verified_at: string | null
  notes: string | null
  package_name?: string
  package?: {
    name: string
    slug: string
  }
  gateway?: {
    name: string
    slug: string
  }
  subscription?: {
    billing_period: string
    started_at: string
    expires_at: string
  } | null
}

interface BillingData {
  currentSubscription: {
    package_name: string
    package_slug: string
    subscription_status: string
    expires_at: string | null
    subscribed_at: string | null
    amount_paid: number
    billing_period: string
  } | null
  billingStats: {
    total_payments: number
    total_spent: number
    next_billing_date: string | null
    days_remaining: number | null
  }
  recentTransactions: Array<{
    id: string
    transaction_type: string
    amount: number
    currency: string
    transaction_status: string
    created_at: string
    package_name: string
    payment_method: string
  }>
}

interface PackagesData {
  packages: PaymentPackage[]
  current_package_id: string | null
  expires_at: string | null
  user_currency?: string
  user_country?: string
}

interface BillingHistoryData {
  transactions: Transaction[]
  summary: {
    total_transactions: number
    completed_transactions: number
    pending_transactions: number
    failed_transactions: number
    total_amount_spent: number
  }
  pagination: {
    current_page: number
    total_pages: number
    total_items: number
    items_per_page: number
    has_next: boolean
    has_prev: boolean
  }
}

interface UsageData {
  daily_quota_used: number
  daily_quota_limit: number
  is_unlimited: boolean
  quota_exhausted: boolean
  package_name: string
  remaining_quota: number
  service_account_count: number
}

interface KeywordUsageData {
  keywords_used: number
  keywords_limit: number
  is_unlimited: boolean
  remaining_quota: number
}

export default function BillingPage() {
  // State management
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [packagesData, setPackagesData] = useState<PackagesData | null>(null)
  const [historyData, setHistoryData] = useState<BillingHistoryData | null>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [keywordUsage, setKeywordUsage] = useState<KeywordUsageData | null>(null)
  const [serviceAccountCount, setServiceAccountCount] = useState<number>(0)
  const [totalKeywords, setTotalKeywords] = useState<number>(0)
  const [userCurrency, setUserCurrency] = useState<'USD' | 'IDR'>('USD')
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Plans section state
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('monthly')
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [startingTrial, setStartingTrial] = useState<string | null>(null)
  
  // Billing history pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Hooks
  const router = useRouter()
  const { addToast } = useToast()
  const { handleApiError } = useApiError()
  const { logBillingActivity } = useActivityLogger()
  usePageViewLogger('/dashboard/settings/plans-billing', 'Billing & Subscriptions', { section: 'billing_management' })

  // Load data on mount
  useEffect(() => {
    loadAllData()
    
    // Handle payment status from URL
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')
    
    if (paymentStatus) {
      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      router.replace(url.pathname, { scroll: false })
    }
  }, [])

  // Data loading functions
  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadBillingData(),
        loadBillingHistory(),
        loadDashboardData()
      ])
    } catch (error) {
      handleApiError(error)
    } finally {
      setLoading(false)
    }
  }

  const loadBillingData = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) throw new Error('User not authenticated')

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('No authentication token')

      const response = await fetch(BILLING_ENDPOINTS.OVERVIEW, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to load billing data')

      const result = await response.json()
      const data = result?.success === true && result.data ? result.data : result
      setBillingData(data)
    } catch (error) {
      handleApiError(error)
      setError(error instanceof Error ? error.message : 'Failed to load billing data')
    }
  }

  const loadDashboardData = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) throw new Error('User not authenticated')

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('No authentication token')

      // Fetch packages from public endpoint
      const packagesResponse = await fetch(PUBLIC_ENDPOINTS.PACKAGES, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!packagesResponse.ok) throw new Error('Failed to load packages')
      
      const packagesResult = await packagesResponse.json()
      const packages = packagesResult?.data?.packages || []

      // Fetch dashboard data to get current package and usage data
      const dashboardResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!dashboardResponse.ok) throw new Error('Failed to load dashboard data')
      
      const dashboardResult = await dashboardResponse.json()
      const dashboardData = dashboardResult?.data || {}
      
      // Extract profile data from nested structure
      const profileData = dashboardData.user?.profile || {}
      const billingData = dashboardData.billing || {}

      // Set packages data
      setPackagesData({
        packages: packages,
        current_package_id: profileData.package_id || billingData.current_package_id || null,
        expires_at: profileData.expires_at || billingData.expires_at || null,
        user_currency: billingData.user_currency || (profileData.country === 'Indonesia' ? 'IDR' : 'USD'),
        user_country: billingData.user_country || profileData.country || ''
      })
      
      // Set user currency
      setUserCurrency(billingData.user_currency || (profileData.country === 'Indonesia' ? 'IDR' : 'USD'))
      
      // Extract usage data from dashboard
      if (dashboardData.user?.quota) {
        setUsageData(dashboardData.user.quota)
      }
      
      // Extract keyword usage from rank tracking
      if (dashboardData.rankTracking?.usage) {
        setKeywordUsage(dashboardData.rankTracking.usage)
      }
      
      // Extract service account count from profile (API returns correct count here)
      if (profileData.service_account_count !== undefined) {
        setServiceAccountCount(profileData.service_account_count)
      } else if (dashboardData.indexing?.serviceAccounts !== undefined) {
        setServiceAccountCount(dashboardData.indexing.serviceAccounts)
      }
      
      // Fetch total keywords count across all domains
      try {
        const keywordsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/rank-tracking/keywords`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })
        
        if (keywordsResponse.ok) {
          const keywordsResult = await keywordsResponse.json()
          if (keywordsResult.success && keywordsResult.data) {
            // Count total active keywords across all domains
            const allKeywords = keywordsResult.data.keywords || []
            const activeKeywordsCount = allKeywords.filter((kw: any) => kw.is_active).length
            setTotalKeywords(activeKeywordsCount)
          }
        }
      } catch (err) {
        // Fallback to usage data if keywords endpoint fails
        setTotalKeywords(keywordUsage?.keywords_used || 0)
      }
      
      // Extract trial eligibility from dashboard
      if (dashboardData.user?.trial) {
        setTrialEligible(dashboardData.user.trial.eligible)
      }
    } catch (error) {
      handleApiError(error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
    }
  }

  const loadBillingHistory = async (page: number = 1) => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) throw new Error('User not authenticated')

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('No authentication token')

      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString()
      })

      const response = await fetch(`${BILLING_ENDPOINTS.HISTORY}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to load billing history')

      const result = await response.json()
      const data = result?.success === true && result.data ? result.data : result
      setHistoryData(data)
      setCurrentPage(page)
    } catch (error) {
      handleApiError(error)
      setError(error instanceof Error ? error.message : 'Failed to load billing history')
    }
  }
  
  const handlePageChange = async (page: number) => {
    await loadBillingHistory(page)
  }

  // Helper functions
  const getBillingPeriodPrice = (pkg: PaymentPackage, period: string): { price: number, originalPrice?: number, discount?: number } => {
    // Map 'yearly' to 'annual' as the API returns 'annual' but UI uses 'yearly'
    const apiPeriod = period === 'yearly' ? 'annual' : period
    
    if (pkg.pricing_tiers && typeof pkg.pricing_tiers === 'object' && pkg.pricing_tiers[apiPeriod]) {
      const periodTier = pkg.pricing_tiers[apiPeriod]
      
      if (periodTier[userCurrency]) {
        const currencyTier = periodTier[userCurrency]
        return {
          price: currencyTier.promo_price || currencyTier.regular_price,
          originalPrice: currencyTier.promo_price ? currencyTier.regular_price : undefined,
          discount: currencyTier.promo_price ? Math.round(((currencyTier.regular_price - currencyTier.promo_price) / currencyTier.regular_price) * 100) : undefined
        }
      }
      
      if (Array.isArray(pkg.pricing_tiers)) {
        const tier = pkg.pricing_tiers.find((t: any) => t.period === apiPeriod)
        if (tier) {
          return {
            price: tier.promo_price || tier.regular_price,
            originalPrice: tier.promo_price ? tier.regular_price : undefined,
            discount: tier.discount_percentage
          }
        }
      }
    }
    
    return { price: pkg.price }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const locale = currency === 'IDR' ? 'id-ID' : 'en-US'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getUsagePercentage = (used: number, limit: number, isUnlimited: boolean) => {
    if (isUnlimited || limit <= 0) return 0
    return Math.min(100, (used / limit) * 100)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  // Action handlers
  const handleSubscribe = async (packageId: string, period: string) => {
    try {
      setSubscribing(packageId)
      const checkoutUrl = `/dashboard/settings/plans-billing/checkout?package=${packageId}&period=${period}`
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
      const checkoutUrl = `/dashboard/settings/plans-billing/checkout?package=${packageId}&period=monthly&trial=true`
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Error starting trial:', error)
    } finally {
      setStartingTrial(null)
    }
  }

  const isTrialEligiblePackage = (pkg: any) => {
    return pkg.free_trial_enabled === true
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'confirmed':
        return <Check className="h-4 w-4 text-success" />
      case 'pending':
      case 'proof_uploaded':
        return <AlertCircle className="h-4 w-4 text-warning" />
      case 'failed':
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'proof_uploaded':
        return 'WAITING FOR CONFIRMATION'
      default:
        return status.replace('_', ' ').toUpperCase()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'confirmed': 
        return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' }
      case 'expired':
      case 'failed':
      case 'cancelled': 
        return { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' }
      case 'expiring_soon':
      case 'pending':
      case 'proof_uploaded': 
        return { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' }
      default: 
        return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' }
    }
  }

  // Loading and error states
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
        <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Billing Data</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadAllData}>Try Again</Button>
      </div>
    )
  }

  const currentPlan = packagesData?.packages.find(pkg => pkg.id === packagesData.current_package_id)
  const currentPlanPricing = currentPlan ? getBillingPeriodPrice(currentPlan, selectedBillingPeriod) : null

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      {currentPlan ? (
        <Card className="bg-card border-border" data-testid="card-current-plan">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <Badge className="mb-2 bg-primary text-primary-foreground" data-testid="badge-current-plan">Current Plan</Badge>
                <CardTitle className="text-2xl" data-testid="text-plan-name">{currentPlan.name}</CardTitle>
                <CardDescription className="text-foreground/70" data-testid="text-billing-info">
                  {billingData?.currentSubscription ? (
                    <>
                      {formatCurrency(billingData.currentSubscription.amount_paid, userCurrency)}/
                      {billingData.currentSubscription.billing_period} • Next billing {billingData.billingStats.next_billing_date ? formatDate(billingData.billingStats.next_billing_date) : 'N/A'}
                    </>
                  ) : currentPlanPricing ? (
                    `Active package • ${formatCurrency(currentPlanPricing.price, userCurrency)}/month`
                  ) : (
                    'Active package'
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Daily URLs */}
              <div className="bg-gradient-to-br from-[hsl(var(--usage-card-bg-from))] to-[hsl(var(--usage-card-bg-to))] rounded-lg p-4 border border-[hsl(var(--usage-card-border))]" data-testid="card-usage-daily-urls">
                <p className="text-xs text-[hsl(var(--usage-card-label))] mb-2 font-medium" data-testid="text-label-daily-urls">Daily URLs</p>
                <p className="text-2xl text-[hsl(var(--usage-card-value))] font-bold mb-2" data-testid="text-value-daily-urls">
                  {formatNumber(usageData?.daily_quota_used || 0)}
                  <span className="text-sm text-[hsl(var(--usage-card-label))] font-normal ml-0.5">
                    /{usageData?.is_unlimited ? '∞' : formatNumber(usageData?.daily_quota_limit || 0)}
                  </span>
                </p>
                <Progress 
                  value={getUsagePercentage(
                    usageData?.daily_quota_used || 0, 
                    usageData?.daily_quota_limit || 0, 
                    usageData?.is_unlimited || false
                  )} 
                  className="h-1.5" 
                  data-testid="progress-daily-urls"
                />
              </div>
              
              {/* Keywords */}
              <div className="bg-gradient-to-br from-[hsl(var(--usage-card-bg-from))] to-[hsl(var(--usage-card-bg-to))] rounded-lg p-4 border border-[hsl(var(--usage-card-border))]" data-testid="card-usage-keywords">
                <p className="text-xs text-[hsl(var(--usage-card-label))] mb-2 font-medium" data-testid="text-label-keywords">Keywords</p>
                <p className="text-2xl text-[hsl(var(--usage-card-value))] font-bold mb-2" data-testid="text-value-keywords">
                  {formatNumber(totalKeywords || keywordUsage?.keywords_used || 0)}
                  <span className="text-sm text-[hsl(var(--usage-card-label))] font-normal ml-0.5">
                    /{keywordUsage?.is_unlimited ? '∞' : formatNumber(keywordUsage?.keywords_limit || 0)}
                  </span>
                </p>
                <Progress 
                  value={getUsagePercentage(
                    totalKeywords || keywordUsage?.keywords_used || 0, 
                    keywordUsage?.keywords_limit || 0, 
                    keywordUsage?.is_unlimited || false
                  )} 
                  className="h-1.5" 
                  data-testid="progress-keywords"
                />
              </div>
              
              {/* Service Accounts */}
              <div className="bg-gradient-to-br from-[hsl(var(--usage-card-bg-from))] to-[hsl(var(--usage-card-bg-to))] rounded-lg p-4 border border-[hsl(var(--usage-card-border))]" data-testid="card-usage-service-accounts">
                <p className="text-xs text-[hsl(var(--usage-card-label))] mb-2 font-medium" data-testid="text-label-service-accounts">Service Accounts</p>
                <p className="text-2xl text-[hsl(var(--usage-card-value))] font-bold mb-2" data-testid="text-value-service-accounts">
                  {serviceAccountCount}
                  <span className="text-sm text-[hsl(var(--usage-card-label))] font-normal ml-0.5">
                    /{currentPlan.quota_limits?.service_accounts_limit === -1 ? '∞' : currentPlan.quota_limits?.service_accounts_limit || 0}
                  </span>
                </p>
                <Progress 
                  value={getUsagePercentage(
                    serviceAccountCount, 
                    currentPlan.quota_limits?.service_accounts_limit || 0, 
                    currentPlan.quota_limits?.service_accounts_limit === -1
                  )} 
                  className="h-1.5" 
                  data-testid="progress-service-accounts"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-no-plan">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground mb-1">No Active Package</h3>
                <p className="text-sm text-muted-foreground">
                  You don't have an active package. Subscribe to a plan below to start tracking your keywords and accessing all features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground" data-testid="text-heading-plans">Plans</h2>
          <div className="flex items-center gap-2 bg-secondary rounded-lg p-1" data-testid="toggle-billing-period">
            <button
              onClick={() => setSelectedBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedBillingPeriod === 'monthly'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="button-monthly"
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedBillingPeriod === 'yearly'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="button-yearly"
            >
              Yearly
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packagesData?.packages && packagesData.packages.length > 0 ? packagesData.packages.map((plan) => {
            const pricing = getBillingPeriodPrice(plan, selectedBillingPeriod)
            const isCurrentPlan = plan.id === packagesData.current_package_id
            
            return (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col ${isCurrentPlan ? 'border-2 border-border' : 'border border-border'}`}
                data-testid={`card-plan-${plan.slug}`}
              >
                {/* Save Badge - Top Right Corner */}
                {pricing.discount && pricing.discount > 0 && (
                  <div className="absolute -top-3 -right-3 z-10">
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg px-3 py-1.5 text-xs font-bold" data-testid={`badge-discount-${plan.slug}`}>
                      Save {pricing.discount}%
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle data-testid={`text-plan-name-${plan.slug}`}>{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-2">
                    {pricing.originalPrice && pricing.originalPrice !== pricing.price && (
                      <span className="text-lg text-muted-foreground line-through" data-testid={`text-plan-regular-price-${plan.slug}`}>
                        {formatCurrency(pricing.originalPrice, userCurrency)}
                      </span>
                    )}
                    <span className="text-3xl text-foreground font-bold" data-testid={`text-plan-price-${plan.slug}`}>
                      {formatCurrency(pricing.price, userCurrency)}
                    </span>
                    <span className="text-sm text-muted-foreground">/{selectedBillingPeriod === 'yearly' ? 'yr' : 'mo'}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm" data-testid={`text-feature-${plan.slug}-${i}`}>
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-2 mt-auto">
                    <Button 
                      className="w-full"
                      variant={isCurrentPlan ? 'secondary' : 'default'}
                      disabled={isCurrentPlan || subscribing === plan.id}
                      onClick={() => handleSubscribe(plan.id, selectedBillingPeriod)}
                      data-testid={`button-${isCurrentPlan ? 'current' : 'upgrade'}-${plan.slug}`}
                    >
                      {subscribing === plan.id ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Processing...
                        </>
                      ) : isCurrentPlan ? (
                        'Current plan'
                      ) : (
                        'Upgrade'
                      )}
                    </Button>
                    {!isCurrentPlan && isTrialEligiblePackage(plan) && trialEligible && (
                      <Button 
                        className="w-full"
                        variant="secondary"
                        disabled={startingTrial === plan.id}
                        onClick={() => handleStartTrial(plan.id)}
                        data-testid={`button-start-trial-${plan.slug}`}
                      >
                        {startingTrial === plan.id ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Starting Trial...
                          </>
                        ) : (
                          'Start Free Trial'
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          }) : (
            <div className="col-span-3 text-center py-8">
              <p className="text-muted-foreground">No plans available</p>
            </div>
          )}
        </div>
      </div>

      {/* Billing History - Full Width */}
      <Card data-testid="card-billing-history">
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyData?.transactions && historyData.transactions.length > 0 ? (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 pb-3 border-b border-border text-sm font-medium text-muted-foreground">
                <div className="col-span-5" data-testid="header-order-id">Order ID</div>
                <div className="col-span-2" data-testid="header-status">Status</div>
                <div className="col-span-2 text-right" data-testid="header-total">Total</div>
                <div className="col-span-3"></div>
              </div>
              
              {/* Table Rows */}
              <div className="space-y-0">
                {historyData.transactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="grid grid-cols-12 gap-4 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors rounded-sm px-2 -mx-2"
                    data-testid={`billing-row-${transaction.id}`}
                  >
                    <div className="col-span-5">
                      <p className="text-sm text-foreground font-medium mb-1" data-testid={`text-invoice-id-${transaction.id}`}>
                        {transaction.id}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-invoice-date-${transaction.id}`}>
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <Badge 
                        variant="secondary" 
                        className={`${
                          transaction.transaction_status === 'completed' || transaction.transaction_status === 'confirmed'
                            ? 'bg-success/10 text-success border-success/20'
                            : transaction.transaction_status === 'pending'
                            ? 'bg-warning/10 text-warning border-warning/20'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                        }`}
                        data-testid={`badge-status-${transaction.id}`}
                      >
                        {transaction.transaction_status === 'completed' || transaction.transaction_status === 'confirmed' ? 'Paid' : getStatusText(transaction.transaction_status)}
                      </Badge>
                    </div>
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="text-sm text-foreground font-medium" data-testid={`text-amount-${transaction.id}`}>
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </div>
                    <div className="col-span-3 flex items-center justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8"
                        onClick={() => window.location.href = `/dashboard/settings/plans-billing/order/${transaction.id}`}
                        data-testid={`button-view-details-${transaction.id}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {historyData.pagination && historyData.pagination.total_pages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, historyData.pagination.total_items)} of {historyData.pagination.total_items} transactions
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!historyData.pagination.has_prev}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, historyData.pagination.total_pages) }, (_, i) => {
                        let pageNum
                        if (historyData.pagination.total_pages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= historyData.pagination.total_pages - 2) {
                          pageNum = historyData.pagination.total_pages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-9 h-9"
                            data-testid={`button-page-${pageNum}`}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!historyData.pagination.has_next}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
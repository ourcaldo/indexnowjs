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
  const [userCurrency, setUserCurrency] = useState<'USD' | 'IDR'>('USD')
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Plans section state
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('monthly')
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [startingTrial, setStartingTrial] = useState<string | null>(null)

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

      // Fetch user profile to get current package and currency
      const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!profileResponse.ok) throw new Error('Failed to load profile')
      
      const profileResult = await profileResponse.json()
      const profileData = profileResult?.data || {}

      // Set packages data
      setPackagesData({
        packages: packages,
        current_package_id: profileData.package_id || null,
        expires_at: profileData.expires_at || null,
        user_currency: profileData.country === 'Indonesia' ? 'IDR' : 'USD',
        user_country: profileData.country || ''
      })
      
      // Set user currency
      setUserCurrency(profileData.country === 'Indonesia' ? 'IDR' : 'USD')
      
      // Extract usage data from profile
      if (profileData.quota) {
        setUsageData(profileData.quota)
      }
      
      // Extract trial eligibility from profile
      if (profileData.trial) {
        setTrialEligible(profileData.trial.eligible)
      }
    } catch (error) {
      handleApiError(error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
    }
  }

  const loadBillingHistory = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) throw new Error('User not authenticated')

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('No authentication token')

      const params = new URLSearchParams({
        page: '1',
        limit: '10'
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
    } catch (error) {
      handleApiError(error)
      setError(error instanceof Error ? error.message : 'Failed to load billing history')
    }
  }

  // Helper functions
  const getBillingPeriodPrice = (pkg: PaymentPackage, period: string): { price: number, originalPrice?: number, discount?: number } => {
    if (pkg.pricing_tiers && typeof pkg.pricing_tiers === 'object' && pkg.pricing_tiers[period]) {
      const periodTier = pkg.pricing_tiers[period]
      
      if (periodTier[userCurrency]) {
        const currencyTier = periodTier[userCurrency]
        return {
          price: currencyTier.promo_price || currencyTier.regular_price,
          originalPrice: currencyTier.promo_price ? currencyTier.regular_price : undefined,
          discount: currencyTier.promo_price ? Math.round(((currencyTier.regular_price - currencyTier.promo_price) / currencyTier.regular_price) * 100) : undefined
        }
      }
      
      if (Array.isArray(pkg.pricing_tiers)) {
        const tier = pkg.pricing_tiers.find((t: any) => t.period === period)
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
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5" data-testid="card-current-plan">
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
              <Button variant="outline" className="bg-background" data-testid="button-manage-plan">Manage</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Daily URLs */}
              <div className="bg-background rounded-lg p-4 border border-border" data-testid="card-usage-daily-urls">
                <p className="text-xs text-muted-foreground mb-2" data-testid="text-label-daily-urls">Daily URLs</p>
                <p className="text-2xl text-foreground mb-2" data-testid="text-value-daily-urls">
                  {formatNumber(usageData?.daily_quota_used || 0)}
                  <span className="text-sm text-muted-foreground">
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
              <div className="bg-background rounded-lg p-4 border border-border" data-testid="card-usage-keywords">
                <p className="text-xs text-muted-foreground mb-2" data-testid="text-label-keywords">Keywords</p>
                <p className="text-2xl text-foreground mb-2" data-testid="text-value-keywords">
                  {formatNumber(keywordUsage?.keywords_used || 0)}
                  <span className="text-sm text-muted-foreground">
                    /{keywordUsage?.is_unlimited ? '∞' : formatNumber(keywordUsage?.keywords_limit || 0)}
                  </span>
                </p>
                <Progress 
                  value={getUsagePercentage(
                    keywordUsage?.keywords_used || 0, 
                    keywordUsage?.keywords_limit || 0, 
                    keywordUsage?.is_unlimited || false
                  )} 
                  className="h-1.5" 
                  data-testid="progress-keywords"
                />
              </div>
              
              {/* Service Accounts */}
              <div className="bg-background rounded-lg p-4 border border-border" data-testid="card-usage-service-accounts">
                <p className="text-xs text-muted-foreground mb-2" data-testid="text-label-service-accounts">Service Accounts</p>
                <p className="text-2xl text-foreground mb-2" data-testid="text-value-service-accounts">
                  {usageData?.service_account_count || 0}
                  <span className="text-sm text-muted-foreground">
                    /{currentPlan.quota_limits?.service_accounts_limit || 0}
                  </span>
                </p>
                <Progress 
                  value={getUsagePercentage(
                    usageData?.service_account_count || 0, 
                    currentPlan.quota_limits?.service_accounts_limit || 0, 
                    false
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
        <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-heading-plans">Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packagesData?.packages && packagesData.packages.length > 0 ? packagesData.packages.map((plan) => {
            const pricing = getBillingPeriodPrice(plan, selectedBillingPeriod)
            const isCurrentPlan = plan.id === packagesData.current_package_id
            
            return (
              <Card 
                key={plan.id} 
                className={isCurrentPlan ? 'border-primary' : ''} 
                data-testid={`card-plan-${plan.slug}`}
              >
                <CardHeader>
                  <CardTitle data-testid={`text-plan-name-${plan.slug}`}>{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl text-foreground font-bold" data-testid={`text-plan-price-${plan.slug}`}>
                      {formatCurrency(pricing.price, userCurrency)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm" data-testid={`text-feature-${plan.slug}-${i}`}>
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={isCurrentPlan ? 'w-full' : 'w-full'}
                    variant={isCurrentPlan ? 'default' : 'outline'}
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

      {/* Billing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Billing History - Left Side */}
        <div className="lg:col-span-2">
          <Card data-testid="card-billing-history">
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyData?.transactions && historyData.transactions.length > 0 ? (
                <div className="space-y-3">
                  {historyData.transactions.slice(0, 5).map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                      data-testid={`billing-row-${transaction.id}`}
                    >
                      <div>
                        <p className="text-sm text-foreground font-medium" data-testid={`text-invoice-id-${transaction.id}`}>
                          {transaction.id}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-invoice-date-${transaction.id}`}>
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="secondary" 
                          className={`${
                            transaction.transaction_status === 'completed' || transaction.transaction_status === 'confirmed'
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                              : transaction.transaction_status === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                              : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          } border-0`}
                          data-testid={`badge-status-${transaction.id}`}
                        >
                          {transaction.transaction_status === 'completed' || transaction.transaction_status === 'confirmed' ? 'Paid' : getStatusText(transaction.transaction_status)}
                        </Badge>
                        <span className="text-sm text-foreground min-w-[80px] text-right" data-testid={`text-amount-${transaction.id}`}>
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => window.location.href = `/dashboard/settings/plans-billing/order/${transaction.id}`}
                          data-testid={`button-download-${transaction.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Payment Method Card */}
          <Card data-testid="card-payment-method">
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              {billingData?.currentSubscription ? (
                <>
                  <div className="bg-gradient-to-br from-primary to-purple-600 dark:from-primary/80 dark:to-purple-600/80 rounded-lg p-4 mb-4">
                    <div className="flex justify-between mb-8">
                      <div className="w-10 h-7 bg-white/20 rounded flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">CARD</span>
                      </div>
                    </div>
                    <p className="text-white text-sm mb-1">•••• •••• •••• ••••</p>
                    <p className="text-xs text-white/70">Payment method on file</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" data-testid="button-update-payment">
                    Update
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">No payment method added</p>
                  <Button variant="outline" size="sm" className="w-full" data-testid="button-add-payment">
                    Add Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral Card */}
          <Card className="border-primary/20 bg-primary/5" data-testid="card-referral">
            <CardHeader>
              <CardTitle>Referral</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-foreground/70 mb-3">Get 1 month free per referral</p>
              <Button size="sm" className="w-full" data-testid="button-share-referral">
                Share link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
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
import { CancelSubscriptionDialog } from './components/CancelSubscriptionDialog'
import { SubscriptionStatusBadge } from './components/SubscriptionStatusBadge'

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
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Subscription management state
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

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
        loadDashboardData(),
        loadSubscriptionData()
      ])
    } catch (error) {
      handleApiError(error)
    } finally {
      setLoading(false)
    }
  }
  
  const loadSubscriptionData = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/payments/paddle/subscription/my-subscription`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) return

      const result = await response.json()
      if (result.success && result.data) {
        setSubscriptionData(result.data)
      }
    } catch (error) {
      // Silently fail - subscription data is optional
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
        user_currency: 'USD',
        user_country: billingData.user_country || profileData.country || ''
      })
      
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
      
      // Use flat USD pricing structure (Paddle handles currency conversion)
      return {
        price: periodTier.promo_price || periodTier.regular_price,
        originalPrice: periodTier.promo_price ? periodTier.regular_price : undefined,
        discount: periodTier.promo_price ? Math.round(((periodTier.regular_price - periodTier.promo_price) / periodTier.regular_price) * 100) : undefined
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
    
    return { price: pkg.price }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
  
  const handleCancelSuccess = async () => {
    setShowCancelDialog(false)
    addToast({
      title: 'Subscription Canceled',
      description: 'Your subscription has been successfully canceled.'
    })
    // Reload subscription data
    await loadSubscriptionData()
    await loadBillingData()
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
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Billing Data</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadAllData}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Try Again
        </button>
      </div>
    )
  }

  const currentPlan = packagesData?.packages.find(pkg => pkg.id === packagesData.current_package_id)
  const currentUserBillingPeriod = billingData?.currentSubscription?.billing_period || 'monthly'
  const currentPlanPricing = currentPlan ? getBillingPeriodPrice(currentPlan, currentUserBillingPeriod) : null

  return (
    <div className="space-y-8">
      {/* Current Plan Card */}
      {currentPlan ? (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
                <p className="mt-2 text-3xl font-bold text-gray-900" data-testid="text-plan-name">{currentPlan.name}</p>
                <p className="text-sm text-gray-500" data-testid="text-billing-info">
                  {currentPlanPricing && `${formatCurrency(currentPlanPricing.price)} / mo`}
                  {billingData?.billingStats?.next_billing_date && ` — Next bill on ${formatDate(billingData.billingStats.next_billing_date)}`}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Current Usage</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Daily URLs */}
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span>Daily URLs</span>
                  <span><span className="text-gray-900 font-bold">{formatNumber(usageData?.daily_quota_used || 0)}</span> / {usageData?.is_unlimited ? '∞' : formatNumber(usageData?.daily_quota_limit || 0)}</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-gray-900 h-1.5 rounded-full" 
                    style={{ width: `${getUsagePercentage(usageData?.daily_quota_used || 0, usageData?.daily_quota_limit || 0, usageData?.is_unlimited || false)}%` }}
                  />
                </div>
              </div>

              {/* Keywords */}
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span>Keywords</span>
                  <span><span className="text-gray-900 font-bold">{formatNumber(totalKeywords || keywordUsage?.keywords_used || 0)}</span> / {keywordUsage?.is_unlimited ? '∞' : formatNumber(keywordUsage?.keywords_limit || 0)}</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-gray-900 h-1.5 rounded-full" 
                    style={{ width: `${getUsagePercentage(totalKeywords || keywordUsage?.keywords_used || 0, keywordUsage?.keywords_limit || 0, keywordUsage?.is_unlimited || false)}%` }}
                  />
                </div>
              </div>

              {/* Service Accounts */}
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span>Service Accounts</span>
                  <span><span className="text-gray-900 font-bold">{serviceAccountCount}</span> / {currentPlan.quota_limits?.service_accounts_limit === -1 ? '∞' : currentPlan.quota_limits?.service_accounts_limit || 0}</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-gray-900 h-1.5 rounded-full" 
                    style={{ width: `${getUsagePercentage(serviceAccountCount, currentPlan.quota_limits?.service_accounts_limit || 0, currentPlan.quota_limits?.service_accounts_limit === -1)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6" data-testid="card-no-plan">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900 mb-1">No Active Package</h3>
              <p className="text-sm text-gray-600">
                You don't have an active package. Subscribe to a plan below to start tracking your keywords and accessing all features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900" data-testid="text-heading-plans">Available Plans</h2>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Monthly</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={selectedBillingPeriod === 'yearly'}
                onChange={(e) => setSelectedBillingPeriod(e.target.checked ? 'yearly' : 'monthly')}
              />
              <div className={`w-11 h-6 rounded-full border border-gray-200 transition-colors duration-200 ease-in-out ${selectedBillingPeriod === 'yearly' ? 'bg-gray-900' : 'bg-gray-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${selectedBillingPeriod === 'yearly' ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </label>
            <span className="text-sm font-medium text-gray-700">Yearly</span>
            <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Save 20%</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {packagesData?.packages && packagesData.packages.length > 0 ? packagesData.packages.map((plan) => {
            const pricing = getBillingPeriodPrice(plan, selectedBillingPeriod)
            const apiPeriod = selectedBillingPeriod === 'yearly' ? 'annual' : 'monthly'
            const currentApiPeriod = currentUserBillingPeriod === 'annual' ? 'annual' : 'monthly'
            const isCurrentPlan = plan.id === packagesData.current_package_id && apiPeriod === currentApiPeriod
            
            return (
              <div 
                key={plan.id} 
                className={`relative rounded-xl p-6 flex flex-col ${isCurrentPlan ? 'border-2 border-gray-900' : 'border border-gray-200'}`}
                data-testid={`card-plan-${plan.slug}`}
              >
                {isCurrentPlan && (
                  <span className="absolute top-0 -translate-y-1/2 inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-800">Current Plan</span>
                )}
                {!isCurrentPlan && pricing.discount && pricing.discount > 0 && (
                  <span className="absolute top-0 -translate-y-1/2 inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-800">Save {pricing.discount}%</span>
                )}
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="mt-2 text-4xl font-bold text-gray-900">
                    {formatCurrency(pricing.price)}
                    <span className="text-xl font-medium text-gray-500">/mo</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                </div>
                
                <button 
                  className={`mt-6 w-full rounded-md py-2 px-4 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${
                    isCurrentPlan 
                      ? 'border border-transparent bg-gray-900 text-white cursor-not-allowed opacity-60'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  disabled={isCurrentPlan || subscribing === plan.id}
                  onClick={() => !isCurrentPlan && handleSubscribe(plan.id, selectedBillingPeriod)}
                >
                  {subscribing === plan.id ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    'Currently Selected'
                  ) : (
                    `Switch to ${plan.name}`
                  )}
                </button>
              </div>
            )
          }) : (
            <div className="col-span-3 text-center py-8">
              <p className="text-gray-500">No plans available</p>
            </div>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">Billing History</h2>
          <p className="mt-1 text-sm text-gray-500">View and download your past invoices</p>
        </div>
        
        {historyData?.transactions && historyData.transactions.length > 0 ? (
          <div className="border-t border-gray-200">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {historyData.transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(transaction.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{transaction.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          transaction.transaction_status === 'completed' || transaction.transaction_status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : transaction.transaction_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.transaction_status === 'completed' || transaction.transaction_status === 'confirmed' ? 'Paid' : getStatusText(transaction.transaction_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(transaction.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => window.location.href = `/dashboard/settings/plans-billing/order/${transaction.id}`}
                          className="inline-flex items-center text-gray-700 hover:text-gray-900"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {historyData.transactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="px-4 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => window.location.href = `/dashboard/settings/plans-billing/order/${transaction.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{formatDate(transaction.created_at)}</span>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      transaction.transaction_status === 'completed' || transaction.transaction_status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : transaction.transaction_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.transaction_status === 'completed' || transaction.transaction_status === 'confirmed' ? 'Paid' : getStatusText(transaction.transaction_status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 truncate max-w-[200px]">{transaction.id}</div>
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(transaction.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
            
            {historyData.pagination && historyData.pagination.total_pages > 1 && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between rounded-b-xl">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, historyData.pagination.total_items)} of {historyData.pagination.total_items} transactions
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!historyData.pagination.has_prev}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
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
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-9 h-9 text-sm rounded-md ${
                            currentPage === pageNum 
                              ? 'bg-gray-900 text-white' 
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!historyData.pagination.has_next}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border-t border-gray-200 px-6 py-12 text-center">
            <p className="text-gray-500">No transactions found</p>
          </div>
        )}
      </div>

      {/* Danger Zone Card - Cancel Subscription */}
      {subscriptionData?.hasSubscription && subscriptionData.subscription && (
        <div className="bg-white shadow-sm ring-1 ring-red-900/10 rounded-xl" data-testid="card-danger-zone">
          <div className="px-6 py-5">
            <h2 className="text-lg font-semibold text-red-800">Danger Zone</h2>
            <p className="mt-1 text-sm text-gray-500">Manage your subscription cancellation.</p>
          </div>
          <div className="border-t border-gray-200 px-6 py-6 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Cancel Subscription</h3>
              <p className="text-sm text-gray-600">All services will be stopped at the end of your billing cycle.</p>
            </div>
            <button
              onClick={() => setShowCancelDialog(true)}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              data-testid="button-cancel-subscription"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      )}
      
      {/* Cancel Subscription Dialog */}
      {showCancelDialog && subscriptionData?.hasSubscription && subscriptionData.subscription?.paddle_subscription_id && (
        <CancelSubscriptionDialog
          subscriptionId={subscriptionData.subscription.paddle_subscription_id}
          onClose={() => setShowCancelDialog(false)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, AlertCircle, Package, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/database'
import { authService } from '@/lib/auth'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { useToast } from '@/hooks/use-toast'
import { useApiError } from '@/hooks/useApiError'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { BILLING_ENDPOINTS, DASHBOARD_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { Button } from '@/components/ui/button'
import { 
  BillingStats, 
  BillingHistory, 
  PackageComparison
} from './components'
import PricingTable from '@/components/shared/PricingTable'

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

export default function BillingPage() {
  // State management
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [packagesData, setPackagesData] = useState<PackagesData | null>(null)
  const [historyData, setHistoryData] = useState<BillingHistoryData | null>(null)
  const [userCurrency, setUserCurrency] = useState<'USD' | 'IDR'>('USD')
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Plans section state
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('monthly')
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [startingTrial, setStartingTrial] = useState<string | null>(null)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})
  const [showComparePlans, setShowComparePlans] = useState(false)

  // History section state
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

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

  useEffect(() => {
    if (statusFilter || typeFilter || searchTerm) {
      loadBillingHistory()
    }
  }, [currentPage, statusFilter, typeFilter, searchTerm])

  // Data loading functions
  // NOTE: Consider refactoring to useQuery for better error handling and caching
  // Example: const { data, error, refetch } = useQuery({ queryKey: ['billing'], queryFn: loadBillingData })
  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadBillingData(),
        loadBillingHistory(),
        loadDashboardData() // Replace individual calls with merged dashboard API
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

      const data = await response.json()
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

      const response = await fetch(DASHBOARD_ENDPOINTS.MAIN, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to load dashboard data')

      const data = await response.json()
      
      // Extract packages data from dashboard response
      if (data.billing) {
        setPackagesData(data.billing)
        if (data.billing.user_currency) {
          setUserCurrency(data.billing.user_currency)
        }
      }
      
      // Extract trial eligibility from dashboard response
      if (data.user?.trial) {
        setTrialEligible(data.user.trial.eligible)
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
        page: currentPage.toString(),
        limit: '10',
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter }),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`${BILLING_ENDPOINTS.HISTORY}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to load billing history')

      const data = await response.json()
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
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const resetFilters = () => {
    setStatusFilter('')
    setTypeFilter('')
    setSearchTerm('')
    setCurrentPage(1)
  }


  const togglePlanDetails = (planId: string) => {
    if (!showComparePlans) {
      setShowDetails(prev => {
        const newState: Record<string, boolean> = {}
        Object.keys(prev).forEach(key => {
          newState[key] = false
        })
        newState[planId] = !prev[planId]
        return newState
      })
    }
  }

  const toggleComparePlans = () => {
    const newShowComparePlans = !showComparePlans
    setShowComparePlans(newShowComparePlans)

    if (newShowComparePlans) {
      const allExpanded: Record<string, boolean> = {}
      packagesData?.packages.forEach(pkg => {
        allExpanded[pkg.id] = true
      })
      setShowDetails(allExpanded)
    } else {
      setShowDetails({})
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-success" />
      case 'pending':
      case 'proof_uploaded':
        return <Clock className="h-4 w-4 text-warning" />
      case 'failed':
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground mt-1">Manage your plan and billing history here.</p>
        </div>
      </div>

      {/* Billing Stats */}
      <BillingStats
        billingData={billingData}
        currentPackageId={packagesData?.current_package_id || null}
        formatCurrency={formatCurrency}
        userCurrency={userCurrency}
      />


      {/* Billing Settings Section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Billing settings</h2>
            <p className="text-sm text-muted-foreground">Manage your plan and billing history here.</p>
          </div>
        </div>

        <PricingTable
          showTrialButton={true}
          trialEligible={trialEligible || false}
          currentPackageId={packagesData?.current_package_id || null}
          subscribing={subscribing}
          startingTrial={startingTrial}
          onSubscribe={(packageId: string) => handleSubscribe(packageId, selectedBillingPeriod)}
          onStartTrial={handleStartTrial}
          isTrialEligiblePackage={isTrialEligiblePackage}
        />
      </div>

      {/* Package Comparison */}
      <PackageComparison
        packages={packagesData?.packages || []}
        showComparePlans={showComparePlans}
        toggleComparePlans={toggleComparePlans}
        selectedBillingPeriod={selectedBillingPeriod}
        userCurrency={userCurrency}
        getBillingPeriodPrice={getBillingPeriodPrice}
        formatCurrency={formatCurrency}
        handleSubscribe={(packageId: string) => handleSubscribe(packageId, selectedBillingPeriod)}
        subscribing={subscribing}
      />

      {/* Billing History */}
      <BillingHistory
        historyData={historyData}
        currentPage={currentPage}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        searchTerm={searchTerm}
        setCurrentPage={setCurrentPage}
        setStatusFilter={setStatusFilter}
        setTypeFilter={setTypeFilter}
        setSearchTerm={setSearchTerm}
        handlePageChange={handlePageChange}
        resetFilters={resetFilters}
        getStatusIcon={getStatusIcon}
        getStatusText={getStatusText}
        getStatusColor={getStatusColor}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />
    </div>
  )
}
import React, { useState, useEffect } from 'react'
import { AlertCircle, Package, TrendingUp, Globe, Users, Server } from 'lucide-react'
import { StatCard } from '@/components/dashboard/enhanced'
import { Card } from '@/components/dashboard/ui'
import { supabase } from '@/lib/database'
import { authService } from '@/lib/auth'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { DASHBOARD_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

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

interface BillingStatsProps {
  billingData: BillingData | null
  currentPackageId: string | null
  formatCurrency: (amount: number, currency?: string) => string
  userCurrency: 'USD' | 'IDR'
}

export const BillingStats = ({ 
  billingData, 
  currentPackageId, 
  formatCurrency, 
  userCurrency 
}: BillingStatsProps) => {
  const { currentSubscription, billingStats } = billingData || {}
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [keywordUsage, setKeywordUsage] = useState<KeywordUsageData | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)

  useEffect(() => {
    loadUsageData()
  }, [])

  const loadUsageData = async () => {
    try {
      setUsageLoading(true)
      await loadDashboardData()
    } catch (error) {
      console.error('Error loading usage data:', error)
    } finally {
      setUsageLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch(DASHBOARD_ENDPOINTS.MAIN, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        // API now returns: { success: true, data: {...}, timestamp: "..." }
        const dashboardData = result.success === true && result.data ? result.data : result
        setUsageData(dashboardData.user?.quota)
        setKeywordUsage(dashboardData.rankTracking?.usage)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const getUsagePercentage = (used: number, limit: number, isUnlimited: boolean) => {
    if (isUnlimited || limit <= 0) return 0
    return Math.min(100, (used / limit) * 100)
  }

  const getExpirationText = () => {
    if (!currentSubscription?.expires_at) return 'No expiration'
    
    const expiryDate = new Date(currentSubscription.expires_at)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry <= 0) return 'Expired'
    if (daysUntilExpiry <= 7) return `${daysUntilExpiry} days left`
    
    return expiryDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* No Active Package Alert */}
      {!currentPackageId && (
        <Card>
          <div className="p-4 border border-warning bg-warning/5 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground mb-1">No Active Package</h3>
                <p className="text-sm text-muted-foreground">
                  You don't have an active package. Subscribe to a plan below to start tracking your keywords and accessing all features.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Unified Plan & Usage Section - Like Reference Design */}
      {currentSubscription && (
        <div className="bg-background rounded-lg border border-border p-6">
          {/* Plan Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Plan</h2>
              <h3 className="text-xl font-bold text-foreground mb-1">{currentSubscription.package_name}</h3>
              <p className="text-sm text-muted-foreground">{getExpirationText()}</p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Payment</h2>
              <div className="text-xl font-bold text-foreground mb-1">
                {formatCurrency(currentSubscription.amount_paid, userCurrency)}
              </div>
              <p className="text-sm text-muted-foreground">per {currentSubscription.billing_period}</p>
            </div>
          </div>

          {/* Usage Stats - Inline 3 Column Layout */}
          {usageLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-border">
              {/* Daily URLs */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Daily URLs</span>
                </div>
                <div className="space-y-3">
                  <div className="w-full bg-border rounded-full h-2">
                    <div 
                      className="bg-info h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${getUsagePercentage(
                          usageData?.daily_quota_used || 0, 
                          usageData?.daily_quota_limit || 500, 
                          usageData?.is_unlimited || false
                        )}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {usageData?.daily_quota_used || 0} 
                        {!usageData?.is_unlimited && (
                          <span className="text-sm text-muted-foreground ml-1">
                            ({Math.round(getUsagePercentage(
                              usageData?.daily_quota_used || 0, 
                              usageData?.daily_quota_limit || 500, 
                              usageData?.is_unlimited || false
                            ))}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {usageData?.is_unlimited ? 'Unlimited' : (usageData?.daily_quota_limit || 500)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Keywords tracked */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Keywords tracked</span>
                </div>
                <div className="space-y-3">
                  <div className="w-full bg-border rounded-full h-2">
                    <div 
                      className="bg-warning h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${getUsagePercentage(
                          keywordUsage?.keywords_used || 0, 
                          keywordUsage?.keywords_limit || 0, 
                          keywordUsage?.is_unlimited || false
                        )}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {keywordUsage?.keywords_used || 0}
                        {!keywordUsage?.is_unlimited && keywordUsage?.keywords_limit > 0 && (
                          <span className="text-sm text-muted-foreground ml-1">
                            ({Math.round(getUsagePercentage(
                              keywordUsage?.keywords_used || 0, 
                              keywordUsage?.keywords_limit || 0, 
                              keywordUsage?.is_unlimited || false
                            ))}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {keywordUsage?.is_unlimited ? 'Unlimited' : (keywordUsage?.keywords_limit > 0 ? keywordUsage.keywords_limit : 'Loading...')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Service accounts */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Service accounts</span>
                </div>
                <div className="space-y-3">
                  <div className="w-full bg-border rounded-full h-2">
                    <div className="bg-muted-foreground h-2 rounded-full w-0" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {usageData?.service_account_count || 0}
                      </span>
                    </div>
                    <span className="text-muted-foreground">connected</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
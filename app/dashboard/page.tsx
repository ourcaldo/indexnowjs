'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  Globe, 
  Search, 
  Plus,
  BarChart3,
  Target,
  Zap,
  ChevronRightIcon,
  ExternalLink,
  Package,
  Clock,
  AlertCircle,
  CheckCircle2,
  Settings,
  Activity
} from 'lucide-react'

import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import PricingTable from '@/components/shared/PricingTable'
import { useDashboardData } from '@/hooks/useDashboardData'

// Import our new analytics widgets
import { 
  RankingDistribution, 
  ActivityTimeline,
  type RankingData,
  type ActivityItem
} from '@/components/dashboard/widgets'

// Import enhanced components
import { StatCard, DataTable, PositionChange } from '@/components/dashboard/enhanced'
import { SharedDomainSelector } from '@/components/shared/DomainSelector'

interface UserProfile {
  full_name: string | null;
  email: string;
  package?: {
    name: string;
    slug: string;
    description: string;
    price: number;
    currency: string;
    billing_period: string;
    quota_limits: {
      daily_urls: number;
      service_accounts: number;
      concurrent_jobs: number;
      keywords_limit: number;
    };
  };
  daily_quota_used?: number;
  expires_at?: string;
  service_account_count?: number;
  active_jobs_count?: number;
  keywords_used?: number;
  keywords_limit?: number;
}

interface KeywordData {
  id: string;
  keyword: string;
  current_position: number | null;
  position_1d: number | null;
  position_3d: number | null;
  position_7d: number | null;
  domain: {
    display_name: string;
    domain_name: string;
  };
  device_type: string;
  country: {
    name: string;
    iso2_code: string;
  };
  recent_ranking?: {
    position: number | null;
  };
  tags?: string[];
}

interface PaymentPackage {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  billing_period: string;
  features: string[];
  quota_limits: {
    daily_quota_limit: number;
    service_accounts_limit: number;
    concurrent_jobs_limit: number;
  };
  is_popular: boolean;
  is_current: boolean;
  pricing_tiers: Record<string, any>;
  free_trial_enabled?: boolean;
}

export default function Dashboard() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [isDomainSelectorOpen, setIsDomainSelectorOpen] = useState(false);
  const [packagesData, setPackagesData] = useState<{ packages: PaymentPackage[], current_package_id: string | null } | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [startingTrial, setStartingTrial] = useState<string | null>(null);
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null);

  // Log page view and dashboard activities
  usePageViewLogger('/dashboard', 'Dashboard', { section: 'main_dashboard' })
  const { logDashboardActivity } = useActivityLogger()

  // Use merged dashboard data
  const { 
    data: dashboardData, 
    isLoading: dashboardLoading, 
    error: dashboardError 
  } = useDashboardData()

  // Extract data from merged dashboard endpoint
  const domainsData = dashboardData?.rankTracking?.domains
  const recentKeywords = dashboardData?.rankTracking?.recentKeywords || []
  
  // Filter keywords by selected domain
  const getKeywordsForDomain = (domainId: string | null) => {
    if (!domainId) return []
    return recentKeywords.filter((k: any) => k.domain?.id === domainId)
  }
  
  const domains = domainsData || []
  const domainKeywords = getKeywordsForDomain(selectedDomainId)
  
  // Set default domain
  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId(domains[0].id)
    }
  }, [domains, selectedDomainId])

  // Handle subscription
  const handleSubscribe = async (packageId: string, period: string) => {
    try {
      setSubscribing(packageId)
      const checkoutUrl = `/dashboard/settings/plans-billing/checkout?package=${packageId}&period=${period}`
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Error starting subscription:', error)
    } finally {
      setSubscribing(null)
    }
  }

  // Check if package is eligible for trial
  const isTrialEligiblePackage = (pkg: any) => {
    return pkg.free_trial_enabled === true
  }

  // Handle trial subscription
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

  // Process dashboard data when it loads
  useEffect(() => {
    if (dashboardData && !dashboardLoading) {
      if (dashboardData.user?.profile) {
        setUserProfile(dashboardData.user.profile)
      }
      
      if (dashboardData.billing) {
        setPackagesData(dashboardData.billing)
      }
      
      if (dashboardData.user?.trial !== undefined) {
        setTrialEligible(dashboardData.user.trial)
      }
      
      setLoading(false)
      
      logDashboardActivity('dashboard_data_loaded_from_merged_api', 'Dashboard data loaded from merged endpoint', {
        timestamp: new Date().toISOString(),
        has_user_data: !!dashboardData.user,
        has_billing_data: !!dashboardData.billing,
        has_indexing_data: !!dashboardData.indexing,
        has_rank_tracking_data: !!dashboardData.rankTracking
      })
    }
  }, [dashboardData, dashboardLoading])
  
  // Handle dashboard loading errors
  useEffect(() => {
    if (dashboardError) {
      logDashboardActivity('dashboard_data_error', 'Dashboard merged API error', {
        error: dashboardError.message,
        timestamp: new Date().toISOString()
      })
      setLoading(false)
    }
  }, [dashboardError])


  const rankingData = useMemo((): RankingData[] => {
    return domainKeywords.map((keyword: KeywordData) => ({
      position: keyword.recent_ranking?.position || null,
      keyword: keyword.keyword,
      domain: keyword.domain.display_name || keyword.domain.domain_name
    }))
  }, [domainKeywords])


  const activityData = useMemo((): ActivityItem[] => {
    const activities: ActivityItem[] = []
    const now = new Date()
    
    // Generate stable activities based on keyword data
    domainKeywords.slice(0, 3).forEach((keyword: KeywordData, index) => {
      if (keyword.recent_ranking?.position) {
        const activityTime = new Date(now.getTime() - (index + 1) * 2 * 60 * 60 * 1000)
        
        activities.push({
          id: `activity_${keyword.id}_${index}`,
          type: keyword.recent_ranking.position <= 10 ? 'rank_improved' : 'rank_declined',
          title: `${keyword.keyword} ranking updated`,
          description: `New position: #${keyword.recent_ranking.position}`,
          timestamp: activityTime.toISOString(),
          metadata: {
            keyword: keyword.keyword,
            domain: keyword.domain.display_name,
            position: keyword.recent_ranking.position
          }
        })
      }
    })

    // Add generic domain activity
    if (domainKeywords.length > 0) {
      const domainActivityTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)
      activities.push({
        id: `activity_domain_${selectedDomainId}`,
        type: 'domain_added',
        title: 'Domain monitoring active',
        description: `Tracking ${domainKeywords.length} keywords`,
        timestamp: domainActivityTime.toISOString(),
        metadata: {
          domain: domains.find(d => d.id === selectedDomainId)?.display_name || 'Domain'
        }
      })
    }

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [domainKeywords, selectedDomainId, domains])

  const selectedDomain = domains.find((d: any) => d.id === selectedDomainId)
  
  // Get keyword count for each domain
  const getDomainKeywordCount = (domainId: string) => {
    return recentKeywords.filter((k: any) => k.domain?.id === domainId).length
  }
  const hasActivePackage = userProfile?.package || packagesData?.current_package_id
  const isDataLoading = loading || dashboardLoading

  // Calculate actual position changes for keywords
  const calculatePositionChange = (keyword: KeywordData): number | null => {
    const current = keyword.recent_ranking?.position || keyword.current_position
    if (!current) return null
    
    // Try to find historical data for comparison
    const historical = keyword.position_1d || keyword.position_3d || keyword.position_7d
    if (!historical) return null
    
    // Position improvement means lower number (better ranking)
    return historical - current
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {hasActivePackage 
              ? `Welcome back! Here's your SEO performance overview.`
              : 'Get started with professional rank tracking and SEO insights.'
            }
          </p>
        </div>
        
        {hasActivePackage && domains.length > 0 && (
          <div className="flex items-center space-x-3">
            <SharedDomainSelector
              domains={domains}
              selectedDomainId={selectedDomainId}
              selectedDomainInfo={selectedDomain}
              isOpen={isDomainSelectorOpen}
              onToggle={() => setIsDomainSelectorOpen(!isDomainSelectorOpen)}
              onDomainSelect={setSelectedDomainId}
              getDomainKeywordCount={getDomainKeywordCount}
              showKeywordCount={true}
              className="w-[320px]"
              addDomainRoute="/dashboard/indexnow/add"
              placeholder="Select domain"
            />
            <Button 
              size="sm"
              onClick={() => router.push('/dashboard/indexnow/add')}
              data-testid="button-add-keyword"
              className="bg-primary text-primary-foreground border-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Keywords
            </Button>
          </div>
        )}
      </div>

      {/* Dashboard Error State */}
      {dashboardError && !isDataLoading ? (
        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h3 className="text-xl font-semibold mb-2 text-destructive">
              Failed to Load Dashboard Data
            </h3>
            <p className="text-destructive/80 mb-6 max-w-md mx-auto">
              We encountered an error while loading your dashboard. Please try again.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()}
                className="bg-destructive text-destructive-foreground btn-hover"
                data-testid="button-retry-dashboard"
              >
                <Settings className="w-4 h-4 mr-2" />
                Retry Loading
              </Button>
              <div className="text-xs text-destructive/80">
                Error: {dashboardError.message}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* No Active Package State */}
      {isDataLoading ? (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-96" />
              <Skeleton className="h-4 w-80" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border border-border rounded-lg p-6">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <Skeleton className="h-8 w-16 mb-4" />
                    <div className="space-y-2 mb-6">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <Skeleton key={j} className="h-4 w-full" />
                      ))}
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : !hasActivePackage && packagesData ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              Unlock the Power of Professional Rank Tracking
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Subscribe to start tracking your keyword rankings, monitor your SEO performance, and grow your online presence with professional insights.
            </p>
          </CardHeader>
          <CardContent>
            <PricingTable
              showTrialButton={true}
              trialEligible={trialEligible || false}
              currentPackageId={packagesData.current_package_id}
              subscribing={subscribing}
              startingTrial={startingTrial}
              onSubscribe={handleSubscribe}
              onStartTrial={handleStartTrial}
              isTrialEligiblePackage={isTrialEligiblePackage}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Empty State - No Domains */}
      {hasActivePackage && domains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              Start Tracking Your Rankings
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add your first domain and keywords to start monitoring your search engine rankings and track your SEO progress.
            </p>
            <Button 
              onClick={() => router.push('/dashboard/indexnow/add')}
              className="inline-flex items-center"
              data-testid="button-add-first-domain"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Domain
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Main Dashboard Content */}
      {hasActivePackage && domains.length > 0 && (
        <>
          {/* Enhanced Key Metrics Overview */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Performance Overview</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedDomain?.display_name || selectedDomain?.domain_name} • Real-time insights
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Keywords */}
                <div className="text-center p-4 bg-info/10 rounded-lg border border-info/20">
                  <div className="flex items-center justify-center w-10 h-10 bg-info/20 rounded-lg mx-auto mb-2">
                    <Search className="w-5 h-5 text-info" />
                  </div>
                  <div className="text-2xl font-bold text-foreground" data-testid="stat-total-keywords">
                    {domainKeywords.length.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Total Keywords
                  </div>
                </div>
                
                {/* Top 10 Positions */}
                <div className="text-center p-4 bg-success/10 rounded-lg border border-success/20">
                  <div className="flex items-center justify-center w-10 h-10 bg-success/20 rounded-lg mx-auto mb-2">
                    <Target className="w-5 h-5 text-success" />
                  </div>
                  <div className="text-2xl font-bold text-success" data-testid="stat-top-10">
                    {domainKeywords.filter((k: KeywordData) => k.recent_ranking?.position && k.recent_ranking.position <= 10).length}
                  </div>
                  <div className="text-xs text-success/80 font-medium">
                    Top 10 Rankings
                  </div>
                </div>
                
                {/* Average Position */}
                <div className="text-center p-4 bg-info/10 rounded-lg border border-info/20">
                  <div className="flex items-center justify-center w-10 h-10 bg-info/20 rounded-lg mx-auto mb-2">
                    <BarChart3 className="w-5 h-5 text-info" />
                  </div>
                  <div className="text-2xl font-bold text-info" data-testid="stat-avg-position">
                    {(() => {
                      const ranked = domainKeywords.filter((k: KeywordData) => k.recent_ranking?.position)
                      return ranked.length > 0 
                        ? Math.round(ranked.reduce((sum: number, k: KeywordData) => sum + (k.recent_ranking?.position || 100), 0) / ranked.length)
                        : 'N/A'
                    })()}
                  </div>
                  <div className="text-xs text-info/80 font-medium">
                    Avg Position
                  </div>
                </div>
                
                {/* Daily Usage */}
                <div className="text-center p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="flex items-center justify-center w-10 h-10 bg-warning/20 rounded-lg mx-auto mb-2">
                    <Activity className="w-5 h-5 text-warning" />
                  </div>
                  <div className="text-2xl font-bold text-warning" data-testid="stat-daily-usage">
                    {userProfile?.daily_quota_used || 0}
                  </div>
                  <div className="text-xs text-warning/80 font-medium">
                    Daily Usage
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Analytics Widgets Row */}
              <RankingDistribution 
                data={rankingData}
                title="Position Distribution"
                description="See where your keywords rank"
                className="w-full"
              />


              {/* Keywords Table */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div>
                      <CardTitle>
                        Top Keywords
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Latest performance • {selectedDomain?.display_name || selectedDomain?.domain_name}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push('/dashboard/indexnow/overview')}
                      data-testid="button-view-all-keywords"
                      className="shrink-0 btn-hover"
                    >
                      View All ({domainKeywords.length})
                      <ChevronRightIcon className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-0">
                  {domainKeywords.length === 0 ? (
                    <div className="text-center py-12 px-6">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Keywords Yet</h3>
                      <p className="text-sm text-muted-foreground mb-6">Start tracking keywords for this domain to see performance data here.</p>
                      <Button onClick={() => router.push('/dashboard/indexnow/add')} size="sm" className="btn-hover">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Keywords
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-hidden">
                      {/* Mobile-friendly header */}
                      <div className="hidden md:grid md:grid-cols-12 gap-3 px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30 border-b">
                        <div className="col-span-4">Keyword</div>
                        <div className="col-span-2 text-center">Position</div>
                        <div className="col-span-2 text-center">Country</div>
                        <div className="col-span-2 text-center">Device</div>
                        <div className="col-span-2 text-center">Tags</div>
                      </div>
                      
                      {/* Keywords List */}
                      <div className="divide-y">
                        {domainKeywords.slice(0, 8).map((keyword: KeywordData, index) => {
                          const currentPos = keyword.recent_ranking?.position || keyword.current_position
                          const positionChange = calculatePositionChange(keyword)
                          
                          return (
                            <div key={keyword.id || index} className="md:grid md:grid-cols-12 gap-3 p-4 md:px-6 md:py-3 hover:bg-muted/50 transition-colors">
                              {/* Mobile Layout */}
                              <div className="md:hidden space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-foreground truncate flex-1 mr-2">
                                    {keyword.keyword}
                                  </div>
                                  <div className="flex items-center space-x-1 shrink-0">
                                    <span className="text-xs font-medium text-foreground">
                                      {currentPos ? `#${currentPos}` : 'NR'}
                                    </span>
                                    <PositionChange change={positionChange} className="text-xs" />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-muted-foreground">
                                      {keyword.country?.iso2_code?.toUpperCase() || 'N/A'}
                                    </span>
                                    <span className="text-xs text-muted-foreground capitalize">
                                      {keyword.device_type}
                                    </span>
                                  </div>
                                  {keyword.tags && keyword.tags.length > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs text-muted-foreground">
                                        {keyword.tags[0]}
                                      </span>
                                      {keyword.tags.length > 1 && (
                                        <span className="text-xs text-muted-foreground">
                                          +{keyword.tags.length - 1}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Desktop Layout */}
                              <div className="hidden md:contents">
                                {/* Keyword */}
                                <div className="col-span-4 font-medium text-foreground truncate">
                                  {keyword.keyword}
                                </div>
                                
                                {/* Position */}
                                <div className="col-span-2 flex items-center justify-center space-x-1">
                                  <span className="text-sm font-medium text-foreground">
                                    {currentPos ? `#${currentPos}` : 'NR'}
                                  </span>
                                  <PositionChange change={positionChange} className="text-xs" />
                                </div>
                                
                                {/* Country */}
                                <div className="col-span-2 flex justify-center">
                                  <span className="text-sm text-muted-foreground">
                                    {keyword.country?.iso2_code?.toUpperCase() || 'N/A'}
                                  </span>
                                </div>
                                
                                {/* Device */}
                                <div className="col-span-2 flex justify-center">
                                  <span className="text-sm text-muted-foreground capitalize">
                                    {keyword.device_type}
                                  </span>
                                </div>
                                
                                {/* Tags */}
                                <div className="col-span-2 flex justify-center">
                                  {keyword.tags && keyword.tags.length > 0 ? (
                                    <div className="flex items-center space-x-1">
                                      <span className="text-sm text-muted-foreground">
                                        {keyword.tags[0]}
                                      </span>
                                      {keyword.tags.length > 1 && (
                                        <span className="text-sm text-muted-foreground">
                                          +{keyword.tags.length - 1}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">-</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-6">
              {/* Enhanced Quick Actions */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full justify-start h-11 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150"
                    onClick={() => router.push('/dashboard/indexnow/add')}
                    data-testid="action-add-keywords"
                  >
                    <Plus className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Add Keywords</div>
                      <div className="text-xs opacity-90">Track new terms</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="w-full justify-start h-11 hover:bg-slate-50 hover:text-foreground dark:hover:bg-slate-800 dark:hover:text-foreground transition-colors duration-150"
                    onClick={() => router.push('/dashboard/indexnow/overview')}
                    data-testid="action-view-keywords"
                  >
                    <Search className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">View All Keywords</div>
                      <div className="text-xs text-muted-foreground hover:text-muted-foreground">{domainKeywords.length} tracked</div>
                    </div>
                  </Button>

                  <Button 
                    variant="outline"
                    className="w-full justify-start h-11 hover:bg-slate-50 hover:text-foreground dark:hover:bg-slate-800 dark:hover:text-foreground transition-colors duration-150"
                    onClick={() => router.push('/dashboard/indexnow/rank-history')}
                    data-testid="action-rank-history"
                  >
                    <BarChart3 className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Rank History</div>
                      <div className="text-xs text-muted-foreground">Historical data</div>
                    </div>
                  </Button>

                  <Button 
                    variant="outline"
                    className="w-full justify-start h-11 hover:bg-slate-50 hover:text-foreground dark:hover:bg-slate-800 dark:hover:text-foreground transition-colors duration-150"
                    onClick={() => router.push('/dashboard/settings/plans-billing')}
                    data-testid="action-manage-billing"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Manage Billing</div>
                      <div className="text-xs text-muted-foreground">Plans & usage</div>
                    </div>
                  </Button>
                </CardContent>
              </Card>

              {/* Activity Timeline */}
              <ActivityTimeline 
                activities={activityData}
                title="Recent Activity"
                description="Latest updates and changes"
                maxItems={3}
                showViewAll={true}
                showUpdateBadge={false}
                onViewAll={() => router.push('/dashboard/indexnow/rank-history')}
              />

              {/* Enhanced FastIndexing Tool */}
              <Card className="border-warning/20 bg-gradient-to-br from-warning/10 to-warning/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-warning/20 rounded-lg">
                        <Zap className="w-4 h-4 text-warning" />
                      </div>
                      <div>
                        <CardTitle className="text-base">FastIndexing</CardTitle>
                        <p className="text-xs text-warning/80">Google URL submission</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-warning/20 text-warning">
                      Pro Tool
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-warning/80 mb-4">
                    Accelerate Google discovery of your new content.
                  </p>
                  <Button 
                    variant="outline"
                    className="w-full border-warning/30 text-warning btn-hover"
                    onClick={() => router.push('/dashboard/tools/fastindexing')}
                    data-testid="action-fast-indexing"
                  >
                    <span className="flex items-center">
                      Open Tool
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
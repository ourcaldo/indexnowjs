'use client'

import { useEffect, useState } from 'react'
import { 
  Server,
  Key,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  BarChart3,
  Zap
} from 'lucide-react'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface ServiceAccount {
  id: string
  name: string
  email: string
  is_active: boolean
  daily_quota_limit: number
  minute_quota_limit: number
  created_at: string
  updated_at: string
}

interface QuotaUsage {
  id: string
  service_account_id: string
  date: string
  requests_made: number
  requests_successful: number
  requests_failed: number
  last_request_at: string | null
}

interface ApiCallStat {
  total_calls: number
  successful_calls: number
  failed_calls: number
  success_rate: number
  last_7_days: number
  today: number
}

interface SystemIntegrationProps {
  userId: string
  systemLoading: boolean
}

export function SystemIntegration({ userId, systemLoading }: SystemIntegrationProps) {
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([])
  const [quotaUsage, setQuotaUsage] = useState<QuotaUsage[]>([])
  const [apiStats, setApiStats] = useState<ApiCallStat | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId && !systemLoading) {
      fetchSystemIntegrationData()
    }
  }, [userId, systemLoading])

  const fetchSystemIntegrationData = async () => {
    try {
      setLoading(true)
      
      // Fetch service accounts
      const accountsResponse = await fetch(ADMIN_ENDPOINTS.USER_SERVICE_ACCOUNTS(userId), {
        credentials: 'include'
      })
      
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        setServiceAccounts(accountsData.data?.serviceAccounts || [])
      }

      // Fetch quota usage
      const quotaResponse = await fetch(ADMIN_ENDPOINTS.USER_QUOTA_USAGE(userId), {
        credentials: 'include'
      })
      
      if (quotaResponse.ok) {
        const quotaData = await quotaResponse.json()
        setQuotaUsage(quotaData.data?.usage || [])
      }

      // Fetch API call statistics
      const statsResponse = await fetch(ADMIN_ENDPOINTS.USER_API_STATS(userId), {
        credentials: 'include'
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setApiStats(statsData.data?.stats || null)
      }

    } catch (error) {
      console.error('Failed to fetch system integration data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getServiceAccountStatus = (account: ServiceAccount) => {
    if (!account.is_active) {
      return { text: 'Inactive', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle }
    }
    
    // Check if quota is being used today
    const todayUsage = quotaUsage.find(usage => 
      usage.service_account_id === account.id && 
      usage.date === new Date().toISOString().split('T')[0]
    )
    
    if (todayUsage && todayUsage.requests_made > 0) {
      return { text: 'Active', color: 'bg-success/10 text-success', icon: CheckCircle }
    }
    
    return { text: 'Idle', color: 'bg-warning/10 text-warning', icon: Clock }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-accent/10">
            <Server className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">System Integration</h3>
            <p className="text-sm text-muted-foreground">Loading integration details...</p>
          </div>
        </div>
        
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-secondary rounded w-3/4"></div>
          <div className="h-4 bg-secondary rounded w-1/2"></div>
          <div className="h-20 bg-secondary rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-accent/10">
          <Server className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">System Integration</h3>
          <p className="text-sm text-muted-foreground">Google API integration and service account details</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* API Statistics Overview */}
        {apiStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-secondary rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-accent/10">
                <BarChart3 className="h-4 w-4 text-accent" />
              </div>
              <p className="text-2xl font-bold text-foreground">{apiStats.total_calls.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total API Calls</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <p className="text-2xl font-bold text-foreground">{apiStats.success_rate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Success Rate</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-warning/10">
                <Activity className="h-4 w-4 text-warning" />
              </div>
              <p className="text-2xl font-bold text-foreground">{apiStats.last_7_days.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Last 7 Days</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-destructive/10">
                <Zap className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-2xl font-bold text-foreground">{apiStats.today.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Today</p>
            </div>
          </div>
        )}

        {/* Service Accounts */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-foreground">Service Accounts</h4>
            <span className="text-sm text-muted-foreground">({serviceAccounts.length} total)</span>
          </div>
          
          {serviceAccounts.length > 0 ? (
            <div className="space-y-3">
              {serviceAccounts.map((account) => {
                const status = getServiceAccountStatus(account)
                const StatusIcon = status.icon
                const todayUsage = quotaUsage.find(usage => 
                  usage.service_account_id === account.id && 
                  usage.date === new Date().toISOString().split('T')[0]
                )
                
                return (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-white border border-border">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {account.name}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.text}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-muted-foreground font-mono truncate">
                            {account.email}
                          </span>
                          
                          <span className="text-xs text-muted-foreground">
                            Quota: {account.daily_quota_limit}/day
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        {todayUsage ? todayUsage.requests_made : 0} / {account.daily_quota_limit}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Today's Usage
                      </div>
                      {todayUsage && (
                        <div className="w-20 bg-muted rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-accent h-1.5 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min((todayUsage.requests_made / account.daily_quota_limit) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm">No service accounts configured</p>
            </div>
          )}
        </div>

        {/* Integration Health */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-foreground">Integration Health</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-foreground">Google Indexing API</h5>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  serviceAccounts.some(acc => acc.is_active) 
                    ? 'bg-success/10 text-success' 
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {serviceAccounts.some(acc => acc.is_active) ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {serviceAccounts.filter(acc => acc.is_active).length} active accounts
              </p>
            </div>
            
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-foreground">Quota Status</h5>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  serviceAccounts.some(acc => acc.is_active) 
                    ? 'bg-success/10 text-success' 
                    : 'bg-warning/10 text-warning'
                }`}>
                  {serviceAccounts.some(acc => acc.is_active) ? 'Available' : 'Limited'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {quotaUsage.reduce((sum, usage) => sum + (usage.requests_made || 0), 0)} requests used today
              </p>
            </div>
          </div>
        </div>

        {/* Recent Integration Activity */}
        {quotaUsage.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-foreground">Recent Integration Activity</h4>
            </div>
            
            <div className="space-y-2">
              {quotaUsage.slice(0, 5).map((usage) => {
                const account = serviceAccounts.find(acc => acc.id === usage.service_account_id)
                
                return (
                  <div key={usage.id} className="flex items-center justify-between text-sm p-2 hover:bg-secondary rounded">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <span className="text-foreground">
                        {account ? account.name : 'Unknown Account'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-muted-foreground">
                      <span>{usage.requests_made} requests</span>
                      <span>{formatDate(usage.date)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
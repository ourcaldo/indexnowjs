'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Package } from 'lucide-react'
import { supabase } from '@/lib/database'
import { DASHBOARD_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface QuotaInfo {
  daily_quota_used: number
  daily_quota_limit: number
  is_unlimited: boolean
  quota_exhausted: boolean
  package_name: string
}

export default function GlobalQuotaWarning() {
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuotaInfo()
    
    // Check quota every 10 seconds
    const interval = setInterval(fetchQuotaInfo, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchQuotaInfo = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) return

      const response = await fetch(DASHBOARD_ENDPOINTS.MAIN, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (response.ok) {
        const data = await response.json()
        setQuotaInfo(data.user?.quota)
      }
    } catch (error) {
      console.error('Failed to fetch quota info:', error)
    } finally {
      setLoading(false)
    }
  }

  // Only show if quota is exhausted and not unlimited
  if (loading || !quotaInfo || quotaInfo.is_unlimited || !quotaInfo.quota_exhausted) {
    return null
  }

  return (
    <div className="bg-error text-white rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Daily Limit Reached</h3>
            <p className="text-xs mt-1 opacity-90">
              You've reached your daily limit of {quotaInfo.daily_quota_limit.toLocaleString()} URLs. All active jobs have been stopped and will resume tomorrow automatically.
            </p>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Daily Usage</span>
                <span>{quotaInfo.daily_quota_used.toLocaleString()}/{quotaInfo.daily_quota_limit.toLocaleString()}</span>
              </div>
              <div className="w-full bg-background/20 rounded-full h-2">
                <div 
                  className="bg-foreground rounded-full h-2 transition-all duration-300"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Upgrade CTA */}
            <div className="mt-3 pt-3 border-t border-foreground/20">
              <div className="flex items-center space-x-2 text-xs">
                <Package className="h-4 w-4" />
                <span>Upgrade for higher daily limits and continuous processing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
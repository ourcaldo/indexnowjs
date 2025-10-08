'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/database'
import { authService } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { useQuotaValidation } from '@/hooks/useQuotaValidation'
import { INDEXING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

import { 
  Zap, 
  Download, 
  Calendar, 
  Clock,
  Database,
  AlertTriangle
} from 'lucide-react'

export default function IndexNowPage() {
  const { addToast } = useToast()
  const { validateJobCreation, isQuotaNearExhaustion, quotaInfo } = useQuotaValidation()
  const [loading, setLoading] = useState(false)
  const [loadingServiceAccounts, setLoadingServiceAccounts] = useState(true)
  const [parsingSitemap, setParsingSitemap] = useState(false)
  
  // Form states
  const [activeTab, setActiveTab] = useState<'manual' | 'sitemap'>('manual')
  const [jobName, setJobName] = useState('')
  const [nextJobNumber, setNextJobNumber] = useState(1)
  const [urls, setUrls] = useState('')
  const [sitemapUrl, setSitemapUrl] = useState('')
  const [scheduleType, setScheduleType] = useState('one-time')
  const [startTime, setStartTime] = useState('')
  const [parsedUrls, setParsedUrls] = useState<string[]>([])
  
  // Service accounts data
  const [serviceAccounts, setServiceAccounts] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Quota notification state
  const [showQuotaNotification, setShowQuotaNotification] = useState(false)
  const [quotaNotificationData, setQuotaNotificationData] = useState({
    remainingQuota: 0,
    dailyLimit: 0,
    packageName: ''
  })

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setJobName(`#Job-${nextJobNumber}`)
  }, [nextJobNumber])

  const loadData = async () => {
    try {
      setLoadingServiceAccounts(true)
      // Auth handled by AuthProvider - get session token directly
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      // Load service accounts
      const serviceAccountsResponse = await fetch(INDEXING_ENDPOINTS.SERVICE_ACCOUNTS, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (serviceAccountsResponse.ok) {
        const serviceAccountsData = await serviceAccountsResponse.json()
        setServiceAccounts(serviceAccountsData.service_accounts || [])
      }

      // Load job count for auto-generating job names
      const jobsResponse = await fetch(INDEXING_ENDPOINTS.JOBS, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        setNextJobNumber(jobsData.nextJobNumber || 1)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoadingServiceAccounts(false)
    }
  }

  const handleParseSitemap = async () => {
    const sanitizedSitemapUrl = sanitizeInput(sitemapUrl)
    
    if (!sanitizedSitemapUrl.trim()) {
      addToast({
        title: 'Error',
        description: 'Please enter a sitemap URL',
        type: 'error'
      })
      return
    }

    if (!validateUrl(sanitizedSitemapUrl)) {
      addToast({
        title: 'Error',
        description: 'Please enter a valid sitemap URL',
        type: 'error'
      })
      return
    }

    setSitemapUrl(sanitizedSitemapUrl)

    try {
      setParsingSitemap(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      
      const response = await fetch(INDEXING_ENDPOINTS.PARSE_SITEMAP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sitemapUrl: sanitizedSitemapUrl })
      })

      if (response.ok) {
        const data = await response.json()
        setParsedUrls(data.urls)
        addToast({
          title: 'Success',
          description: `Found ${data.count} URLs in sitemap`,
          type: 'success'
        })
      } else {
        const error = await response.json()
        addToast({
          title: 'Error',
          description: error.error || 'Failed to parse sitemap',
          type: 'error'
        })
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to parse sitemap',
        type: 'error'
      })
    } finally {
      setParsingSitemap(false)
    }
  }

  const sanitizeInput = (input: string): string => {
    // Remove HTML tags and escape special characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
  }

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false
      }
      // Basic domain validation
      if (urlObj.hostname.length < 3 || !urlObj.hostname.includes('.')) {
        return false
      }
      return true
    } catch {
      return false
    }
  }

  const validateJobName = (name: string): boolean => {
    // Allow only alphanumeric characters, spaces, hyphens, underscores, and #
    const validPattern = /^[a-zA-Z0-9\s\-_#]+$/
    return validPattern.test(name) && name.length <= 100
  }

  const handleSubmit = async () => {
    // Sanitize job name
    const sanitizedJobName = sanitizeInput(jobName)
    
    if (!sanitizedJobName.trim()) {
      addToast({
        title: 'Error',
        description: 'Please enter a job name',
        type: 'error'
      })
      return
    }

    if (!validateJobName(sanitizedJobName)) {
      addToast({
        title: 'Error',
        description: 'Job name contains invalid characters or is too long',
        type: 'error'
      })
      return
    }

    if (activeTab === 'manual') {
      // Process and validate URLs
      const rawUrls = urls.split('\n').map(url => sanitizeInput(url)).filter(url => url.trim())
      
      if (rawUrls.length === 0) {
        addToast({
          title: 'Error',
          description: 'Please enter at least one URL',
          type: 'error'
        })
        return
      }

      // Validate each URL
      const invalidUrls: string[] = []
      const validUrls: string[] = []
      
      rawUrls.forEach(url => {
        if (!validateUrl(url)) {
          invalidUrls.push(url)
        } else {
          validUrls.push(url)
        }
      })

      if (invalidUrls.length > 0) {
        addToast({
          title: 'Error',
          description: `Invalid URLs found: ${invalidUrls.slice(0, 3).join(', ')}${invalidUrls.length > 3 ? '...' : ''}`,
          type: 'error'
        })
        return
      }

      // Check for duplicate URLs  
      const uniqueUrls = Array.from(new Set(validUrls))
      if (uniqueUrls.length !== validUrls.length) {
        addToast({
          title: 'Warning',
          description: `Removed ${validUrls.length - uniqueUrls.length} duplicate URL(s)`,
          type: 'success'
        })
      }

      // No limit on URL count - removed per user request

      // Update the urls state with cleaned URLs
      setUrls(uniqueUrls.join('\n'))
      
    } else {
      // Validate sitemap URL
      const sanitizedSitemapUrl = sanitizeInput(sitemapUrl)
      
      if (!sanitizedSitemapUrl.trim()) {
        addToast({
          title: 'Error',
          description: 'Please enter a sitemap URL',
          type: 'error'
        })
        return
      }

      if (!validateUrl(sanitizedSitemapUrl)) {
        addToast({
          title: 'Error',
          description: 'Please enter a valid sitemap URL',
          type: 'error'
        })
        return
      }

      // Check if it's likely a sitemap file
      if (!sanitizedSitemapUrl.toLowerCase().includes('sitemap') && !sanitizedSitemapUrl.toLowerCase().endsWith('.xml')) {
        addToast({
          title: 'Warning',
          description: 'URL does not appear to be a sitemap file. Continue anyway?',
          type: 'success'
        })
      }

      setSitemapUrl(sanitizedSitemapUrl)
    }

    if (scheduleType !== 'one-time' && !startTime) {
      addToast({
        title: 'Error',
        description: 'Please select a start time for scheduled jobs',
        type: 'error'
      })
      return
    }

    // Validate quota before submitting job using global quota manager
    const urlsToSubmit = activeTab === 'manual' ? urls.split('\n').filter(url => url.trim()) : parsedUrls
    
    const quotaValidation = await validateJobCreation(urlsToSubmit.length)
    
    if (!quotaValidation.success) {
      addToast({
        title: 'Quota Issue',
        description: quotaValidation.error || 'Unable to create job due to quota limits',
        type: 'error'
      })
      return
    }

    try {
      setLoading(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      
      const jobData = {
        name: sanitizeInput(jobName),
        type: activeTab,
        scheduleType,
        ...(activeTab === 'manual' 
          ? { urls: urls.split('\n').filter(url => url.trim()) }
          : { sitemapUrl: sanitizeInput(sitemapUrl) }
        ),
        ...(scheduleType !== 'one-time' && startTime ? { startTime } : {})
      }

      const response = await fetch(INDEXING_ENDPOINTS.JOBS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(jobData)
      })

      if (response.ok) {
        const data = await response.json()
        addToast({
          title: 'Success',
          description: 'Indexing job created successfully',
          type: 'success'
        })
        
        // Clear form and increment job number
        clearForm()
        setNextJobNumber(prev => prev + 1)
      } else {
        const error = await response.json()
        
        // Handle quota exhaustion with notification
        if (error.quota_exhausted || error.quotaExhausted) {
          setQuotaNotificationData({
            remainingQuota: error.remaining_quota || error.remainingQuota || 0,
            dailyLimit: currentUser?.package?.quota_limits?.daily_urls || 50,
            packageName: currentUser?.package?.name || 'Free'
          })
          setShowQuotaNotification(true)
        }
        
        addToast({
          title: 'Quota Limit Reached',
          description: error.error || 'Daily quota exceeded. Upgrade your plan to submit more URLs.',
          type: 'error'
        })
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to create job',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const clearForm = () => {
    setUrls('')
    setSitemapUrl('')
    setParsedUrls([])
    setScheduleType('one-time')
    setStartTime('')
    setActiveTab('manual')
  }

  const totalQuota = serviceAccounts.reduce((total, account) => total + (account.daily_quota_limit || 200), 0)
  const usedQuota = serviceAccounts.reduce((total, account) => total + (account.quota_usage?.requests_made || 0), 0)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-primary">IndexNow</h1>
        <p className="mt-1 text-muted-foreground">Submit URLs for indexing and manage schedules</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="p-6 rounded-lg border bg-background border-border">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-brand-primary">Submit URLs for Indexing</h2>
            </div>

            {/* Job Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                Job Name
              </label>
              <input
                type="text"
                value={jobName}
                onChange={(e) => {
                  const value = e.target.value
                  // Prevent input longer than 100 characters
                  if (value.length <= 100) {
                    setJobName(value)
                  }
                }}
                maxLength={100}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-background border-border focus:ring-brand-accent"
                placeholder={`#Job-${nextJobNumber}`}
              />
              <p className="text-xs mt-1 text-muted-foreground">
                {jobName.length}/100 characters
              </p>
            </div>

            {/* Input Method Tabs */}
            <div className="mb-6">
              <div className="flex border rounded-lg p-1 bg-secondary border-border">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'manual' 
                      ? 'bg-background text-brand-primary shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>✋</span>
                    Manual Input
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('sitemap')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'sitemap' 
                      ? 'bg-background text-brand-primary shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    From Sitemap
                  </div>
                </button>
              </div>
            </div>

            {/* URL Input */}
            {activeTab === 'manual' && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-muted-foreground">
                  URLs (one per line)
                </label>
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:border-transparent bg-background border-border focus:ring-brand-accent text-foreground"
                  placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                />
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-muted-foreground">
                    Enter one URL per line (newline separated format).
                  </span>
                  <span className="text-muted-foreground">
                    {urls.split('\n').filter(url => url.trim()).length} URLs
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'sitemap' && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-muted-foreground">
                  Sitemap URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={sitemapUrl}
                    onChange={(e) => {
                      const value = e.target.value
                      // Prevent extremely long URLs
                      if (value.length <= 2000) {
                        setSitemapUrl(value)
                      }
                    }}
                    maxLength={2000}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-background border-border focus:ring-brand-accent text-foreground"
                    placeholder="https://example.com/sitemap.xml"
                  />
                  <button
                    onClick={handleParseSitemap}
                    disabled={parsingSitemap || !sitemapUrl.trim()}
                    className="px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 bg-brand-primary"
                  >
                    <Download className="w-4 h-4 mr-2 inline" />
                    {parsingSitemap ? 'Parsing...' : 'Parse'}
                  </button>
                </div>
                <p className="text-xs mt-2 text-muted-foreground">
                  Supports nested sitemaps and sitemap indexes.
                </p>
                {parsedUrls.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary border border-border">
                    <p className="text-sm font-medium text-brand-primary">
                      Found {parsedUrls.length} URLs
                    </p>
                    <div className="mt-2 max-h-32 overflow-y-auto text-xs text-muted-foreground">
                      {parsedUrls.slice(0, 10).map((url, idx) => (
                        <div key={idx}>{url}</div>
                      ))}
                      {parsedUrls.length > 10 && (
                        <div>... and {parsedUrls.length - 10} more</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Schedule Section */}
            <div className="mb-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-brand-primary">Schedule</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">
                    Frequency
                  </label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-background border-border focus:ring-brand-accent text-foreground"
                  >
                    <option value="one-time">One-time</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {scheduleType !== 'one-time' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-muted-foreground">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-background border-border focus:ring-brand-accent text-foreground"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 bg-brand-primary"
              >
                <Zap className="w-4 h-4 mr-2 inline" />
                {loading ? 'Creating Job...' : 'Submit for Indexing'}
              </button>
              <button
                onClick={clearForm}
                className="px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-90 bg-secondary text-foreground border border-border"
              >
                Clear Form
              </button>
            </div>
          </div>
        </div>

        {/* API Quota Status */}
        <div className="lg:col-span-1">
          <div className="p-6 rounded-lg border bg-background border-border">
            <h3 className="text-lg font-semibold mb-4 text-brand-primary">API Quota Status</h3>
            
            {loadingServiceAccounts ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto border-brand-primary"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <>
                {/* Total Daily Quota */}
                <div className="mb-6 p-4 rounded-lg bg-secondary border border-border">
                  <div className="text-center">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Total Daily Quota</h4>
                    <div className="text-3xl font-bold mb-1 text-brand-primary">
                      {totalQuota.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Requests per day</div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      {usedQuota}/{totalQuota} used today ({Math.round((usedQuota / totalQuota) * 100) || 0}%)
                    </div>
                  </div>
                </div>

                {/* Individual Service Accounts */}
                {serviceAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {serviceAccounts.map((account, idx) => (
                      <div key={account.id} className="p-3 rounded-lg bg-secondary border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium truncate flex-1 text-brand-primary">
                            {account.email}
                          </span>
                          <span 
                            className={`text-xs px-2 py-1 rounded-full text-white ${
                              account.is_active ? 'bg-success' : 'bg-muted-foreground'
                            }`}
                          >
                            {account.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Daily Requests</span>
                            <span className="text-brand-primary">
                              {account.quota_usage?.requests_made || 0}/{account.daily_quota_limit || 200}
                            </span>
                          </div>
                          <div className="w-full rounded-full h-1.5 bg-border">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                (account.quota_usage?.requests_made || 0) > (account.daily_quota_limit || 200) * 0.9 
                                  ? 'bg-error' : 'bg-success'
                              }`}
                              style={{
                                width: `${Math.min(((account.quota_usage?.requests_made || 0) / (account.daily_quota_limit || 200)) * 100, 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Database className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium text-brand-primary">No Service Accounts</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Add service accounts in Settings to start indexing
                    </p>
                  </div>
                )}

                {/* Warning if low quota */}
                {totalQuota > 0 && (usedQuota / totalQuota) > 0.8 && (
                  <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-warning" />
                      <div className="text-xs text-brand-primary">
                        API quota is running low. Consider adding more service accounts.
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
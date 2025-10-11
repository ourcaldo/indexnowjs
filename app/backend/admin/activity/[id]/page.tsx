'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { 
  ArrowLeft,
  Activity,
  Clock,
  User,
  Monitor,
  MapPin,
  Smartphone,
  Tablet,
  Globe,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Settings,
  Shield,
  Zap,
  Server,
  AlertCircle,
  Calendar,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface ActivityDetail {
  id: string
  user_id: string
  user_name: string
  user_email: string
  event_type: string
  action_description: string
  target_type?: string
  target_id?: string
  ip_address?: string
  user_agent?: string
  device_info?: any
  location_data?: any
  success: boolean
  error_message?: string
  metadata?: any
  created_at: string
  related_activities: ActivityDetail[]
}

export default function ActivityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchActivityDetail(params.id as string)
    }
  }, [params.id])

  const fetchActivityDetail = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(ADMIN_ENDPOINTS.ACTIVITY_BY_ID(id), {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity details')
      }

      const data = await response.json()
      setActivity(data.data?.activity || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      full: date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }),
      short: date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getEventIcon = (eventType: string) => {
    const icons = {
      login: LogIn,
      logout: LogOut,
      register: User,
      job_create: Zap,
      job_update: Settings,
      job_delete: XCircle,
      job_start: CheckCircle,
      service_account_add: Shield,
      service_account_delete: XCircle,
      profile_update: User,
      admin_login: Shield,
      user_management: Settings,
      api_call: Server,
      settings_change: Settings
    }
    
    return icons[eventType as keyof typeof icons] || Activity
  }

  const getDeviceInfo = (userAgent?: string) => {
    if (!userAgent) return { icon: Monitor, text: 'Desktop', details: 'Unknown Browser' }
    
    const ua = userAgent.toLowerCase()
    let deviceType = 'Desktop'
    let icon = Monitor
    
    if (ua.includes('mobile') || ua.includes('iphone')) {
      deviceType = 'Mobile'
      icon = Smartphone
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'Tablet'
      icon = Tablet
    }
    
    let browser = 'Unknown Browser'
    if (ua.includes('chrome')) browser = 'Google Chrome'
    else if (ua.includes('firefox')) browser = 'Mozilla Firefox'
    else if (ua.includes('safari')) browser = 'Safari'
    else if (ua.includes('edge')) browser = 'Microsoft Edge'
    
    return { icon, text: deviceType, details: browser }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Loading Activity Details...</h1>
          </div>
        </div>
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen bg-secondary p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Button 
              onClick={() => router.back()}
              variant="outline"
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Activity Logs
            </Button>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Activity Not Found</h3>
                  <p className="text-muted-foreground">{error || 'The requested activity log could not be found.'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const EventIcon = getEventIcon(activity.event_type)
  const deviceInfo = getDeviceInfo(activity.user_agent)
  const DeviceIcon = deviceInfo.icon
  const formattedDate = formatDate(activity.created_at)

  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            onClick={() => router.back()}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Activity Logs
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">Activity Details</h1>
          <p className="text-muted-foreground mt-2">
            Complete information about this user activity
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Activity Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <EventIcon className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <div className="text-xl text-foreground">
                      {activity.event_type.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-muted-foreground font-normal">
                      Activity ID: {activity.id}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Description</h4>
                  <p className="text-foreground bg-secondary p-3 rounded-lg">
                    {activity.action_description}
                  </p>
                </div>

                {activity.error_message && (
                  <div>
                    <h4 className="text-sm font-medium text-error mb-2">Error Details</h4>
                    <div className="bg-error/5 border border-error/20 p-3 rounded-lg">
                      <p className="text-error text-sm">
                        {activity.error_message}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Status</h4>
                    <div className="flex items-center gap-2">
                      {activity.success ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-success" />
                          <span className="text-success font-medium">Success</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-error" />
                          <span className="text-error font-medium">Failed</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Timestamp</h4>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">{formattedDate.full}</span>
                    </div>
                  </div>
                </div>

                {activity.target_type && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Target Resource</h4>
                    <div className="bg-secondary p-3 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">Type:</span> {activity.target_type}
                      </div>
                      {activity.target_id && (
                        <div className="text-sm mt-1">
                          <span className="font-medium">ID:</span> 
                          <code className="ml-2 bg-white px-2 py-1 rounded text-xs">
                            {activity.target_id}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Metadata */}
            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-secondary p-4 rounded-lg text-sm overflow-auto">
                    {JSON.stringify(activity.metadata, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center pb-4 border-b border-border">
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="font-medium text-foreground">{activity.user_name}</h3>
                  <p className="text-sm text-muted-foreground">{activity.user_email}</p>
                </div>
                
                <Link 
                  href={`/backend/admin/users/${activity.user_id}`}
                  className="block"
                >
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View User Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Technical Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Device & Browser</h4>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DeviceIcon className="h-4 w-4" />
                    <div className="text-sm">
                      <div>{deviceInfo.text}</div>
                      <div className="text-xs">{deviceInfo.details}</div>
                    </div>
                  </div>
                </div>

                {activity.ip_address && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">IP Address</h4>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <code className="text-sm bg-secondary px-2 py-1 rounded">
                        {activity.ip_address}
                      </code>
                    </div>
                  </div>
                )}

                {activity.user_agent && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">User Agent</h4>
                    <p className="text-xs text-muted-foreground bg-secondary p-2 rounded break-all">
                      {activity.user_agent}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Activities */}
            {activity.related_activities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activities
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Latest activities from this user
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activity.related_activities.slice(0, 5).map((relatedActivity) => {
                      const RelatedIcon = getEventIcon(relatedActivity.event_type)
                      const relatedDate = formatDate(relatedActivity.created_at)
                      
                      return (
                        <Link 
                          key={relatedActivity.id}
                          href={`/backend/admin/activity/${relatedActivity.id}`}
                          className="block hover:bg-secondary p-2 rounded transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <RelatedIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">
                                {relatedActivity.action_description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {relatedDate.short}
                              </p>
                            </div>
                            <div className="flex items-center">
                              {relatedActivity.success ? (
                                <CheckCircle className="h-3 w-3 text-success" />
                              ) : (
                                <XCircle className="h-3 w-3 text-error" />
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
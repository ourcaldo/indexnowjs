'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft,
  Activity,
  Clock,
  User,
  Monitor,
  MapPin,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface ActivityLog {
  id: string
  user_id: string
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
}

interface UserInfo {
  id: string
  name: string
}

export default function UserActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params
      setResolvedParams(resolved)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (resolvedParams?.id) {
      fetchUserActivity()
    }
  }, [resolvedParams, currentPage])

  const fetchUserActivity = async () => {
    if (!resolvedParams?.id) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '50',
        page: currentPage.toString()
      })

      const response = await fetch(`${ADMIN_ENDPOINTS.USER_BY_ID(resolvedParams.id)}/activity?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user activity')
      }

      const data = await response.json()
      setLogs(data.logs || [])
      setUser(data.user || null)
      setPagination(data.pagination || {})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getEventTypeBadge = (eventType: string, success: boolean) => {
    const colors = {
      login: success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
      logout: 'bg-muted/10 text-muted-foreground',
      job_create: 'bg-primary/10 text-primary',
      job_update: 'bg-warning/10 text-warning',
      job_delete: 'bg-destructive/10 text-destructive',
      service_account_add: 'bg-success/10 text-success',
      service_account_delete: 'bg-destructive/10 text-destructive',
      profile_update: 'bg-primary/10 text-primary',
      api_call: 'bg-muted/10 text-muted-foreground'
    }
    
    return colors[eventType as keyof typeof colors] || 'bg-muted/10 text-muted-foreground'
  }

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Monitor className="h-4 w-4" />
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return <Smartphone className="h-4 w-4" />
    }
    
    return <Monitor className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/backend/admin/users">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Users
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">User Activity History</h1>
            <p className="text-muted-foreground mt-2">Loading user activity...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/backend/admin/users">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Users
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">User Activity History</h1>
            <Card className="mt-4">
              <CardContent className="p-6">
                <p className="text-destructive">Error: {error}</p>
                <Button 
                  onClick={fetchUserActivity}
                  className="mt-4 bg-primary hover:bg-primary/90 text-white"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/backend/admin/users">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
              </Button>
            </Link>
            {resolvedParams?.id && (
              <Link href={`/backend/admin/users/${resolvedParams.id}`}>
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  View User Profile
                </Button>
              </Link>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Activity History: {user?.name || 'Loading...'}
          </h1>
          <p className="text-muted-foreground mt-2">
            Complete activity timeline for this user including logins, actions, and system interactions
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{logs.length}</p>
                  <p className="text-xs text-muted-foreground">Total Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {logs.filter(l => l.success).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Successful</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {logs.filter(l => !l.success).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Activity className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {new Set(logs.map(l => l.event_type)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Event Types</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline ({logs.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No activity found for this user</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="border border-border rounded-lg p-4 hover:bg-background transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Timestamp */}
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground text-sm font-medium">
                            {formatDate(log.created_at)}
                          </span>
                        </div>

                        {/* Event/Action */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${getEventTypeBadge(log.event_type, log.success)} border-0 text-xs`}>
                              {log.event_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {!log.success && (
                              <Badge className="bg-destructive/10 text-destructive border-0 text-xs">
                                FAILED
                              </Badge>
                            )}
                          </div>
                          <p className="text-foreground text-sm mb-1">
                            {log.action_description}
                          </p>
                          {log.error_message && (
                            <p className="text-destructive text-xs">
                              Error: {log.error_message}
                            </p>
                          )}
                        </div>

                        {/* IP and Device */}
                        <div className="flex items-center gap-4 min-w-[180px] text-muted-foreground text-xs">
                          {log.ip_address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="font-mono">{log.ip_address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            {getDeviceIcon(log.user_agent)}
                          </div>
                        </div>
                      </div>

                      {/* Link to Activity Detail */}
                      <Link href={`/backend/admin/activity/${log.id}`}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-background"
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} entries
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
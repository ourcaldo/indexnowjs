'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Activity,
  Clock,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
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
  FileText,
  Server,
  Shield,
  Zap,
  Key
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { ADMIN_ENDPOINTS, buildEndpoint } from '@/lib/core/constants/ApiEndpoints'

interface ActivityLog {
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
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dayFilter, setDayFilter] = useState('7')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchActivityLogs()
  }, [dayFilter, typeFilter, currentPage])

  const fetchActivityLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        days: dayFilter,
        limit: '50',
        page: currentPage.toString()
      })

      const response = await fetch(buildEndpoint(ADMIN_ENDPOINTS.ACTIVITY, Object.fromEntries(params)), {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity logs')
      }

      const data = await response.json()
      setLogs(data.logs || [])
      setPagination(data.pagination || {})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = typeFilter === 'all' || log.event_type === typeFilter
    
    return matchesSearch && matchesType
  })

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
    const eventConfig = {
      login: { 
        color: success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
        icon: LogIn,
        label: 'Sign In'
      },
      logout: { 
        color: 'bg-muted/10 text-muted-foreground',
        icon: LogOut,
        label: 'Sign Out'
      },
      register: { 
        color: success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
        icon: User,
        label: 'Registration'
      },
      job_create: { 
        color: 'bg-accent/10 text-accent',
        icon: Zap,
        label: 'Job Created'
      },
      job_update: { 
        color: 'bg-warning/10 text-warning',
        icon: Settings,
        label: 'Job Updated'
      },
      job_delete: { 
        color: 'bg-destructive/10 text-destructive',
        icon: XCircle,
        label: 'Job Deleted'
      },
      job_start: { 
        color: 'bg-success/10 text-success',
        icon: CheckCircle,
        label: 'Job Started'
      },
      service_account_add: { 
        color: 'bg-success/10 text-success',
        icon: Shield,
        label: 'Service Added'
      },
      service_account_delete: { 
        color: 'bg-destructive/10 text-destructive',
        icon: XCircle,
        label: 'Service Removed'
      },
      profile_update: { 
        color: 'bg-accent/10 text-accent',
        icon: User,
        label: 'Profile Updated'
      },
      admin_login: { 
        color: 'bg-warning/10 text-warning',
        icon: Shield,
        label: 'Admin Access'
      },
      user_management: { 
        color: 'bg-accent/10 text-accent',
        icon: Settings,
        label: 'User Management'
      },
      api_call: { 
        color: 'bg-muted/10 text-muted-foreground',
        icon: Server,
        label: 'API Call'
      },
      settings_change: { 
        color: 'bg-warning/10 text-warning',
        icon: Settings,
        label: 'Settings Changed'
      },
      user_password_reset: {
        color: 'bg-destructive/10 text-destructive',
        icon: Key,
        label: 'Password Reset'
      },
      user_profile_update: {
        color: 'bg-accent/10 text-accent',
        icon: User,
        label: 'Profile Updated'
      },
      user_role_change: {
        color: 'bg-warning/10 text-warning',
        icon: Shield,
        label: 'Role Changed'
      },
      user_security_view: {
        color: 'bg-muted/10 text-muted-foreground',
        icon: Shield,
        label: 'Security Analysis'
      },
      user_activity_view: {
        color: 'bg-muted/10 text-muted-foreground',
        icon: Activity,
        label: 'Activity Review'
      },
      page_view: {
        color: 'bg-accent/10 text-accent',
        icon: Globe,
        label: 'Page Visit'
      },
      dashboard_view: {
        color: 'bg-accent/10 text-accent',
        icon: Monitor,
        label: 'Dashboard'
      }
    }
    
    return eventConfig[eventType as keyof typeof eventConfig] || {
      color: 'bg-muted/10 text-muted-foreground',
      icon: Activity,
      label: eventType.replace('_', ' ').toUpperCase()
    }
  }

  const getDeviceInfo = (userAgent?: string) => {
    if (!userAgent) return { icon: Monitor, text: 'Desktop' }
    
    const ua = userAgent.toLowerCase()
    
    if (ua.includes('mobile') || ua.includes('iphone')) {
      return { icon: Smartphone, text: 'Mobile' }
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return { icon: Tablet, text: 'Tablet' }
    }
    if (ua.includes('android')) {
      return ua.includes('mobile') ? { icon: Smartphone, text: 'Mobile' } : { icon: Tablet, text: 'Tablet' }
    }
    
    return { icon: Monitor, text: 'Desktop' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Activity Logs</h1>
            <p className="text-muted-foreground mt-2">Loading activity logs...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-secondary p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Activity Logs</h1>
            <Card className="mt-4">
              <CardContent className="p-6">
                <p className="text-destructive">Error: {error}</p>
                <Button 
                  onClick={fetchActivityLogs}
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
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Activity Logs</h1>
          <p className="text-muted-foreground mt-2">
            Track backend events, user actions (logins, changes, API calls), and system warnings or errors for audits and debugging
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Activity className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{filteredLogs.length}</p>
                  <p className="text-xs text-muted-foreground">Total Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <User className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {new Set(filteredLogs.map(l => l.user_id)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Activity className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {filteredLogs.filter(l => l.success).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Successful Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Activity className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {filteredLogs.filter(l => !l.success).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Failed Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user name, email, action, or event type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={dayFilter} onValueChange={setDayFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last 24 hours</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="login">Login/Logout</SelectItem>
                    <SelectItem value="job_create">Job Management</SelectItem>
                    <SelectItem value="service_account_add">Service Accounts</SelectItem>
                    <SelectItem value="profile_update">Profile Updates</SelectItem>
                    <SelectItem value="api_call">API Calls</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              User Activity Logs
            </CardTitle>
            <p className="text-muted-foreground text-sm mt-2">
              Showing {filteredLogs.length} activities from all users (latest first)
            </p>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No activity logs found</h3>
                <p className="text-muted-foreground">No user activities match your current filters</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary hover:bg-secondary">
                      <TableHead className="w-16 text-center text-foreground font-semibold">#</TableHead>
                      <TableHead className="text-center text-foreground font-semibold">Timestamp</TableHead>
                      <TableHead className="text-center text-foreground font-semibold">User</TableHead>
                      <TableHead className="text-center text-foreground font-semibold">Action/Event</TableHead>
                      <TableHead className="text-center text-foreground font-semibold">Device & IP</TableHead>
                      <TableHead className="text-center text-foreground font-semibold">Status</TableHead>
                      <TableHead className="w-16 text-center text-foreground font-semibold">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log, index) => {
                      const eventConfig = getEventTypeBadge(log.event_type, log.success)
                      const deviceInfo = getDeviceInfo(log.user_agent)
                      const IconComponent = eventConfig.icon
                      const DeviceIcon = deviceInfo.icon
                      
                      return (
                        <TableRow 
                          key={log.id}
                          className="hover:bg-secondary border-b border-border"
                        >
                          {/* Row Number */}
                          <TableCell className="text-center text-muted-foreground font-mono text-sm">
                            {(currentPage - 1) * 50 + index + 1}
                          </TableCell>
                          
                          {/* Timestamp */}
                          <TableCell className="text-left">
                            <div className="text-foreground text-sm font-medium">
                              {formatDate(log.created_at)}
                            </div>
                          </TableCell>
                          
                          {/* User Info */}
                          <TableCell className="text-left">
                            <Link 
                              href={`/backend/admin/users/${log.user_id}`}
                              className="hover:text-accent transition-colors"
                            >
                              <div className="text-foreground font-medium text-sm">
                                {log.user_name}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {log.user_email}
                              </div>
                            </Link>
                          </TableCell>
                          
                          {/* Event/Action */}
                          <TableCell className="text-left">
                            <Badge className={`${eventConfig.color} border-0 text-xs mb-1`}>
                              {eventConfig.label}
                            </Badge>
                            <div className="text-foreground text-sm">
                              {log.action_description}
                            </div>
                            {log.error_message && (
                              <div className="text-destructive text-xs mt-1 bg-destructive/5 px-2 py-1 rounded">
                                <strong>Error:</strong> {log.error_message}
                              </div>
                            )}
                          </TableCell>
                          
                          {/* Device & IP */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                              <DeviceIcon className="h-4 w-4 flex-shrink-0" />
                              <span className="font-medium">{deviceInfo.text}</span>
                            </div>
                            {log.ip_address && (
                              <div className="text-muted-foreground text-xs">
                                <span className="font-mono bg-secondary px-1.5 py-0.5 rounded">
                                  {log.ip_address}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          
                          {/* Status */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {log.success ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-success" />
                                  <span className="text-success text-sm font-medium">Success</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 text-destructive" />
                                  <span className="text-destructive text-sm font-medium">Failed</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          
                          {/* View Details */}
                          <TableCell className="text-center">
                            <Link href={`/backend/admin/activity/${log.id}`}>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-accent/10 hover:text-accent"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
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
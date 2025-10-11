'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle, 
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  Search,
  Filter,
  RefreshCw,
  Eye
} from 'lucide-react'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface ErrorStats {
  summary: {
    totalErrors: number
    criticalErrors: number
    highErrors: number
    unresolvedErrors: number
  }
  distributions: {
    byType: Record<string, number>
    bySeverity: Record<string, number>
    byEndpoint: Array<{ endpoint: string; count: number }>
  }
  topErrors: Array<{
    message: string
    error_type: string
    severity: string
    count: number
  }>
  trend: {
    value: number
    direction: 'up' | 'down' | 'stable'
    previousPeriodCount: number
    currentPeriodCount: number
  }
  timeRange: string
}

interface CriticalError {
  id: string
  error_type: string
  severity: string
  message: string
  endpoint?: string
  http_method?: string
  stack_trace?: string
  created_at: string
  user_id?: string
}

type TimeRange = '24h' | '7d' | '30d'

export default function ErrorMonitoringDashboard() {
  const router = useRouter()
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [criticalErrors, setCriticalErrors] = useState<CriticalError[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [timeRange])

  const fetchDashboardData = async () => {
    try {
      if (!loading) setRefreshing(true)

      const [statsRes, criticalRes] = await Promise.all([
        fetch(`${ADMIN_ENDPOINTS.ERROR_STATS}?range=${timeRange}`, { credentials: 'include' }),
        fetch(`${ADMIN_ENDPOINTS.CRITICAL_ERRORS}?limit=20`, { credentials: 'include' })
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.data)
      }

      if (criticalRes.ok) {
        const criticalData = await criticalRes.json()
        setCriticalErrors(criticalData.data?.criticalErrors || [])
      }
    } catch (error) {
      // Error handled by API
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      case 'LOW':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

  const getTrendIcon = () => {
    if (!stats) return <Minus className="h-4 w-4 text-muted-foreground" />
    if (stats.trend.direction === 'up') return <TrendingUp className="h-4 w-4 text-destructive" />
    if (stats.trend.direction === 'down') return <TrendingDown className="h-4 w-4 text-success" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '24h': return 'Last 24 Hours'
      case '7d': return 'Last 7 Days'
      case '30d': return 'Last 30 Days'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Error Monitoring Dashboard</h1>
            <p className="text-muted-foreground mt-2">Loading error analytics...</p>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground" data-testid="text-dashboard-title">
                Error Monitoring Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                System error tracking, analysis, and resolution management
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                <SelectTrigger className="w-[180px]" data-testid="select-time-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchDashboardData}
                disabled={refreshing}
                data-testid="button-refresh"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Error Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-total-errors">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Total Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground" data-testid="text-total-errors">
                  {stats.summary.totalErrors.toLocaleString()}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-2">
                  {getTrendIcon()}
                  <span className="ml-1">
                    {Math.abs(stats.trend.value).toFixed(1)}% {stats.trend.direction === 'up' ? 'increase' : stats.trend.direction === 'down' ? 'decrease' : 'stable'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-critical-errors">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Critical Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive" data-testid="text-critical-errors">
                  {stats.summary.criticalErrors.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Requires immediate attention
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-high-errors">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-orange-500" />
                  High Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600" data-testid="text-high-errors">
                  {stats.summary.highErrors.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  High severity issues
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-unresolved-errors">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Unresolved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600" data-testid="text-unresolved-errors">
                  {stats.summary.unresolvedErrors.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Pending resolution
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error Distribution Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* By Severity */}
            <Card data-testid="card-severity-distribution">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  By Severity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.distributions.bySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{severity}</span>
                      <Badge variant="secondary" className={getSeverityColor(severity)}>
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* By Type */}
            <Card data-testid="card-type-distribution">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  By Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.distributions.byType)
                    .slice(0, 5)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-foreground truncate">{type}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Endpoints */}
            <Card data-testid="card-endpoint-distribution">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Top Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.distributions.byEndpoint.map(({ endpoint, count }) => (
                    <div key={endpoint} className="flex items-center justify-between">
                      <span className="text-sm text-foreground truncate text-ellipsis max-w-[200px]">
                        {endpoint}
                      </span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Critical Errors List */}
        <Card data-testid="card-critical-errors-list">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Critical Errors
                </CardTitle>
                <CardDescription className="mt-1">
                  Unresolved critical errors requiring immediate attention
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/backend/admin/errors')}
                data-testid="button-view-all-errors"
              >
                <Eye className="h-4 w-4 mr-2" />
                View All Errors
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {criticalErrors.length > 0 ? (
              <div className="space-y-4">
                {criticalErrors.map((error) => (
                  <div 
                    key={error.id} 
                    className="p-4 bg-secondary rounded-lg border border-border hover:border-destructive/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/backend/admin/errors/${error.id}`)}
                    data-testid={`error-item-${error.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                          <Badge variant="secondary" className="text-xs">
                            {error.error_type}
                          </Badge>
                          <h4 className="text-sm font-medium text-foreground" data-testid={`error-message-${error.id}`}>
                            {error.message}
                          </h4>
                        </div>
                        {error.endpoint && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {error.http_method && <span className="font-mono mr-2">{error.http_method}</span>}
                            <code className="bg-muted px-1 rounded">{error.endpoint}</code>
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs text-muted-foreground">{formatDate(error.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                <p className="text-sm">No critical errors found</p>
                <p className="text-xs mt-1">System is running smoothly</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Errors */}
        {stats && stats.topErrors.length > 0 && (
          <Card className="mt-6" data-testid="card-top-errors">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Most Common Errors</CardTitle>
              <CardDescription>Top 5 errors by occurrence in {getTimeRangeLabel().toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topErrors.map((error, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className={getSeverityColor(error.severity)}>
                          {error.severity}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {error.error_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground mt-1">{error.message}</p>
                    </div>
                    <div className="ml-4">
                      <div className="text-right">
                        <span className="text-lg font-bold text-foreground">{error.count}</span>
                        <p className="text-xs text-muted-foreground">occurrences</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

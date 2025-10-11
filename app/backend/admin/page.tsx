'use client'

import { useEffect, useState } from 'react'
import { 
  Users, 
  Activity, 
  Briefcase, 
  Server, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { supabase } from '@/lib/database'
import { useAdminDashboardLogger } from '@/hooks/use-admin-activity-logger'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface DashboardStats {
  total_users: number
  regular_users: number
  admin_users: number
  super_admin_users: number
  total_jobs: number
  active_jobs: number
  completed_jobs: number
  failed_jobs: number
  total_service_accounts: number
  active_service_accounts: number
  daily_api_requests: number
  published_posts: number
  published_pages: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { logDashboardView, logStatsRefresh } = useAdminDashboardLogger()

  useEffect(() => {
    fetchDashboardStats()
    // Log admin dashboard access
    logDashboardView()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Get current session token from Supabase auth
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No authentication session found')
        return
      }

      const response = await fetch(ADMIN_ENDPOINTS.DASHBOARD, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.data?.stats)
        // Log stats refresh if this is a manual refresh
        if (stats !== null) {
          logStatsRefresh()
        }
      } else {
        console.error('Error fetching dashboard stats:', response.status)
        const errorData = await response.text()
        console.error('Error details:', errorData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-border border-t-primary"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      subtitle: `${stats?.regular_users || 0} regular, ${stats?.admin_users || 0} admin`,
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
    {
      title: 'Indexing Jobs',
      value: stats?.total_jobs || 0,
      subtitle: `${stats?.active_jobs || 0} active, ${stats?.completed_jobs || 0} completed`,
      icon: Activity,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: 'Service Accounts',
      value: stats?.total_service_accounts || 0,
      subtitle: `${stats?.active_service_accounts || 0} active accounts`,
      icon: Server,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      title: 'API Requests Today',
      value: stats?.daily_api_requests || 0,
      subtitle: 'Google Indexing API calls',
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  ]

  const quickStats = [
    {
      label: 'Failed Jobs',
      value: stats?.failed_jobs || 0,
      icon: XCircle,
      color: 'text-error',
      bgColor: 'bg-error/10'
    },
    {
      label: 'Success Rate',
      value: stats?.total_jobs ? Math.round(((stats.completed_jobs / stats.total_jobs) * 100)) : 0,
      suffix: '%',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      label: 'Published Posts',
      value: stats?.published_posts || 0,
      icon: Briefcase,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
    {
      label: 'Published Pages',
      value: stats?.published_pages || 0,
      icon: Briefcase,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of IndexNow Studio system metrics</p>
        </div>
        <button
          onClick={fetchDashboardStats}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-background rounded-lg border border-border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-1">{card.value.toLocaleString()}</h3>
              <p className="text-sm font-medium text-foreground mb-1">{card.title}</p>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-background rounded-lg border border-border p-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {stat.value.toLocaleString()}{stat.suffix}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Status */}
      <div className="bg-background rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-success rounded-full"></div>
            <span className="text-sm text-muted-foreground">Database Connection</span>
            <span className="text-sm font-medium text-success">Healthy</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-success rounded-full"></div>
            <span className="text-sm text-muted-foreground">Google API</span>
            <span className="text-sm font-medium text-success">Active</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-success rounded-full"></div>
            <span className="text-sm text-muted-foreground">Background Worker</span>
            <span className="text-sm font-medium text-success">Running</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="bg-background rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/backend/admin/users"
            className="flex items-center p-4 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <Users className="h-5 w-5 text-accent mr-3" />
            <span className="text-sm font-medium text-foreground">Manage Users</span>
          </a>
          <a
            href="/backend/admin/activity"
            className="flex items-center p-4 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <Activity className="h-5 w-5 text-success mr-3" />
            <span className="text-sm font-medium text-foreground">View Logs</span>
          </a>
          <a
            href="/backend/admin/settings/site"
            className="flex items-center p-4 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <Server className="h-5 w-5 text-warning mr-3" />
            <span className="text-sm font-medium text-foreground">Site Settings</span>
          </a>
          <a
            href="/backend/admin/cms/posts"
            className="flex items-center p-4 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <Briefcase className="h-5 w-5 text-primary mr-3" />
            <span className="text-sm font-medium text-foreground">Manage Content</span>
          </a>
        </div>
      </div>
    </div>
  )
}
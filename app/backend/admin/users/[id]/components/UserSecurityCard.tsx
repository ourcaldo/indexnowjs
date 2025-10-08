'use client'

import { 
  Shield,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface SecurityData {
  ipAddresses: Array<{
    ip: string
    lastUsed: string
    usageCount: number
  }>
  locations: string[]
  loginAttempts: {
    total: number
    successful: number
    failed: number
    recent: Array<{
      success: boolean
      timestamp: string
      ip_address?: string
      device_info?: any
    }>
  }
  activity: {
    lastActivity: string | null
    firstSeen: string | null
    totalActivities: number
  }
  securityScore: number
  riskLevel: 'low' | 'medium' | 'high'
}

interface UserSecurityCardProps {
  securityData: SecurityData | null
  securityLoading: boolean
}

export function UserSecurityCard({ securityData, securityLoading }: UserSecurityCardProps) {
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-success/10 text-success border-success/20'
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20'
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-success'
    if (score >= 60) return 'text-warning'
    return 'text-destructive'
  }

  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-destructive/10">
          <Shield className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Security Overview</h3>
          <p className="text-sm text-muted-foreground">Account security metrics and login patterns</p>
        </div>
      </div>

      {securityLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3 p-3 bg-secondary rounded-lg">
                <div className="w-8 h-8 bg-muted rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : securityData ? (
        <div className="space-y-6">
          {/* Security Score & Risk Level */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Security Score</p>
                  <p className={`text-2xl font-bold ${getSecurityScoreColor(securityData.securityScore)}`}>
                    {securityData.securityScore}/100
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-border flex items-center justify-center">
                  <span className={`text-lg font-bold ${getSecurityScoreColor(securityData.securityScore)}`}>
                    {securityData.securityScore}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Risk Level</p>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getRiskLevelColor(securityData.riskLevel)}`}>
                    {securityData.riskLevel.toUpperCase()}
                  </span>
                </div>
                <AlertTriangle className={`h-8 w-8 ${
                  securityData.riskLevel === 'high' ? 'text-destructive' :
                  securityData.riskLevel === 'medium' ? 'text-warning' :
                  'text-success'
                }`} />
              </div>
            </div>
          </div>

          {/* Login Attempts */}
          <div>
            <h4 className="font-medium text-foreground mb-3">Login Attempts</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-secondary rounded-lg">
                <p className="text-2xl font-bold text-foreground">{securityData.loginAttempts.total}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
              </div>
              <div className="text-center p-3 bg-success/10 rounded-lg">
                <p className="text-2xl font-bold text-success">{securityData.loginAttempts.successful}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Successful</p>
              </div>
              <div className="text-center p-3 bg-destructive/10 rounded-lg">
                <p className="text-2xl font-bold text-destructive">{securityData.loginAttempts.failed}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Failed</p>
              </div>
            </div>
          </div>

          {/* IP Addresses */}
          <div>
            <h4 className="font-medium text-foreground mb-3">IP Addresses</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {securityData.ipAddresses.map((ip, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded">
                  <span className="font-mono text-sm text-foreground">{ip.ip}</span>
                  <div className="text-xs text-muted-foreground">
                    Used {ip.usageCount} times • Last: {new Date(ip.lastUsed).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <h4 className="font-medium text-foreground mb-3">Locations</h4>
            <div className="flex flex-wrap gap-2">
              {securityData.locations.map((location, index) => (
                <div key={index} className="flex items-center space-x-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs">
                  <MapPin className="h-3 w-3" />
                  <span>{location}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Login Attempts */}
          <div>
            <h4 className="font-medium text-foreground mb-3">Recent Login Attempts</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {securityData.loginAttempts.recent.map((attempt, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded">
                  <div className="flex items-center space-x-2">
                    {attempt.success ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm text-foreground">
                      {attempt.success ? 'Successful login' : 'Failed login'}
                    </span>
                    {attempt.ip_address && (
                      <span className="font-mono text-xs text-muted-foreground">
                        from {attempt.ip_address}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(attempt.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Activity</p>
                <p className="text-sm text-foreground">
                  {securityData.activity.lastActivity 
                    ? new Date(securityData.activity.lastActivity).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">First Seen</p>
                <p className="text-sm text-foreground">
                  {securityData.activity.firstSeen 
                    ? new Date(securityData.activity.firstSeen).toLocaleDateString()
                    : 'N/A'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Activities</p>
                <p className="text-sm text-foreground">{securityData.activity.totalActivities}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h4 className="text-lg font-medium text-foreground mb-2">No Security Data</h4>
          <p className="text-sm text-muted-foreground">Security information is not available for this user.</p>
        </div>
      )}
    </div>
  )
}
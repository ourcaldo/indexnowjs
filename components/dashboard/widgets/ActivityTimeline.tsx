import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Globe, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  ExternalLink
} from 'lucide-react'

export interface ActivityItem {
  id: string
  type: 'keyword_added' | 'rank_improved' | 'rank_declined' | 'domain_added' | 'indexing_request' | 'target_achieved'
  title: string
  description?: string
  timestamp: string
  metadata?: {
    keyword?: string
    domain?: string
    position?: number
    previousPosition?: number
    url?: string
  }
}

export type ActivityType = ActivityItem['type']

interface ActivityTimelineProps {
  activities: ActivityItem[]
  title?: string
  description?: string
  maxItems?: number
  showViewAll?: boolean
  showUpdateBadge?: boolean
  onViewAll?: () => void
  className?: string
}

export const ActivityTimeline = ({ 
  activities, 
  title = "Recent Activity", 
  description = "Latest updates and changes",
  maxItems = 5,
  showViewAll = true,
  showUpdateBadge = true,
  onViewAll,
  className = '' 
}: ActivityTimelineProps) => {
  
  const displayActivities = activities.slice(0, maxItems)
  
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'keyword_added':
        return <Plus className="w-4 h-4" />
      case 'rank_improved':
        return <TrendingUp className="w-4 h-4" />
      case 'rank_declined':
        return <TrendingDown className="w-4 h-4" />
      case 'domain_added':
        return <Globe className="w-4 h-4" />
      case 'indexing_request':
        return <Zap className="w-4 h-4" />
      case 'target_achieved':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'keyword_added':
        return 'text-[hsl(var(--info-foreground))] bg-[hsl(var(--info)/0.1)]'
      case 'rank_improved':
        return 'text-[hsl(var(--success-foreground))] bg-[hsl(var(--success)/0.1)]'
      case 'rank_declined':
        return 'text-[hsl(var(--error-foreground))] bg-[hsl(var(--error)/0.1)]'
      case 'domain_added':
        return 'text-[hsl(var(--accent-foreground))] bg-[hsl(var(--accent)/0.1)]'
      case 'indexing_request':
        return 'text-[hsl(var(--warning-foreground))] bg-[hsl(var(--warning)/0.1)]'
      case 'target_achieved':
        return 'text-[hsl(var(--success-foreground))] bg-[hsl(var(--success)/0.1)]'
      default:
        return 'text-muted-foreground bg-muted'
    }
  }

  const getActivityBadge = (type: ActivityType) => {
    switch (type) {
      case 'keyword_added':
        return { variant: 'secondary' as const, label: 'New Keyword' }
      case 'rank_improved':
        return { variant: 'default' as const, label: 'Improved', className: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]' }
      case 'rank_declined':
        return { variant: 'destructive' as const, label: 'Declined' }
      case 'domain_added':
        return { variant: 'secondary' as const, label: 'New Domain' }
      case 'indexing_request':
        return { variant: 'outline' as const, label: 'Indexed' }
      case 'target_achieved':
        return { variant: 'default' as const, label: 'Target Hit', className: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]' }
      default:
        return { variant: 'outline' as const, label: 'Update' }
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    
    // Guard against invalid dates
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    // Guard against negative time differences (future dates)
    if (diffInHours < 0) {
      return 'Just now'
    }
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return diffInMinutes <= 0 ? 'Just now' : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          {showUpdateBadge && (
            <Badge variant="outline" className="flex items-center space-x-1 w-fit">
              <Clock className="w-3 h-3" />
              <span>{activities.length} updates</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayActivities.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayActivities.map((activity, index) => {
              const badge = getActivityBadge(activity.type)
              const colorClass = getActivityColor(activity.type)
              
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  {/* Timeline Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {activity.title}
                      </h4>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    
                    {activity.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.description}
                      </p>
                    )}
                    
                    {/* Metadata Display */}
                    {activity.metadata && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {activity.metadata.keyword && (
                          <span className="flex items-center space-x-1">
                            <Search className="w-3 h-3" />
                            <span className="truncate max-w-32">{activity.metadata.keyword}</span>
                          </span>
                        )}
                        {activity.metadata.domain && (
                          <span className="flex items-center space-x-1">
                            <Globe className="w-3 h-3" />
                            <span className="truncate max-w-32">{activity.metadata.domain}</span>
                          </span>
                        )}
                        {activity.metadata.position && (
                          <span className="font-medium">
                            #{activity.metadata.position}
                            {activity.metadata.previousPosition && (
                              <span className="text-muted-foreground">
                                {' '}(was #{activity.metadata.previousPosition})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* View All Button */}
        {showViewAll && activities.length > maxItems && (
          <div className="mt-6 text-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewAll}
              className="flex items-center space-x-2"
            >
              <span>View All Activity</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
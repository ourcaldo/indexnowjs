import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

export interface UsageData {
  date: string
  usage: number
  limit: number
}

interface UsageChartProps {
  data: UsageData[]
  title?: string
  description?: string
  className?: string
}

export const UsageChart = ({ 
  data, 
  title = "Daily Usage", 
  description = "Track your daily API usage and quota",
  className = '' 
}: UsageChartProps) => {
  // Guard against empty data
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No usage data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate usage statistics
  const totalUsage = data.reduce((sum, item) => sum + item.usage, 0)
  const averageUsage = data.length > 0 ? Math.round(totalUsage / data.length) : 0
  const currentLimit = data.length > 0 ? data[data.length - 1]?.limit || 0 : 0
  const usagePercentage = currentLimit > 0 ? Math.round((totalUsage / (currentLimit * data.length)) * 100) : 0
  
  // Calculate trend (compare first half vs second half)
  const midPoint = Math.floor(data.length / 2)
  const firstHalf = data.slice(0, midPoint)
  const secondHalf = data.slice(midPoint)
  const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, item) => sum + item.usage, 0) / firstHalf.length : 0
  const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, item) => sum + item.usage, 0) / secondHalf.length : 0
  const trendDirection = secondHalfAvg > firstHalfAvg ? 'up' : 'down'
  const trendPercentage = firstHalfAvg > 0 ? Math.abs(Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)) : 0

  // Generate simple bar chart data
  const maxUsage = Math.max(...data.map(item => Math.max(item.usage, item.limit)))
  
  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Activity className="w-3 h-3" />
              <span>{averageUsage}/day avg</span>
            </Badge>
            <Badge 
              variant={trendDirection === 'up' ? 'default' : 'secondary'}
              className={`flex items-center space-x-1 ${
                trendDirection === 'up' ? 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]' : 'bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))]'
              }`}
            >
              {trendDirection === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{trendPercentage}%</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{totalUsage}</div>
            <div className="text-xs text-muted-foreground">Total Usage</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{currentLimit}</div>
            <div className="text-xs text-muted-foreground">Daily Limit</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              usagePercentage > 80 ? 'text-[hsl(var(--error))]' : 
              usagePercentage > 60 ? 'text-[hsl(var(--warning))]' : 
              'text-[hsl(var(--success))]'
            }`}>
              {usagePercentage}%
            </div>
            <div className="text-xs text-muted-foreground">Avg Usage</div>
          </div>
        </div>

        {/* Simple Bar Chart */}
        <div className="space-y-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Last {data.length} days</span>
            <span>Usage vs Limit</span>
          </div>
          <div className="flex items-end space-x-1 h-24">
            {data.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col justify-end items-center space-y-1">
                {/* Limit bar (background) */}
                <div className="w-full bg-muted rounded-t-sm relative" style={{ height: '100%' }}>
                  {/* Usage bar (foreground) */}
                  <div 
                    className={`w-full rounded-t-sm ${
                      item.usage > item.limit * 0.8 ? 'bg-[hsl(var(--error))]' : 
                      item.usage > item.limit * 0.6 ? 'bg-[hsl(var(--warning))]' : 
                      'bg-[hsl(var(--success))]'
                    }`}
                    style={{ 
                      height: maxUsage > 0 ? `${(item.usage / maxUsage) * 100}%` : '0%'
                    }}
                  />
                  {/* Limit indicator line */}
                  {item.limit > 0 && (
                    <div 
                      className="absolute w-full border-t-2 border-border"
                      style={{ 
                        bottom: maxUsage > 0 ? `${((maxUsage - item.limit) / maxUsage) * 100}%` : '100%'
                      }}
                    />
                  )}
                </div>
                {/* Date label */}
                <div className="text-xs text-muted-foreground transform -rotate-45 origin-center mt-2">
                  {(() => {
                    const date = new Date(item.date)
                    return isNaN(date.getTime()) ? 'Invalid' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  })()}
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-[hsl(var(--success))] rounded"></div>
              <span>Usage</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 border-t-2 border-border"></div>
              <span>Limit</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
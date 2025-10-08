import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react'

export interface UsageDataPoint {
  date: string
  keywords_checked: number
  api_calls: number
  quota_used: number
}

interface UsageChartProps {
  data: UsageDataPoint[]
  currentQuota: number
  totalQuota: number
  title?: string
  description?: string
  className?: string
}

export const UsageChart = ({ 
  data, 
  currentQuota, 
  totalQuota,
  title = "Daily Usage Trends", 
  description = "Keyword checks and API usage patterns",
  className = '' 
}: UsageChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Generate sample data for empty state
      const now = new Date()
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now)
        date.setDate(date.getDate() - (6 - i))
        return {
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          value: Math.random() * 100,
          quota: Math.random() * 50
        }
      })
    }
    
    return data.slice(-7).map(point => ({
      date: new Date(point.date).toLocaleDateString('en-US', { weekday: 'short' }),
      value: point.keywords_checked,
      quota: point.quota_used
    }))
  }, [data])

  const quotaPercentage = totalQuota > 0 ? Math.round((currentQuota / totalQuota) * 100) : 0
  const maxValue = Math.max(...chartData.map(d => d.value))
  
  const trend = useMemo(() => {
    if (chartData.length < 2) return null
    const recent = chartData[chartData.length - 1].value
    const previous = chartData[chartData.length - 2].value
    const change = recent - previous
    const percentChange = previous > 0 ? Math.abs((change / previous) * 100) : 0
    
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      value: Math.abs(change),
      percentage: Math.round(percentChange * 10) / 10
    }
  }, [chartData])

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          {trend && (
            <Badge 
              variant={trend.direction === 'up' ? 'default' : trend.direction === 'down' ? 'destructive' : 'secondary'}
              className="flex items-center gap-1"
            >
              {trend.direction === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : trend.direction === 'down' ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Activity className="w-3 h-3" />
              )}
              {trend.percentage}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Quota Usage Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Quota Usage</span>
              <div className="flex items-center gap-2">
                {quotaPercentage > 80 && <AlertCircle className="w-4 h-4 text-destructive" />}
                <span className="text-sm font-mono text-muted-foreground">
                  {currentQuota.toLocaleString()} / {totalQuota.toLocaleString()}
                </span>
              </div>
            </div>
            <Progress 
              value={quotaPercentage} 
              className="h-2"
              // Add color indicator based on usage level
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{quotaPercentage}% used</span>
              <span className={quotaPercentage > 80 ? 'text-destructive font-medium' : ''}>
                {quotaPercentage > 90 ? 'Critical' : quotaPercentage > 80 ? 'Warning' : 'Good'}
              </span>
            </div>
          </div>

          {/* Usage Chart */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">7-Day Activity</h4>
            <div className="flex items-end justify-between h-24 gap-2 relative">
              {chartData.map((point, index) => (
                <div 
                  key={index} 
                  className="flex flex-col items-center flex-1 min-w-0 relative"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="relative w-full max-w-6 bg-muted rounded-sm overflow-hidden cursor-pointer" style={{ height: '60px' }}>
                    <div 
                      className={`absolute bottom-0 w-full bg-primary rounded-sm transition-all duration-300 ${
                        hoveredIndex === index ? 'bg-primary/80 shadow-lg' : ''
                      }`}
                      style={{ 
                        height: maxValue > 0 ? `${(point.value / maxValue) * 100}%` : '0%' 
                      }}
                    />
                    <div 
                      className={`absolute bottom-0 w-full bg-accent/50 rounded-sm transition-all duration-300 ${
                        hoveredIndex === index ? 'bg-accent/70' : ''
                      }`}
                      style={{ 
                        height: maxValue > 0 ? `${(point.quota / maxValue) * 100}%` : '0%' 
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 truncate">{point.date}</span>
                  
                  {/* Tooltip */}
                  {hoveredIndex === index && (
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-popover border border-border rounded-md px-3 py-2 shadow-md z-10 whitespace-nowrap">
                      <div className="text-sm font-medium text-popover-foreground">{point.date}</div>
                      <div className="text-xs text-muted-foreground">Keywords: {point.value}</div>
                      <div className="text-xs text-muted-foreground">Quota: {point.quota}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary rounded-sm" />
                <span>Keywords</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-accent/50 rounded-sm" />
                <span>Quota</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
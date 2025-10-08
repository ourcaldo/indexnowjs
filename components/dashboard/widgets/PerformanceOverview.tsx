import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Target, Search, Zap, Globe } from 'lucide-react'

export interface PerformanceMetric {
  label: string
  current: number
  previous?: number
  target?: number
  unit?: string
  format?: 'number' | 'percentage' | 'position'
}

interface PerformanceOverviewProps {
  metrics: PerformanceMetric[]
  title?: string
  description?: string
  className?: string
}

export const PerformanceOverview = ({ 
  metrics, 
  title = "Performance Overview", 
  description = "Key metrics and trends",
  className = '' 
}: PerformanceOverviewProps) => {
  // Guard against empty data
  if (!metrics || metrics.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No performance metrics available</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  type FormatType = 'number' | 'percentage' | 'position'
  
  const formatValue = (value: number, format?: FormatType, unit?: string) => {
    let formatted = ''
    
    switch (format) {
      case 'percentage':
        formatted = `${value}%`
        break
      case 'position':
        formatted = `#${value}`
        break
      default:
        formatted = value.toLocaleString()
    }
    
    return unit ? `${formatted} ${unit}` : formatted
  }

  const calculateTrend = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null
    
    const change = current - previous
    const percentChange = Math.abs((change / previous) * 100)
    
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      value: change,
      percentage: Math.round(percentChange * 10) / 10
    }
  }

  const getProgressValue = (current: number, target?: number) => {
    if (!target) return 0
    return Math.min((current / target) * 100, 100)
  }

  const getMetricIcon = (label: string) => {
    const lowerLabel = label.toLowerCase()
    if (lowerLabel.includes('position') || lowerLabel.includes('rank')) {
      return <Target className="w-4 h-4" />
    }
    if (lowerLabel.includes('keyword') || lowerLabel.includes('search')) {
      return <Search className="w-4 h-4" />
    }
    if (lowerLabel.includes('domain') || lowerLabel.includes('site')) {
      return <Globe className="w-4 h-4" />
    }
    return <Zap className="w-4 h-4" />
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <Badge variant="outline" className="flex items-center space-x-1 w-fit">
            <TrendingUp className="w-3 h-3" />
            <span>{metrics.length} metrics</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {metrics.map((metric, index) => {
            const trend = calculateTrend(metric.current, metric.previous)
            const progressValue = getProgressValue(metric.current, metric.target)
            
            return (
              <div key={index} className="space-y-3">
                {/* Metric Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                  <div className="flex items-center space-x-2">
                    <div className="text-accent">
                      {getMetricIcon(metric.label)}
                    </div>
                    <span className="text-sm font-medium text-foreground">{metric.label}</span>
                  </div>
                  
                  {/* Trend Badge */}
                  {trend && (
                    <Badge 
                      variant="outline" 
                      className={`flex items-center space-x-1 text-xs w-fit ${
                        trend.direction === 'up' ? 'border-[hsl(var(--success)/0.2)] bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success-foreground))]' :
                        trend.direction === 'down' ? 'border-[hsl(var(--error)/0.2)] bg-[hsl(var(--error)/0.1)] text-[hsl(var(--error-foreground))]' :
                        'border-muted bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {trend.direction === 'up' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : trend.direction === 'down' ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : null}
                      <span>{trend.percentage}%</span>
                    </Badge>
                  )}
                </div>

                {/* Current Value */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                  <div className="text-2xl font-bold text-foreground">
                    {formatValue(metric.current, metric.format, metric.unit)}
                  </div>
                  {metric.previous && (
                    <div className="text-sm text-muted-foreground">
                      vs {formatValue(metric.previous, metric.format, metric.unit)}
                    </div>
                  )}
                </div>

                {/* Progress to Target */}
                {metric.target && (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs space-y-1 sm:space-y-0">
                      <span className="text-muted-foreground">Progress to target</span>
                      <span className="text-muted-foreground">
                        {formatValue(metric.target, metric.format, metric.unit)}
                      </span>
                    </div>
                    <Progress 
                      value={progressValue} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {Math.round(progressValue)}% complete
                    </div>
                  </div>
                )}

                {/* Separator for all but last item */}
                {index < metrics.length - 1 && (
                  <div className="border-b border-border"></div>
                )}
              </div>
            )
          })}
        </div>

        {/* Overall Summary */}
        {metrics.length > 1 && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <TrendingUp className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">Performance Summary</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const improvingMetrics = metrics.filter(m => {
                      const trend = calculateTrend(m.current, m.previous)
                      return trend && trend.direction === 'up'
                    }).length
                    
                    const decliningMetrics = metrics.filter(m => {
                      const trend = calculateTrend(m.current, m.previous)
                      return trend && trend.direction === 'down'
                    }).length

                    if (improvingMetrics > decliningMetrics) {
                      return `${improvingMetrics} metrics trending upward - Great progress!`
                    } else if (decliningMetrics > improvingMetrics) {
                      return `${decliningMetrics} metrics need attention - Consider optimization strategies.`
                    } else {
                      return "Performance is stable across key metrics."
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
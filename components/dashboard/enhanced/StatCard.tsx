import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export type StatCardVariant = 'primary' | 'success' | 'warning' | 'info' | 'error'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  variant?: StatCardVariant
  description?: string
  className?: string
  showTrend?: boolean
}

export const StatCard = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  variant = 'primary',
  description,
  className = '',
  showTrend = true
}: StatCardProps) => {
  
  const getTrendIcon = () => {
    if (!change || change === 0) return <Minus className="w-3 h-3" />
    return change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
  }

  const getTrendColor = () => {
    if (!change || change === 0) return 'text-muted-foreground'
    return change > 0 ? 'text-success' : 'text-destructive'
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-success/20 border-success/30 backdrop-blur-sm'
      case 'warning':
        return 'bg-warning/20 border-warning/30 backdrop-blur-sm'
      case 'info':
        return 'bg-info/20 border-info/30 backdrop-blur-sm'
      case 'error':
        return 'bg-destructive/20 border-destructive/30 backdrop-blur-sm'
      default:
        return 'bg-primary/20 border-primary/30 backdrop-blur-sm'
    }
  }

  const getIconColor = () => {
    switch (variant) {
      case 'success':
        return 'text-success'
      case 'warning':
        return 'text-warning'
      case 'info':
        return 'text-info'
      case 'error':
        return 'text-destructive'
      default:
        return 'text-primary'
    }
  }

  return (
    <Card className={`${getVariantClasses()} ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-foreground">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {showTrend && change !== undefined && (
                <Badge variant="outline" className={`flex items-center gap-1 ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span className="text-xs">
                    {Math.abs(change)}{changeLabel || ''}
                  </span>
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-2">
                {description}
              </p>
            )}
          </div>
          {icon && (
            <div className={`flex-shrink-0 ml-4 ${getIconColor()}`}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
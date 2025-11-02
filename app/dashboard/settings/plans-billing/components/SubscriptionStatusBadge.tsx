'use client'

import { Badge } from '@/components/ui/badge'
import { AlertCircle, Check, Clock, Pause, XCircle } from 'lucide-react'

interface SubscriptionStatusBadgeProps {
  status: string
  cancelAtPeriodEnd?: boolean
  periodEnd?: string | null
  className?: string
}

export function SubscriptionStatusBadge({
  status,
  cancelAtPeriodEnd = false,
  periodEnd,
  className = ''
}: SubscriptionStatusBadgeProps) {
  const getStatusConfig = () => {
    if (status === 'active' && cancelAtPeriodEnd) {
      const formattedDate = periodEnd ? new Date(periodEnd).toLocaleDateString() : ''
      return {
        icon: <Clock className="h-3 w-3" />,
        text: `Cancels on ${formattedDate}`,
        bgColor: 'bg-warning/10',
        textColor: 'text-warning',
        borderColor: 'border-warning/20'
      }
    }

    switch (status.toLowerCase()) {
      case 'active':
        return {
          icon: <Check className="h-3 w-3" />,
          text: 'Active',
          bgColor: 'bg-success/10',
          textColor: 'text-success',
          borderColor: 'border-success/20'
        }
      case 'past_due':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Past Due',
          bgColor: 'bg-destructive/10',
          textColor: 'text-destructive',
          borderColor: 'border-destructive/20'
        }
      case 'paused':
        return {
          icon: <Pause className="h-3 w-3" />,
          text: 'Paused',
          bgColor: 'bg-muted',
          textColor: 'text-muted-foreground',
          borderColor: 'border-border'
        }
      case 'canceled':
      case 'cancelled':
        return {
          icon: <XCircle className="h-3 w-3" />,
          text: 'Canceled',
          bgColor: 'bg-muted',
          textColor: 'text-muted-foreground',
          borderColor: 'border-border'
        }
      default:
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: status,
          bgColor: 'bg-muted',
          textColor: 'text-muted-foreground',
          borderColor: 'border-border'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge 
      className={`inline-flex items-center gap-1.5 ${config.bgColor} ${config.textColor} ${config.borderColor} border ${className}`}
      data-testid={`badge-subscription-status-${status}`}
    >
      {config.icon}
      <span className="text-xs font-medium">{config.text}</span>
    </Badge>
  )
}

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default'

interface StatusBadgeProps {
  status: StatusVariant
  children: React.ReactNode
  className?: string
}

const statusVariants = {
  success: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]',
  warning: 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]',
  error: 'bg-[hsl(var(--error))] text-[hsl(var(--error-foreground))]',
  info: 'bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))]',
  default: 'bg-muted text-muted-foreground'
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <Badge 
      className={cn(
        'text-xs font-medium px-2 py-1',
        statusVariants[status],
        className
      )}
      data-testid={`status-${status}`}
    >
      {children}
    </Badge>
  )
}
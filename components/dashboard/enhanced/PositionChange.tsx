import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PositionChangeProps {
  change: number | null
  className?: string
}

export const PositionChange = ({ change, className = '' }: PositionChangeProps) => {
  if (change === null) return <span className={`text-muted-foreground ${className}`}>-</span>
  
  if (change > 0) {
    return (
      <span className={`inline-flex items-center text-success ${className}`}>
        <TrendingUp className="w-4 h-4 mr-1" />
        +{change}
      </span>
    )
  } else if (change < 0) {
    return (
      <span className={`inline-flex items-center text-destructive ${className}`}>
        <TrendingDown className="w-4 h-4 mr-1" />
        {change}
      </span>
    )
  } else {
    return (
      <span className={`inline-flex items-center text-muted-foreground ${className}`}>
        <Minus className="w-4 h-4 mr-1" />
        0
      </span>
    )
  }
}
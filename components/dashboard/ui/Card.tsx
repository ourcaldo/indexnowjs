import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export const Card = ({ children, className }: CardProps) => (
  <div 
    className={cn(
      'p-6 rounded-lg bg-background border border-border',
      className
    )}
  >
    {children}
  </div>
)
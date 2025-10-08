import React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string
  className?: string
}

export const Input = ({ placeholder, className, value, onChange, ...props }: InputProps) => (
  <input
    className={cn(
      'flex h-10 w-full rounded-md px-3 py-2 text-sm bg-background border border-border text-brand-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    {...props}
  />
)
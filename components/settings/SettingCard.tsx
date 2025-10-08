import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SettingCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function SettingCard({ title, description, children, className = '' }: SettingCardProps) {
  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg text-foreground">{title}</CardTitle>
        {description && (
          <CardDescription className="text-muted-foreground">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}
import React from 'react'
import { Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, Button } from '@/components/dashboard/ui'

interface NoDomainStateProps {
  title?: string
  description?: string
  buttonText?: string
  redirectRoute?: string
  className?: string
}

export const NoDomainState = ({
  title = "No Domains Added",
  description = "Add your first domain to start tracking keywords and monitoring your search rankings.",
  buttonText = "Add Your First Domain", 
  redirectRoute = "/dashboard/indexnow/add",
  className = ""
}: NoDomainStateProps) => {
  const router = useRouter()

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="text-center py-12">
        <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2 text-foreground">
          {title}
        </h3>
        <p className="text-muted-foreground mb-6">
          {description}
        </p>
        <Button onClick={() => router.push(redirectRoute)}>
          {buttonText}
        </Button>
      </div>
    </Card>
  )
}
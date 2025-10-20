'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RANK_TRACKING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { apiRequest } from '@/lib/core/queryClient'
import { useApiError } from '@/hooks/useApiError'
import { 
  Plus, 
  Globe, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Domain {
  id: string
  domain_name: string
  display_name?: string
}

interface DomainSelectionStepProps {
  domains: Domain[]
  selectedDomain: string
  onDomainSelect: (domainId: string) => void
  onNext: () => void
}

export function DomainSelectionStep({
  domains,
  selectedDomain,
  onDomainSelect,
  onNext
}: DomainSelectionStepProps) {
  const queryClient = useQueryClient()
  const { handleApiError } = useApiError()
  const [newDomainName, setNewDomainName] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Create domain mutation
  const createDomainMutation = useMutation({
    mutationFn: async (domainData: { domain_name: string; display_name?: string }) => {
      return await apiRequest(RANK_TRACKING_ENDPOINTS.DOMAINS, {
        method: 'POST',
        body: JSON.stringify(domainData)
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [RANK_TRACKING_ENDPOINTS.DOMAINS] })
      onDomainSelect(data.id)
      setNewDomainName('')
      setErrors({ ...errors, domain: '' })
    },
    onError: handleApiError
  })

  const handleCreateDomain = () => {
    if (!newDomainName.trim()) {
      setErrors({ ...errors, domain: 'Domain name is required' })
      return
    }

    createDomainMutation.mutate({
      domain_name: newDomainName.trim(),
      display_name: newDomainName.trim()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2 text-foreground">
          Select or Add Domain
        </h2>
        <p className="text-muted-foreground">
          Choose an existing domain or add a new one to track keywords for.
        </p>
      </div>

      {/* Existing Domains */}
      {domains.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">Existing Domains</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedDomain === domain.id 
                    ? 'ring-2 bg-primary/10 border-primary ring-primary' 
                    : 'bg-background border-border hover:border-primary/50'
                }`}
                onClick={() => onDomainSelect(domain.id)}
                data-testid={`card-domain-${domain.id}`}
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {domain.display_name || domain.domain_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {domain.domain_name}
                    </div>
                  </div>
                  {selectedDomain === domain.id && (
                    <CheckCircle2 className="w-5 h-5 ml-auto text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Domain */}
      <div className={`space-y-4 ${domains.length > 0 ? 'border-t border-border pt-6' : ''}`}>
        <h3 className="font-medium text-foreground">Add New Domain</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="example.com"
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateDomain()}
              data-testid="input-new-domain"
            />
          </div>
          <Button 
            onClick={handleCreateDomain} 
            disabled={!newDomainName.trim() || createDomainMutation.isPending}
            data-testid="button-add-domain"
          >
            {createDomainMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Domain
          </Button>
        </div>
        {errors.domain && (
          <div className="flex items-center gap-2 text-sm text-destructive" data-testid="error-domain">
            <AlertCircle className="w-4 h-4" />
            {errors.domain}
          </div>
        )}
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button 
          onClick={onNext} 
          disabled={!selectedDomain}
          data-testid="button-continue-keywords"
        >
          Continue to Keywords
        </Button>
      </div>
    </div>
  )
}

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
  Loader2,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  const [showAddDomain, setShowAddDomain] = useState(false)
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
      setShowAddDomain(false)
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
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-1 text-foreground">
          Select or Add Domain
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose an existing domain or add a new one to track keywords for.
        </p>
      </div>

      {/* Domain Selector Dropdown */}
      {domains.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="domain-select" className="text-sm">Domain</Label>
          <Select value={selectedDomain} onValueChange={onDomainSelect}>
            <SelectTrigger 
              id="domain-select"
              className="w-full"
              data-testid="select-domain"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Select a domain" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {domains.map((domain) => (
                <SelectItem 
                  key={domain.id} 
                  value={domain.id}
                  data-testid={`option-domain-${domain.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {domain.display_name || domain.domain_name}
                    </span>
                    {domain.display_name && domain.display_name !== domain.domain_name && (
                      <span className="text-xs text-muted-foreground">
                        ({domain.domain_name})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Add New Domain Toggle */}
      {!showAddDomain ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddDomain(true)}
          className="w-full"
          data-testid="button-toggle-add-domain"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Domain
        </Button>
      ) : (
        <div className="space-y-3 p-3 rounded-lg border border-border bg-secondary/30">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Add New Domain</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddDomain(false)
                setNewDomainName('')
                setErrors({ ...errors, domain: '' })
              }}
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              data-testid="button-cancel-add-domain"
            >
              Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="example.com"
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateDomain()}
              className="flex-1"
              data-testid="input-new-domain"
            />
            <Button 
              onClick={handleCreateDomain} 
              disabled={!newDomainName.trim() || createDomainMutation.isPending}
              size="sm"
              data-testid="button-add-domain"
            >
              {createDomainMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>
          {errors.domain && (
            <div className="flex items-center gap-2 text-xs text-destructive" data-testid="error-domain">
              <AlertCircle className="w-3 h-3" />
              {errors.domain}
            </div>
          )}
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-end pt-2">
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

'use client'

import React from 'react'
import { Globe, Plus, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Domain {
  id: string
  domain_name: string
  display_name?: string
}

interface SharedDomainSelectorProps {
  domains: Domain[]
  selectedDomainId: string | null
  selectedDomainInfo: Domain | undefined
  isOpen: boolean
  onToggle: () => void
  onDomainSelect: (id: string) => void
  getDomainKeywordCount?: (domainId: string) => number
  showKeywordCount?: boolean
  className?: string
  addDomainRoute?: string
  placeholder?: string
}

export const SharedDomainSelector = ({
  domains,
  selectedDomainId,
  selectedDomainInfo,
  isOpen,
  onToggle,
  onDomainSelect,
  getDomainKeywordCount,
  showKeywordCount = true,
  className = '',
  addDomainRoute = '/dashboard/indexnow/add',
  placeholder = 'Select Domain'
}: SharedDomainSelectorProps) => {
  const router = useRouter()

  const handleDomainSelect = (domainId: string) => {
    onDomainSelect(domainId)
    onToggle() // Close dropdown
  }

  const handleAddDomain = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(addDomainRoute)
    onToggle() // Close dropdown
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div 
        className="bg-background rounded-lg border border-border cursor-pointer px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200 min-w-[280px] max-w-[320px]"
        onClick={onToggle}
        data-testid="domain-selector-trigger"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              {selectedDomainInfo ? (selectedDomainInfo.display_name || selectedDomainInfo.domain_name) : placeholder}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedDomainInfo && showKeywordCount && getDomainKeywordCount && (
              <>
                <span className="text-xs text-muted-foreground">Keywords</span>
                <span className="font-bold text-sm text-foreground">
                  {getDomainKeywordCount(selectedDomainInfo.id)}
                </span>
              </>
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>
      
      {/* Domain Selection Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-lg border border-border shadow-lg z-50 max-h-60 overflow-y-auto"
             data-testid="domain-selector-dropdown">
          <div className="p-2">
            {domains.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No domains available
              </div>
            ) : (
              <div className="space-y-1">
                {domains.map((domain) => (
                  <div 
                    key={domain.id} 
                    className={`flex items-center justify-between py-2 px-3 text-sm rounded-lg cursor-pointer transition-colors duration-150 ${
                      selectedDomainId === domain.id 
                        ? 'bg-accent/10 text-foreground' 
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDomainSelect(domain.id)
                    }}
                    data-testid={`domain-option-${domain.id}`}
                  >
                    <span className="font-medium truncate flex-1">
                      {domain.display_name || domain.domain_name}
                    </span>
                    {showKeywordCount && getDomainKeywordCount && (
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-muted-foreground">Keywords</span>
                        <span className={`font-bold px-2 py-1 rounded text-xs ${
                          selectedDomainId === domain.id
                            ? 'bg-accent/20 text-foreground'
                            : 'bg-muted text-foreground'
                        }`}>
                          {getDomainKeywordCount(domain.id)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Add Domain Button */}
            <div className="pt-2 border-t border-border mt-2">
              <button 
                className="w-full text-sm px-3 py-2 rounded-lg hover:bg-muted/50 flex items-center gap-2 text-muted-foreground transition-colors duration-150"
                onClick={handleAddDomain}
                data-testid="button-add-domain"
              >
                <Plus className="w-4 h-4" />
                Add New Domain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
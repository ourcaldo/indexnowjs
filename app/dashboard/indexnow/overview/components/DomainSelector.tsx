import React from 'react'
import { Globe, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Domain {
  id: string
  domain_name: string
  display_name?: string
}

interface DomainSelectorProps {
  domains: Domain[]
  selectedDomainId: string | null
  selectedDomainInfo: Domain | undefined
  showDomainsManager: boolean
  setShowDomainsManager: (show: boolean) => void
  setSelectedDomainId: (id: string) => void
  getDomainKeywordCount: (domainId: string) => number
}

export const DomainSelector = ({
  domains,
  selectedDomainId,
  selectedDomainInfo,
  showDomainsManager,
  setShowDomainsManager,
  setSelectedDomainId,
  getDomainKeywordCount
}: DomainSelectorProps) => {
  const router = useRouter()

  return (
    <div className="inline-block">
      <div 
        className="bg-background rounded-lg border cursor-pointer px-3 py-2 shadow-sm hover:shadow-md transition-shadow min-w-[280px] max-w-[320px] border-border"
        onClick={() => setShowDomainsManager(!showDomainsManager)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {selectedDomainInfo ? (selectedDomainInfo.display_name || selectedDomainInfo.domain_name) : 'Select Domain'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedDomainInfo && (
              <>
                <span className="text-xs text-muted-foreground">Keywords</span>
                <span className="font-bold text-sm text-foreground">
                  {getDomainKeywordCount(selectedDomainInfo.id)}
                </span>
              </>
            )}
          </div>
        </div>
        
        {/* Domain Selection List */}
        {showDomainsManager && (
          <div className="border-t mt-2 pt-2 border-border">
            <div className="space-y-1">
              {domains.map((domain) => (
                <div 
                  key={domain.id} 
                  className={`flex items-center justify-between py-1 px-2 text-xs rounded cursor-pointer hover:bg-secondary ${
                    selectedDomainId === domain.id ? 'bg-info/10 border border-info/20' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedDomainId(domain.id)
                    setShowDomainsManager(false)
                  }}
                >
                  <span className="font-medium truncate text-foreground">
                    {domain.display_name || domain.domain_name}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-muted-foreground">Keywords</span>
                    <span className="font-bold px-1 py-0.5 rounded text-xs text-foreground bg-secondary">
                      {getDomainKeywordCount(domain.id)}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Add Domain Button */}
              <div className="pt-1 border-t border-border">
                <button 
                  className="text-xs px-2 py-1 rounded hover:bg-secondary flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push('/dashboard/indexnow/add')
                  }}
                >
                  <Plus className="w-3 h-3" />
                  Add Domain
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
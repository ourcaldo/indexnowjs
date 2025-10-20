'use client'

import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { SharedDomainSelector } from '@/components/shared/DomainSelector'
import { useSiteName, useSiteLogo } from '@/hooks/use-site-settings'

interface DashboardHeaderProps {
  domains: any[]
  selectedDomainId: string | null
  selectedDomainInfo: any
  isDomainSelectorOpen: boolean
  onDomainSelectorToggle: () => void
  onDomainSelect: (id: string) => void
  getDomainKeywordCount?: (domainId: string) => number
  onToggleSidebar: () => void
}

export default function DashboardHeader({
  domains,
  selectedDomainId,
  selectedDomainInfo,
  isDomainSelectorOpen,
  onDomainSelectorToggle,
  onDomainSelect,
  getDomainKeywordCount,
  onToggleSidebar
}: DashboardHeaderProps) {
  const router = useRouter()
  const siteName = useSiteName()
  const iconUrl = useSiteLogo(false)

  const handleAddKeywords = () => {
    router.push('/dashboard/indexnow/add')
  }

  return (
    <>
      {/* Desktop header (hidden on mobile) */}
      <div className="hidden lg:flex bg-background border-b border-border px-6 py-3 items-center justify-between">
        {/* Left side: Domain Selector */}
        <div className="flex-1">
          {domains.length > 0 && (
            <SharedDomainSelector
              domains={domains}
              selectedDomainId={selectedDomainId}
              selectedDomainInfo={selectedDomainInfo}
              isOpen={isDomainSelectorOpen}
              onToggle={onDomainSelectorToggle}
              onDomainSelect={onDomainSelect}
              getDomainKeywordCount={getDomainKeywordCount}
              showKeywordCount={true}
              className="w-[320px]"
              addDomainRoute="/dashboard/indexnow/add"
              placeholder="Select domain"
            />
          )}
        </div>
        
        {/* Right side: Notif/indexnow/rank-historyication + Add Keywords Button */}
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 rounded-lg transition-colors duration-150 bg-secondary text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="Notifications"
            data-testid="button-notifications-desktop"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button
            onClick={handleAddKeywords}
            className="inline-flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-150 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            aria-label="Add Keywords"
            data-testid="button-add-keywords-header-desktop"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Keywords
          </button>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {iconUrl && (
            <img 
              src={iconUrl} 
              alt="Icon"
              className="w-6 h-6 rounded flex-shrink-0"
            />
          )}
          <h1 className="text-lg font-semibold text-foreground truncate">{siteName}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 rounded-lg transition-colors duration-150 bg-secondary text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="Notifications"
            data-testid="button-notifications-mobile"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button
            onClick={handleAddKeywords}
            className="p-2 rounded-lg transition-colors duration-150 bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label="Add Keywords"
            data-testid="button-add-keywords-header"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-150 flex-shrink-0"
            aria-label="Mobile Menu"
            data-testid="button-toggle-sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}

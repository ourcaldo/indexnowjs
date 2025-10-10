'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'
import { useDashboardData } from '@/hooks/useDashboardData'
import { usePageViewLogger } from '@/hooks/useActivityLogger'
import { RANK_TRACKING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { Card, Button } from '@/components/dashboard/ui'
import { FilterPanel } from './components'
import { SharedDomainSelector } from '@/components/shared/DomainSelector'
import { NoDomainState } from '@/components/shared/NoDomainState'
import { DeviceCountryFilter } from '@/components/shared/DeviceCountryFilter'

export default function IndexNowOverview() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDevice, setSelectedDevice] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showDomainsManager, setShowDomainsManager] = useState(false)
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null)
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)

  usePageViewLogger('/dashboard/indexnow/overview', 'Keywords Overview', { section: 'keyword_tracker' })

  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData()

  const { data: countriesData } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.COUNTRIES],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(RANK_TRACKING_ENDPOINTS.COUNTRIES, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch countries')
      const result = await response.json()
      if (result.success === true && result.data) {
        return result.data
      }
      return result
    }
  })

  const { data: keywordCountsData } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.KEYWORDS + '-counts'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${RANK_TRACKING_ENDPOINTS.KEYWORDS}?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch keyword counts')
      const result = await response.json()
      if (result.success === true && result.data) {
        return result.data
      }
      return result
    }
  })

  const domains = dashboardData?.rankTracking?.domains || []
  const countries = countriesData?.data?.data || []
  const allKeywords = keywordCountsData?.data || []

  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId(domains[0].id)
    }
  }, [domains, selectedDomainId])

  const selectedDomainInfo = domains.find((d: any) => d.id === selectedDomainId)

  const getDomainKeywordCount = (domainId: string) => {
    return allKeywords.filter((k: any) => k.domain_id === domainId).length
  }

  return (
    <div className="space-y-6">
      {dashboardLoading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </Card>
      ) : domains.length === 0 ? (
        <NoDomainState />
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <SharedDomainSelector
              domains={domains}
              selectedDomainId={selectedDomainId}
              selectedDomainInfo={selectedDomainInfo}
              isOpen={showDomainsManager}
              onToggle={() => setShowDomainsManager(!showDomainsManager)}
              onDomainSelect={setSelectedDomainId}
              getDomainKeywordCount={getDomainKeywordCount}
              showKeywordCount={true}
              addDomainRoute="/dashboard/indexnow/add"
              placeholder="Select Domain"
            />

            <div className="flex items-center gap-3">
              <DeviceCountryFilter
                selectedDevice={selectedDevice}
                selectedCountry={selectedCountry}
                countries={countries}
                onDeviceChange={setSelectedDevice}
                onCountryChange={setSelectedCountry}
              />
              
              <Button
                onClick={() => router.push('/dashboard/indexnow/add')}
                className="btn-hover whitespace-nowrap"
                data-testid="button-add-keywords"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Keywords
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          <FilterPanel
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            selectedKeywords={selectedKeywords}
            setShowActionsMenu={setShowActionsMenu}
            setShowDeleteConfirm={setShowDeleteConfirm}
            setShowTagModal={setShowTagModal}
            showActionsMenu={showActionsMenu}
          />
        </>
      )}
    </div>
  )
}

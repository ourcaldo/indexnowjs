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
import { RankOverviewStats, FilterPanel } from './components'
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
  // Fix: The API returns { success: true, data: { data: [...] } }, so we need data.data
  const countries = countriesData?.data?.data || []
  const allKeywords = keywordCountsData?.data || []
  
  // Log to debug countries issue
  console.log('Countries API Response:', countriesData)
  console.log('Extracted countries:', countries)

  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId(domains[0].id)
    }
  }, [domains, selectedDomainId])

  const selectedDomainInfo = domains.find((d: any) => d.id === selectedDomainId)

  const getDomainKeywordCount = (domainId: string) => {
    return allKeywords.filter((k: any) => k.domain_id === domainId).length
  }

  // Fetch ALL keywords for the selected domain for statistics calculation
  const { data: allDomainKeywordsData } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.KEYWORDS + '-stats', {
      domain_id: selectedDomainId,
      device_type: selectedDevice || undefined,
      country_id: selectedCountry || undefined
    }],
    queryFn: async () => {
      if (!selectedDomainId) return { data: [], pagination: { page: 1, total: 0, total_pages: 1 } }
      
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams()
      params.append('domain_id', selectedDomainId)
      
      if (selectedDevice) params.append('device_type', selectedDevice)
      if (selectedCountry) params.append('country_id', selectedCountry)
      
      params.append('limit', '100')
      
      const response = await fetch(`${RANK_TRACKING_ENDPOINTS.KEYWORDS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch domain keywords for stats')
      const result = await response.json()
      if (result.success === true && result.data) {
        return result.data
      }
      return result
    },
    enabled: !!selectedDomainId
  })

  const statsKeywords = allDomainKeywordsData?.data || []
  const pagination = allDomainKeywordsData?.pagination || { page: 1, total: 0, total_pages: 1 }

  // Stats calculation
  const totalKeywords = typeof pagination?.total === 'number' ? pagination.total : 0
  const avgPosition = statsKeywords.length > 0 
    ? Math.round(statsKeywords.reduce((sum: number, k: any) => sum + (k.current_position || 100), 0) / statsKeywords.length) 
    : 0
  const topTenCount = statsKeywords.filter((k: any) => k.current_position && k.current_position <= 10).length
  const improvingCount = statsKeywords.filter((k: any) => k.position_1d && k.position_1d > 0).length

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

          {/* Statistics Overview */}
          <RankOverviewStats
            totalKeywords={totalKeywords}
            avgPosition={avgPosition}
            topTenCount={topTenCount}
            improvingCount={improvingCount}
          />

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

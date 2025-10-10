'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'
import { useDashboardData } from '@/hooks/useDashboardData'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { RANK_TRACKING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { Card, Button } from '@/components/dashboard/ui'
import { 
  RankOverviewStats, 
  FilterPanel, 
  KeywordTable, 
  BulkActions, 
  Pagination 
} from './components'
import { SharedDomainSelector } from '@/components/shared/DomainSelector'
import { NoDomainState } from '@/components/shared/NoDomainState'
import { DeviceCountryFilter } from '@/components/shared/DeviceCountryFilter'

export default function IndexNowOverview() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [selectedDevice, setSelectedDevice] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [showDomainsManager, setShowDomainsManager] = useState(false)
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null)
  
  // New state for multiselect functionality
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingTag, setIsAddingTag] = useState(false)

  // Activity logging
  usePageViewLogger('/dashboard/indexnow/overview', 'Keywords Overview', { section: 'keyword_tracker' })
  const { logActivity } = useActivityLogger()

  // Use merged dashboard API for better performance and to prevent loading glitches
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData()

  // Fetch countries
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
      // Handle new API response format: { success: true, data: {...} }
      if (result.success === true && result.data) {
        return result.data
      }
      return result
    }
  })

  // Fetch keywords with filters (for display)
  const { data: keywordsData, isLoading: keywordsLoading, refetch: refetchKeywords } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.KEYWORDS, {
      domain_id: selectedDomainId || selectedDomain || undefined,
      device_type: selectedDevice || undefined,
      country_id: selectedCountry || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      page: currentPage,
      limit: 100
    }],
    queryFn: async () => {
      const params = new URLSearchParams()
      const domainFilter = selectedDomainId || selectedDomain
      if (domainFilter) params.append('domain_id', domainFilter)
      if (selectedDevice) params.append('device_type', selectedDevice)
      if (selectedCountry) params.append('country_id', selectedCountry)
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','))
      params.append('page', currentPage.toString())
      params.append('limit', '100')

      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${RANK_TRACKING_ENDPOINTS.KEYWORDS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch keywords')
      const result = await response.json()
      // Handle new API response format: { success: true, data: { data: [...], pagination: {...} } }
      if (result.success === true && result.data) {
        return result.data
      }
      return result
    }
  })

  // Fetch total keyword counts for each domain - using smaller limit to avoid 400 errors
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
      // Handle new API response format: { success: true, data: { data: [...], pagination: {...} } }
      if (result.success === true && result.data) {
        return result.data
      }
      return result
    }
  })

  // Fetch ALL keywords for the selected domain for statistics calculation - FILTERED by device/country
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
      
      // Apply same filters as main keyword query for consistent stats
      if (selectedDevice) params.append('device_type', selectedDevice)
      if (selectedCountry) params.append('country_id', selectedCountry)
      
      params.append('limit', '100') // Use smaller limit to avoid 400 errors
      
      const response = await fetch(`${RANK_TRACKING_ENDPOINTS.KEYWORDS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch domain keywords for stats')
      const result = await response.json()
      // Handle new API response format: { success: true, data: { data: [...], pagination: {...} } }
      if (result.success === true && result.data) {
        return result.data
      }
      return result
    },
    enabled: !!selectedDomainId
  })

  const domains = dashboardData?.rankTracking?.domains || []
  const countries = countriesData?.data?.data || []
  
  // Extract keywords array - API returns { data: { data: [...], pagination: {...} } }
  // After unwrapping in query, we get { data: [...], pagination: {...} }
  // So we need to access .data to get the actual array
  const keywords = Array.isArray(keywordsData?.data) ? keywordsData.data : []
  const allKeywords = Array.isArray(keywordCountsData?.data) ? keywordCountsData.data : []
  const statsKeywords = Array.isArray(allDomainKeywordsData?.data) ? allDomainKeywordsData.data : []
  
  // Additional safety checks for domains
  const safeDomains = Array.isArray(domains) ? domains : []

  // Set default selected domain if none selected
  useEffect(() => {
    if (!selectedDomainId && safeDomains.length > 0) {
      setSelectedDomainId(safeDomains[0].id)
    }
  }, [safeDomains, selectedDomainId])

  // Clear selected keywords when domain changes
  useEffect(() => {
    setSelectedKeywords([])
  }, [selectedDomainId])

  // Functions for multiselect and bulk actions
  const handleKeywordSelect = (keywordId: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keywordId) 
        ? prev.filter(id => id !== keywordId)
        : [...prev, keywordId]
    )
  }

  const handleSelectAll = () => {
    if (selectedKeywords.length === filteredKeywords.length) {
      setSelectedKeywords([])
    } else {
      setSelectedKeywords(filteredKeywords.map((k: any) => k.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedKeywords.length === 0) return
    
    setIsDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(RANK_TRACKING_ENDPOINTS.BULK_DELETE_KEYWORDS, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keywordIds: selectedKeywords })
      })

      if (response.ok) {
        // Log activity
        await logActivity({
          eventType: 'keyword_bulk_delete',
          actionDescription: `Bulk deleted ${selectedKeywords.length} keywords from ${selectedDomainInfo?.domain_name || 'domain'}`,
          metadata: {
            keywordCount: selectedKeywords.length,
            domainId: selectedDomainId,
            domainName: selectedDomainInfo?.domain_name
          }
        })

        setSelectedKeywords([])
        refetchKeywords()
        setShowDeleteConfirm(false)
      }
    } catch (error) {
      console.error('Failed to delete keywords:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddTag = async () => {
    if (selectedKeywords.length === 0 || !newTag.trim()) return
    
    setIsAddingTag(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(RANK_TRACKING_ENDPOINTS.ADD_KEYWORD_TAG, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          keywordIds: selectedKeywords,
          tag: newTag.trim()
        })
      })

      if (response.ok) {
        // Log activity
        await logActivity({
          eventType: 'keyword_tag_add',
          actionDescription: `Added tag "${newTag.trim()}" to ${selectedKeywords.length} keywords`,
          metadata: {
            tag: newTag.trim(),
            keywordCount: selectedKeywords.length,
            domainId: selectedDomainId,
            domainName: selectedDomainInfo?.domain_name
          }
        })

        setSelectedKeywords([])
        setNewTag('')
        refetchKeywords()
        setShowTagModal(false)
      }
    } catch (error) {
      console.error('Failed to add tag:', error)
    } finally {
      setIsAddingTag(false)
    }
  }

  // Get selected domain info
  const selectedDomainInfo = safeDomains.find((d: any) => d.id === selectedDomainId)

  // Get keyword count for each domain
  const getDomainKeywordCount = (domainId: string) => {
    return allKeywords.filter((k: any) => k.domain_id === domainId).length
  }
  // Fix: Extract pagination from the new API response format (after unwrapping)
  const pagination = keywordsData?.pagination || { page: 1, total: 0, total_pages: 1 }

  // Filter keywords by search term
  const filteredKeywords = keywords.filter((keyword: any) =>
    keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats calculation using ALL keywords for the domain (not affected by pagination)
  // Defensive: Ensure totalKeywords is always a number, never undefined/null
  const totalKeywords = typeof pagination?.total === 'number' ? pagination.total : 0
  const avgPosition = statsKeywords.length > 0 
    ? Math.round(statsKeywords.reduce((sum: number, k: any) => sum + (k.current_position || 100), 0) / statsKeywords.length) 
    : 0
  const topTenCount = statsKeywords.filter((k: any) => k.current_position && k.current_position <= 10).length
  const improvingCount = statsKeywords.filter((k: any) => k.position_1d && k.position_1d > 0).length // Positive means improved position

  return (
    <div className="space-y-6">
      {/* Check if user has domains */}
      {dashboardLoading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </Card>
      ) : safeDomains.length === 0 ? (
        <NoDomainState />
      ) : (
        <>
          {/* Domain Section and Add Keyword Button - Same Row */}
          <div className="flex items-center justify-between mb-6">
            <SharedDomainSelector
              domains={safeDomains}
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

            {/* Device and Country Filters + Add Keyword Button */}
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
            selectedTags={selectedTags}
            availableTags={[]}
            onSearchChange={setSearchTerm}
            onTagsChange={setSelectedTags}
          />

          {/* Bulk Actions Bar */}
          {selectedKeywords.length > 0 && (
            <BulkActions
              selectedCount={selectedKeywords.length}
              onDelete={() => setShowDeleteConfirm(true)}
              onAddTag={() => setShowTagModal(true)}
              onCancelSelection={() => setSelectedKeywords([])}
              showDeleteConfirm={showDeleteConfirm}
              onConfirmDelete={handleBulkDelete}
              onCancelDelete={() => setShowDeleteConfirm(false)}
              isDeleting={isDeleting}
              showTagModal={showTagModal}
              newTag={newTag}
              onTagChange={setNewTag}
              onSubmitTag={handleAddTag}
              onCancelTag={() => { setShowTagModal(false); setNewTag('') }}
              isAddingTag={isAddingTag}
            />
          )}

          {/* Keywords Table */}
          <KeywordTable
            keywords={filteredKeywords}
            loading={keywordsLoading}
            selectedKeywords={selectedKeywords}
            onKeywordSelect={handleKeywordSelect}
            onSelectAll={handleSelectAll}
            refetchKeywords={refetchKeywords}
          />

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.total_pages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  )
}

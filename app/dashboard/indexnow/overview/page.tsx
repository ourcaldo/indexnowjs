'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'
import { useDomain } from '@/lib/contexts/DomainContext'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { RANK_TRACKING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { Card, Button } from '@/components/dashboard/ui'
import { 
  RankOverviewStats, 
  FilterPanel, 
  BulkActions, 
  KeywordTable, 
  Pagination 
} from './components'
import { SharedDomainSelector } from '@/components/shared/DomainSelector'
import { NoDomainState } from '@/components/shared/NoDomainState'
import { DeviceCountryFilter } from '@/components/shared/DeviceCountryFilter'
import { RankingDistribution } from '@/components/dashboard/enhanced'

export default function IndexNowOverview() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDevice, setSelectedDevice] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showDomainsManager, setShowDomainsManager] = useState(false)
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  usePageViewLogger('/dashboard/indexnow/overview', 'Keywords Overview', { section: 'keyword_tracker' })
  const { logActivity } = useActivityLogger()

  // Use domain context instead of local state
  const {
    domains,
    selectedDomainId,
    selectedDomainInfo,
    setSelectedDomainId,
    getDomainKeywordCount,
    isDomainSelectorOpen: showDomainsManagerContext,
    setIsDomainSelectorOpen: setShowDomainsManagerContext
  } = useDomain()

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

  // Fix: API returns { success: true, data: { data: [...] } }, but query already unwraps to { data: [...] }
  const countries = countriesData?.data || []

  // Clear selected keywords when domain changes
  useEffect(() => {
    setSelectedKeywords([])
  }, [selectedDomainId])

  // Fetch keywords with filters (for display)
  const { data: keywordsData, isLoading: keywordsLoading, refetch: refetchKeywords } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.KEYWORDS, {
      domain_id: selectedDomainId || undefined,
      device_type: selectedDevice || undefined,
      country_id: selectedCountry || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      page: currentPage,
      limit: 100
    }],
    queryFn: async () => {
      const params = new URLSearchParams()
      const domainFilter = selectedDomainId
      if (domainFilter) params.append('domain_id', domainFilter)
      if (selectedDevice && selectedDevice !== '__placeholder__') params.append('device_type', selectedDevice)
      if (selectedCountry && selectedCountry !== '__placeholder__') params.append('country_id', selectedCountry)
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
      if (result.success === true && result.data) {
        return result.data
      }
      return result
    }
  })

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
      
      if (selectedDevice && selectedDevice !== '__placeholder__') params.append('device_type', selectedDevice)
      if (selectedCountry && selectedCountry !== '__placeholder__') params.append('country_id', selectedCountry)
      
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
  const statsPagination = allDomainKeywordsData?.pagination || { page: 1, total: 0, total_pages: 1 }
  
  const keywords = keywordsData?.data || []
  const pagination = keywordsData?.pagination || { page: 1, total: 0, total_pages: 1 }

  // Filter keywords by search term
  const filteredKeywords = keywords.filter((keyword: any) =>
    keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats calculation - filter out null positions for accurate calculations
  const keywordsWithPosition = statsKeywords.filter((k: any) => k.current_position !== null && k.current_position !== undefined)
  
  const totalKeywords = typeof statsPagination?.total === 'number' ? statsPagination.total : 0
  const avgPosition = keywordsWithPosition.length > 0 
    ? Math.round(keywordsWithPosition.reduce((sum: number, k: any) => sum + k.current_position, 0) / keywordsWithPosition.length) 
    : 0
  const topTenCount = keywordsWithPosition.filter((k: any) => k.current_position <= 10).length
  const improvingCount = keywordsWithPosition.filter((k: any) => k.position_1d && k.position_1d > 0).length

  // Calculate position distribution for RankingDistribution chart
  const rankingDistribution = useMemo(() => {
    if (keywordsWithPosition.length === 0) {
      return { total: 0, topTen: 0, topTwenty: 0, topFifty: 0, beyond: 0 }
    }

    const topTen = keywordsWithPosition.filter((k: any) => k.current_position <= 10).length
    const topTwenty = keywordsWithPosition.filter((k: any) => k.current_position <= 20).length
    const topFifty = keywordsWithPosition.filter((k: any) => k.current_position <= 50).length
    const beyond = keywordsWithPosition.filter((k: any) => k.current_position > 50).length

    return {
      total: keywordsWithPosition.length,
      topTen,
      topTwenty,
      topFifty,
      beyond
    }
  }, [keywordsWithPosition])

  // Bulk action handlers
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

  return (
    <div className="space-y-6">
      {domains.length === 0 ? (
        <NoDomainState />
      ) : (
        <>
          {/* Device/Country Filter - Full width on all devices */}
          <div className="w-full mb-6">
            <DeviceCountryFilter
              selectedDevice={selectedDevice}
              selectedCountry={selectedCountry}
              countries={countries}
              onDeviceChange={setSelectedDevice}
              onCountryChange={setSelectedCountry}
              className="w-full"
            />
          </div>

          {/* Statistics Overview */}
          <RankOverviewStats
            totalKeywords={totalKeywords}
            avgPosition={avgPosition}
            topTenCount={topTenCount}
            improvingCount={improvingCount}
          />

          {/* Ranking Distribution Chart */}
          <RankingDistribution 
            data={rankingDistribution}
            title="Position Distribution"
            description={`Ranking breakdown for ${selectedDomainInfo?.display_name || selectedDomainInfo?.domain_name || 'domain'}`}
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

          {/* Bulk Actions Modals */}
          {selectedKeywords.length > 0 && (
            <BulkActions
              showDeleteConfirm={showDeleteConfirm}
              setShowDeleteConfirm={setShowDeleteConfirm}
              showTagModal={showTagModal}
              setShowTagModal={setShowTagModal}
              selectedKeywords={selectedKeywords}
              isDeleting={isDeleting}
              handleBulkDelete={handleBulkDelete}
              isAddingTag={isAddingTag}
              newTag={newTag}
              setNewTag={setNewTag}
              handleAddTag={handleAddTag}
            />
          )}

          {/* Keywords Table */}
          <KeywordTable
            keywords={keywords}
            filteredKeywords={filteredKeywords}
            selectedKeywords={selectedKeywords}
            handleKeywordSelect={handleKeywordSelect}
            handleSelectAll={handleSelectAll}
            searchTerm={searchTerm}
            keywordsLoading={keywordsLoading}
          />

          {/* Pagination */}
          <Pagination
            pagination={pagination}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </>
      )}
    </div>
  )
}

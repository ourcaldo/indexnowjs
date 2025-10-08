'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'
import { usePageViewLogger } from '@/hooks/useActivityLogger'
import { useDashboardData } from '@/hooks/useDashboardData'
import { RANK_TRACKING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { NoDomainState } from '@/components/shared/NoDomainState'
import { SharedDomainSelector } from '@/components/shared/DomainSelector'
import { DeviceCountryFilter } from '@/components/shared/DeviceCountryFilter'
import { RankOverviewStats } from '@/app/dashboard/indexnow/overview/components/RankOverviewStats'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Calendar, 
  Search,
  ChevronLeft,
  ChevronRight,
  Globe,
  Tag,
  X,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Info
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DateRangeCalendar } from './components/DateRangeCalendar'
import { BulkActionsBar } from './components/BulkActionsBar'


interface Domain {
  id: string
  domain_name: string
  display_name: string
}

interface RankHistoryData {
  keyword_id: string
  keyword: string
  device_type: string
  tags: string[]
  domain: Domain
  country: any
  history: { [date: string]: { position: number | null, url: string | null } }
}

// Helper to format date in local timezone
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get comparison periods based on selected date range
const getComparisonPeriods = (dateRangeType: string) => {
  const today = new Date()
  const todayStr = formatLocalDate(today)

  let comparisonDate: string
  let periodLabel: string

  switch (dateRangeType) {
    case '7d':
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(today.getDate() - 7)
      comparisonDate = formatLocalDate(sevenDaysAgo)
      periodLabel = '7 days ago'
      break
    case '30d':
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 30)
      comparisonDate = formatLocalDate(thirtyDaysAgo)
      periodLabel = '30 days ago'
      break
    case '60d':
      const sixtyDaysAgo = new Date(today)
      sixtyDaysAgo.setDate(today.getDate() - 60)
      comparisonDate = formatLocalDate(sixtyDaysAgo)
      periodLabel = '60 days ago'
      break
    default:
      const defaultSevenDaysAgo = new Date(today)
      defaultSevenDaysAgo.setDate(today.getDate() - 7)
      comparisonDate = formatLocalDate(defaultSevenDaysAgo)
      periodLabel = '7 days ago'
  }

  return { todayStr, comparisonDate, periodLabel }
}

// Calculate position change
const calculatePositionChange = (currentPos: number | null, previousPos: number | null): number | null => {
  if (!currentPos || !previousPos) return null
  return previousPos - currentPos // Positive means improvement (moved up)
}

// Get position change indicator
const getPositionChangeDisplay = (change: number | null) => {
  if (change === null || change === 0) {
    return { icon: Minus, color: 'text-muted-foreground', text: '—' }
  }

  if (change > 0) {
    return { icon: TrendingUp, color: 'text-success', text: `+${change}` }
  } else {
    return { icon: TrendingDown, color: 'text-destructive', text: `${change}` }
  }
}

// Format date for display (e.g., "Sep 13")
const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function RankHistoryPage() {
  const router = useRouter()

  // Activity logging
  usePageViewLogger('/dashboard/indexnow/rank-history', 'Rank History', { section: 'keyword_tracker' })

  // State for domain management
  const [selectedDomainId, setSelectedDomainId] = useState<string>('')
  const [showDomainsManager, setShowDomainsManager] = useState(false)

  // State for filters
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showTagsDropdown, setShowTagsDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // State for keyword selection (checkboxes)
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])

  // State for bulk actions
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'positions'>('all')

  // State for date range and pagination
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '60d' | 'custom'>('7d')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [appliedCustomDates, setAppliedCustomDates] = useState<{start: string, end: string} | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 20

  // Calculate actual date range based on selection
  const getDateRange = () => {
    const today = new Date()
    let startDate: string
    let endDate: string = formatLocalDate(today)

    if (dateRange === 'custom' && appliedCustomDates) {
      startDate = appliedCustomDates.start
      endDate = appliedCustomDates.end
    } else {
      let daysBack: number
      switch (dateRange) {
        case '7d':
          daysBack = 6 // 7 days including today
          break
        case '30d':
          daysBack = 29 // 30 days including today
          break
        case '60d':
          daysBack = 59 // 60 days including today
          break
        default:
          daysBack = 6
      }

      // Calculate start date in local timezone
      const startDateTime = new Date(today)
      startDateTime.setDate(today.getDate() - daysBack)
      startDate = formatLocalDate(startDateTime)
    }

    return { startDate, endDate }
  }

  const { startDate, endDate } = getDateRange()

  const handleKeywordSelect = (keywordId: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keywordId) 
        ? prev.filter(id => id !== keywordId)
        : [...prev, keywordId]
    )
  }

  // Reset selection when filters change
  useEffect(() => {
    setSelectedKeywords([])
  }, [selectedDomainId, selectedDevice, selectedCountry, selectedTags, searchQuery, dateRange])

  // Bulk action handlers
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
        credentials: 'include',
        body: JSON.stringify({ keywordIds: selectedKeywords })
      })

      if (response.ok) {
        setSelectedKeywords([])
        // Refresh data by re-fetching
        refetchKeywords()
        refetchRankHistory()
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
        setSelectedKeywords([])
        setNewTag('')
        // Refresh data by re-fetching
        refetchKeywords()
        refetchRankHistory()
        setShowTagModal(false)
      }
    } catch (error) {
      console.error('Failed to add tag:', error)
    } finally {
      setIsAddingTag(false)
    }
  }

  // Use merged dashboard API for better performance and to prevent loading glitches
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData()

  // Fetch domains with keyword counts (better than dashboard API for accurate counts)
  const { data: domainsWithCounts = [], isLoading: domainsLoading } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.DOMAINS],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(RANK_TRACKING_ENDPOINTS.DOMAINS, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch domains')
      const data = await response.json()
      return data.success ? data.data : []
    }
  })

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
      return response.json()
    }
  })

  // Fetch all keywords for domain (regardless of ranking data)
  const { data: keywordsData = [], isLoading: keywordsLoading, refetch: refetchKeywords } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.KEYWORDS, selectedDomainId, selectedDevice, selectedCountry],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams()
      if (selectedDomainId) params.append('domain_id', selectedDomainId)
      if (selectedDevice) params.append('device_type', selectedDevice)
      if (selectedCountry) params.append('country_id', selectedCountry)
      params.append('limit', '1000')

      const response = await fetch(`${RANK_TRACKING_ENDPOINTS.KEYWORDS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      const data = await response.json()
      return data.success ? data.data : []
    },
    enabled: !!selectedDomainId
  })

  // Fetch rank history data to merge with keywords
  const { data: rankHistoryData = [], isLoading: rankHistoryLoading, refetch: refetchRankHistory } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.RANK_HISTORY, selectedDomainId, selectedDevice, selectedCountry, startDate, endDate],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams()
      if (selectedDomainId) params.append('domain_id', selectedDomainId)
      if (selectedDevice) params.append('device_type', selectedDevice)
      if (selectedCountry) params.append('country_id', selectedCountry)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      params.append('limit', '1000')

      const response = await fetch(`${RANK_TRACKING_ENDPOINTS.RANK_HISTORY}?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      const data = await response.json()
      return data.success ? data.data : []
    },
    enabled: !!startDate && !!endDate && !!selectedDomainId
  })

  // Combine loading states
  const isLoading = keywordsLoading || rankHistoryLoading

  // Merge keywords with rank history data
  const rankHistory = useMemo(() => {
    if (!keywordsData || keywordsData.length === 0) return []

    // Create a map of rank history data by keyword_id
    const historyMap: { [keywordId: string]: any } = {}
    if (rankHistoryData && rankHistoryData.length > 0) {
      rankHistoryData.forEach((historyItem: any) => {
        historyMap[historyItem.keyword_id] = historyItem
      })
    }

    // Transform keywords to match expected format, merging with history data
    return keywordsData.map((keyword: any) => ({
      keyword_id: keyword.id,
      keyword: keyword.keyword,
      device_type: keyword.device_type,
      tags: keyword.tags || [],
      domain: keyword.domain,
      country: keyword.country,
      history: historyMap[keyword.id]?.history || {} // Empty history if no data
    }))
  }, [keywordsData, rankHistoryData])

  const domains = domainsWithCounts || []
  const countries = countriesData?.data || []

  // Set default selected domain
  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId(domains[0].id)
    }
  }, [domains, selectedDomainId])

  // Get selected domain info
  const selectedDomainInfo = domains.find((d: any) => d.id === selectedDomainId)

  // Get keyword count for each domain (now using domains API with keyword counts)
  const getDomainKeywordCount = (domainId: string) => {
    const domain = domains.find((d: any) => d.id === domainId)
    // Supabase returns count as [{ count: number }] array structure
    return domain?.keyword_count?.[0]?.count || 0
  }

  // Get comparison date strings for calculations (needed before sorting)
  const { todayStr: currentDateStr, comparisonDate: prevDateStr, periodLabel } = getComparisonPeriods(dateRange)

  // Filter and search logic
  const filteredData = rankHistory.filter((item: RankHistoryData) => {
    // Search filter
    if (searchQuery && !item.keyword.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Tags filter
    if (selectedTags.length > 0) {
      const hasMatchingTag = selectedTags.some(tag => 
        item.tags?.some(itemTag => itemTag.toLowerCase().includes(tag.toLowerCase()))
      )
      if (!hasMatchingTag) return false
    }

    return true
  })

  // Apply active filter sorting/filtering
  const sortedAndFilteredData = (() => {
    let data = [...filteredData]

    switch (activeFilter) {
      case 'positions':
        // Sort by current position (ascending - best positions first, position 1 at top)
        return data.sort((a, b) => {
          const posA = a.history[currentDateStr]?.position || 999
          const posB = b.history[currentDateStr]?.position || 999
          return posA - posB
        })
      case 'all':
      default:
        // Default view - no sorting applied, keep original order
        return data
    }
  })()

  // Checkbox selection handlers
  const handleSelectAll = () => {
    if (selectedKeywords.length === sortedAndFilteredData.length) {
      setSelectedKeywords([])
    } else {
      setSelectedKeywords(sortedAndFilteredData.map((item: RankHistoryData) => item.keyword_id))
    }
  }

  // Pagination logic
  const totalItems = sortedAndFilteredData.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = sortedAndFilteredData.slice(startIndex, endIndex)

  // Get unique tags for filter
  const availableTags = Array.from(new Set(
    rankHistory.flatMap((item: RankHistoryData) => item.tags || [])
  )).filter(Boolean) as string[]

  // Calculate stats for RankOverviewStats
  const statsData = {
    totalKeywords: filteredData.length,
    avgPosition: (() => {
      if (filteredData.length === 0) return 0
      const itemsWithPosition = filteredData.filter((item: RankHistoryData) => {
        return item.history[currentDateStr]?.position
      })
      if (itemsWithPosition.length === 0) return 0
      const totalPositions = filteredData.reduce((acc: number, item: RankHistoryData) => {
        const position = item.history[currentDateStr]?.position
        return position ? acc + position : acc
      }, 0)
      return Math.round(totalPositions / itemsWithPosition.length)
    })(),
    topTenCount: filteredData.filter((item: RankHistoryData) => {
      const position = item.history[currentDateStr]?.position
      return position && position <= 10
    }).length,
    improvingCount: filteredData.filter((item: RankHistoryData) => {
      const currentPos = item.history[currentDateStr]?.position
      const previousPos = item.history[prevDateStr]?.position
      return currentPos && previousPos && currentPos < previousPos
    }).length
  }

  return (
    <div className="space-y-6">
      {/* Check if user has domains */}
      {(dashboardLoading || domainsLoading) ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      ) : domains.length === 0 ? (
        <NoDomainState 
          title="No Domains Added"
          description="Add your first domain to start tracking keywords and view rank history."
          buttonText="Add Your First Domain"
          redirectRoute="/dashboard/indexnow/add"
        />
      ) : (
        <>
          {/* Domain Section and Add Keyword Button - Same Row */}
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
                  data-testid="rank-history-domain-selector"
                />

                {/* Device and Country Filters + Add Keyword Button */}
                <div className="flex items-center gap-3">
                  <DeviceCountryFilter
                    selectedDevice={selectedDevice}
                    selectedCountry={selectedCountry}
                    countries={countries}
                    onDeviceChange={setSelectedDevice}
                    onCountryChange={setSelectedCountry}
                    compact={true}
                  />

                  <Button 
                    onClick={() => router.push('/dashboard/indexnow/add')}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    data-testid="button-add-keyword"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Keyword
                  </Button>
                </div>
              </div>

              {/* Rank Overview Stats Widget - Always show when domain is selected */}
              {selectedDomainId && (
                <RankOverviewStats 
                  totalKeywords={statsData.totalKeywords}
                  avgPosition={statsData.avgPosition}
                  topTenCount={statsData.topTenCount}
                  improvingCount={statsData.improvingCount}
                />
              )}

              {/* Filters Section - Reordered: Search (60-70%) → Date → Tags */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search Bar - 60-70% width */}
                    <div className="flex-1 min-w-[250px] max-w-[60%]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search keywords..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 text-sm"
                          data-testid="input-search"
                        />
                      </div>
                    </div>

                    {/* Date Range Filter */}
                    <div className="flex items-center gap-2">
                      {/* Custom Date Range Picker - Semrush Style */}
                      <div className="relative">
                        <Button
                          size="sm"
                          variant={dateRange === 'custom' ? 'default' : 'outline'}
                          onClick={() => {
                            setDateRange('custom')
                            // Initialize custom dates with current preset values when opening picker
                            if (!showDatePicker && startDate && endDate) {
                              setCustomStartDate(startDate)
                              setCustomEndDate(endDate)
                            }
                            setShowDatePicker(!showDatePicker)
                          }}
                          className="flex items-center gap-1 hover:bg-slate-50 hover:text-foreground dark:hover:bg-slate-800 dark:hover:text-foreground transition-colors duration-150"
                          data-testid="filter-date-custom"
                        >
                          <Calendar className="w-3 h-3" />
                          {dateRange === 'custom' && appliedCustomDates 
                            ? `${new Date(appliedCustomDates.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(appliedCustomDates.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : dateRange !== 'custom'
                            ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : 'Custom'
                          }
                        </Button>

                        {showDatePicker && (
                          <div className="absolute top-full right-0 mt-1 bg-background border rounded-lg shadow-xl z-50 overflow-hidden">
                            <div className="flex">
                              {/* Calendar Section */}
                              <div className="p-4 border-r border-border">
                                <DateRangeCalendar
                                  selectedRange={{ start: customStartDate, end: customEndDate }}
                                  onRangeChange={(start, end) => {
                                    setCustomStartDate(start)
                                    setCustomEndDate(end)
                                  }}
                                />
                              </div>

                              
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 p-4 border-t border-border bg-background">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  setShowDatePicker(false)
                                  setCustomStartDate('')
                                  setCustomEndDate('')
                                }}
                                data-testid="button-date-reset"
                              >
                                Reset
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  if (customStartDate && customEndDate) {
                                    setAppliedCustomDates({ start: customStartDate, end: customEndDate })
                                  }
                                  setShowDatePicker(false)
                                }}
                                disabled={!customStartDate || !customEndDate}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                data-testid="button-date-apply"
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags Filter Icon */}
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                        className="flex items-center gap-1 min-w-[100px] justify-between"
                        data-testid="filter-tags-dropdown"
                      >
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>Tags {selectedTags.length > 0 && `(${selectedTags.length})`}</span>
                        </div>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>

                      {showTagsDropdown && (
                        <div className="absolute top-full right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 min-w-[200px] max-h-[200px] overflow-y-auto">
                          <div className="p-2">
                            {availableTags.length === 0 ? (
                              <div className="text-xs text-muted-foreground py-2">No tags available</div>
                            ) : (
                              availableTags.map((tag: string) => (
                                <label 
                                  key={tag} 
                                  className="flex items-center gap-2 py-1 px-2 text-xs hover:bg-accent cursor-pointer rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedTags.includes(tag)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedTags([...selectedTags, tag])
                                      } else {
                                        setSelectedTags(selectedTags.filter(t => t !== tag))
                                      }
                                    }}
                                    className="rounded border-input"
                                    data-testid={`tag-${tag}`}
                                  />
                                  <span className="text-foreground">{tag}</span>
                                </label>
                              ))
                            )}

                            {selectedTags.length > 0 && (
                              <div className="border-t pt-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedTags([])}
                                  className="text-xs w-full"
                                  data-testid="button-clear-tags"
                                >
                                  Clear All
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>



              {/* Bulk Actions Bar */}
              <BulkActionsBar
                selectedCount={selectedKeywords.length}
                onDeleteKeywords={() => setShowDeleteConfirm(true)}
                onAddTag={() => setShowTagModal(true)}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />

              {/* Rank History Table - Semrush Style Comparison */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-bold text-foreground" data-testid="title-rank-history">
                        Rank History
                      </CardTitle>
                      {/* Info icon with tooltip */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="inline-flex items-center justify-center rounded-full w-5 h-5 text-muted-foreground hover:text-foreground transition-colors">
                              <Info className="w-4 h-4" />
                              <span className="sr-only">Information about rank history</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="bottom" 
                            align="start"
                            className="max-w-sm p-3 text-sm bg-card border border-border text-foreground shadow-lg"
                          >
                            <p>This report shows keyword position comparison between today and {getComparisonPeriods(dateRange).periodLabel}, including position changes and trends for better performance tracking.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Count text inline with title */}
                      <div className="text-sm text-muted-foreground">
                        {startIndex + 1}-{Math.min(endIndex, totalItems)} ({totalItems})
                      </div>
                    </div>

                    {/* Filter buttons inline with title */}
                    <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg">
                      <Button
                        variant={activeFilter === 'positions' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveFilter('positions')}
                        data-testid="filter-positions"
                        className="text-xs h-8 px-3 hover:bg-slate-50 hover:text-foreground dark:hover:bg-slate-800 dark:hover:text-foreground transition-colors duration-150"
                      >
                        Positions
                      </Button>
                      <Button
                        variant={activeFilter === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveFilter('all')}
                        data-testid="filter-all"
                        className="text-xs h-8 px-3 hover:bg-slate-50 hover:text-foreground dark:hover:bg-slate-800 dark:hover:text-foreground transition-colors duration-150"
                      >
                        All for {selectedDomainInfo?.domain_name}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <div className="border-t border-border"></div>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Loading rank history...</p>
                    </div>
                  ) : paginatedData.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No rank history data found for the selected filters.</p>
                    </div>
                  ) : (
                    <>


                      <div className="overflow-x-auto">
                        <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-border">
                            <th className="text-center py-2 px-3 w-10 sticky left-0 bg-slate-50 hover:bg-slate-100 z-10 transition-colors duration-150">
                              <input
                                type="checkbox"
                                checked={selectedKeywords.length === filteredData.length && filteredData.length > 0}
                                onChange={handleSelectAll}
                                className="w-4 h-4 rounded border-input"
                                data-testid="checkbox-select-all"
                              />
                            </th>
                            <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sticky left-10 bg-slate-50 hover:bg-slate-100 z-10 transition-colors duration-150">
                              KEYWORD
                            </th>
                            <th className="text-center py-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground min-w-[80px] bg-slate-50 hover:bg-slate-100 transition-colors duration-150">
                              POS. {formatDateDisplay(getComparisonPeriods(dateRange).todayStr)}
                            </th>
                            <th className="text-center py-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground min-w-[80px] bg-slate-50 hover:bg-slate-100 transition-colors duration-150">
                              POS. {formatDateDisplay(getComparisonPeriods(dateRange).comparisonDate)}
                            </th>
                            <th className="text-center py-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground min-w-[80px] bg-slate-50 hover:bg-slate-100 transition-colors duration-150">
                              DIFF
                            </th>
                            <th className="text-center py-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground bg-slate-50 hover:bg-slate-100 transition-colors duration-150">
                              DEVICE
                            </th>
                            <th className="text-center py-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground bg-slate-50 hover:bg-slate-100 transition-colors duration-150">
                              TAGS
                            </th>
                            <th className="text-center py-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground bg-slate-50 hover:bg-slate-100 transition-colors duration-150">
                              COUNTRY
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-card">
                          {paginatedData.map((item: RankHistoryData) => {
                            const currentPosition = item.history[currentDateStr]?.position
                            const comparisonPosition = item.history[prevDateStr]?.position
                            const positionChange = calculatePositionChange(currentPosition, comparisonPosition)
                            const changeDisplay = getPositionChangeDisplay(positionChange)

                            return (
                              <tr key={item.keyword_id} className="border-b border-border hover:bg-slate-50 transition-colors duration-150 group" data-testid={`row-keyword-${item.keyword_id}`}>
                                <td className="text-center py-2 px-3 w-10 sticky left-0 bg-card group-hover:bg-slate-50 z-10 transition-colors duration-150">
                                  <input
                                    type="checkbox"
                                    checked={selectedKeywords.includes(item.keyword_id)}
                                    onChange={() => handleKeywordSelect(item.keyword_id)}
                                    className="w-4 h-4 rounded border-input"
                                    data-testid={`checkbox-keyword-${item.keyword_id}`}
                                  />
                                </td>
                                <td className="py-2 px-3 sticky left-10 bg-card group-hover:bg-slate-50 z-10 transition-colors duration-150">
                                  <div className="font-medium text-sm text-foreground max-w-[200px] truncate">
                                    {item.keyword}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-3" data-testid={`current-pos-${item.keyword_id}`}>
                                  {currentPosition ? (
                                    <span className="text-sm font-medium text-foreground">
                                      {currentPosition}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                  )}
                                </td>
                                <td className="text-center py-2 px-3" data-testid={`comparison-pos-${item.keyword_id}`}>
                                  {comparisonPosition ? (
                                    <span className="text-sm font-medium text-foreground">
                                      {comparisonPosition}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                  )}
                                </td>
                                <td className="text-center py-2 px-3" data-testid={`diff-${item.keyword_id}`}>
                                  <div className="flex items-center justify-center gap-1">
                                    <changeDisplay.icon className={`w-4 h-4 ${changeDisplay.color}`} />
                                    <span className={`text-sm font-medium ${changeDisplay.color}`}>
                                      {changeDisplay.text}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-center py-2 px-3">
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {item.device_type || 'Desktop'}
                                  </span>
                                </td>
                                <td className="text-center py-2 px-3">
                                  <div className="flex flex-wrap gap-1 justify-center max-w-[120px]">
                                    {item.tags && item.tags.length > 0 ? (
                                      item.tags.slice(0, 2).map((tag: string, idx: number) => (
                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
                                          {tag}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                    {item.tags && item.tags.length > 2 && (
                                      <span className="text-xs text-muted-foreground">+{item.tags.length - 2}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-3">
                                  <span className="text-xs text-muted-foreground">
                                    {item.country?.name || 'Global'}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Bottom Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      data-testid="button-pagination-prev"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                        return (
                          <Button
                            key={pageNum}
                            size="sm"
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            onClick={() => setCurrentPage(pageNum)}
                            data-testid={`button-page-${pageNum}`}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      data-testid="button-pagination-next"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Bulk Actions Modals */}
          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Delete Keywords
                </h3>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to delete {selectedKeywords.length} keyword{selectedKeywords.length > 1 ? 's' : ''}? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Add Tag Modal */}
          {showTagModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Add Tag
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add a tag to {selectedKeywords.length} keyword{selectedKeywords.length > 1 ? 's' : ''}:
                </p>
                <Input
                  placeholder="Enter tag name..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="mb-6"
                />
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTagModal(false)
                      setNewTag('')
                    }}
                    disabled={isAddingTag}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddTag}
                    disabled={isAddingTag || !newTag.trim()}
                  >
                    {isAddingTag ? 'Adding...' : 'Add Tag'}
                  </Button>
                </div>
              </div>
            </div>
          )}
    </div>
  )
}
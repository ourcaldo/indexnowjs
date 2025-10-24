import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, Minus, BarChart, Info } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'
import { RANK_TRACKING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface WeeklyTrendsData {
  weekNumber: number
  weekLabel: string
  startDate: string
  endDate: string
  totalKeywords: number
  improvement: number
  decline: number
  unchanged: number
  positionDistribution: {
    topThree: number
    topTen: number
    topTwenty: number
    topHundred: number
    outOfHundred: number
  }
}

interface WeeklyTrendsAnalyticsProps {
  domainId: string
  deviceType?: string
  countryId?: string
  className?: string
}

type PositionRangeFilter = 'topThree' | 'topTen' | 'topTwenty' | 'topHundred' | 'outOfHundred'

const POSITION_RANGE_OPTIONS = [
  { value: 'topThree' as PositionRangeFilter, label: '1-3', sublabel: 'Top 3', color: '#4BB543' },
  { value: 'topTen' as PositionRangeFilter, label: '4-10', sublabel: 'Top 10', color: '#3D8BFF' },
  { value: 'topTwenty' as PositionRangeFilter, label: '11-20', sublabel: 'Top 20', color: '#F0A202' },
  { value: 'topHundred' as PositionRangeFilter, label: '21-100', sublabel: 'Top 100', color: '#E63946' },
  { value: 'outOfHundred' as PositionRangeFilter, label: '100+', sublabel: 'Out of 100', color: '#6C757D' }
]

const WeeklyTrendsHeader = () => (
  <div className="flex items-center gap-2">
    <CardTitle className="text-base font-semibold text-foreground">Weekly Trends</CardTitle>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-4 h-4 text-muted-foreground cursor-help" data-testid="info-weekly-trends" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>Weekly Trends tracks how your keyword rankings change week-by-week, showing improvements, declines, and position distribution patterns over the current month.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
)

export const WeeklyTrendsAnalytics = ({ 
  domainId,
  deviceType,
  countryId,
  className = '' 
}: WeeklyTrendsAnalyticsProps) => {
  const [selectedRange, setSelectedRange] = useState<PositionRangeFilter>('topTen')

  const { data: weeklyTrendsData, isLoading } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.WEEKLY_TRENDS, { domain_id: domainId, device_type: deviceType, country_id: countryId }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('domain_id', domainId)
      if (deviceType && deviceType !== '__placeholder__') params.append('device_type', deviceType)
      if (countryId && countryId !== '__placeholder__') params.append('country_id', countryId)

      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${RANK_TRACKING_ENDPOINTS.WEEKLY_TRENDS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to fetch weekly trends')
      
      const result = await response.json()
      return result.success ? result.data : []
    },
    enabled: !!domainId
  })

  const weeklyTrends: WeeklyTrendsData[] = weeklyTrendsData || []

  const maxImprovement = useMemo(() => {
    if (!weeklyTrends.length) return 0
    return Math.max(...weeklyTrends.map(w => w.improvement))
  }, [weeklyTrends])

  const maxDecline = useMemo(() => {
    if (!weeklyTrends.length) return 0
    return Math.max(...weeklyTrends.map(w => w.decline))
  }, [weeklyTrends])

  const maxPositionCount = useMemo(() => {
    if (!weeklyTrends.length) return 0
    return Math.max(...weeklyTrends.map(w => {
      const dist = w.positionDistribution
      return Math.max(dist.topThree, dist.topTen, dist.topTwenty, dist.topHundred, dist.outOfHundred)
    }))
  }, [weeklyTrends])

  const selectedRangeInfo = POSITION_RANGE_OPTIONS.find(opt => opt.value === selectedRange)

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <WeeklyTrendsHeader />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading weekly trends...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!weeklyTrends.length) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <WeeklyTrendsHeader />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <BarChart className="w-12 h-12 text-muted-foreground mb-3" />
            <div className="text-muted-foreground">No weekly data available for this month</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <WeeklyTrendsHeader />
            <p className="text-sm text-muted-foreground mt-1">Performance tracking across weeks in current month</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Weekly Improvement Chart */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Improvement Trends</h4>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#4BB543' }}></div>
                  <span className="text-muted-foreground">Improved</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#E63946' }}></div>
                  <span className="text-muted-foreground">Declined</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {weeklyTrends.map((week, index) => {
                const improvementPercent = maxImprovement > 0 ? (week.improvement / maxImprovement) * 100 : 0
                const declinePercent = maxDecline > 0 ? (week.decline / maxDecline) * 100 : 0

                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-foreground">{week.weekLabel}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-success" />
                          {week.improvement}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingDown className="w-3 h-3 text-destructive" />
                          {week.decline}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-6">
                      <div 
                        className="bg-[#4BB543] rounded-sm transition-all duration-300 flex items-center justify-end px-2"
                        style={{ width: `${improvementPercent}%` }}
                        data-testid={`improvement-bar-week-${week.weekNumber}`}
                      >
                        {improvementPercent > 15 && (
                          <span className="text-[10px] font-medium text-white">{week.improvement}</span>
                        )}
                      </div>
                      <div 
                        className="bg-[#E63946] rounded-sm transition-all duration-300 flex items-center justify-start px-2"
                        style={{ width: `${declinePercent}%` }}
                        data-testid={`decline-bar-week-${week.weekNumber}`}
                      >
                        {declinePercent > 15 && (
                          <span className="text-[10px] font-medium text-white">{week.decline}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: Weekly Position Distribution Chart */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Position Distribution</h4>
              <div className="flex gap-1">
                {POSITION_RANGE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedRange === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRange(option.value)}
                    className="text-xs px-2 py-1 h-auto"
                    data-testid={`filter-${option.value}`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {weeklyTrends.map((week, index) => {
                const count = week.positionDistribution[selectedRange]
                const percentage = maxPositionCount > 0 ? (count / maxPositionCount) * 100 : 0

                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-foreground">{week.weekLabel}</span>
                      <span className="text-muted-foreground">{count} keywords</span>
                    </div>
                    <div className="flex gap-1 h-6">
                      <div 
                        className="rounded-sm transition-all duration-300 flex items-center justify-end px-2"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: selectedRangeInfo?.color
                        }}
                        data-testid={`position-bar-week-${week.weekNumber}`}
                      >
                        {percentage > 15 && (
                          <span className="text-[10px] font-medium text-white">{count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="border-t mt-6 pt-4">
          <h5 className="text-sm font-medium text-foreground mb-3">Monthly Summary</h5>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: '#4BB543' }}>
                {weeklyTrends.reduce((sum, w) => sum + w.improvement, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Improved</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: '#E63946' }}>
                {weeklyTrends.reduce((sum, w) => sum + w.decline, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Declined</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {weeklyTrends.reduce((sum, w) => sum + w.unchanged, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Unchanged</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

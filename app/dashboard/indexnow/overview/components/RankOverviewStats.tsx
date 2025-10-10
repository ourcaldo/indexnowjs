import React from 'react'
import { Search, TrendingUp, Target, Award } from 'lucide-react'
import { StatCard } from '@/components/dashboard/enhanced'

interface RankOverviewStatsProps {
  totalKeywords: number
  avgPosition: number
  topTenCount: number
  improvingCount: number
}

export const RankOverviewStats = ({
  totalKeywords,
  avgPosition,
  topTenCount,
  improvingCount
}: RankOverviewStatsProps) => {
  const formatNumber = (value: number | undefined | null): string => {
    if (value === undefined || value === null || typeof value !== 'number') {
      return '0'
    }
    return String(value)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Keywords"
        value={formatNumber(totalKeywords)}
        variant="info"
        icon={<Search className="w-6 h-6" />}
        description="Keywords being tracked"
      />
      
      <StatCard
        title="Average Position"
        value={formatNumber(avgPosition)}
        variant="warning"
        icon={<Target className="w-6 h-6" />}
        description="Average ranking position"
      />
      
      <StatCard
        title="Top 10 Rankings"
        value={formatNumber(topTenCount)}
        variant="success"
        icon={<Award className="w-6 h-6" />}
        description="Keywords in top 10"
      />
      
      <StatCard
        title="Improving (1D)"
        value={formatNumber(improvingCount)}
        variant="error"
        icon={<TrendingUp className="w-6 h-6" />}
        description="Keywords moving up"
      />
    </div>
  )
}
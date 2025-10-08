import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, TrendingUp, Award } from 'lucide-react'

export interface RankingData {
  position: number | null
  keyword: string
  domain: string
}

interface RankingDistributionProps {
  data: RankingData[]
  title?: string
  description?: string
  className?: string
}

export const RankingDistribution = ({ 
  data, 
  title = "Ranking Distribution", 
  description = "Overview of your keyword positions",
  className = '' 
}: RankingDistributionProps) => {
  // Guard against empty data
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No ranking data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate distribution
  const rankedKeywords = data.filter(item => item.position !== null && item.position > 0)
  const unrankedCount = data.length - rankedKeywords.length
  
  const distribution = {
    top3: rankedKeywords.filter(item => item.position! <= 3).length,
    top10: rankedKeywords.filter(item => item.position! <= 10 && item.position! > 3).length,
    top20: rankedKeywords.filter(item => item.position! <= 20 && item.position! > 10).length,
    top50: rankedKeywords.filter(item => item.position! <= 50 && item.position! > 20).length,
    beyond50: rankedKeywords.filter(item => item.position! > 50).length,
    unranked: unrankedCount
  }

  const totalKeywords = data.length
  const rankedPercentage = totalKeywords > 0 ? Math.round((rankedKeywords.length / totalKeywords) * 100) : 0

  // Distribution segments for visualization
  const segments = [
    { label: 'Top 3', count: distribution.top3, color: 'bg-[hsl(var(--success))]', textColor: 'text-[hsl(var(--success))]' },
    { label: 'Top 10', count: distribution.top10, color: 'bg-[hsl(var(--info))]', textColor: 'text-[hsl(var(--info))]' },
    { label: 'Top 20', count: distribution.top20, color: 'bg-[hsl(var(--accent))]', textColor: 'text-[hsl(var(--accent))]' },
    { label: 'Top 50', count: distribution.top50, color: 'bg-[hsl(var(--warning))]', textColor: 'text-[hsl(var(--warning))]' },
    { label: '50+', count: distribution.beyond50, color: 'bg-[hsl(var(--muted))]', textColor: 'text-[hsl(var(--muted-foreground))]' },
    { label: 'Unranked', count: distribution.unranked, color: 'bg-[hsl(var(--error))]', textColor: 'text-[hsl(var(--error))]' }
  ]

  const maxCount = Math.max(...segments.map(s => s.count))

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Target className="w-3 h-3" />
              <span>{rankedKeywords.length} ranked</span>
            </Badge>
            <Badge 
              variant="default"
              className="flex items-center space-x-1 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
            >
              <Award className="w-3 h-3" />
              <span>{rankedPercentage}%</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-[hsl(var(--success))]">{distribution.top3}</div>
            <div className="text-xs text-muted-foreground">Top 3 Positions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[hsl(var(--info))]">{distribution.top10}</div>
            <div className="text-xs text-muted-foreground">Top 10 Positions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{totalKeywords}</div>
            <div className="text-xs text-muted-foreground">Total Keywords</div>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">Position Distribution</div>
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-16 text-xs text-muted-foreground text-right">{segment.label}</div>
              <div className="flex-1 flex items-center space-x-2">
                {/* Bar */}
                <div className="flex-1 bg-muted rounded-full h-3 relative overflow-hidden">
                  <div 
                    className={`h-full ${segment.color} transition-all duration-500 ease-out`}
                    style={{ 
                      width: maxCount > 0 ? `${(segment.count / maxCount) * 100}%` : '0%'
                    }}
                  />
                </div>
                {/* Count */}
                <div className={`text-sm font-medium ${segment.textColor} min-w-[2rem] text-right`}>
                  {segment.count}
                </div>
                {/* Percentage */}
                <div className="text-xs text-muted-foreground min-w-[3rem] text-right">
                  {totalKeywords > 0 ? Math.round((segment.count / totalKeywords) * 100) : 0}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Insights */}
        {rankedKeywords.length > 0 && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <TrendingUp className="w-4 h-4 text-[hsl(var(--success))] mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">Performance Insight</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {distribution.top3 > 0 && (
                    <>You have <span className="font-medium text-[hsl(var(--success))]">{distribution.top3} keywords</span> in top 3 positions! </>
                  )}
                  {distribution.top10 > 0 && (
                    <>Great job with <span className="font-medium text-[hsl(var(--info))]">{distribution.top10} keywords</span> in top 10. </>
                  )}
                  {distribution.unranked > 0 && (
                    <>Consider optimizing <span className="font-medium text-[hsl(var(--error))]">{distribution.unranked} unranked keywords</span> for better visibility.</>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
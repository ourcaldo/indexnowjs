import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Target, TrendingUp, Award, Search } from 'lucide-react'

export interface RankingData {
  total: number
  topTen: number
  topTwenty: number
  topFifty: number
  beyond: number
}

interface RankingDistributionProps {
  data: RankingData
  title?: string
  description?: string
  className?: string
}

export const RankingDistribution = ({ 
  data,
  title = "Ranking Distribution", 
  description = "Keyword position breakdown and performance insights",
  className = '' 
}: RankingDistributionProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  const distributionData = useMemo(() => {
    if (!data || data.total === 0) {
      return [
        { label: 'Top 10', count: 0, percentage: 0, color: 'hsl(var(--success))' },
        { label: 'Top 20', count: 0, percentage: 0, color: 'hsl(var(--info))' },
        { label: 'Top 50', count: 0, percentage: 0, color: 'hsl(var(--warning))' },
        { label: '50+', count: 0, percentage: 0, color: 'hsl(var(--muted-foreground))' }
      ]
    }

    const total = data.total
    return [
      { 
        label: 'Top 10', 
        count: data.topTen, 
        percentage: Math.round((data.topTen / total) * 100),
        color: 'hsl(var(--success))'
      },
      { 
        label: 'Top 20', 
        count: data.topTwenty - data.topTen, 
        percentage: Math.round(((data.topTwenty - data.topTen) / total) * 100),
        color: 'hsl(var(--info))'
      },
      { 
        label: 'Top 50', 
        count: data.topFifty - data.topTwenty, 
        percentage: Math.round(((data.topFifty - data.topTwenty) / total) * 100),
        color: 'hsl(var(--warning))'
      },
      { 
        label: '50+', 
        count: data.beyond, 
        percentage: Math.round((data.beyond / total) * 100),
        color: 'hsl(var(--muted-foreground))'
      }
    ]
  }, [data])

  const performanceScore = useMemo(() => {
    if (!data || data.total === 0) return 0
    
    // Calculate weighted score: Top 10 = 100%, Top 20 = 75%, Top 50 = 50%, 50+ = 25%
    const score = (
      (data.topTen * 100) + 
      ((data.topTwenty - data.topTen) * 75) + 
      ((data.topFifty - data.topTwenty) * 50) + 
      (data.beyond * 25)
    ) / data.total
    
    return Math.round(score)
  }, [data])

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return { level: 'Excellent', color: 'text-success', icon: Award }
    if (score >= 60) return { level: 'Good', color: 'text-info', icon: Target }
    if (score >= 40) return { level: 'Fair', color: 'text-warning', icon: TrendingUp }
    return { level: 'Needs Work', color: 'text-muted-foreground', icon: Search }
  }

  const performance = getPerformanceLevel(performanceScore)
  const Icon = performance.icon

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Icon className="w-3 h-3" />
            {performance.level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Performance Score */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Performance Score</span>
              <span className={`text-2xl font-bold ${performance.color}`}>
                {performanceScore}%
              </span>
            </div>
            <Progress value={performanceScore} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Based on keyword position distribution and ranking quality
            </p>
          </div>

          {/* Distribution Chart */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Position Breakdown</h4>
            
            {distributionData.length === 0 ? (
              <div className="text-center py-6">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No ranking data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {distributionData.map((item, index) => (
                  <div 
                    key={index} 
                    className="space-y-2 relative cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-3 h-3 rounded-sm transition-all duration-200 ${
                            hoveredIndex === index ? 'scale-125 shadow-md' : ''
                          }`}
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{item.count}</span>
                        <Badge variant="secondary" className="text-xs px-2 py-0">
                          {item.percentage}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={item.percentage} 
                      className={`h-1.5 transition-all duration-200 ${
                        hoveredIndex === index ? 'scale-y-125' : ''
                      }`}
                    />
                    
                    {/* Tooltip */}
                    {hoveredIndex === index && (
                      <div className="absolute left-0 top-full mt-2 bg-popover border border-border rounded-md px-3 py-2 shadow-md z-20 whitespace-nowrap">
                        <div className="text-sm font-medium text-popover-foreground">{item.label} Rankings</div>
                        <div className="text-xs text-muted-foreground">Keywords: {item.count}</div>
                        <div className="text-xs text-muted-foreground">Percentage: {item.percentage}%</div>
                        <div className="text-xs text-muted-foreground">
                          Performance: {item.label === 'Top 10' ? 'Excellent' : item.label === 'Top 20' ? 'Good' : item.label === 'Top 50' ? 'Fair' : 'Needs Improvement'}
                        </div>
                        <div className="absolute bottom-full left-4 border-4 border-transparent border-b-popover"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Insights */}
          {data && data.total > 0 && (
            <div className="border-t pt-4 space-y-2">
              <h5 className="text-sm font-medium text-foreground">Quick Insights</h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-success">
                    {data.topTen}
                  </div>
                  <div className="text-xs text-muted-foreground">Top 10 Keywords</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">
                    {Math.round((data.topTwenty / data.total) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">In Top 20</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
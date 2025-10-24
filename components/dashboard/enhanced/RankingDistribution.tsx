import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, TrendingUp, Award } from 'lucide-react'

export interface RankingData {
  total: number
  topThree: number
  topTen: number
  topTwenty: number
  topHundred: number
  outOfHundred: number
}

export interface KeywordSummary {
  keyword: string
  current_position: number
  position_1d?: number
}

export interface KeywordsByRange {
  topThree: KeywordSummary[]
  topTen: KeywordSummary[]
  topTwenty: KeywordSummary[]
  topHundred: KeywordSummary[]
  outOfHundred: KeywordSummary[]
}

interface RankingDistributionProps {
  data: RankingData
  keywordsByRange?: KeywordsByRange
  title?: string
  description?: string
  className?: string
}

export const RankingDistribution = ({ 
  data,
  keywordsByRange,
  title = "Position Distribution", 
  description,
  className = '' 
}: RankingDistributionProps) => {
  
  const segments = [
    { 
      label: 'Top 3', 
      range: '1-3',
      count: data.topThree,
      color: 'bg-green-500',
      textColor: 'text-green-500',
      keywords: keywordsByRange?.topThree || []
    },
    { 
      label: 'Top 10', 
      range: '4-10',
      count: data.topTen,
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      keywords: keywordsByRange?.topTen || []
    },
    { 
      label: 'Top 20', 
      range: '11-20',
      count: data.topTwenty,
      color: 'bg-orange-500',
      textColor: 'text-orange-500',
      keywords: keywordsByRange?.topTwenty || []
    },
    { 
      label: 'Top 100', 
      range: '21-100',
      count: data.topHundred,
      color: 'bg-red-500',
      textColor: 'text-red-500',
      keywords: keywordsByRange?.topHundred || []
    },
    { 
      label: 'Out of 100', 
      range: '>100',
      count: data.outOfHundred,
      color: 'bg-gray-400',
      textColor: 'text-gray-400',
      keywords: keywordsByRange?.outOfHundred || []
    }
  ]

  const maxCount = Math.max(...segments.map(s => s.count), 1)
  const rankedCount = data.total - data.outOfHundred
  const rankedPercentage = data.total > 0 ? Math.round((rankedCount / data.total) * 100) : 0

  return (
    <Card className={className} data-testid="card-ranking-distribution">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="flex items-center space-x-1" data-testid="badge-ranked">
              <Target className="w-3 h-3" />
              <span>{rankedCount} ranked</span>
            </Badge>
            <Badge 
              variant="default"
              className="flex items-center space-x-1 bg-green-500 text-white hover:bg-green-600"
              data-testid="badge-percentage"
            >
              <Award className="w-3 h-3" />
              <span>{rankedPercentage}%</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Performance Score */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Performance Score</span>
            <span className="text-lg font-bold text-green-500" data-testid="text-performance-score">{rankedPercentage}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${rankedPercentage}%` }}
              data-testid="bar-performance-score"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Based on keyword position distribution and ranking quality</p>
        </div>

        {/* Position Breakdown */}
        <div className={keywordsByRange ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : ""}>
          {/* Left: Bar Chart */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">Position Breakdown</div>
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center space-x-3" data-testid={`row-position-${segment.range}`}>
                <div className="w-20 text-xs text-muted-foreground text-right">{segment.label}</div>
                <div className="flex-1 flex items-center space-x-2">
                  {/* Bar */}
                  <div className="flex-1 bg-muted rounded-full h-3 relative overflow-hidden">
                    <div 
                      className={`h-full ${segment.color} transition-all duration-500 ease-out`}
                      style={{ 
                        width: maxCount > 0 ? `${(segment.count / maxCount) * 100}%` : '0%'
                      }}
                      data-testid={`bar-${segment.range}`}
                    />
                  </div>
                  {/* Count */}
                  <div className={`text-sm font-medium ${segment.textColor} min-w-[2rem] text-right`} data-testid={`text-count-${segment.range}`}>
                    {segment.count}
                  </div>
                  {/* Percentage */}
                  <div className="text-xs text-muted-foreground min-w-[3rem] text-right" data-testid={`text-percentage-${segment.range}`}>
                    {data.total > 0 ? Math.round((segment.count / data.total) * 100) : 0}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Top Keywords */}
          {keywordsByRange && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">Top Keywords</div>
              {segments.map((segment, index) => {
                const topKeywords = segment.keywords.slice(0, 3)
                return (
                  <div key={index} className="min-h-[40px] flex items-center" data-testid={`keywords-${segment.range}`}>
                    {topKeywords.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {topKeywords.map((kw, kwIndex) => (
                          <Badge 
                            key={kwIndex} 
                            variant="outline" 
                            className="text-xs px-2 py-0.5"
                            data-testid={`keyword-badge-${segment.range}-${kwIndex}`}
                          >
                            {kw.keyword} (#{kw.current_position})
                          </Badge>
                        ))}
                        {segment.keywords.length > 3 && (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            +{segment.keywords.length - 3} more
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No keywords</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Performance Insights */}
        {rankedCount > 0 && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg" data-testid="section-insights">
            <div className="flex items-start space-x-2">
              <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">Performance Insight</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.topThree > 0 && (
                    <>You have <span className="font-medium text-green-500">{data.topThree} keywords</span> in top 3 positions! </>
                  )}
                  {data.topTen > 0 && (
                    <>Great job with <span className="font-medium text-blue-500">{data.topTen} keywords</span> in top 10. </>
                  )}
                  {data.outOfHundred > 0 && (
                    <>Consider optimizing <span className="font-medium text-gray-500">{data.outOfHundred} unranked keywords</span> for better visibility.</>
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

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

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

interface TopKeywordsProps {
  keywordsByRange: KeywordsByRange
  title?: string
  className?: string
}

export const TopKeywords = ({ 
  keywordsByRange,
  title = "Top Keywords",
  className = '' 
}: TopKeywordsProps) => {
  
  const segments = [
    { 
      label: 'Top 3', 
      range: '1-3',
      keywords: keywordsByRange.topThree
    },
    { 
      label: 'Top 10', 
      range: '4-10',
      keywords: keywordsByRange.topTen
    },
    { 
      label: 'Top 20', 
      range: '11-20',
      keywords: keywordsByRange.topTwenty
    },
    { 
      label: 'Top 100', 
      range: '21-100',
      keywords: keywordsByRange.topHundred
    },
    { 
      label: 'Out of 100', 
      range: '>100',
      keywords: keywordsByRange.outOfHundred
    }
  ]

  return (
    <Card className={className} data-testid="card-top-keywords">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {segments.map((segment, index) => {
            const topKeyword = segment.keywords[0]
            
            return (
              <div key={index} className="min-h-[34px] flex items-center" data-testid={`keywords-${segment.range}`}>
                {topKeyword ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex-1 truncate">
                      <span className="text-sm font-medium text-foreground" data-testid={`keyword-text-${segment.range}`}>
                        {topKeyword.keyword}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        (#{topKeyword.current_position})
                      </span>
                    </div>
                    {topKeyword.position_1d && topKeyword.position_1d > 0 && (
                      <div className="flex items-center ml-2">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-500 ml-1">+{topKeyword.position_1d}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">No keywords</span>
                )}
              </div>
            )
          })}
        </div>
        
        {/* Performance Insights */}
        {(keywordsByRange.topThree.length > 0 || keywordsByRange.topTen.length > 0) && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg" data-testid="section-insights">
            <div className="flex items-start space-x-2">
              <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">Performance Insight</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {keywordsByRange.topThree.length > 0 && (
                    <>You have <span className="font-medium text-green-500">{keywordsByRange.topThree.length} keywords</span> in top 3 positions! </>
                  )}
                  {keywordsByRange.topTen.length > 0 && (
                    <>Great job with <span className="font-medium text-blue-500">{keywordsByRange.topTen.length} keywords</span> in top 10.</>
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

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

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
  
  const allKeywords = useMemo(() => {
    const combined = [
      ...keywordsByRange.topThree,
      ...keywordsByRange.topTen,
      ...keywordsByRange.topTwenty,
      ...keywordsByRange.topHundred,
      ...keywordsByRange.outOfHundred
    ]
    
    return combined
      .filter(kw => kw.current_position > 0)
      .sort((a, b) => a.current_position - b.current_position)
      .slice(0, 10)
  }, [keywordsByRange])

  return (
    <Card className={className} data-testid="card-top-keywords">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {allKeywords.length > 0 ? (
          <div className="space-y-2.5">
            {allKeywords.map((keyword, index) => (
              <div key={index} className="flex items-center justify-between" data-testid={`keyword-row-${index}`}>
                <div className="flex-1 truncate">
                  <span className="text-sm font-medium text-foreground" data-testid={`keyword-text-${index}`}>
                    {keyword.keyword}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    (#{keyword.current_position})
                  </span>
                </div>
                {keyword.position_1d && keyword.position_1d !== 0 && (
                  <div className="flex items-center ml-2">
                    {keyword.position_1d > 0 ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-500 ml-1">+{keyword.position_1d}</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-red-500 ml-1">{keyword.position_1d}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No ranked keywords yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

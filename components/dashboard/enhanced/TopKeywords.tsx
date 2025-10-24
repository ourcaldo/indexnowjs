import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, Info } from 'lucide-react'

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
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" data-testid="info-top-keywords" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Top Keywords displays your best-performing keywords sorted by their current search position, with the highest ranking keywords shown first.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {allKeywords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Keyword
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pos.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {allKeywords.map((keyword, index) => (
                  <tr key={index} className="border-b last:border-b-0 hover:bg-muted/10 transition-colors" data-testid={`keyword-row-${index}`}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground truncate block" data-testid={`keyword-text-${index}`}>
                        {keyword.keyword}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-foreground">
                        {keyword.current_position}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {keyword.position_1d && keyword.position_1d !== 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          {keyword.position_1d > 0 ? (
                            <>
                              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                              <span className="text-sm font-medium text-green-500">+{keyword.position_1d}</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-sm font-medium text-red-500">{keyword.position_1d}</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 px-6">
            <p className="text-sm text-muted-foreground">No ranked keywords yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

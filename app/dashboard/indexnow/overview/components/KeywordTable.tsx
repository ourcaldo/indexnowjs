import React from 'react'
import { Smartphone, Monitor, Globe, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, Badge } from '@/components/dashboard/ui'
import { PositionChange } from '@/components/dashboard/enhanced'

interface Keyword {
  id: string
  keyword: string
  current_position?: number | null
  position_1d?: number | null
  device_type: string
  country?: {
    iso2_code: string
    name: string
  }
  last_updated?: string
  url?: string
  current_url?: string
  tags?: string[]
}

interface KeywordTableProps {
  keywords: Keyword[]
  filteredKeywords: Keyword[]
  selectedKeywords: string[]
  handleKeywordSelect: (keywordId: string) => void
  handleSelectAll: () => void
  searchTerm: string
  keywordsLoading: boolean
}

export const KeywordTable = ({
  keywords,
  filteredKeywords,
  selectedKeywords,
  handleKeywordSelect,
  handleSelectAll,
  searchTerm,
  keywordsLoading
}: KeywordTableProps) => {
  if (keywordsLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          ></div>
        </div>
      </Card>
    )
  }

  if (filteredKeywords.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            {searchTerm ? 'No keywords found' : 'No keywords added'}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? `No keywords match "${searchTerm}" in this domain.`
              : 'Add keywords to start tracking their search positions.'}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-4 py-3 text-center w-10">
                <input
                  type="checkbox"
                  checked={
                    selectedKeywords.length === filteredKeywords.length &&
                    filteredKeywords.length > 0
                  }
                  onChange={handleSelectAll}
                  className="w-4 h-4"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground">
                KEYWORD
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider text-muted-foreground">
                POSITION
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider text-muted-foreground">
                CHANGE (1D)
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider text-muted-foreground">
                DEVICE
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider text-muted-foreground">
                TAGS
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider text-muted-foreground">
                URL
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider text-muted-foreground">
                COUNTRY
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider text-muted-foreground">
                UPDATED
              </th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {filteredKeywords.map((keyword) => (
              <tr key={keyword.id} className="border-b">
                <td className="p-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={selectedKeywords.includes(keyword.id)}
                    onChange={() => handleKeywordSelect(keyword.id)}
                    className="w-4 h-4"
                  />
                </td>
                <td className="p-3">
                  <div className="font-medium text-sm text-foreground">
                    {keyword.keyword}
                  </div>
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg font-semibold text-foreground">
                      {keyword.current_position || '-'}
                    </span>
                    {keyword.position_1d !== null && keyword.position_1d !== undefined && (
                      <div className="flex items-center">
                        {keyword.position_1d > 0 ? (
                          <TrendingUp className="w-3 h-3 text-success" />
                        ) : keyword.position_1d < 0 ? (
                          <TrendingDown className="w-3 h-3 text-destructive" />
                        ) : (
                          <Minus className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3 text-center">
                  <PositionChange change={keyword.position_1d ?? null} />
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center">
                    {keyword.device_type === 'mobile' ? (
                      <Smartphone className="w-4 h-4 mr-2 text-muted-foreground" />
                    ) : (
                      <Monitor className="w-4 h-4 mr-2 text-muted-foreground" />
                    )}
                    <span className="text-sm capitalize text-foreground">
                      {keyword.device_type}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {keyword.tags && keyword.tags.length > 0 ? (
                      keyword.tags.map((tag, index) => (
                        <Badge key={index} variant="default">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-center">
                  {(keyword.current_url || keyword.url) ? (
                    <a
                      href={keyword.current_url || keyword.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm hover:underline justify-center text-primary"
                    >
                      {(() => {
                        const url = keyword.current_url || keyword.url;
                        if (!url) return '-';
                        try {
                          const urlObj = new URL(url);
                          return urlObj.pathname + urlObj.search;
                        } catch {
                          return url;
                        }
                      })()}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-xs font-mono text-muted-foreground">
                      {keyword.country?.iso2_code}
                    </span>
                    <span className="text-sm text-foreground">
                      {keyword.country?.name}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <span className="text-sm text-muted-foreground">
                    {keyword.last_updated
                      ? new Date(keyword.last_updated).toLocaleDateString()
                      : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

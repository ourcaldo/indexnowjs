import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, Award } from 'lucide-react'

export interface RankingData {
  total: number
  topThree: number
  topTen: number
  topTwenty: number
  topHundred: number
  outOfHundred: number
}

interface PositionDistributionProps {
  data: RankingData
  title?: string
  description?: string
  className?: string
}

export const PositionDistribution = ({ 
  data,
  title = "Position Distribution", 
  description,
  className = '' 
}: PositionDistributionProps) => {
  
  const segments = [
    { 
      label: 'Top 3', 
      range: '1-3',
      count: data.topThree,
      color: 'bg-green-500',
      textColor: 'text-green-500'
    },
    { 
      label: 'Top 10', 
      range: '4-10',
      count: data.topTen,
      color: 'bg-blue-500',
      textColor: 'text-blue-500'
    },
    { 
      label: 'Top 20', 
      range: '11-20',
      count: data.topTwenty,
      color: 'bg-orange-500',
      textColor: 'text-orange-500'
    },
    { 
      label: 'Top 100', 
      range: '21-100',
      count: data.topHundred,
      color: 'bg-red-500',
      textColor: 'text-red-500'
    },
    { 
      label: 'Out of 100', 
      range: '>100',
      count: data.outOfHundred,
      color: 'bg-gray-400',
      textColor: 'text-gray-400'
    }
  ]

  const maxCount = Math.max(...segments.map(s => s.count), 1)
  const rankedCount = data.total - data.outOfHundred
  const rankedPercentage = data.total > 0 ? Math.round((rankedCount / data.total) * 100) : 0

  return (
    <Card className={className} data-testid="card-position-distribution">
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
        <div className="mb-4">
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

        <div className="space-y-2.5">
          <div className="text-sm font-medium text-foreground">Position Breakdown</div>
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center space-x-2" data-testid={`row-position-${segment.range}`}>
              <div className="w-16 text-xs text-muted-foreground text-right">{segment.label}</div>
              <div className="flex-1 flex items-center space-x-2">
                <div className="flex-1 bg-muted rounded-full h-2.5 relative overflow-hidden">
                  <div 
                    className={`h-full ${segment.color} transition-all duration-500 ease-out`}
                    style={{ 
                      width: maxCount > 0 ? `${(segment.count / maxCount) * 100}%` : '0%'
                    }}
                    data-testid={`bar-${segment.range}`}
                  />
                </div>
                <div className={`text-sm font-medium ${segment.textColor} min-w-[1.5rem] text-right`} data-testid={`text-count-${segment.range}`}>
                  {segment.count}
                </div>
                <div className="text-xs text-muted-foreground min-w-[2.5rem] text-right" data-testid={`text-percentage-${segment.range}`}>
                  {data.total > 0 ? Math.round((segment.count / data.total) * 100) : 0}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface RankingData {
  total: number
  topThree: number
  topTen: number
  topTwenty: number
  topHundred: number
  outOfHundred: number
}

interface RankingDistributionProps {
  data: RankingData
  title?: string
  description?: string
  className?: string
}

export const RankingDistribution = ({ 
  data,
  title = "Position Distribution", 
  description,
  className = '' 
}: RankingDistributionProps) => {
  
  const positions = [
    { 
      label: 'Top 3', 
      count: data.topThree,
      color: '#4BB543',
      range: '1-3'
    },
    { 
      label: 'Top 10', 
      count: data.topTen,
      color: '#3D8BFF',
      range: '4-10'
    },
    { 
      label: 'Top 20', 
      count: data.topTwenty,
      color: '#F0A202',
      range: '11-20'
    },
    { 
      label: 'Top 100', 
      count: data.topHundred,
      color: '#E63946',
      range: '21-100'
    }
  ]

  return (
    <Card className={className} data-testid="card-ranking-distribution">
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </CardHeader>
      )}
      <CardContent className={title ? "" : "pt-6"}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {positions.map((position, index) => (
            <div 
              key={index}
              className="border border-border rounded-lg p-4 flex flex-col items-start space-y-2"
              data-testid={`card-position-${position.range}`}
            >
              <div className="flex items-center gap-2 w-full">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: position.color }}
                  data-testid={`indicator-${position.range}`}
                />
                <span 
                  className="text-2xl font-bold text-foreground"
                  data-testid={`text-count-${position.range}`}
                >
                  {position.count}
                </span>
              </div>
              
              <div className="text-sm font-medium text-muted-foreground">
                {position.label}
              </div>
              
              <div className="flex flex-col text-xs text-muted-foreground space-y-0.5">
                <div data-testid={`text-new-${position.range}`}>new 0</div>
                <div data-testid={`text-lost-${position.range}`}>lost 0</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

'use client'

import NeonContainer from './NeonContainer'
import AdvancedNeonCard from './AdvancedNeonCard'

interface NeonBorderCardProps {
  children: React.ReactNode
  className?: string
  intensity?: 'low' | 'medium' | 'high'
}

export default function NeonBorderCard({ children, className = '', intensity = 'medium' }: NeonBorderCardProps) {
  return (
    <NeonContainer className="relative">
      {(mousePosition, isTracking) => (
        <AdvancedNeonCard
          mousePosition={mousePosition}
          isTracking={isTracking}
          intensity={intensity}
          className={className}
        >
          {children}
        </AdvancedNeonCard>
      )}
    </NeonContainer>
  )
}
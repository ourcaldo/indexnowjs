'use client'

import { useState } from 'react'
import NeonContainer from './NeonContainer'
import AdvancedNeonCard from './AdvancedNeonCard'

interface NeonCardProps {
  children: React.ReactNode
  className?: string
  intensity?: 'low' | 'medium' | 'high'
}

export default function NeonCard({ children, className = '', intensity = 'medium' }: NeonCardProps) {
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
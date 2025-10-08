'use client'

import { useEffect, useRef, useState } from 'react'

interface AdvancedNeonCardProps {
  children: React.ReactNode
  className?: string
  intensity?: 'low' | 'medium' | 'high'
  mousePosition: { x: number; y: number }
  isTracking: boolean
}

export default function AdvancedNeonCard({ 
  children, 
  className = '', 
  intensity = 'medium',
  mousePosition,
  isTracking
}: AdvancedNeonCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [neonElements, setNeonElements] = useState<HTMLDivElement[]>([])

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    // Create neon line elements for each border
    const topNeon = document.createElement('div')
    const rightNeon = document.createElement('div')
    const bottomNeon = document.createElement('div')
    const leftNeon = document.createElement('div')

    const neonElements = [topNeon, rightNeon, bottomNeon, leftNeon]
    
    neonElements.forEach(neon => {
      neon.style.position = 'absolute'
      neon.style.pointerEvents = 'none'
      neon.style.opacity = '0'
      neon.style.transition = 'opacity 0.15s ease-out'
      neon.style.zIndex = '10'
      card.appendChild(neon)
    })

    setNeonElements(neonElements)
    card.style.position = 'relative'

    return () => {
      neonElements.forEach(neon => {
        if (neon.parentNode) {
          neon.parentNode.removeChild(neon)
        }
      })
    }
  }, [])

  useEffect(() => {
    const card = cardRef.current
    if (!card || !isTracking || neonElements.length === 0) {
      // Hide all neon elements when not tracking
      neonElements.forEach(neon => {
        neon.style.opacity = '0'
      })
      return
    }

    const rect = card.getBoundingClientRect()
    const [topNeon, rightNeon, bottomNeon, leftNeon] = neonElements

    // Convert global mouse position to card-relative position
    const relativeX = mousePosition.x - rect.left
    const relativeY = mousePosition.y - rect.top

    // Calculate distances to each border edge from global mouse position
    const distanceToTop = Math.abs(mousePosition.y - rect.top)
    const distanceToRight = Math.abs(mousePosition.x - rect.right)
    const distanceToBottom = Math.abs(mousePosition.y - rect.bottom)
    const distanceToLeft = Math.abs(mousePosition.x - rect.left)

    // Define activation distance (how close mouse needs to be to show effect)
    const activationDistance = 200

    // Get neon color based on intensity (using project color scheme)
    const getColor = () => {
      // Get accent color from CSS custom property for consistency
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--soft-blue').trim() || 'hsl(var(--accent))'
      return accentColor
    }

    const neonColor = getColor()
    const intensity_alpha = intensity === 'high' ? '1' : intensity === 'medium' ? '0.8' : '0.6'

    // Reset all neon elements
    neonElements.forEach(neon => {
      neon.style.opacity = '0'
    })

    // Show neon effect on closest borders within activation distance
    if (distanceToTop <= activationDistance) {
      // Top border
      topNeon.style.top = '0px'
      topNeon.style.left = `${Math.max(0, Math.min(relativeX - 80, rect.width - 160))}px`
      topNeon.style.width = '160px'
      topNeon.style.height = '2px'
      topNeon.style.background = `linear-gradient(to right, transparent, ${neonColor}${Math.round(255 * parseFloat(intensity_alpha)).toString(16)}, transparent)`
      topNeon.style.boxShadow = `0 0 20px ${neonColor}, 0 0 40px ${neonColor}50`
      topNeon.style.opacity = `${Math.max(0, 1 - distanceToTop / activationDistance)}`
    }

    if (distanceToRight <= activationDistance) {
      // Right border
      rightNeon.style.top = `${Math.max(0, Math.min(relativeY - 80, rect.height - 160))}px`
      rightNeon.style.right = '0px'
      rightNeon.style.width = '2px'
      rightNeon.style.height = '160px'
      rightNeon.style.background = `linear-gradient(to bottom, transparent, ${neonColor}${Math.round(255 * parseFloat(intensity_alpha)).toString(16)}, transparent)`
      rightNeon.style.boxShadow = `0 0 20px ${neonColor}, 0 0 40px ${neonColor}50`
      rightNeon.style.opacity = `${Math.max(0, 1 - distanceToRight / activationDistance)}`
    }

    if (distanceToBottom <= activationDistance) {
      // Bottom border
      bottomNeon.style.bottom = '0px'
      bottomNeon.style.left = `${Math.max(0, Math.min(relativeX - 80, rect.width - 160))}px`
      bottomNeon.style.width = '160px'
      bottomNeon.style.height = '2px'
      bottomNeon.style.background = `linear-gradient(to right, transparent, ${neonColor}${Math.round(255 * parseFloat(intensity_alpha)).toString(16)}, transparent)`
      bottomNeon.style.boxShadow = `0 0 20px ${neonColor}, 0 0 40px ${neonColor}50`
      bottomNeon.style.opacity = `${Math.max(0, 1 - distanceToBottom / activationDistance)}`
    }

    if (distanceToLeft <= activationDistance) {
      // Left border
      leftNeon.style.top = `${Math.max(0, Math.min(relativeY - 80, rect.height - 160))}px`
      leftNeon.style.left = '0px'
      leftNeon.style.width = '2px'
      leftNeon.style.height = '160px'
      leftNeon.style.background = `linear-gradient(to bottom, transparent, ${neonColor}${Math.round(255 * parseFloat(intensity_alpha)).toString(16)}, transparent)`
      leftNeon.style.boxShadow = `0 0 20px ${neonColor}, 0 0 40px ${neonColor}50`
      leftNeon.style.opacity = `${Math.max(0, 1 - distanceToLeft / activationDistance)}`
    }

  }, [mousePosition, isTracking, intensity, neonElements])

  return (
    <div
      ref={cardRef}
      className={`bg-white/5 backdrop-blur-sm rounded-3xl border-2 border-white/10 transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  )
}
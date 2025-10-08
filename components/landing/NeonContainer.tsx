'use client'

import { useState, useRef } from 'react'

interface NeonContainerProps {
  children: (mousePosition: { x: number; y: number }, isTracking: boolean) => React.ReactNode
  className?: string
}

export default function NeonContainer({ children, className = '' }: NeonContainerProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isTracking, setIsTracking] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setMousePosition({
      x: e.clientX,
      y: e.clientY
    })
    setIsTracking(true)
  }

  const handleMouseLeave = () => {
    setIsTracking(false)
  }

  return (
    <div
      ref={containerRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children(mousePosition, isTracking)}
    </div>
  )
}
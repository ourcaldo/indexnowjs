'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AddKeywordModal } from '@/components/modals/AddKeywordModal'

export default function AddKeywordsPage() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  // Open modal on mount for direct page access
  useEffect(() => {
    setIsOpen(true)
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    // Navigate back when modal closes
    router.back()
  }

  return (
    <AddKeywordModal 
      open={isOpen} 
      onClose={handleClose}
    />
  )
}
import React from 'react'
import { Button } from '@/components/dashboard/ui'

interface PaginationProps {
  pagination: {
    page: number
    total: number
    total_pages: number
  }
  currentPage: number
  setCurrentPage: (page: number | ((prev: number) => number)) => void
}

export const Pagination = ({ pagination, currentPage, setCurrentPage }: PaginationProps) => {
  if (pagination.total_pages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <div className="text-sm text-muted-foreground">
        Showing {((pagination.page - 1) * 20) + 1} to {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} keywords
      </div>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={pagination.page <= 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
        >
          Previous
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={pagination.page >= pagination.total_pages}
          onClick={() => setCurrentPage(prev => prev + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
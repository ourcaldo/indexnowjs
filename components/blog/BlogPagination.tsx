'use client'

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

interface PaginationData {
  current_page: number
  total_pages: number
  has_next_page: boolean
  has_prev_page: boolean
  per_page: number
  total_posts: number
}

interface BlogPaginationProps {
  pagination: PaginationData
  onPageChange: (page: number) => void
  className?: string
}

export default function BlogPagination({ pagination, onPageChange, className = '' }: BlogPaginationProps) {
  const { current_page, total_pages, has_next_page, has_prev_page } = pagination
  
  // Generate page numbers to display
  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, current_page - delta); i <= Math.min(total_pages - 1, current_page + delta); i++) {
      range.push(i)
    }

    if (current_page - delta > 2) {
      rangeWithDots.push(1, 'dots')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (current_page + delta < total_pages - 1) {
      rangeWithDots.push('dots', total_pages)
    } else {
      if (total_pages > 1) {
        rangeWithDots.push(total_pages)
      }
    }

    return rangeWithDots
  }

  if (total_pages <= 1) return null

  const visiblePages = getVisiblePages()

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Page info */}
      <div className="text-sm text-muted-foreground" data-testid="pagination-info">
        Showing {((current_page - 1) * pagination.per_page) + 1} to {Math.min(current_page * pagination.per_page, pagination.total_posts)} of {pagination.total_posts} posts
      </div>
      
      {/* Pagination controls */}
      <nav className="flex items-center gap-1" data-testid="pagination-controls">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(current_page - 1)}
          disabled={!has_prev_page}
          className={`
            flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors
            ${has_prev_page 
              ? 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border' 
              : 'text-muted-foreground/60 cursor-not-allowed border border-border/50'
            }
          `}
          data-testid="pagination-prev"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            if (page === 'dots') {
              return (
                <div key={`dots-${index}`} className="px-3 py-2" data-testid="pagination-dots">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground/70" />
                </div>
              )
            }
            
            const pageNum = page as number
            const isActive = pageNum === current_page
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`
                  px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                  ${isActive 
                    ? 'bg-info text-info-foreground border-info' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border-border'
                  }
                `}
                data-testid={`pagination-page-${pageNum}`}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(current_page + 1)}
          disabled={!has_next_page}
          className={`
            flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors
            ${has_next_page 
              ? 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border' 
              : 'text-muted-foreground/60 cursor-not-allowed border border-border/50'
            }
          `}
          data-testid="pagination-next"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  )
}
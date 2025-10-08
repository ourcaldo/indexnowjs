'use client'

import { useState } from 'react'
import { Search, X, Filter } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  count?: number
}

interface BlogFiltersProps {
  onSearch: (query: string) => void
  onTagFilter: (tag: string | null) => void
  onCategoryFilter: (category: string | null) => void
  currentSearch?: string
  currentTag?: string
  currentCategory?: string
  availableTags?: string[]
  availableCategories?: Category[]
  className?: string
}

export default function BlogFilters({ 
  onSearch, 
  onTagFilter, 
  onCategoryFilter,
  currentSearch = '', 
  currentTag = '', 
  currentCategory = '',
  availableTags = [],
  availableCategories = [],
  className = '' 
}: BlogFiltersProps) {
  const [searchInput, setSearchInput] = useState(currentSearch)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchInput.trim())
  }

  const handleSearchClear = () => {
    setSearchInput('')
    onSearch('')
  }

  const handleTagSelect = (tag: string) => {
    if (currentTag === tag) {
      onTagFilter(null)
    } else {
      onTagFilter(tag)
    }
    setIsFilterOpen(false)
  }

  const handleCategorySelect = (categorySlug: string) => {
    if (currentCategory === categorySlug) {
      onCategoryFilter(null)
    } else {
      onCategoryFilter(categorySlug)
    }
  }

  const clearAllFilters = () => {
    setSearchInput('')
    onSearch('')
    onTagFilter(null)
    onCategoryFilter(null)
  }

  const hasActiveFilters = currentSearch || currentTag || currentCategory

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              type="text"
              placeholder="Search blog posts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-black/50 border border-border/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
              data-testid="blog-search-input"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="blog-search-clear"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </form>

        {/* Filter Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`
              flex items-center gap-2 px-4 py-3 bg-black/50 border border-border/50 rounded-xl text-foreground hover:border-border/70 transition-colors
              ${isFilterOpen ? 'border-accent/50' : ''}
            `}
            data-testid="blog-filter-toggle"
          >
            <Filter className="w-5 h-5" />
            <span>Filters</span>
            {(currentTag || currentCategory) && (
              <span className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full">
                {(currentTag ? 1 : 0) + (currentCategory ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Filter Dropdown */}
          {isFilterOpen && (
            <div className="absolute top-full mt-2 right-0 bg-card border border-border/50 rounded-xl shadow-xl z-50 min-w-64">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-foreground">Filter by Tag</h3>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-accent hover:text-accent/80"
                      data-testid="blog-clear-filters"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {availableTags.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagSelect(tag)}
                        className={`
                          w-full text-left px-3 py-2 rounded-lg transition-colors text-sm
                          ${currentTag === tag
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:bg-black/50 hover:text-foreground'
                          }
                        `}
                        data-testid={`blog-tag-filter-${tag.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No tags available</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Buttons */}
      {availableCategories.filter(cat => cat.slug !== 'uncategorized').length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onCategoryFilter(null)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${!currentCategory
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-black/50 border border-border/50 text-muted-foreground hover:bg-black/70 hover:text-foreground'
                }
              `}
              data-testid="category-filter-all"
            >
              All
            </button>
            {availableCategories.filter(cat => cat.slug !== 'uncategorized').map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.slug)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${currentCategory === category.slug
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-black/50 border border-border/50 text-muted-foreground hover:bg-black/70 hover:text-foreground'
                  }
                `}
                data-testid={`category-filter-${category.slug}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2" data-testid="active-filters">
          {currentSearch && (
            <div className="flex items-center gap-2 bg-accent/20 border border-accent/30 px-3 py-1 rounded-full">
              <Search className="w-4 h-4 text-accent" />
              <span className="text-accent/80 text-sm">"{currentSearch}"</span>
              <button
                onClick={handleSearchClear}
                className="text-accent hover:text-accent/80"
                data-testid="active-search-filter-clear"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {currentTag && (
            <div className="flex items-center gap-2 bg-accent/20 border border-accent/30 px-3 py-1 rounded-full">
              <Filter className="w-4 h-4 text-accent" />
              <span className="text-accent/80 text-sm">#{currentTag}</span>
              <button
                onClick={() => onTagFilter(null)}
                className="text-accent hover:text-accent/80"
                data-testid="active-tag-filter-clear"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
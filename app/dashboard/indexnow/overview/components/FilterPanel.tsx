import React from 'react'
import { Search, Filter, Trash2, Tag } from 'lucide-react'
import { Input, Select, Button } from '@/components/dashboard/ui'

interface Country {
  id: string
  name: string
  iso2_code: string
}

interface FilterPanelProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedTags: string[]
  setSelectedTags: (tags: string[]) => void
  selectedKeywords: string[]
  setShowActionsMenu: (show: boolean) => void
  setShowDeleteConfirm: (show: boolean) => void
  setShowTagModal: (show: boolean) => void
  showActionsMenu: boolean
}

export const FilterPanel = ({
  searchTerm,
  setSearchTerm,
  selectedTags,
  setSelectedTags,
  selectedKeywords,
  setShowActionsMenu,
  setShowDeleteConfirm,
  setShowTagModal,
  showActionsMenu
}: FilterPanelProps) => {
  return (
    <div className="space-y-4">
      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search keywords..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3">

          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions Row */}
      {selectedKeywords.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border">
          <span className="text-sm text-foreground">
            {selectedKeywords.length} keyword{selectedKeywords.length > 1 ? 's' : ''} selected
          </span>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-error border-error hover:bg-slate-50 transition-colors duration-150"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTagModal(true)}
              className="text-warning border-warning hover:bg-slate-50 transition-colors duration-150"
            >
              <Tag className="w-4 h-4 mr-1" />
              Add Tag
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
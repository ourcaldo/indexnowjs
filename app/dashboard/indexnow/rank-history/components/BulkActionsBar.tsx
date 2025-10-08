import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Tag, Plus, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface BulkActionsBarProps {
  selectedCount: number
  onDeleteKeywords: () => void
  onAddTag: () => void
  activeFilter: 'all' | 'positions'
  onFilterChange: (filter: 'all' | 'positions') => void
}

export const BulkActionsBar = ({
  selectedCount,
  onDeleteKeywords,
  onAddTag,
  activeFilter,
  onFilterChange
}: BulkActionsBarProps) => {
  if (selectedCount === 0) {
    return null // Don't show anything when no keywords are selected
  }

  return (
    <div className="bg-secondary/50 border-b border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-warning/10 text-warning-foreground px-3 py-1 rounded text-sm">
            {selectedCount === 0 ? 'No keywords selected' : ''}
            {selectedCount === 1 ? '1 keyword selected' : ''}
            {selectedCount > 1 ? `${selectedCount} keywords selected` : ''}
          </div>
          {selectedCount > 0 && (
            <div className="text-sm text-muted-foreground">
              Select keywords from the table below to perform actions.
            </div>
          )}
        </div>
        
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteKeywords}
              className="text-destructive border-destructive hover:bg-destructive/10"
              data-testid="action-delete"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remove keywords
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddTag}
              className="text-warning border-warning hover:bg-warning/10"
              data-testid="action-add-tag"
            >
              <Tag className="w-4 h-4 mr-1" />
              Add tag
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
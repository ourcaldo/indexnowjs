import React from 'react'
import { Button, Input } from '@/components/dashboard/ui'

interface BulkActionsProps {
  showDeleteConfirm: boolean
  setShowDeleteConfirm: (show: boolean) => void
  showTagModal: boolean
  setShowTagModal: (show: boolean) => void
  selectedKeywords: string[]
  isDeleting: boolean
  handleBulkDelete: () => void
  isAddingTag: boolean
  newTag: string
  setNewTag: (tag: string) => void
  handleAddTag: () => void
}

export const BulkActions = ({
  showDeleteConfirm,
  setShowDeleteConfirm,
  showTagModal,
  setShowTagModal,
  selectedKeywords,
  isDeleting,
  handleBulkDelete,
  isAddingTag,
  newTag,
  setNewTag,
  handleAddTag
}: BulkActionsProps) => {
  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Delete Keywords
            </h3>
            <p className="mb-6 text-muted-foreground">
              Are you sure you want to delete {selectedKeywords.length} keyword{selectedKeywords.length > 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-slate-50 hover:text-destructive hover:border-destructive text-destructive-foreground transition-colors duration-150"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Add Tag to Keywords
            </h3>
            <p className="mb-4 text-muted-foreground">
              Add a tag to {selectedKeywords.length} selected keyword{selectedKeywords.length > 1 ? 's' : ''}:
            </p>
            <Input
              placeholder="Enter tag name..."
              value={newTag}
              onChange={(e: any) => setNewTag(e.target.value)}
              className="mb-6"
              onKeyPress={(e: any) => {
                if (e.key === 'Enter' && newTag.trim()) {
                  handleAddTag()
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTagModal(false)
                  setNewTag('')
                }}
                disabled={isAddingTag}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddTag}
                disabled={isAddingTag || !newTag.trim()}
                className="bg-primary hover:bg-slate-50 hover:text-primary hover:border-primary text-primary-foreground transition-colors duration-150"
              >
                {isAddingTag ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                {isAddingTag ? 'Adding...' : 'Add Tag'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
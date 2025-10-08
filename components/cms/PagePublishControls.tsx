'use client'

import { useState } from 'react'
import { 
  Save, 
  Eye, 
  Clock, 
  CheckCircle, 
  Archive,
  Home,
  Layout,
  Globe
} from 'lucide-react'

interface PagePublishControlsProps {
  status: 'draft' | 'published' | 'archived'
  onStatusChange: (status: 'draft' | 'published' | 'archived') => void
  onSave: () => void
  onPreview?: () => void
  isLoading?: boolean
  isDirty?: boolean
  className?: string
}

export default function PagePublishControls({
  status,
  onStatusChange,
  onSave,
  onPreview,
  isLoading = false,
  isDirty = false,
  className = ""
}: PagePublishControlsProps) {

  const getStatusConfig = (currentStatus: string) => {
    switch (currentStatus) {
      case 'published':
        return {
          icon: CheckCircle,
          color: 'text-success',
          bgColor: 'bg-success/10',
          borderColor: 'border-success/20',
          label: 'Published'
        }
      case 'archived':
        return {
          icon: Archive,
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          borderColor: 'border-warning/20',
          label: 'Archived'
        }
      default:
        return {
          icon: Clock,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-muted/20',
          label: 'Draft'
        }
    }
  }


  const statusConfig = getStatusConfig(status)
  const StatusIcon = statusConfig.icon

  return (
    <div className={`bg-white border border-border rounded-lg p-4 space-y-4 ${className}`}>
      {/* Publish Status */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Publish Status</h3>
        <div className="space-y-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
            <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
            <span className={`text-sm font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {(['draft', 'published', 'archived'] as const).map((statusOption) => (
              <button
                key={statusOption}
                onClick={() => onStatusChange(statusOption)}
                className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                  status === statusOption
                    ? 'bg-accent text-white'
                    : 'bg-secondary text-muted-foreground hover:bg-border hover:text-foreground'
                }`}
                disabled={isLoading}
                data-testid={`button-status-${statusOption}`}
              >
                {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-border">
        <button
          onClick={onSave}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-brand-text/50 text-white text-sm font-medium rounded-lg transition-colors"
          data-testid="button-save-page"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : isDirty ? 'Save Changes' : 'Save Page'}
        </button>
        
        {onPreview && (
          <button
            onClick={onPreview}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary hover:bg-border text-foreground text-sm font-medium rounded-lg transition-colors"
            disabled={isLoading}
            data-testid="button-preview-page"
          >
            <Eye className="h-4 w-4" />
            Preview Page
          </button>
        )}
      </div>

      {/* Status Info */}
      {status === 'draft' && (
        <div className="text-xs text-muted-foreground bg-brand-text/5 p-3 rounded-lg">
          <strong>Draft:</strong> Page is saved but not visible to the public. Only you can see it in preview mode.
        </div>
      )}
      
      {status === 'published' && (
        <div className="text-xs text-success bg-success/5 p-3 rounded-lg">
          <strong>Published:</strong> Page is live and visible to all visitors.
        </div>
      )}
      
      {status === 'archived' && (
        <div className="text-xs text-warning bg-warning/5 p-3 rounded-lg">
          <strong>Archived:</strong> Page is hidden from public but preserved. You can republish it anytime.
        </div>
      )}
    </div>
  )
}
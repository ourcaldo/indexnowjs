'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { ArrowLeft, Plus } from 'lucide-react'
import PostForm from '@/components/cms/PostForm'
import { PostFormData } from '@/lib/cms/validation'

export default function CreatePostPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: PostFormData) => {
    setIsLoading(true)
    
    try {
      const response = await fetch(ADMIN_ENDPOINTS.CMS_POSTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create post')
      }

      const result = await response.json()
      
      // Stay on the page after successful creation
      // User can navigate manually if needed
    } catch (error) {
      console.error('Create post error:', error)
      throw error // Re-throw to be handled by PostForm
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      router.push('/backend/admin/cms/posts')
    }
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/backend/admin/cms/posts')}
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Posts</span>
              </button>
              <div className="h-6 w-px bg-border"></div>
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Post
                </h1>
                <p className="text-sm text-muted-foreground">
                  Create and publish new blog content
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                Auto-save: Enabled
              </span>
              {isLoading && (
                <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded">
                  Saving...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <PostForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>

      {/* Help Text */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-2">Quick Tips</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Use descriptive titles with target keywords</li>
            <li>• Add relevant tags for better organization</li>
            <li>• Include a featured image for better engagement</li>
            <li>• Save as draft first, then publish when ready</li>
            <li>• Use preview to check how your post looks</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
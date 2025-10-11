'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { ArrowLeft, Edit3, Loader2 } from 'lucide-react'
import PostForm from '@/components/cms/PostForm'
import { PostFormData } from '@/lib/cms/validation'

interface EditPostPageProps {
  params: { id: string }
}

export default function EditPostPage({ params }: EditPostPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [postData, setPostData] = useState<PostFormData & { id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch post data on component mount
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(ADMIN_ENDPOINTS.CMS_POST_BY_ID(params.id), {
          credentials: 'include'
        })

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Post not found')
          }
          throw new Error('Failed to fetch post')
        }

        const data = await response.json()
        setPostData(data.data?.post)
      } catch (error) {
        console.error('Fetch post error:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch post')
      } finally {
        setIsFetching(false)
      }
    }

    fetchPost()
  }, [params.id])

  const handleSubmit = async (data: PostFormData) => {
    setIsLoading(true)
    
    try {
      const response = await fetch(ADMIN_ENDPOINTS.CMS_POST_BY_ID(params.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update post')
      }

      const result = await response.json()
      
      // Stay on the page after successful update
      // User can navigate manually if needed
    } catch (error) {
      console.error('Update post error:', error)
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(ADMIN_ENDPOINTS.CMS_POST_BY_ID(params.id), {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete post')
      }

      router.push('/backend/admin/cms/posts')
    } catch (error) {
      console.error('Delete post error:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete post')
    }
  }

  if (isFetching) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    )
  }

  if (error || !postData) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-medium text-destructive mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error || 'Post not found'}</p>
            <button
              onClick={() => router.push('/backend/admin/cms/posts')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Back to Posts
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
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
                  <Edit3 className="h-5 w-5" />
                  Edit Post
                </h1>
                <p className="text-sm text-muted-foreground">
                  Editing: {postData.title}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm text-destructive border border-destructive/20 rounded hover:bg-destructive/5 transition-colors"
              >
                Delete Post
              </button>
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
          initialData={postData}
          mode="edit"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>

      {/* Help Text */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-2">Editing Tips</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Changes are automatically saved as you type</li>
            <li>• Use preview to see how your post looks to visitors</li>
            <li>• Publishing will make your post visible to everyone</li>
            <li>• Archiving will hide the post from public view</li>
            <li>• Remember to update SEO settings if needed</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
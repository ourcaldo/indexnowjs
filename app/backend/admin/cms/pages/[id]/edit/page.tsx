'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { ArrowLeft, Save, Eye, ExternalLink } from 'lucide-react'
import PageForm from '@/components/cms/PageForm'
import { PageFormData } from '@/lib/cms/pageValidation'
import { CMSPage } from '@/types/pages'
import { useToast } from '@/hooks/use-toast'

export default function EditPage() {
  const router = useRouter()
  const params = useParams()
  const pageId = params.id as string
  const { addToast } = useToast()

  const [page, setPage] = useState<CMSPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (pageId) {
      fetchPage()
    }
  }, [pageId])

  const fetchPage = async () => {
    try {
      const response = await fetch(ADMIN_ENDPOINTS.CMS_PAGE_BY_ID(pageId), {
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 404) {
          addToast({
            title: 'Page not found',
            description: 'The page you are looking for does not exist.',
          })
          router.push('/backend/admin/cms/pages')
          return
        }
        throw new Error('Failed to fetch page')
      }

      const data = await response.json()
      setPage(data.page)
    } catch (error) {
      console.error('Error fetching page:', error)
      addToast({
        title: 'Error loading page',
        description: 'Failed to load the page. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: PageFormData) => {
    setIsLoading(true)
    
    try {
      // Track original status for more accurate toast messages
      const originalStatus = page?.status
      
      const response = await fetch(ADMIN_ENDPOINTS.CMS_PAGE_BY_ID(pageId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update page')
      }

      const result = await response.json()
      setPage(result.page)
      
      // Create contextual toast message
      let description = `Your page "${data.title}" has been updated`
      
      // Only mention status change if it actually changed
      if (originalStatus !== data.status) {
        if (data.status === 'published') {
          description += ' and published'
        } else if (originalStatus === 'published' && data.status === 'draft') {
          description += ' and unpublished'
        } else {
          description += ` and saved as ${data.status}`
        }
      }
      
      description += '.'
      
      addToast({
        title: 'Page updated successfully',
        description: description,
      })
      
    } catch (error) {
      console.error('Error updating page:', error)
      addToast({
        title: 'Error updating page',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (confirm('Are you sure? Any unsaved changes will be lost.')) {
      router.push('/backend/admin/cms/pages')
    }
  }

  const handlePreview = () => {
    if (page?.slug) {
      window.open(`/${page.slug}`, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-4"></div>
          <p className="text-muted-foreground">Loading page...</p>
        </div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Page not found</h2>
          <p className="text-muted-foreground mb-4">The page you are looking for does not exist.</p>
          <button
            onClick={() => router.push('/backend/admin/cms/pages')}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
          >
            Back to Pages
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/backend/admin/cms/pages')}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Edit Page</h1>
                <p className="text-muted-foreground text-sm">
                  Editing: <span className="font-medium">{page.title}</span>
                  {/* Removed homepage badge */}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {page.status === 'published' && (
                <button
                  onClick={handlePreview}
                  className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                  data-testid="button-preview"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Live
                </button>
              )}
              
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                disabled={isLoading}
                data-testid="button-cancel-edit"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-sm text-muted-foreground">
                <Save className="h-4 w-4" />
                Auto-save: {isLoading ? 'Saving...' : 'Ready'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <PageForm
            initialData={{
              ...page,
              selectedCategories: [], // Pages don't have categories
              mainCategory: undefined, // Pages don't have categories
              tags: [] // Pages don't have tags
            }}
            mode="edit"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className={`text-lg font-semibold ${
                page.status === 'published' ? 'text-success' :
                page.status === 'archived' ? 'text-warning' : 'text-muted-foreground'
              }`}>
                {page.status.charAt(0).toUpperCase() + page.status.slice(1)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Template</div>
              <div className="text-lg font-semibold text-foreground">
                {page.template.charAt(0).toUpperCase() + page.template.slice(1)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Created</div>
              <div className="text-lg font-semibold text-foreground">
                {new Date(page.created_at).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Last Updated</div>
              <div className="text-lg font-semibold text-foreground">
                {new Date(page.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
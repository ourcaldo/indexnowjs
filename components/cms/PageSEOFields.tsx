'use client'

import { useState, useEffect } from 'react'
import { Search, Eye, Globe, Share2 } from 'lucide-react'
import { usePublicSettings } from '@/hooks/usePublicSettings'

interface PageSEOFieldsProps {
  title: string
  metaTitle: string
  metaDescription: string
  slug: string
  onMetaTitleChange: (value: string) => void
  onMetaDescriptionChange: (value: string) => void
  className?: string
}

export default function PageSEOFields({
  title,
  metaTitle,
  metaDescription,
  slug,
  onMetaTitleChange,
  onMetaDescriptionChange,
  className = ""
}: PageSEOFieldsProps) {
  const [showPreview, setShowPreview] = useState(false)
  const { settings } = usePublicSettings()

  // Auto-generate meta title from page title with site title if empty
  useEffect(() => {
    if (!metaTitle && title) {
      const siteTitle = settings?.site_name || 'IndexNow Studio'
      const generatedMetaTitle = `${title} - ${siteTitle}`
      onMetaTitleChange(generatedMetaTitle)
    }
  }, [title, metaTitle, onMetaTitleChange, settings?.site_name])

  const getMetaTitleDisplay = () => {
    if (metaTitle) return metaTitle
    if (title) {
      const siteTitle = settings?.site_name || 'IndexNow Studio'
      return `${title} - ${siteTitle}`
    }
    return 'Untitled Page'
  }
  const getMetaDescriptionDisplay = () => metaDescription || 'No description available.'
  const getUrlDisplay = () => `indexnow.studio/${slug || 'page-slug'}`

  const metaTitleLength = getMetaTitleDisplay().length
  const metaDescriptionLength = getMetaDescriptionDisplay().length

  const getTitleColorClass = () => {
    if (metaTitleLength > 60) return 'text-destructive'
    if (metaTitleLength > 50) return 'text-warning'
    return 'text-success'
  }

  const getDescriptionColorClass = () => {
    if (metaDescriptionLength > 160) return 'text-destructive'
    if (metaDescriptionLength > 140) return 'text-warning'
    return 'text-success'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
          <Search className="h-5 w-5" />
          SEO Settings
        </h3>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 px-3 py-1 text-sm text-accent hover:bg-accent/5 rounded transition-colors"
          type="button"
          data-testid="button-seo-preview"
        >
          <Eye className="h-4 w-4" />
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {showPreview && (
        <div className="space-y-4">
          {/* Google Search Preview */}
          <div className="bg-secondary border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium text-foreground">Google Search Preview</h4>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-accent underline">
                {getUrlDisplay()}
              </div>
              <div className="text-lg text-foreground font-medium leading-tight">
                {getMetaTitleDisplay()}
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {getMetaDescriptionDisplay()}
              </div>
            </div>
          </div>

          {/* Social Media Preview */}
          <div className="bg-secondary border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium text-foreground">Social Media Preview</h4>
            </div>
            <div className="border border-border rounded-lg p-3 bg-card">
              <div className="w-full h-32 bg-secondary rounded border-2 border-dashed border-border flex items-center justify-center mb-3">
                <span className="text-xs text-muted-foreground">Featured Image Preview</span>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground leading-tight">
                  {getMetaTitleDisplay()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {getMetaDescriptionDisplay()}
                </div>
                <div className="text-xs text-muted-foreground uppercase">
                  {getUrlDisplay()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="page-meta-title" className="block text-sm font-medium text-foreground mb-2">
            Meta Title
          </label>
          <input
            id="page-meta-title"
            type="text"
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            placeholder={title || "Enter meta title for search engines..."}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            maxLength={70}
            data-testid="input-meta-title"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-muted-foreground">
              This title will appear in search engine results and browser tabs
            </p>
            <span className={`text-xs font-medium ${getTitleColorClass()}`}>
              {metaTitleLength}/60
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="page-meta-description" className="block text-sm font-medium text-foreground mb-2">
            Meta Description
          </label>
          <textarea
            id="page-meta-description"
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            placeholder="Write a compelling description that summarizes what visitors will find on this page..."
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent resize-none"
            rows={3}
            maxLength={170}
            data-testid="textarea-meta-description"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-muted-foreground">
              A good description helps search engines understand your page content
            </p>
            <span className={`text-xs font-medium ${getDescriptionColorClass()}`}>
              {metaDescriptionLength}/160
            </span>
          </div>
        </div>
      </div>

      <div className="bg-accent/5 border border-brand-accent/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-accent mb-2">SEO Tips for Pages</h4>
        <ul className="text-xs text-accent space-y-1">
          <li>• Keep your meta title under 60 characters for best display</li>
          <li>• Write meta descriptions between 140-160 characters</li>
          <li>• Include your main keyword naturally in both title and description</li>
          <li>• Make descriptions compelling to encourage clicks</li>
          <li>• Each page should have unique meta titles and descriptions</li>
        </ul>
      </div>
    </div>
  )
}
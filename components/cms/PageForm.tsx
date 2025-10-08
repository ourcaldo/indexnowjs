'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageFormSchema, PageFormData } from '@/lib/cms/pageValidation'
import { generateSlug, generatePageMetaTitle, generatePageMetaDescription } from '@/lib/cms/pageValidation'
import TiptapEditor from './TiptapEditor'
import ImageUploader from './ImageUploader'
import CustomCodeEditor from './CustomCodeEditor'
import PageSEOFields from './PageSEOFields'
import PagePublishControls from './PagePublishControls'
import { useToast } from '@/hooks/use-toast'

interface PageFormProps {
  initialData?: Partial<PageFormData> & { id?: string }
  mode: 'create' | 'edit'
  onSubmit: (data: PageFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export default function PageForm({ 
  initialData, 
  mode, 
  onSubmit, 
  onCancel,
  isLoading = false 
}: PageFormProps) {
  const [isDirty, setIsDirty] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const { addToast } = useToast()

  const form = useForm<PageFormData>({
    resolver: zodResolver(PageFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      content: initialData?.content || '',
      featured_image_url: initialData?.featured_image_url || '',
      status: initialData?.status || 'draft',
      meta_title: initialData?.meta_title || '',
      meta_description: initialData?.meta_description || '',
      custom_css: initialData?.custom_css || '',
      custom_js: initialData?.custom_js || ''
    }
  })

  const { watch, setValue, handleSubmit, formState: { errors } } = form

  const watchedTitle = watch('title')
  const watchedContent = watch('content')
  const watchedSlug = watch('slug')
  const watchedStatus = watch('status')
  const watchedMetaTitle = watch('meta_title')
  const watchedMetaDescription = watch('meta_description')
  const watchedCustomCSS = watch('custom_css')
  const watchedCustomJS = watch('custom_js')

  // Initialize slugManuallyEdited based on existing data
  useEffect(() => {
    if (mode === 'edit' && initialData?.slug) {
      // For edit mode, always mark as manually edited to prevent auto-generation
      setSlugManuallyEdited(true)
    }
  }, [mode, initialData?.slug])

  // Auto-generate slug from title (only for new pages)
  useEffect(() => {
    if (mode === 'create' && watchedTitle && !slugManuallyEdited) {
      const newSlug = generateSlug(watchedTitle)
      setValue('slug', newSlug)
    }
  }, [mode, watchedTitle, slugManuallyEdited, setValue])

  // Auto-generate meta title and description if not set
  useEffect(() => {
    if (watchedTitle && !watchedMetaTitle) {
      const metaTitle = generatePageMetaTitle(watchedTitle, 'IndexNow Studio')
      setValue('meta_title', metaTitle)
    }
  }, [watchedTitle, watchedMetaTitle, setValue])

  useEffect(() => {
    if (watchedContent && !watchedMetaDescription) {
      const metaDescription = generatePageMetaDescription(watchedContent, 160)
      setValue('meta_description', metaDescription)
    }
  }, [watchedContent, watchedMetaDescription, setValue])

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsDirty(true)
    })
    return () => subscription.unsubscribe()
  }, [form])

  const handleFormSubmit = async (data: PageFormData) => {
    try {
      await onSubmit(data)
      setIsDirty(false)
    } catch (error) {
      console.error('Form submission error:', error)
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save page',
        type: 'error'
      })
    }
  }

  const handleSlugChange = (value: string) => {
    // Let user type ANYTHING - no immediate cleaning
    setValue('slug', value)
    setSlugManuallyEdited(true)
  }

  const handlePreview = () => {
    const currentData = form.getValues()
    if (currentData.slug) {
      window.open(`/${currentData.slug}`, '_blank')
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="page-title" className="block text-sm font-medium text-foreground mb-2">
              Page Title <span className="text-destructive">*</span>
            </label>
            <input
              id="page-title"
              type="text"
              {...form.register('title')}
              placeholder="Enter your page title..."
              className="w-full px-4 py-3 text-lg border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              data-testid="input-page-title"
            />
            {errors.title && (
              <p className="mt-2 text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="page-slug" className="block text-sm font-medium text-foreground mb-2">
              Page URL Slug <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center">
              <span className="px-3 py-3 text-sm text-muted-foreground bg-secondary border border-r-0 border-border rounded-l-lg">
                indexnow.studio/
              </span>
              <input
                id="page-slug"
                type="text"
                value={watchedSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="page-slug"
                className="flex-1 px-3 py-3 text-sm border border-border rounded-r-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                data-testid="input-page-slug"
              />
            </div>
            {errors.slug && (
              <p className="mt-2 text-sm text-destructive">{errors.slug.message}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              The slug is the URL-friendly version of the page title
            </p>
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Page Content
            </label>
            <TiptapEditor
              content={watchedContent || ''}
              onChange={(content) => setValue('content', content)}
              placeholder="Write your page content here..."
              className="min-h-[400px]"
            />
            {errors.content && (
              <p className="mt-2 text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Featured Image
            </label>
            <ImageUploader
              value={form.watch('featured_image_url') || ''}
              onChange={(url: string) => setValue('featured_image_url', url)}
              onRemove={() => setValue('featured_image_url', '')}
              className="w-full"
            />
            {errors.featured_image_url && (
              <p className="mt-2 text-sm text-destructive">{errors.featured_image_url.message}</p>
            )}
          </div>


          {/* Custom Code Editor */}
          <CustomCodeEditor
            customCSS={watchedCustomCSS || ''}
            customJS={watchedCustomJS || ''}
            onCSSChange={(css: string) => setValue('custom_css', css)}
            onJSChange={(js: string) => setValue('custom_js', js)}
          />

          {/* SEO Fields */}
          <PageSEOFields
            title={watchedTitle}
            metaTitle={watchedMetaTitle || ''}
            metaDescription={watchedMetaDescription || ''}
            slug={watchedSlug}
            onMetaTitleChange={(value) => setValue('meta_title', value)}
            onMetaDescriptionChange={(value) => setValue('meta_description', value)}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Controls */}
          <PagePublishControls
            status={watchedStatus}
            onStatusChange={(status) => setValue('status', status)}
            onSave={() => handleSubmit(handleFormSubmit)()}
            onPreview={handlePreview}
            isLoading={isLoading}
            isDirty={isDirty}
          />

          

          {/* Form Status */}
          {isDirty && (
            <div className="text-xs text-warning bg-warning/5 p-3 rounded-lg">
              <strong>Unsaved Changes:</strong> You have unsaved changes. Make sure to save your page before leaving.
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PostFormSchema, PostFormData, generateSlug, generateExcerpt } from '@/lib/cms/validation'
import TiptapEditor from './TiptapEditor'
import ImageUploader from './ImageUploader'
import TagManager from './TagManager'
import CategorySelector from './CategorySelector'
import SEOFields from './SEOFields'
import PublishControls from './PublishControls'
import { useToast } from '@/hooks/use-toast'

interface PostFormProps {
  initialData?: Partial<PostFormData> & { id?: string }
  mode: 'create' | 'edit'
  onSubmit: (data: PostFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export default function PostForm({ 
  initialData, 
  mode, 
  onSubmit, 
  onCancel,
  isLoading = false 
}: PostFormProps) {
  const [isDirty, setIsDirty] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const { addToast } = useToast()

  const form = useForm<PostFormData>({
    resolver: zodResolver(PostFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      content: initialData?.content || '',
      excerpt: initialData?.excerpt || '',
      featured_image_url: initialData?.featured_image_url || '',
      status: initialData?.status || 'draft',
      post_type: initialData?.post_type || 'post',
      selectedCategories: initialData?.selectedCategories || [],
      mainCategory: initialData?.mainCategory,
      meta_title: initialData?.meta_title || '',
      meta_description: initialData?.meta_description || '',
      tags: initialData?.tags || []
    }
  })

  const { watch, setValue, handleSubmit, formState: { errors } } = form

  const watchedTitle = watch('title')
  const watchedContent = watch('content')
  const watchedSlug = watch('slug')
  const watchedStatus = watch('status')
  const watchedPostType = watch('post_type')
  const watchedMetaTitle = watch('meta_title')
  const watchedMetaDescription = watch('meta_description')
  const watchedTags = watch('tags')
  const watchedSelectedCategories = watch('selectedCategories')
  const watchedMainCategory = watch('mainCategory')

  // Auto-generate slug from title
  useEffect(() => {
    if (watchedTitle && !slugManuallyEdited) {
      const newSlug = generateSlug(watchedTitle)
      setValue('slug', newSlug)
    }
  }, [watchedTitle, slugManuallyEdited, setValue])

  // Auto-generate excerpt from content if not manually set
  useEffect(() => {
    if (watchedContent && !form.getValues('excerpt')) {
      const autoExcerpt = generateExcerpt(watchedContent, 160)
      setValue('excerpt', autoExcerpt)
    }
  }, [watchedContent, setValue, form])

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsDirty(true)
    })
    return () => subscription.unsubscribe()
  }, [form])

  const handleFormSubmit = async (data: PostFormData) => {
    try {
      await onSubmit(data)
      setIsDirty(false)
      addToast({
        title: mode === 'create' ? 'Post created successfully' : 'Post updated successfully',
        description: `Your post has been ${data.status === 'published' ? 'published' : 'saved as ' + data.status}.`,
      })
    } catch (error) {
      console.error('Form submission error:', error)
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save post',
      })
    }
  }

  const handleSlugChange = (value: string) => {
    setValue('slug', generateSlug(value))
    setSlugManuallyEdited(true)
  }

  const handlePreview = () => {
    const currentData = form.getValues()
    if (currentData.slug) {
      window.open(`/blog/${currentData.slug}`, '_blank')
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Post Title *
            </label>
            <input
              id="title"
              type="text"
              {...form.register('title')}
              placeholder="Enter your post title..."
              className="w-full px-4 py-3 text-lg border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-foreground mb-2">
              URL Slug *
            </label>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground bg-secondary border border-r-0 border-border px-3 py-2 rounded-l-lg">
                /blog/
              </span>
              <input
                id="slug"
                type="text"
                value={watchedSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="url-slug"
                className="flex-1 px-3 py-2 border border-border rounded-r-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            {errors.slug && (
              <p className="mt-1 text-sm text-destructive">{errors.slug.message}</p>
            )}
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Content
            </label>
            <TiptapEditor
              content={watchedContent || ''}
              onChange={(content) => setValue('content', content)}
              placeholder="Start writing your post content..."
            />
            {errors.content && (
              <p className="mt-1 text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-foreground mb-2">
              Excerpt (Optional)
            </label>
            <textarea
              id="excerpt"
              {...form.register('excerpt')}
              placeholder="Brief description of your post..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-vertical"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-generated from content if left empty. Used in post previews and meta descriptions.
            </p>
            {errors.excerpt && (
              <p className="mt-1 text-sm text-destructive">{errors.excerpt.message}</p>
            )}
          </div>

          {/* SEO Fields */}
          <SEOFields
            title={watchedTitle}
            metaTitle={watchedMetaTitle}
            metaDescription={watchedMetaDescription}
            slug={watchedSlug}
            onMetaTitleChange={(value) => setValue('meta_title', value)}
            onMetaDescriptionChange={(value) => setValue('meta_description', value)}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Controls */}
          <PublishControls
            status={watchedStatus}
            postType={watchedPostType}
            onStatusChange={(status) => setValue('status', status)}
            onPostTypeChange={(type) => setValue('post_type', type)}
            onSave={handleSubmit(handleFormSubmit)}
            onPreview={mode === 'edit' ? handlePreview : undefined}
            isLoading={isLoading}
            isDirty={isDirty}
          />

          {/* Featured Image */}
          <div className="bg-white border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Featured Image</h3>
            <ImageUploader
              value={form.getValues('featured_image_url') || ''}
              onChange={(url) => setValue('featured_image_url', url)}
              onRemove={() => setValue('featured_image_url', '')}
            />
            {errors.featured_image_url && (
              <p className="mt-1 text-sm text-destructive">{errors.featured_image_url.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="bg-white border border-border rounded-lg p-4">
            <CategorySelector
              selectedCategories={watchedSelectedCategories || []}
              mainCategory={watchedMainCategory}
              onChange={(selectedCategories, mainCategory) => {
                setValue('selectedCategories', selectedCategories)
                setValue('mainCategory', mainCategory)
              }}
            />
          </div>

          {/* Tags */}
          <div className="bg-white border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Tags</h3>
            <TagManager
              tags={watchedTags}
              onChange={(tags) => setValue('tags', tags)}
              placeholder="Add tags for better organization..."
            />
            {errors.tags && (
              <p className="mt-1 text-sm text-destructive">{errors.tags.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-white border border-border rounded-lg p-4">
            <div className="space-y-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full px-4 py-2 border border-border rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                {mode === 'create' ? 'Creating new post' : 'Editing existing post'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
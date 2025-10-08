import { z } from 'zod'
import slugify from 'slugify'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

// Post validation schemas
export const PostFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug must be less than 255 characters'),
  content: z.string().optional(),
  excerpt: z.string().max(500, 'Excerpt must be less than 500 characters').optional(),
  featured_image_url: z.string().url('Featured image must be a valid URL').optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  post_type: z.enum(['post', 'news', 'blog']).default('post'),
  selectedCategories: z.array(z.string()).optional().default([]),
  mainCategory: z.string().optional(),
  meta_title: z.string().max(255, 'Meta title must be less than 255 characters').optional(),
  meta_description: z.string().max(500, 'Meta description must be less than 500 characters').optional(),
  tags: z.array(z.string()).default([])
})

export const PostStatusUpdateSchema = z.object({
  status: z.enum(['draft', 'published', 'archived'])
})

export type PostFormData = z.infer<typeof PostFormSchema>
export type PostStatusUpdateData = z.infer<typeof PostStatusUpdateSchema>

// Slug generation utility
export function generateSlug(title: string): string {
  return slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  })
}

// Check if slug is unique (for frontend validation)
export async function isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
  try {
    const params = new URLSearchParams({ slug })
    if (excludeId) {
      params.append('excludeId', excludeId)
    }
    
    const response = await fetch(`${ADMIN_ENDPOINTS.CMS_POSTS_VALIDATE_SLUG}?${params}`, {
      credentials: 'include'
    })
    
    if (!response.ok) {
      return false
    }
    
    const data = await response.json()
    return data.isUnique
  } catch (error) {
    console.error('Error validating slug:', error)
    return false
  }
}

// Content sanitization utility
export function sanitizeContent(content: string): string {
  // Basic HTML sanitization - remove script tags and other dangerous elements
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

// Extract excerpt from content
export function generateExcerpt(content: string, maxLength: number = 160): string {
  // Strip HTML tags and get plain text
  const plainText = content.replace(/<[^>]*>/g, '').trim()
  
  if (plainText.length <= maxLength) {
    return plainText
  }
  
  // Find the last complete word within the limit
  const truncated = plainText.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')
  
  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + '...'
  }
  
  return truncated + '...'
}

// Validate file type for image uploads
export function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  return validTypes.includes(file.type)
}

// Validate file size (in MB)
export function isValidImageSize(file: File, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

// Generate SEO-friendly meta title
export function generateMetaTitle(title: string, siteName?: string): string {
  const maxLength = 60
  let metaTitle = title
  
  if (siteName) {
    const withSiteName = `${title} - ${siteName}`
    metaTitle = withSiteName.length <= maxLength ? withSiteName : title
  }
  
  return metaTitle.length > maxLength ? title.substring(0, 57) + '...' : metaTitle
}

// Generate SEO-friendly meta description
export function generateMetaDescription(excerpt: string, maxLength: number = 160): string {
  if (excerpt.length <= maxLength) {
    return excerpt
  }
  
  const truncated = excerpt.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')
  
  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + '...'
  }
  
  return truncated + '...'
}
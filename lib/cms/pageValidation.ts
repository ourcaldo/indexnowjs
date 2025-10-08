import { z } from 'zod'
import slugify from 'slugify'
import { VALIDATION_PATTERNS, FIELD_LIMITS } from '@/lib/core/constants/ValidationRules'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

// Page validation schemas
export const PageFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  slug: z.string()
    .min(FIELD_LIMITS.SLUG.min, 'Slug is required')
    .max(FIELD_LIMITS.SLUG.max, 'Slug must be less than 100 characters')
    .regex(VALIDATION_PATTERNS.SLUG, 'Slug can only contain lowercase letters, numbers, and dashes (no consecutive dashes or dashes at start/end)'),
  content: z.string().optional(),
  featured_image_url: z.string().url('Featured image must be a valid URL').optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  meta_title: z.string().max(255, 'Meta title must be less than 255 characters').optional(),
  meta_description: z.string().max(500, 'Meta description must be less than 500 characters').optional(),
  custom_css: z.string().optional(),
  custom_js: z.string().optional()
})

export const PageStatusUpdateSchema = z.object({
  status: z.enum(['draft', 'published', 'archived'])
})

export type PageFormData = z.infer<typeof PageFormSchema>
export type PageStatusUpdateData = z.infer<typeof PageStatusUpdateSchema>

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

    const response = await fetch(`${ADMIN_ENDPOINTS.CMS_PAGES_VALIDATE_SLUG}?${params}`, {
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

// Sanitize custom CSS
export function sanitizeCustomCSS(css: string): string {
  // Remove dangerous CSS properties and functions
  return css
    .replace(/@import\s+/gi, '') // Remove @import statements
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions (IE)
    .replace(/javascript\s*:/gi, '') // Remove javascript: URLs
    .replace(/behavior\s*:/gi, '') // Remove IE behaviors
    .replace(/binding\s*:/gi, '') // Remove binding property
}

// Sanitize custom JavaScript
export function sanitizeCustomJS(js: string): string {
  // Basic JS sanitization - remove dangerous patterns
  return js
    .replace(/eval\s*\(/gi, '') // Remove eval calls
    .replace(/Function\s*\(/gi, '') // Remove Function constructor
    .replace(/setTimeout\s*\(\s*["']/gi, 'setTimeout(function() {') // Convert string timeouts
    .replace(/setInterval\s*\(\s*["']/gi, 'setInterval(function() {') // Convert string intervals
    .replace(/document\.write\s*\(/gi, '') // Remove document.write
}

// Extract excerpt from content for pages (shorter than posts)
export function generatePageExcerpt(content: string, maxLength: number = 120): string {
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

// Validate file type for image uploads (same as posts)
export function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  return validTypes.includes(file.type)
}

// Validate file size (in MB)
export function isValidImageSize(file: File, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

// Generate SEO-friendly meta title for pages
export function generatePageMetaTitle(title: string, siteName: string = 'IndexNow Studio'): string {
  if (!title?.trim()) return siteName

  // If title already contains the site name, don't duplicate it
  if (title.toLowerCase().includes(siteName.toLowerCase())) {
    return title
  }

  // Truncate meta title to a reasonable length (e.g., 60 characters)
  const maxLength = 60
  const combinedTitle = `${title} - ${siteName}`

  if (combinedTitle.length > maxLength) {
    // If combined title exceeds max length, truncate the page title and append site name if possible
    const remainingLength = maxLength - siteName.length - 3 // account for ' - '
    if (remainingLength > 0) {
      const truncatedTitle = title.substring(0, remainingLength)
      return `${truncatedTitle} - ${siteName}`
    } else {
      // If even the site name is too long, just return a truncated version of the site name
      return siteName.substring(0, maxLength)
    }
  }

  return combinedTitle
}

// Generate SEO-friendly meta description for pages
export function generatePageMetaDescription(content: string, maxLength: number = 160): string {
  const excerpt = generatePageExcerpt(content, maxLength)
  return excerpt
}

// Validate template type - simplified to only default
export function isValidTemplate(template: string): boolean {
  return template === 'default'
}

// Get template display name - simplified
export function getTemplateDisplayName(template: string): string {
  return 'Default'
}

// Get template description - simplified  
export function getTemplateDescription(template: string): string {
  return 'Standard page layout with header and content area'
}
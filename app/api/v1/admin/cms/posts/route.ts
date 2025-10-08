import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation } from '@/lib/core/api-response-middleware'
import { AdminCmsService } from '@/lib/services/admin/AdminCmsService'
import { createStandardError } from '@/lib/core/api-response-middleware'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

/**
 * GET /api/v1/admin/cms/posts
 * Fetch all CMS posts with author information
 * 
 * @security Requires super admin authentication
 * @returns ApiSuccessResponse<CMSPostWithAuthor[]> | ApiErrorResponse
 */
export const GET = adminApiWrapper(async (request, adminUser) => {
  const response = await withDatabaseOperation(
    async () => {
      const posts = await AdminCmsService.getAllPostsWithAuthors(adminUser.id)
      return posts
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/posts' }
  )
  
  return response
})

/**
 * POST /api/v1/admin/cms/posts
 * Create a new CMS post
 * 
 * @security Requires super admin authentication
 * @body CMSPost data (title, slug, content, etc.)
 * @returns ApiSuccessResponse<CMSPost> | ApiErrorResponse
 */
export const POST = adminApiWrapper(async (request, adminUser) => {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.title) {
      return await createStandardError(
        ErrorType.VALIDATION,
        'Title is required',
        400,
        ErrorSeverity.LOW,
        { field: 'title' }
      )
    }
    
    if (!body.slug) {
      return await createStandardError(
        ErrorType.VALIDATION,
        'Slug is required',
        400,
        ErrorSeverity.LOW,
        { field: 'slug' }
      )
    }
    
    if (!body.content) {
      return await createStandardError(
        ErrorType.VALIDATION,
        'Content is required',
        400,
        ErrorSeverity.LOW,
        { field: 'content' }
      )
    }

    const response = await withDatabaseOperation(
      async () => {
        const post = await AdminCmsService.createPost(adminUser.id, {
          title: body.title,
          slug: body.slug,
          content: body.content,
          excerpt: body.excerpt,
          featured_image: body.featured_image,
          status: body.status || 'draft',
          author_id: body.author_id || adminUser.id,
          published_at: body.status === 'published' ? new Date().toISOString() : undefined
        })
        return post
      },
      { userId: adminUser.id, endpoint: '/api/v1/admin/cms/posts' }
    )
    
    return response
  } catch (error) {
    return await createStandardError(
      ErrorType.SYSTEM,
      error as Error,
      500,
      ErrorSeverity.HIGH
    )
  }
})

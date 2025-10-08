import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation, createStandardError } from '@/lib/core/api-response-middleware'
import { AdminCmsService } from '@/lib/services/admin/AdminCmsService'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

/**
 * GET /api/v1/admin/cms/pages
 * Fetch all CMS pages
 * 
 * @security Requires super admin authentication
 * @returns ApiSuccessResponse<CMSPage[]> | ApiErrorResponse
 */
export const GET = adminApiWrapper(async (request, adminUser) => {
  const response = await withDatabaseOperation(
    async () => {
      const pages = await AdminCmsService.getAllPages(adminUser.id)
      return pages
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/pages' }
  )
  
  return response
})

/**
 * POST /api/v1/admin/cms/pages
 * Create a new CMS page
 * 
 * @security Requires super admin authentication
 * @body CMSPage data (title, slug, content, etc.)
 * @returns ApiSuccessResponse<CMSPage> | ApiErrorResponse
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
        const page = await AdminCmsService.createPage(adminUser.id, {
          title: body.title,
          slug: body.slug,
          content: body.content,
          status: body.status || 'draft',
          published_at: body.status === 'published' ? new Date().toISOString() : undefined
        })
        return page
      },
      { userId: adminUser.id, endpoint: '/api/v1/admin/cms/pages' }
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

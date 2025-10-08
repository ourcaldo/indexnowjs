import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation, createStandardError, formatSuccess } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { PageStatusUpdateSchema } from '@/lib/cms/pageValidation'
import { ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'

export const PATCH = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const { id } = await params

  // Parse and validate request body
  let body
  try {
    const text = await request.text()
    if (!text || text.trim() === '') {
      return createStandardError(
        ErrorType.VALIDATION,
        'Request body is empty',
        400,
        ErrorSeverity.LOW
      )
    }
    body = JSON.parse(text)
  } catch (parseError) {
    logger.error({
      error: parseError instanceof Error ? parseError.message : 'Unknown error',
      endpoint: '/api/v1/admin/cms/pages/[id]/status',
      method: 'PATCH'
    }, 'JSON parse error in request body')
    return createStandardError(
      ErrorType.VALIDATION,
      'Invalid JSON in request body',
      400,
      ErrorSeverity.LOW
    )
  }

  // Validate request body against schema
  const validationResult = PageStatusUpdateSchema.safeParse(body)
  if (!validationResult.success) {
    const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
    return createStandardError(
      ErrorType.VALIDATION,
      `Validation failed: ${errors.join(', ')}`,
      400,
      ErrorSeverity.LOW
    )
  }

  const { status } = validationResult.data

  const response = await withDatabaseOperation(
    async () => {
      // Update page status using secure admin operation
      const page = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser.id,
          operation: 'update_cms_page_status',
          source: 'admin/cms/pages/[id]/status',
          reason: 'Admin updating CMS page status',
          metadata: {
            pageId: id,
            newStatus: status,
            endpoint: '/api/v1/admin/cms/pages/[id]/status',
            method: 'PATCH'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_cms_pages', operationType: 'update' },
        async (supabase: any) => {
          // Build update object for status change
          const updateData: any = {
            status,
            updated_at: new Date().toISOString()
          }

          // Auto-set published_at when status changes to published
          if (status === 'published') {
            updateData.published_at = new Date().toISOString()
          } else if (status === 'draft' || status === 'archived') {
            updateData.published_at = null
          }

          const { data: pageData, error } = await supabase
            .from('indb_cms_pages')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

          if (error || !pageData) {
            return null
          }

          return pageData
        }
      )

      if (!page) {
        throw new Error('Page not found')
      }

      return {
        message: 'Page status updated successfully',
        page
      }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/pages/[id]/status' }
  )

  if (!response.success) {
    if (response.error.message.includes('not found')) {
      return createStandardError(
        ErrorType.AUTHORIZATION,
        'Page not found',
        404,
        ErrorSeverity.MEDIUM
      )
    }
    return response
  }

  return formatSuccess(response.data, undefined, 202)
})
import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation, createStandardError, formatSuccess } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const PATCH = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const { id } = await params
  const body = await request.json()

  if (!body.status) {
    return createStandardError(
      ErrorType.VALIDATION,
      'Status is required',
      400,
      ErrorSeverity.LOW,
      { field: 'status' }
    )
  }

  if (!['draft', 'published', 'archived'].includes(body.status)) {
    return createStandardError(
      ErrorType.VALIDATION,
      'Invalid status value',
      400,
      ErrorSeverity.LOW,
      { field: 'status', allowedValues: ['draft', 'published', 'archived'] }
    )
  }

  const response = await withDatabaseOperation(
    async () => {
      // Update post status using secure admin operation
      const post = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser.id,
          operation: 'update_cms_post_status',
          source: 'admin/cms/posts/[id]/status',
          reason: 'Admin updating CMS post status',
          metadata: {
            postId: id,
            newStatus: body.status,
            endpoint: '/api/v1/admin/cms/posts/[id]/status',
            method: 'PATCH'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_cms_posts', operationType: 'update' },
        async (supabase: any) => {
          // Build update object for status change
          const updateData: any = {
            status: body.status,
            updated_at: new Date().toISOString()
          }

          // Auto-set published_at when status changes to published
          if (body.status === 'published') {
            updateData.published_at = new Date().toISOString()
          } else if (body.status === 'draft') {
            updateData.published_at = null
          }

          const { data: postData, error } = await supabase
            .from('indb_cms_posts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

          if (error || !postData) {
            return null
          }

          return postData
        }
      )

      if (!post) {
        throw new Error('Post not found')
      }

      return {
        message: 'Post status updated successfully',
        post
      }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/posts/[id]/status' }
  )

  if (!response.success) {
    if (response.error.message.includes('not found')) {
      return createStandardError(
        ErrorType.AUTHORIZATION,
        'Post not found',
        404,
        ErrorSeverity.MEDIUM
      )
    }
    return response
  }

  return formatSuccess(response.data, undefined, 202)
})
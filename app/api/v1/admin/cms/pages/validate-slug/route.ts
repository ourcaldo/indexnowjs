import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation, createStandardError, formatSuccess } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const excludeId = searchParams.get('excludeId')

  if (!slug) {
    return createStandardError(
      ErrorType.VALIDATION,
      'Slug is required',
      400,
      ErrorSeverity.LOW,
      { field: 'slug' }
    )
  }

  const response = await withDatabaseOperation(
    async () => {
      const authContext = {
        userId: adminUser.id,
        operation: 'validate_cms_page_slug',
        reason: 'Admin validating CMS page slug uniqueness for content management',
        source: 'admin/cms/pages/validate-slug',
        metadata: {
          endpoint: '/api/v1/admin/cms/pages/validate-slug',
          slug,
          excludeId
        }
      }

      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        authContext,
        {
          table: 'indb_cms_pages',
          operationType: 'select',
          columns: ['id'],
          whereConditions: { slug }
        },
        async () => {
          let query = supabaseAdmin
            .from('indb_cms_pages')
            .select('id')
            .eq('slug', slug)

          // Exclude specific page ID when checking for updates
          if (excludeId) {
            query = query.neq('id', excludeId)
          }

          const { data, error } = await query

          if (error) {
            throw new Error(`Failed to validate slug: ${error.message}`)
          }

          return data
        }
      )

      const isUnique = !data || data.length === 0

      return { isUnique, slug }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/pages/validate-slug' }
  )

  if (!response.success) {
    return response
  }

  return formatSuccess(response.data)
})
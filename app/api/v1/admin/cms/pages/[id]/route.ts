import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation, createStandardError, formatSuccess } from '@/lib/core/api-response-middleware'
import { supabaseAdmin } from '@/lib/database'
import { PageFormSchema, sanitizeContent, sanitizeCustomCSS, sanitizeCustomJS } from '@/lib/cms/pageValidation'
import { SecureServiceRoleHelpers, SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'

export const GET = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const { id } = await params

  const response = await withDatabaseOperation(
    async () => {
      const authContext = {
        userId: adminUser.id,
        operation: 'admin_cms_get_page_detail',
        reason: `Admin fetching CMS page details for page ${id}`,
        source: 'admin/cms/pages/[id]',
        metadata: {
          endpoint: '/api/v1/admin/cms/pages/[id]',
          pageId: id
        }
      }

      const page = await SecureServiceRoleWrapper.executeSecureOperation(
        authContext,
        {
          table: 'indb_cms_pages',
          operationType: 'select',
          columns: ['*'],
          whereConditions: { id }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_cms_pages')
            .select('*')
            .eq('id', id)
            .single()

          if (error || !data) {
            return null
          }

          return data
        }
      )

      if (!page) {
        throw new Error('Page not found')
      }

      // Get author information using secure wrapper
      let authorName = 'Unknown'
      let authorEmail = 'Unknown'
      
      if (page.author_id) {
        try {
          const profileContext = {
            userId: adminUser.id,
            operation: 'admin_cms_get_page_author_profile',
            reason: `Admin fetching author profile for CMS page ${id}`,
            source: 'admin/cms/pages/[id]',
            metadata: {
              pageId: id,
              authorId: page.author_id,
              endpoint: '/api/v1/admin/cms/pages/[id]'
            }
          }

          const authorProfiles = await SecureServiceRoleHelpers.secureSelect(
            profileContext,
            'indb_auth_user_profiles',
            ['full_name', 'user_id'],
            { user_id: page.author_id }
          )

          if (authorProfiles.length > 0) {
            const authorProfile = authorProfiles[0]
            authorName = authorProfile.full_name || 'Unknown'

            const authContext = {
              userId: 'system',
              operation: 'admin_cms_get_page_author_auth',
              reason: `Admin fetching author auth data for CMS page ${id}`,
              source: 'admin/cms/pages/[id]',
              metadata: {
                pageId: id,
                authorId: authorProfile.user_id,
                endpoint: '/api/v1/admin/cms/pages/[id]'
              }
            }

            const authUser = await SecureServiceRoleWrapper.executeSecureOperation(
              authContext,
              {
                table: 'auth.users',
                operationType: 'select',
                columns: ['id', 'email'],
                whereConditions: { id: authorProfile.user_id }
              },
              async () => {
                const { data, error } = await supabaseAdmin.auth.admin.getUserById(authorProfile.user_id)
                if (error || !data?.user) throw error
                return data.user
              }
            )

            authorEmail = authUser.email || 'Unknown'
          }
        } catch (error) {
          logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: adminUser.id,
            pageId: id,
            authorId: page.author_id,
            endpoint: '/api/v1/admin/cms/pages/[id]',
            method: 'GET'
          }, 'Failed to fetch author data for page')
        }
      }

      const pageWithAuthor = {
        ...page,
        author_name: authorName,
        author_email: authorEmail
      }

      return { page: pageWithAuthor }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/pages/[id]' }
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

  return formatSuccess(response.data)
})

export const PUT = adminApiWrapper(async (
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
      endpoint: '/api/v1/admin/cms/pages/[id]',
      method: 'PUT'
    }, 'JSON parse error in request body')
    return createStandardError(
      ErrorType.VALIDATION,
      'Invalid JSON in request body',
      400,
      ErrorSeverity.LOW
    )
  }

  const response = await withDatabaseOperation(
    async () => {
      // Check if page exists
      const checkPageContext = {
        userId: adminUser.id,
        operation: 'admin_cms_check_page_exists',
        reason: `Admin checking if page ${id} exists before update`,
        source: 'admin/cms/pages/[id]',
        metadata: {
          endpoint: '/api/v1/admin/cms/pages/[id]',
          pageId: id,
          method: 'PUT'
        }
      }

      const existingPage = await SecureServiceRoleWrapper.executeSecureOperation(
        checkPageContext,
        {
          table: 'indb_cms_pages',
          operationType: 'select',
          columns: ['id', 'slug'],
          whereConditions: { id }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_cms_pages')
            .select('id, slug')
            .eq('id', id)
            .single()

          if (error || !data) {
            return null
          }

          return data
        }
      )

      if (!existingPage) {
        throw new Error('Page not found')
      }

      // Build update object with only provided fields
      const updateData: any = {}
      
      if (body.title !== undefined) updateData.title = body.title
      if (body.slug !== undefined) {
        // Trim and normalize slugs for comparison
        const newSlug = body.slug.trim()
        const existingSlug = existingPage.slug.trim()
        
        // Check if new slug already exists (excluding current page)
        if (newSlug !== existingSlug) {
          const slugCheckContext = {
            userId: adminUser.id,
            operation: 'admin_cms_check_slug_conflict',
            reason: `Admin checking slug uniqueness for page ${id}`,
            source: 'admin/cms/pages/[id]',
            metadata: {
              endpoint: '/api/v1/admin/cms/pages/[id]',
              pageId: id,
              newSlug,
              existingSlug
            }
          }

          const slugConflict = await SecureServiceRoleWrapper.executeSecureOperation(
            slugCheckContext,
            {
              table: 'indb_cms_pages',
              operationType: 'select',
              columns: ['id', 'slug'],
              whereConditions: { slug: newSlug }
            },
            async () => {
              const { data, error } = await supabaseAdmin
                .from('indb_cms_pages')
                .select('id, slug')
                .eq('slug', newSlug)
                .neq('id', id)
                .single()

              if (error && error.code !== 'PGRST116') {
                throw new Error('Failed to check slug uniqueness')
              }

              return data
            }
          )

          if (slugConflict) {
            throw new Error(`Slug "${newSlug}" is already used by another page`)
          }
        }
        updateData.slug = newSlug
      }
      
      if (body.content !== undefined) {
        updateData.content = body.content ? sanitizeContent(body.content) : null
      }
      if (body.featured_image_url !== undefined) updateData.featured_image_url = body.featured_image_url || null
      
      if (body.status !== undefined) {
        updateData.status = body.status
        // Auto-set published_at when status changes to published
        if (body.status === 'published') {
          updateData.published_at = new Date().toISOString()
        } else if (body.status === 'draft' || body.status === 'archived') {
          updateData.published_at = null
        }
      }
      
      if (body.meta_title !== undefined) updateData.meta_title = body.meta_title || null
      if (body.meta_description !== undefined) updateData.meta_description = body.meta_description || null
      
      if (body.custom_css !== undefined) {
        updateData.custom_css = body.custom_css ? sanitizeCustomCSS(body.custom_css) : null
      }
      if (body.custom_js !== undefined) {
        updateData.custom_js = body.custom_js ? sanitizeCustomJS(body.custom_js) : null
      }

      // Always update the updated_at timestamp
      updateData.updated_at = new Date().toISOString()

      const updateContext = {
        userId: adminUser.id,
        operation: 'admin_cms_update_page',
        reason: `Admin updating CMS page ${id}`,
        source: 'admin/cms/pages/[id]',
        metadata: {
          endpoint: '/api/v1/admin/cms/pages/[id]',
          pageId: id,
          updatedFields: Object.keys(updateData)
        }
      }

      const page = await SecureServiceRoleWrapper.executeSecureOperation(
        updateContext,
        {
          table: 'indb_cms_pages',
          operationType: 'update',
          data: updateData,
          whereConditions: { id }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_cms_pages')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

          if (error || !data) {
            return null
          }

          return data
        }
      )

      if (!page) {
        throw new Error('Page not found')
      }

      return {
        page,
        message: 'Page updated successfully'
      }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/pages/[id]' }
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
    if (response.error.message.includes('already used')) {
      return createStandardError(
        ErrorType.VALIDATION,
        response.error.message,
        400,
        ErrorSeverity.LOW
      )
    }
    return response
  }

  return formatSuccess(response.data, undefined, 200)
})

export const DELETE = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const { id } = await params

  const response = await withDatabaseOperation(
    async () => {
      const deleteContext = {
        userId: adminUser.id,
        operation: 'admin_cms_delete_page',
        reason: `Admin deleting CMS page ${id}`,
        source: 'admin/cms/pages/[id]',
        metadata: {
          endpoint: '/api/v1/admin/cms/pages/[id]',
          pageId: id
        }
      }

      const page = await SecureServiceRoleWrapper.executeSecureOperation(
        deleteContext,
        {
          table: 'indb_cms_pages',
          operationType: 'delete',
          whereConditions: { id }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_cms_pages')
            .delete()
            .eq('id', id)
            .select()
            .single()

          if (error || !data) {
            return null
          }

          return data
        }
      )

      if (!page) {
        throw new Error('Page not found')
      }

      return {
        message: 'Page deleted successfully',
        page
      }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/pages/[id]' }
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

  return formatSuccess(response.data)
})

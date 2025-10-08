import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation, createStandardError, formatSuccess } from '@/lib/core/api-response-middleware'
import { supabaseAdmin } from '@/lib/database'
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
        operation: 'admin_cms_get_post_detail',
        reason: `Admin fetching CMS post details for post ${id}`,
        source: 'admin/cms/posts/[id]',
        metadata: {
          endpoint: '/api/v1/admin/cms/posts/[id]',
          postId: id
        }
      }

      const post = await SecureServiceRoleWrapper.executeSecureOperation(
        authContext,
        {
          table: 'indb_cms_posts',
          operationType: 'select',
          columns: ['*'],
          whereConditions: { id }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_cms_posts')
            .select('*')
            .eq('id', id)
            .single()

          if (error || !data) {
            return null
          }

          return data
        }
      )

      if (!post) {
        throw new Error('Post not found')
      }

      // Get author information
      let authorName = 'Unknown'
      let authorEmail = 'Unknown'
      
      if (post.author_id) {
        const profileContext = {
          userId: adminUser.id,
          operation: 'admin_cms_get_post_detail_author_profile',
          reason: `Admin fetching author profile for CMS post detail ${id}`,
          source: 'admin/cms/posts/[id]',
          metadata: {
            postId: id,
            authorId: post.author_id,
            endpoint: '/api/v1/admin/cms/posts/[id]'
          }
        }

        const authorProfile = await SecureServiceRoleWrapper.executeSecureOperation(
          profileContext,
          {
            table: 'indb_auth_user_profiles',
            operationType: 'select',
            columns: ['full_name', 'user_id'],
            whereConditions: { user_id: post.author_id }
          },
          async () => {
            const { data, error } = await supabaseAdmin
              .from('indb_auth_user_profiles')
              .select('full_name, user_id')
              .eq('user_id', post.author_id)
              .single()

            if (error) {
              throw new Error('Failed to fetch author profile')
            }

            return data
          }
        )

        if (authorProfile) {
          authorName = authorProfile.full_name || 'Unknown'
          try {
            const authContext = {
              userId: 'system',
              operation: 'admin_cms_get_post_detail_author_auth',
              reason: `Admin fetching author auth data for CMS post detail ${id}`,
              source: 'admin/cms/posts/[id]',
              metadata: {
                postId: id,
                authorId: authorProfile.user_id,
                endpoint: '/api/v1/admin/cms/posts/[id]'
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
          } catch (authFetchError) {
            logger.error({
              error: authFetchError instanceof Error ? authFetchError.message : 'Unknown error',
              userId: adminUser.id,
              postId: id,
              authorId: post.author_id,
              endpoint: '/api/v1/admin/cms/posts/[id]',
              method: 'GET'
            }, 'Failed to fetch auth data for author')
          }
        }
      }

      const postWithAuthor = {
        ...post,
        author_name: authorName,
        author_email: authorEmail,
        selectedCategories: post.categories || [],
        mainCategory: post.main_category_id
      }

      return { post: postWithAuthor }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/posts/[id]' }
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
      endpoint: '/api/v1/admin/cms/posts/[id]',
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
      // Build update object with only provided fields
      const updateData: any = {}
      
      if (body.title !== undefined) updateData.title = body.title
      if (body.slug !== undefined) updateData.slug = body.slug
      if (body.content !== undefined) updateData.content = body.content
      if (body.excerpt !== undefined) updateData.excerpt = body.excerpt
      if (body.featured_image_url !== undefined) updateData.featured_image_url = body.featured_image_url
      if (body.status !== undefined) {
        updateData.status = body.status
        // Auto-set published_at when status changes to published
        if (body.status === 'published') {
          updateData.published_at = new Date().toISOString()
        } else if (body.status === 'draft') {
          updateData.published_at = null
        }
      }
      if (body.post_type !== undefined) updateData.post_type = body.post_type
      if (body.meta_title !== undefined) updateData.meta_title = body.meta_title
      if (body.meta_description !== undefined) updateData.meta_description = body.meta_description
      if (body.tags !== undefined) updateData.tags = body.tags
      // Handle multiple categories - store directly in cms_posts table
      if (body.selectedCategories !== undefined) {
        updateData.categories = body.selectedCategories
      }
      
      if (body.mainCategory !== undefined) {
        updateData.main_category_id = body.mainCategory
      }

      // Always update the updated_at timestamp
      updateData.updated_at = new Date().toISOString()

      const updateContext = {
        userId: adminUser.id,
        operation: 'admin_cms_update_post',
        reason: `Admin updating CMS post ${id}`,
        source: 'admin/cms/posts/[id]',
        metadata: {
          endpoint: '/api/v1/admin/cms/posts/[id]',
          postId: id,
          updatedFields: Object.keys(updateData)
        }
      }

      const post = await SecureServiceRoleWrapper.executeSecureOperation(
        updateContext,
        {
          table: 'indb_cms_posts',
          operationType: 'update',
          data: updateData,
          whereConditions: { id }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_cms_posts')
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

      if (!post) {
        throw new Error('Post not found')
      }

      return { post }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/posts/[id]' }
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
        operation: 'admin_cms_delete_post',
        reason: `Admin deleting CMS post ${id}`,
        source: 'admin/cms/posts/[id]',
        metadata: {
          endpoint: '/api/v1/admin/cms/posts/[id]',
          postId: id
        }
      }

      const post = await SecureServiceRoleWrapper.executeSecureOperation(
        deleteContext,
        {
          table: 'indb_cms_posts',
          operationType: 'delete',
          whereConditions: { id }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_cms_posts')
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

      if (!post) {
        throw new Error('Post not found')
      }

      return {
        message: 'Post deleted successfully',
        post
      }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/posts/[id]' }
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

  return formatSuccess(response.data)
})

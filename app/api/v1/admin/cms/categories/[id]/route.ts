import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation, createStandardError, formatSuccess } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'
import slugify from 'slugify'

interface UpdateCategoryRequest {
  name?: string
  description?: string
  parent_id?: string
  is_active?: boolean
}

export const GET = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const response = await withDatabaseOperation(
    async () => {
      const category = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser.id,
          operation: 'get_cms_category_details',
          source: 'admin/cms/categories/[id]',
          reason: 'Admin fetching specific CMS category details',
          metadata: {
            categoryId: params.id,
            endpoint: '/api/v1/admin/cms/categories/[id]',
            method: 'GET'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_cms_categories', operationType: 'select' },
        async (supabase: any) => {
          const { data: categoryData, error } = await supabase
            .from('indb_cms_categories')
            .select(`
              *,
              parent:parent_id(id, name, slug),
              children:indb_cms_categories!parent_id(id, name, slug, post_count)
            `)
            .eq('id', params.id)
            .single()

          if (error) {
            throw new Error(`Failed to fetch category: ${error.message}`)
          }
          
          return categoryData
        }
      )

      if (!category) {
        throw new Error('Category not found')
      }

      return { category }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/categories/[id]' }
  )

  if (!response.success) {
    if (response.error.message.includes('not found')) {
      return createStandardError(
        ErrorType.AUTHORIZATION,
        'Category not found',
        404,
        ErrorSeverity.LOW
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
  const body: UpdateCategoryRequest = await request.json()

  const response = await withDatabaseOperation(
    async () => {
      const category = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser.id,
          operation: 'update_cms_category',
          source: 'admin/cms/categories/[id]',
          reason: 'Admin updating CMS category details',
          metadata: {
            categoryId: params.id,
            updateFields: Object.keys(body),
            endpoint: '/api/v1/admin/cms/categories/[id]',
            method: 'PUT'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_cms_categories', operationType: 'update' },
        async (supabase: any) => {
          // Get existing category
          const { data: existing, error: fetchError } = await supabase
            .from('indb_cms_categories')
            .select('*')
            .eq('id', params.id)
            .single()

          if (fetchError || !existing) {
            throw new Error('Category not found')
          }

          const updateData: any = {}

          // Update name and slug if provided
          if (body.name && body.name.trim() !== existing.name) {
            const newSlug = slugify(body.name, { lower: true, strict: true })
            
            // Check for duplicate slug
            const { data: duplicate } = await supabase
              .from('indb_cms_categories')
              .select('id')
              .eq('slug', newSlug)
              .neq('id', params.id)
              .single()

            if (duplicate) {
              throw new Error('A category with this name already exists')
            }

            updateData.name = body.name.trim()
            updateData.slug = newSlug
          }

          // Update description
          if (body.description !== undefined) {
            updateData.description = body.description?.trim() || null
          }

          // Update parent_id
          if (body.parent_id !== undefined) {
            if (body.parent_id === params.id) {
              throw new Error('Category cannot be parent of itself')
            }

            if (body.parent_id) {
              // Validate parent exists
              const { data: parent } = await supabase
                .from('indb_cms_categories')
                .select('id')
                .eq('id', body.parent_id)
                .eq('is_active', true)
                .single()

              if (!parent) {
                throw new Error('Parent category not found')
              }
            }

            updateData.parent_id = body.parent_id || null
          }

          // Update active status
          if (body.is_active !== undefined) {
            updateData.is_active = body.is_active
          }

          // Add updated timestamp
          updateData.updated_at = new Date().toISOString()

          // Update category
          const { data: categoryData, error } = await supabase
            .from('indb_cms_categories')
            .update(updateData)
            .eq('id', params.id)
            .select()
            .single()

          if (error) {
            throw new Error(`Failed to update category: ${error.message}`)
          }

          return categoryData
        }
      )

      return {
        message: 'Category updated successfully',
        category
      }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/categories/[id]' }
  )

  if (!response.success) {
    return response
  }

  return formatSuccess(response.data, undefined, 200)
})

export const DELETE = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const response = await withDatabaseOperation(
    async () => {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser.id,
          operation: 'delete_cms_category',
          source: 'admin/cms/categories/[id]',
          reason: 'Admin deleting CMS category after validation',
          metadata: {
            categoryId: params.id,
            endpoint: '/api/v1/admin/cms/categories/[id]',
            method: 'DELETE'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_cms_categories', operationType: 'delete' },
        async (supabase: any) => {
          // Check if category has posts
          const { data: postCount } = await supabase
            .from('indb_cms_post_categories')
            .select('id', { count: 'exact' })
            .eq('category_id', params.id)

          if (postCount && postCount.length > 0) {
            throw new Error('Cannot delete category with associated posts. Move posts to another category first.')
          }

          // Check if category has children
          const { data: children } = await supabase
            .from('indb_cms_categories')
            .select('id')
            .eq('parent_id', params.id)

          if (children && children.length > 0) {
            throw new Error('Cannot delete category with child categories. Delete or move child categories first.')
          }

          // Delete category
          const { error } = await supabase
            .from('indb_cms_categories')
            .delete()
            .eq('id', params.id)

          if (error) {
            throw new Error(`Failed to delete category: ${error.message}`)
          }

          return { deleted: true }
        }
      )

      return { message: 'Category deleted successfully' }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/categories/[id]' }
  )

  if (!response.success) {
    return response
  }

  return formatSuccess(response.data)
})

import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation, createStandardError, formatSuccess } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'
import slugify from 'slugify'

interface CreateCategoryRequest {
  name: string
  description?: string
  parent_id?: string
}

export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const { searchParams } = new URL(request.url)
  const include_inactive = searchParams.get('include_inactive') === 'true'

  const response = await withDatabaseOperation(
    async () => {
      const { categories, total } = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser.id,
          operation: 'get_cms_categories',
          source: 'admin/cms/categories',
          reason: 'Admin fetching CMS categories list with hierarchy',
          metadata: {
            includeInactive: include_inactive,
            endpoint: '/api/v1/admin/cms/categories',
            method: 'GET'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_cms_categories', operationType: 'select' },
        async (supabase: any) => {
          let query = supabase
            .from('indb_cms_categories')
            .select(`
              *,
              parent:parent_id(id, name, slug),
              children:indb_cms_categories!parent_id(id, name, slug, post_count)
            `)
            .order('name')

          if (!include_inactive) {
            query = query.eq('is_active', true)
          }

          const { data: categoriesData, error } = await query

          if (error) {
            throw new Error(`Failed to fetch categories: ${error.message}`)
          }

          // Organize into hierarchy
          const rootCategories = categoriesData?.filter((cat: any) => !cat.parent_id) || []
          const childCategories = categoriesData?.filter((cat: any) => cat.parent_id) || []

          // Build hierarchy
          const hierarchy = rootCategories.map((parent: any) => ({
            ...parent,
            children: childCategories.filter((child: any) => child.parent_id === parent.id)
          }))

          return {
            categories: hierarchy,
            total: categoriesData?.length || 0
          }
        }
      )

      return { categories, total }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/categories' }
  )

  if (!response.success) {
    return response
  }

  return formatSuccess(response.data)
})

export const POST = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const body: CreateCategoryRequest = await request.json()

  // Validate required fields
  if (!body.name || body.name.trim() === '') {
    return createStandardError(
      ErrorType.VALIDATION,
      'Category name is required',
      400,
      ErrorSeverity.LOW,
      { field: 'name' }
    )
  }

  // Generate slug
  const slug = slugify(body.name, { lower: true, strict: true })

  const response = await withDatabaseOperation(
    async () => {
      const category = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser.id,
          operation: 'create_cms_category',
          source: 'admin/cms/categories',
          reason: 'Admin creating new CMS category',
          metadata: {
            categoryName: body.name.trim(),
            slug,
            parentId: body.parent_id,
            endpoint: '/api/v1/admin/cms/categories',
            method: 'POST'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_cms_categories', operationType: 'insert' },
        async (supabase: any) => {
          // Check for duplicate slug
          const { data: existing } = await supabase
            .from('indb_cms_categories')
            .select('id')
            .eq('slug', slug)
            .single()

          if (existing) {
            throw new Error('A category with this name already exists')
          }

          // Validate parent category if provided
          if (body.parent_id) {
            const { data: parent, error: parentError } = await supabase
              .from('indb_cms_categories')
              .select('id')
              .eq('id', body.parent_id)
              .eq('is_active', true)
              .single()

            if (parentError || !parent) {
              throw new Error('Parent category not found')
            }
          }

          // Create category
          const { data: categoryData, error } = await supabase
            .from('indb_cms_categories')
            .insert({
              name: body.name.trim(),
              slug,
              description: body.description?.trim() || null,
              parent_id: body.parent_id || null
            })
            .select()
            .single()

          if (error) {
            throw new Error(`Failed to create category: ${error.message}`)
          }

          return categoryData
        }
      )

      return {
        message: 'Category created successfully',
        category
      }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/categories' }
  )

  if (!response.success) {
    return response
  }

  return formatSuccess(response.data, undefined, 201)
})

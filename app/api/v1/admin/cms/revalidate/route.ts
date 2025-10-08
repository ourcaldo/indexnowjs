import { NextRequest } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { adminApiWrapper, withDatabaseOperation, createStandardError, formatSuccess } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database'
import { ErrorType, ErrorSeverity, logger } from '@/lib/monitoring/error-handling'

export const POST = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const body = await request.json()
  const { type, paths, tags } = body

  const revalidated: string[] = []

  if (type === 'path' && paths && Array.isArray(paths)) {
    // Revalidate specific paths
    for (const path of paths) {
      try {
        revalidatePath(path)
        revalidated.push(path)
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          path: path,
          endpoint: '/api/v1/admin/cms/revalidate',
          method: 'POST'
        }, `Failed to revalidate path ${path}`)
      }
    }
  } else if (type === 'tag' && tags && Array.isArray(tags)) {
    // Revalidate by tags
    for (const tag of tags) {
      try {
        revalidateTag(tag)
        revalidated.push(tag)
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          tag: tag,
          endpoint: '/api/v1/admin/cms/revalidate',
          method: 'POST'
        }, `Failed to revalidate tag ${tag}`)
      }
    }
  } else if (type === 'page') {
    // Revalidate specific page and related paths
    const { slug, is_homepage } = body
    
    if (slug) {
      try {
        // Revalidate the specific page
        revalidatePath(`/${slug}`)
        revalidated.push(`/${slug}`)

        // If this is the homepage, also revalidate the root path
        if (is_homepage) {
          revalidatePath('/')
          revalidated.push('/')
        }
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          slug: slug,
          endpoint: '/api/v1/admin/cms/revalidate',
          method: 'POST'
        }, `Failed to revalidate page ${slug}`)
      }
    }
  } else if (type === 'homepage') {
    // Revalidate homepage specifically
    try {
      revalidatePath('/')
      revalidated.push('/')
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: '/api/v1/admin/cms/revalidate',
        method: 'POST'
      }, 'Failed to revalidate homepage')
    }
  } else if (type === 'all-pages') {
    // Revalidate all pages
    const response = await withDatabaseOperation(
      async () => {
        const pagesContext = {
          userId: adminUser.id,
          operation: 'admin_cms_revalidate_get_pages',
          reason: 'CMS revalidate getting all published pages for cache invalidation',
          source: 'admin/cms/revalidate',
          metadata: {
            endpoint: '/api/v1/admin/cms/revalidate',
            revalidationType: 'all-pages'
          }
        }

        const pages = await SecureServiceRoleWrapper.executeSecureOperation(
          pagesContext,
          {
            table: 'indb_cms_pages',
            operationType: 'select',
            columns: ['slug', 'is_homepage'],
            whereConditions: { status: 'published' }
          },
          async () => {
            const { data, error } = await supabaseAdmin
              .from('indb_cms_pages')
              .select('slug, is_homepage')
              .eq('status', 'published')

            if (error) {
              throw new Error('Failed to fetch pages')
            }

            return data
          }
        )

        if (pages) {
          for (const page of pages) {
            revalidatePath(`/${page.slug}`)
            revalidated.push(`/${page.slug}`)
            
            if (page.is_homepage) {
              revalidatePath('/')
              revalidated.push('/')
            }
          }
        }

        return { revalidated }
      },
      { userId: adminUser.id, endpoint: '/api/v1/admin/cms/revalidate' }
    )

    if (!response.success) {
      return response
    }
  } else {
    return createStandardError(
      ErrorType.VALIDATION,
      'Invalid revalidation type. Use "path", "tag", "page", "homepage", or "all-pages"',
      400,
      ErrorSeverity.LOW,
      { allowedTypes: ['path', 'tag', 'page', 'homepage', 'all-pages'] }
    )
  }

  return formatSuccess({
    success: true,
    message: `Successfully revalidated ${revalidated.length} items`,
    revalidated
  }, undefined, 201)
})

export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const response = await withDatabaseOperation(
    async () => {
      // Get published pages count
      const countContext = {
        userId: adminUser.id,
        operation: 'admin_cms_revalidate_get_pages_count',
        reason: 'CMS revalidate info getting published pages count',
        source: 'admin/cms/revalidate',
        metadata: {
          endpoint: '/api/v1/admin/cms/revalidate'
        }
      }

      const count = await SecureServiceRoleWrapper.executeSecureOperation(
        countContext,
        {
          table: 'indb_cms_pages',
          operationType: 'select',
          whereConditions: { status: 'published' }
        },
        async () => {
          const { count, error } = await supabaseAdmin
            .from('indb_cms_pages')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published')

          if (error) {
            throw new Error('Failed to count pages')
          }

          return count
        }
      )

      return {
        available_types: [
          'path',    // Revalidate specific paths
          'tag',     // Revalidate by cache tags
          'page',    // Revalidate specific page
          'homepage', // Revalidate homepage
          'all-pages' // Revalidate all published pages
        ],
        published_pages_count: count || 0,
        revalidation_info: {
          homepage_revalidation: '30 minutes (1800 seconds)',
          page_revalidation: '1 hour (3600 seconds)',
          manual_revalidation: 'Available via this API'
        }
      }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/cms/revalidate' }
  )

  if (!response.success) {
    return response
  }

  return formatSuccess(response.data)
})

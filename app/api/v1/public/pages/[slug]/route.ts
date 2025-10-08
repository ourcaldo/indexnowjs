import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType } from '@/lib/monitoring/error-handling'
import { logger } from '@/lib/monitoring/error-handling'

export const GET = publicApiWrapper(async (
  request: NextRequest, 
  _context: any,
  { params }: { params: Promise<{ slug: string }> } = {} as any
) => {
  try {
    const { slug } = await params
    
    if (!slug) {
      const error = ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        new Error('Page slug is required'),
        { statusCode: 400 }
      )
      return formatError(error)
    }
    
    // Fetch the page and author information using secure operation
    const { page, authorName } = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'fetch_public_page_by_slug',
        source: 'public/pages/[slug]',
        reason: 'Fetching published CMS page by slug for public website display',
        metadata: {
          slug,
          endpoint: '/api/v1/public/pages/[slug]'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'indb_cms_pages', operationType: 'select' },
      async () => {
        // Fetch the page with author information
        const { data: page, error: pageError } = await supabaseAdmin
          .from('indb_cms_pages')
          .select(`
            id,
            title,
            slug,
            content,
            template,
            featured_image_url,
            meta_title,
            meta_description,
            custom_css,
            custom_js,
            published_at,
            author_id
          `)
          .eq('slug', slug)
          .eq('status', 'published')
          .not('published_at', 'is', null)
          .single()
        
        if (pageError || !page) {
          if (pageError?.code === 'PGRST116') {
            throw new Error('Page not found')
          }
          throw new Error(`Failed to fetch page: ${pageError?.message || 'Unknown error'}`)
        }
        
        // Fetch author information
        let authorName = 'Unknown'
        if (page.author_id) {
          const { data: author } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select('user_id, full_name')
            .eq('user_id', page.author_id)
            .single()
          
          if (author?.full_name) {
            authorName = author.full_name
          }
        }

        return { page, authorName }
      }
    )

    if (!page) {
      const error = ErrorHandlingService.createError(
        ErrorType.NOT_FOUND,
        new Error('Page not found'),
        { statusCode: 404 }
      )
      return formatError(error)
    }

    // Transform the page data for public consumption
    const publicPage = {
      id: page.id,
      title: page.title,
      slug: page.slug,
      content: page.content || '',
      template: page.template,
      featured_image_url: page.featured_image_url,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      custom_css: page.custom_css,
      custom_js: page.custom_js,
      published_at: page.published_at,
      author_name: authorName
    }

    return formatSuccess({ page: publicPage })
    
  } catch (error) {
    if (error && typeof error === 'object' && 'type' in error) {
      return formatError(error as any)
    }
    
    const structuredError = ErrorHandlingService.createError(
      ErrorType.INTERNAL,
      error as Error,
      { statusCode: 500, context: { endpoint: '/api/v1/public/pages/[slug]' } }
    )
    return formatError(structuredError)
  }
})

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

export const GET = publicApiWrapper(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '12')
  const template = searchParams.get('template') || ''
  const search = searchParams.get('search') || ''

  const offset = (page - 1) * limit

  // Fetch published pages using secure operation
  const { pages, count } = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: 'system',
      operation: 'fetch_public_pages',
      source: 'public/pages',
      reason: 'Fetching published CMS pages for public website display',
      metadata: {
        page,
        limit,
        template,
        search,
        endpoint: '/api/v1/public/pages'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent') || undefined
    },
    { table: 'indb_cms_pages', operationType: 'select' },
    async () => {
      // Build query for published pages only
      let query = supabaseAdmin
        .from('indb_cms_pages')
        .select(`
          id,
          title,
          slug,
          template,
          featured_image_url,
          meta_title,
          meta_description,
          published_at
        `, { count: 'exact' })
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Apply template filter if provided
      if (template && template !== 'all') {
        query = query.eq('template', template)
      }

      // Apply search filter if provided
      if (search) {
        query = query.or(`title.ilike.%${search}%,meta_title.ilike.%${search}%,meta_description.ilike.%${search}%`)
      }

      const { data: pages, error, count } = await query

      if (error) {
        throw new Error(`Failed to fetch public pages: ${error.message}`)
      }

      return { pages: pages || [], count: count || 0 }
    }
  )

  return formatSuccess({ 
    pages: pages || [],
    total: count || 0,
    page,
    limit,
    hasNext: (count || 0) > offset + limit,
    hasPrev: page > 1
  })
})

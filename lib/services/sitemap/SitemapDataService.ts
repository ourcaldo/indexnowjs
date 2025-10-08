import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'

export class SitemapDataService {
  async getPosts(page: number = 1, limit: number = 5000): Promise<any[]> {
    const startTime = Date.now()
    
    try {
      const offset = (page - 1) * limit

      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_published_posts_for_sitemap',
          reason: 'Retrieving published posts data for public sitemap generation',
          source: 'services/sitemap/SitemapDataService',
          metadata: {
            page: page,
            limit: limit,
            offset: offset,
            operation_type: 'sitemap_generation'
          }
        },
        {
          table: 'indb_cms_posts',
          operationType: 'select',
          columns: ['id', 'title', 'slug', 'updated_at', 'published_at', 'main_category_id'],
          whereConditions: { status: 'published' }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_cms_posts')
            .select(`
              id,
              title,
              slug,
              updated_at,
              published_at,
              main_category_id,
              indb_cms_categories!main_category_id (
                slug
              )
            `)
            .eq('status', 'published')
            .not('published_at', 'is', null)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1)

          if (error) {
            throw new Error(`Failed to fetch posts for sitemap: ${error.message}`);
          }

          return data || []
        }
      )

      const endTime = Date.now()
      console.log(`[PERF] Posts sitemap query took ${endTime - startTime}ms for page ${page}`)

      return data
    } catch (error) {
      console.error('Failed to fetch posts for sitemap:', error)
      return []
    }
  }

  async getCategories(): Promise<any[]> {
    const startTime = Date.now()
    
    try {
      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_categories_for_sitemap',
          reason: 'Retrieving categories data for public sitemap generation',
          source: 'services/sitemap/SitemapDataService',
          metadata: {
            operation_type: 'sitemap_generation'
          }
        },
        {
          table: 'indb_cms_categories',
          operationType: 'select',
          columns: ['id', 'name', 'slug', 'updated_at']
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_cms_categories')
            .select('id, name, slug, updated_at')
            .order('updated_at', { ascending: false })

          if (error) {
            throw new Error(`Failed to fetch categories for sitemap: ${error.message}`);
          }

          return data || []
        }
      )

      const endTime = Date.now()
      console.log(`[PERF] Categories sitemap query took ${endTime - startTime}ms`)

      return data
    } catch (error) {
      console.error('Failed to fetch categories for sitemap:', error)
      return []
    }
  }

  async getTagsFromPosts(): Promise<string[]> {
    const startTime = Date.now()
    
    try {
      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_tags_from_posts_for_sitemap',
          reason: 'Retrieving tags from published posts for public sitemap generation',
          source: 'services/sitemap/SitemapDataService',
          metadata: {
            operation_type: 'sitemap_generation'
          }
        },
        {
          table: 'indb_cms_posts',
          operationType: 'select',
          columns: ['tags', 'updated_at'],
          whereConditions: { status: 'published' }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_cms_posts')
            .select('tags, updated_at')
            .eq('status', 'published')
            .not('tags', 'is', null)
            .order('updated_at', { ascending: false })

          if (error) {
            throw new Error(`Failed to fetch tags for sitemap: ${error.message}`);
          }

          return data
        }
      )

      const endTime = Date.now()
      console.log(`[PERF] Tags sitemap query took ${endTime - startTime}ms`)

      // Extract and flatten all tags with timestamps for last update
      const tagMap = new Map<string, string>()
      data?.forEach(post => {
        if (Array.isArray(post.tags)) {
          post.tags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              const cleanTag = tag.trim()
              // Keep the most recent update time for each tag
              if (!tagMap.has(cleanTag) || post.updated_at > tagMap.get(cleanTag)!) {
                tagMap.set(cleanTag, post.updated_at)
              }
            }
          })
        }
      })

      // Return unique tags
      return Array.from(tagMap.keys())
    } catch (error) {
      console.error('Failed to fetch tags for sitemap:', error)
      return []
    }
  }

  async getTotalPostsCount(): Promise<number> {
    try {
      const count = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_total_posts_count_for_sitemap',
          reason: 'Counting published posts for sitemap pagination calculation',
          source: 'services/sitemap/SitemapDataService',
          metadata: {
            operation_type: 'sitemap_generation'
          }
        },
        {
          table: 'indb_cms_posts',
          operationType: 'select',
          columns: ['id'],
          whereConditions: { status: 'published' }
        },
        async () => {
          const { count, error } = await supabaseAdmin
            .from('indb_cms_posts')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published')

          if (error) {
            throw new Error(`Failed to get posts count: ${error.message}`);
          }

          return count || 0
        }
      )

      return count
    } catch (error) {
      console.error('Failed to get posts count:', error)
      return 0
    }
  }
}
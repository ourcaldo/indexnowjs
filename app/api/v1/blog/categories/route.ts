import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType } from '@/lib/monitoring/error-handling'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'

export const GET = publicApiWrapper(async () => {
    // Fetch blog categories with post counts using secure operation
    const categoriesWithCounts = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'fetch_blog_categories_with_counts',
        source: 'blog/categories',
        reason: 'Fetching blog categories with post counts for public blog display',
        metadata: {
          endpoint: '/api/v1/blog/categories'
        }
      },
      { table: 'indb_cms_categories', operationType: 'select' },
      async () => {
        // Get all active categories first
        const { data: categories, error } = await supabaseAdmin
          .from('indb_cms_categories')
          .select('id, name, slug')
          .eq('is_active', true)
          .order('name')
        
        if (error) {
          throw new Error(`Failed to fetch categories: ${error.message}`)
        }
        
        if (!categories || categories.length === 0) {
          return []
        }
        
        // For each category, count how many published posts it has
        const categoriesWithCounts = await Promise.all(
          categories.map(async (category) => {
            const { count } = await supabaseAdmin
              .from('indb_cms_posts')
              .select('*', { count: 'exact', head: true })
              .eq('main_category_id', category.id)
              .eq('status', 'published')
              .not('published_at', 'is', null)
            
            return {
              id: category.id,
              name: category.name,
              slug: category.slug,
              count: count || 0
            }
          })
        )
        
        // Filter to only show categories with posts
        return categoriesWithCounts.filter(cat => cat.count > 0)
      }
    )
    
    return formatSuccess({
      categories: categoriesWithCounts
    })
})
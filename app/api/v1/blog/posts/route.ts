import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

export const GET = publicApiWrapper(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const tag = searchParams.get('tag')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    
    const offset = (page - 1) * limit
    
    // Fetch blog posts using SecureWrapper for admin operations
    const posts = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'fetch_published_blog_posts',
        reason: 'Public API - fetching published blog posts for display',
        source: 'app/api/v1/blog/posts/route.ts',
        metadata: { page, limit, tag, category, search }
      },
      {
        table: 'indb_cms_posts',
        operationType: 'select'
      },
      async () => {
        // Build the query with category names from join
        let query = supabaseAdmin
          .from('indb_cms_posts')
          .select(`
            id,
            title,
            slug,
            content,
            excerpt,
            featured_image_url,
            meta_title,
            meta_description,
            tags,
            post_type,
            published_at,
            created_at,
            author_id,
            main_category:indb_cms_categories!main_category_id(id, name, slug)
          `)
          .eq('status', 'published')
          .not('published_at', 'is', null)
          .order('published_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        // Apply tag filter if provided
        if (tag) {
          // Clean the tag parameter and ensure proper JSON formatting
          const cleanTag = String(tag).trim().replace(/^"|"$/g, '')
          const tagJson = JSON.stringify([cleanTag])
          query = query.filter('tags', 'cs', tagJson)
        }
        
        // Apply category filter if provided (support both old and new category system)
        if (category) {
          // First try new category system by slug - using separate SecureWrapper call
          const categoryData = await SecureServiceRoleWrapper.executeSecureOperation(
            {
              userId: 'system',
              operation: 'fetch_category_by_slug',
              reason: 'Finding category ID for blog post filtering',
              source: 'app/api/v1/blog/posts/route.ts',
              metadata: { categorySlug: category }
            },
            {
              table: 'indb_cms_categories',
              operationType: 'select'
            },
            async () => {
              const { data, error } = await supabaseAdmin
                .from('indb_cms_categories')
                .select('id')
                .eq('slug', category)
                .single()
              
              if (error && error.code !== 'PGRST116') throw error
              return data
            }
          )
          
          if (categoryData) {
            query = query.eq('main_category_id', categoryData.id)
          }
        }
        
        // Apply search filter if provided
        if (search) {
          query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
        }
        
        const { data, error } = await query
        if (error) throw error
        return data || []
      }
    )
    
    // Get total count for pagination with same filters using SecureWrapper
    const totalCount = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'count_published_blog_posts',
        reason: 'Public API - counting published blog posts for pagination',
        source: 'app/api/v1/blog/posts/route.ts',
        metadata: { tag, category, search }
      },
      {
        table: 'indb_cms_posts',
        operationType: 'select'
      },
      async () => {
        let totalQuery = supabaseAdmin
          .from('indb_cms_posts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published')
          .not('published_at', 'is', null)
        
        // Apply same filters to total count
        if (tag) {
          // Clean the tag parameter and ensure proper JSON formatting
          const cleanTag = String(tag).trim().replace(/^"|"$/g, '')
          const tagJson = JSON.stringify([cleanTag])
          totalQuery = totalQuery.filter('tags', 'cs', tagJson)
        }
        
        if (category) {
          // Use the same category lookup approach as above
          const categoryData = await SecureServiceRoleWrapper.executeSecureOperation(
            {
              userId: 'system',
              operation: 'fetch_category_by_slug_for_count',
              reason: 'Finding category ID for blog post count filtering',
              source: 'app/api/v1/blog/posts/route.ts',
              metadata: { categorySlug: category }
            },
            {
              table: 'indb_cms_categories',
              operationType: 'select'
            },
            async () => {
              const { data, error } = await supabaseAdmin
                .from('indb_cms_categories')
                .select('id')
                .eq('slug', category)
                .single()
              
              if (error && error.code !== 'PGRST116') throw error
              return data
            }
          )
          
          if (categoryData) {
            totalQuery = totalQuery.eq('main_category_id', categoryData.id)
          }
        }
        
        if (search) {
          totalQuery = totalQuery.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
        }
        
        const { count, error } = await totalQuery
        if (error) throw error
        return count || 0
      }
    )
    
    const totalPages = Math.ceil((totalCount || 0) / limit)
    
    // Fetch author information for posts using SecureWrapper
    const authorIds = posts?.map(post => post.author_id).filter(Boolean) || []
    let authorsMap: Record<string, any> = {}
    
    if (authorIds.length > 0) {
      const authors = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'fetch_blog_post_authors',
          reason: 'Public API - fetching author information for blog posts',
          source: 'app/api/v1/blog/posts/route.ts',
          metadata: { authorIds, postCount: posts?.length }
        },
        {
          table: 'indb_auth_user_profiles',
          operationType: 'select'
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select('user_id, full_name, email')
            .in('user_id', authorIds)
          
          if (error) throw error
          return data || []
        }
      )
      
      if (authors) {
        authorsMap = authors.reduce((map, author) => {
          map[author.user_id] = author
          return map
        }, {} as Record<string, any>)
      }
    }
    
    // Transform the data to include author and category information
    const transformedPosts = posts?.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || post.content?.substring(0, 200) + '...',
      featured_image_url: post.featured_image_url,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      tags: post.tags || [],
      category: (post as any).main_category?.slug || 'uncategorized',
      category_name: (post as any).main_category?.name || 'Uncategorized',
      post_type: post.post_type || 'post',
      published_at: post.published_at,
      created_at: post.created_at,
      author: {
        name: authorsMap[post.author_id]?.full_name || 'IndexNow Studio Team',
        avatar_url: null
      }
    })) || []
    
    return formatSuccess({
      posts: transformedPosts,
      pagination: {
        current_page: page,
        per_page: limit,
        total_posts: totalCount || 0,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      },
      filters: {
        tag: tag || null,
        category: category || null,
        search: search || null
      }
    })
})
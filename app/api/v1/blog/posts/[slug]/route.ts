import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType } from '@/lib/monitoring/error-handling'

export const GET = publicApiWrapper(async (
  request: NextRequest,
  _context: any,
  { params }: { params: Promise<{ slug: string }> } = {} as any
) => {
    const { slug } = await params
    
    if (!slug) {
      const error = ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        new Error('Post slug is required'),
        { statusCode: 400 }
      )
      return formatError(error)
    }
    
    // Fetch the main post with category slug from join using SecureWrapper
    const post = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'fetch_published_blog_post_by_slug',
        reason: 'Public API - fetching single published blog post for display',
        source: 'app/api/v1/blog/posts/[slug]/route.ts',
        metadata: { slug }
      },
      {
        table: 'indb_cms_posts',
        operationType: 'select'
      },
      async () => {
        const { data, error } = await supabaseAdmin
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
            updated_at,
            author_id,
            main_category:indb_cms_categories!main_category_id(slug)
          `)
          .eq('slug', slug)
          .eq('status', 'published')
          .not('published_at', 'is', null)
          .single()
        
        if (error) {
          if (error.code === 'PGRST116') {
            // Post not found - return null to handle in outer scope
            return null
          }
          throw error
        }
        
        return data
      }
    )
    
    if (!post) {
      const error = ErrorHandlingService.createError(
        ErrorType.NOT_FOUND,
        new Error('Post not found'),
        { statusCode: 404 }
      )
      return formatError(error)
    }
    
    // Fetch related posts (same tags, excluding current post) using SecureWrapper
    const relatedPosts = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'fetch_related_blog_posts',
        reason: 'Public API - fetching related blog posts for single post display',
        source: 'app/api/v1/blog/posts/[slug]/route.ts',
        metadata: { postId: post.id, slug }
      },
      {
        table: 'indb_cms_posts',
        operationType: 'select'
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_cms_posts')
          .select(`
            id,
            title,
            slug,
            excerpt,
            featured_image_url,
            tags,
            published_at
          `)
          .eq('status', 'published')
          .not('published_at', 'is', null)
          .neq('id', post.id)
          .order('published_at', { ascending: false })
          .limit(3)
        
        if (error) throw error
        return data || []
      }
    )
    
    // Fetch author information using SecureWrapper
    let authorData = null
    if (post.author_id) {
      authorData = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'fetch_blog_post_author',
          reason: 'Public API - fetching author information for single blog post',
          source: 'app/api/v1/blog/posts/[slug]/route.ts',
          metadata: { authorId: post.author_id, slug }
        },
        {
          table: 'indb_auth_user_profiles',
          operationType: 'select'
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select('user_id, full_name, email')
            .eq('user_id', post.author_id)
            .single()
          
          if (error && error.code !== 'PGRST116') throw error
          return data
        }
      )
    }

    // Transform the main post data
    const transformedPost = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content || '',
      excerpt: post.excerpt,
      featured_image_url: post.featured_image_url,
      meta_title: post.meta_title || post.title,
      meta_description: post.meta_description || post.excerpt,
      tags: post.tags || [],
      category: post.main_category?.slug || 'uncategorized',
      post_type: post.post_type || 'post',
      published_at: post.published_at,
      created_at: post.created_at,
      updated_at: post.updated_at,
      author: {
        name: authorData?.full_name || 'IndexNow Studio Team',
        avatar_url: null
      }
    }
    
    // Transform related posts
    const transformedRelatedPosts = relatedPosts?.map(relatedPost => ({
      id: relatedPost.id,
      title: relatedPost.title,
      slug: relatedPost.slug,
      excerpt: relatedPost.excerpt || '',
      featured_image_url: relatedPost.featured_image_url,
      tags: relatedPost.tags || [],
      published_at: relatedPost.published_at,
      author: {
        name: 'IndexNow Studio Team'
      }
    })) || []
    
    return formatSuccess({
      post: transformedPost,
      related_posts: transformedRelatedPosts
    })
})
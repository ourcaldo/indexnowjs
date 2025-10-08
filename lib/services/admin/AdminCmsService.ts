/**
 * Admin CMS Service
 * 
 * Refactored service layer for CMS operations (posts and pages)
 * Handles all database interactions with proper error handling and security logging
 */

import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database'

export interface CMSPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  featured_image?: string
  status: string
  author_id: string
  created_at: string
  updated_at: string
  published_at?: string
}

export interface CMSPostWithAuthor extends CMSPost {
  author_name: string
  author_email: string
}

export interface CMSPage {
  id: string
  title: string
  slug: string
  content: string
  status: string
  created_at: string
  updated_at: string
  published_at?: string
}

export class AdminCmsService {
  /**
   * Get all CMS posts with author information
   */
  static async getAllPostsWithAuthors(adminUserId: string): Promise<CMSPostWithAuthor[]> {
    const authContext = {
      userId: adminUserId,
      operation: 'admin_cms_get_all_posts',
      reason: 'Admin fetching all CMS posts for content management',
      source: 'AdminCmsService',
      metadata: { endpoint: '/api/v1/admin/cms/posts' }
    }

    // Fetch all posts
    const posts = await SecureServiceRoleWrapper.executeSecureOperation(
      authContext,
      {
        table: 'indb_cms_posts',
        operationType: 'select',
        columns: ['*']
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_cms_posts')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return data
      }
    )

    // Enrich with author data
    const postsWithAuthors: CMSPostWithAuthor[] = []

    for (const post of posts || []) {
      const authorData = await this.getAuthorData(adminUserId, post.author_id, post.id)
      
      postsWithAuthors.push({
        ...post,
        author_name: authorData.name,
        author_email: authorData.email
      })
    }

    return postsWithAuthors
  }

  /**
   * Get a single CMS post by ID with author information
   */
  static async getPostById(adminUserId: string, postId: string): Promise<CMSPostWithAuthor> {
    const authContext = {
      userId: adminUserId,
      operation: 'admin_cms_get_post_by_id',
      reason: `Admin fetching CMS post ${postId}`,
      source: 'AdminCmsService',
      metadata: { postId, endpoint: '/api/v1/admin/cms/posts' }
    }

    const post = await SecureServiceRoleWrapper.executeSecureOperation(
      authContext,
      {
        table: 'indb_cms_posts',
        operationType: 'select',
        columns: ['*'],
        whereConditions: { id: postId }
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_cms_posts')
          .select('*')
          .eq('id', postId)
          .single()

        if (error) throw error
        if (!data) throw new Error('Post not found')
        return data
      }
    )

    const authorData = await this.getAuthorData(adminUserId, post.author_id, postId)

    return {
      ...post,
      author_name: authorData.name,
      author_email: authorData.email
    }
  }

  /**
   * Create a new CMS post
   */
  static async createPost(
    adminUserId: string,
    postData: Omit<CMSPost, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CMSPost> {
    const authContext = {
      userId: adminUserId,
      operation: 'admin_cms_create_post',
      reason: 'Admin creating new CMS post',
      source: 'AdminCmsService',
      metadata: { endpoint: '/api/v1/admin/cms/posts' }
    }

    const post = await SecureServiceRoleWrapper.executeSecureOperation(
      authContext,
      {
        table: 'indb_cms_posts',
        operationType: 'insert',
        data: postData
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_cms_posts')
          .insert(postData)
          .select()
          .single()

        if (error) throw error
        return data
      }
    )

    return post
  }

  /**
   * Update an existing CMS post
   */
  static async updatePost(
    adminUserId: string,
    postId: string,
    postData: Partial<CMSPost>
  ): Promise<CMSPost> {
    const authContext = {
      userId: adminUserId,
      operation: 'admin_cms_update_post',
      reason: `Admin updating CMS post ${postId}`,
      source: 'AdminCmsService',
      metadata: { postId, endpoint: '/api/v1/admin/cms/posts' }
    }

    const post = await SecureServiceRoleWrapper.executeSecureOperation(
      authContext,
      {
        table: 'indb_cms_posts',
        operationType: 'update',
        data: postData,
        whereConditions: { id: postId }
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_cms_posts')
          .update(postData)
          .eq('id', postId)
          .select()
          .single()

        if (error) throw error
        return data
      }
    )

    return post
  }

  /**
   * Delete a CMS post
   */
  static async deletePost(adminUserId: string, postId: string): Promise<void> {
    const authContext = {
      userId: adminUserId,
      operation: 'admin_cms_delete_post',
      reason: `Admin deleting CMS post ${postId}`,
      source: 'AdminCmsService',
      metadata: { postId, endpoint: '/api/v1/admin/cms/posts' }
    }

    await SecureServiceRoleWrapper.executeSecureOperation(
      authContext,
      {
        table: 'indb_cms_posts',
        operationType: 'delete',
        whereConditions: { id: postId }
      },
      async () => {
        const { error } = await supabaseAdmin
          .from('indb_cms_posts')
          .delete()
          .eq('id', postId)

        if (error) throw error
      }
    )
  }

  /**
   * Get all CMS pages
   */
  static async getAllPages(adminUserId: string): Promise<CMSPage[]> {
    const authContext = {
      userId: adminUserId,
      operation: 'admin_cms_get_all_pages',
      reason: 'Admin fetching all CMS pages',
      source: 'AdminCmsService',
      metadata: { endpoint: '/api/v1/admin/cms/pages' }
    }

    const pages = await SecureServiceRoleWrapper.executeSecureOperation(
      authContext,
      {
        table: 'indb_cms_pages',
        operationType: 'select',
        columns: ['*']
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_cms_pages')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return data
      }
    )

    return pages || []
  }

  /**
   * Get a single CMS page by ID
   */
  static async getPageById(adminUserId: string, pageId: string): Promise<CMSPage> {
    const authContext = {
      userId: adminUserId,
      operation: 'admin_cms_get_page_by_id',
      reason: `Admin fetching CMS page ${pageId}`,
      source: 'AdminCmsService',
      metadata: { pageId, endpoint: '/api/v1/admin/cms/pages' }
    }

    const page = await SecureServiceRoleWrapper.executeSecureOperation(
      authContext,
      {
        table: 'indb_cms_pages',
        operationType: 'select',
        columns: ['*'],
        whereConditions: { id: pageId }
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_cms_pages')
          .select('*')
          .eq('id', pageId)
          .single()

        if (error) throw error
        if (!data) throw new Error('Page not found')
        return data
      }
    )

    return page
  }

  /**
   * Create a new CMS page
   */
  static async createPage(
    adminUserId: string,
    pageData: Omit<CMSPage, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CMSPage> {
    const authContext = {
      userId: adminUserId,
      operation: 'admin_cms_create_page',
      reason: 'Admin creating new CMS page',
      source: 'AdminCmsService',
      metadata: { endpoint: '/api/v1/admin/cms/pages' }
    }

    const page = await SecureServiceRoleWrapper.executeSecureOperation(
      authContext,
      {
        table: 'indb_cms_pages',
        operationType: 'insert',
        data: pageData
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_cms_pages')
          .insert(pageData)
          .select()
          .single()

        if (error) throw error
        return data
      }
    )

    return page
  }

  /**
   * Update an existing CMS page
   */
  static async updatePage(
    adminUserId: string,
    pageId: string,
    pageData: Partial<CMSPage>
  ): Promise<CMSPage> {
    const authContext = {
      userId: adminUserId,
      operation: 'admin_cms_update_page',
      reason: `Admin updating CMS page ${pageId}`,
      source: 'AdminCmsService',
      metadata: { pageId, endpoint: '/api/v1/admin/cms/pages' }
    }

    const page = await SecureServiceRoleWrapper.executeSecureOperation(
      authContext,
      {
        table: 'indb_cms_pages',
        operationType: 'update',
        data: pageData,
        whereConditions: { id: pageId }
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_cms_pages')
          .update(pageData)
          .eq('id', pageId)
          .select()
          .single()

        if (error) throw error
        return data
      }
    )

    return page
  }

  /**
   * Delete a CMS page
   */
  static async deletePage(adminUserId: string, pageId: string): Promise<void> {
    const authContext = {
      userId: adminUserId,
      operation: 'admin_cms_delete_page',
      reason: `Admin deleting CMS page ${pageId}`,
      source: 'AdminCmsService',
      metadata: { pageId, endpoint: '/api/v1/admin/cms/pages' }
    }

    await SecureServiceRoleWrapper.executeSecureOperation(
      authContext,
      {
        table: 'indb_cms_pages',
        operationType: 'delete',
        whereConditions: { id: pageId }
      },
      async () => {
        const { error } = await supabaseAdmin
          .from('indb_cms_pages')
          .delete()
          .eq('id', pageId)

        if (error) throw error
      }
    )
  }

  /**
   * Private helper: Get author data for a post
   */
  private static async getAuthorData(
    adminUserId: string,
    authorId: string,
    postId: string
  ): Promise<{ name: string; email: string }> {
    try {
      // Get author profile
      const profileContext = {
        userId: adminUserId,
        operation: 'admin_cms_get_post_author_profile',
        reason: `Admin fetching author profile for CMS post ${postId}`,
        source: 'AdminCmsService',
        metadata: { postId, authorId }
      }

      const authorProfile = await SecureServiceRoleWrapper.executeSecureOperation(
        profileContext,
        {
          table: 'indb_auth_user_profiles',
          operationType: 'select',
          columns: ['full_name', 'user_id'],
          whereConditions: { user_id: authorId }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select('full_name, user_id')
            .eq('user_id', authorId)
            .single()

          if (error) throw error
          return data
        }
      )

      // Get author auth data (email)
      const authContext = {
        userId: adminUserId,
        operation: 'admin_cms_get_post_author_auth',
        reason: `Admin fetching author auth data for CMS post ${postId}`,
        source: 'AdminCmsService',
        metadata: { postId, authorId: authorProfile.user_id }
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
          if (error) throw error
          return data.user
        }
      )

      return {
        name: authorProfile.full_name || 'Unknown',
        email: authUser?.email || 'Unknown'
      }
    } catch (error) {
      // Return default values if author data fetch fails
      return {
        name: 'Unknown',
        email: 'Unknown'
      }
    }
  }
}

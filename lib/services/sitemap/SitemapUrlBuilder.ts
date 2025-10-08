import { SitemapUrl } from './SitemapXmlGenerator'

export class SitemapUrlBuilder {
  constructor(private baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
  }

  buildStaticPageUrls(): SitemapUrl[] {
    const staticPages = [
      { path: '', priority: 1.0, changefreq: 'weekly' as const },
      { path: '/pricing', priority: 0.9, changefreq: 'monthly' as const },
      { path: '/contact', priority: 0.7, changefreq: 'monthly' as const },
      { path: '/faq', priority: 0.6, changefreq: 'monthly' as const },
      { path: '/blog', priority: 0.8, changefreq: 'daily' as const },
    ]

    const today = new Date().toISOString().split('T')[0]

    return staticPages.map(page => ({
      url: `${this.baseUrl}${page.path}`,
      lastmod: today,
      changefreq: page.changefreq,
      priority: page.priority
    }))
  }

  buildPostUrls(posts: any[], changeFreqCallback: (updatedAt: string, defaultFreq: string) => any): SitemapUrl[] {
    return posts.map(post => {
      const category = Array.isArray(post.indb_cms_categories) ? post.indb_cms_categories[0] : post.indb_cms_categories
      return {
        url: `${this.baseUrl}/blog/${category?.slug || 'uncategorized'}/${post.slug}`,
        lastmod: new Date(post.updated_at).toISOString().split('T')[0],
        changefreq: changeFreqCallback(post.updated_at, 'weekly'),
        priority: 0.7
      }
    })
  }

  buildCategoryUrls(categories: any[]): SitemapUrl[] {
    const today = new Date().toISOString().split('T')[0]
    
    return categories.map(category => ({
      url: `${this.baseUrl}/blog/category/${category.slug}`,
      lastmod: today,
      changefreq: 'weekly' as const,
      priority: 0.6
    }))
  }

  buildTagUrls(tags: string[]): SitemapUrl[] {
    const today = new Date().toISOString().split('T')[0]
    
    return Array.from(new Set(tags)).map(tag => ({
      url: `${this.baseUrl}/blog/tag/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'))}`,
      lastmod: today,
      changefreq: 'weekly' as const,
      priority: 0.5
    }))
  }

  buildSitemapIndexUrls(enabledSitemaps: { posts: boolean; pages: boolean; categories: boolean; tags: boolean }): { loc: string; lastmod: string }[] {
    const lastmod = new Date().toISOString()
    const sitemaps: { loc: string; lastmod: string }[] = []

    if (enabledSitemaps.posts) {
      sitemaps.push({
        loc: `${this.baseUrl}/sitemap-posts.xml`,
        lastmod
      })
    }

    if (enabledSitemaps.pages) {
      sitemaps.push({
        loc: `${this.baseUrl}/sitemap-pages.xml`,
        lastmod
      })
    }

    if (enabledSitemaps.categories) {
      sitemaps.push({
        loc: `${this.baseUrl}/sitemap-categories.xml`,
        lastmod
      })
    }

    if (enabledSitemaps.tags) {
      sitemaps.push({
        loc: `${this.baseUrl}/sitemap-tags.xml`,
        lastmod
      })
    }

    return sitemaps
  }
}
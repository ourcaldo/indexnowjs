import { SitemapConfigService } from './SitemapConfigService'
import { SitemapXmlGenerator } from './SitemapXmlGenerator'
import { SitemapUrlBuilder } from './SitemapUrlBuilder'
import { SitemapDataService } from './SitemapDataService'
import { SitemapMonitor } from './SitemapMonitor'

export class SitemapOrchestrator {
  private configService: SitemapConfigService
  private xmlGenerator: SitemapXmlGenerator
  private urlBuilder: SitemapUrlBuilder
  private dataService: SitemapDataService

  constructor(baseUrl: string) {
    this.configService = new SitemapConfigService()
    this.xmlGenerator = new SitemapXmlGenerator()
    this.urlBuilder = new SitemapUrlBuilder(baseUrl)
    this.dataService = new SitemapDataService()
  }

  async generateMainSitemap(): Promise<string> {
    const startTime = SitemapMonitor.startGeneration('main')
    
    try {
      const settings = await this.configService.getSiteSettings()
      
      if (!settings?.sitemap_enabled) {
        const result = this.xmlGenerator.generateSitemapIndexXml([])
        SitemapMonitor.completeGeneration('main', startTime, 0, true)
        return result
      }

      const enabledSitemaps = {
        posts: settings.sitemap_posts_enabled,
        pages: settings.sitemap_pages_enabled,
        categories: settings.sitemap_categories_enabled,
        tags: settings.sitemap_tags_enabled
      }

      const sitemaps = this.urlBuilder.buildSitemapIndexUrls(enabledSitemaps)
      const result = this.xmlGenerator.generateSitemapIndexXml(sitemaps)
      
      SitemapMonitor.completeGeneration('main', startTime, sitemaps.length, true)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      SitemapMonitor.completeGeneration('main', startTime, 0, false, errorMessage)
      console.error('Failed to generate main sitemap:', error)
      return this.xmlGenerator.generateSitemapIndexXml([])
    }
  }

  async generatePostsSitemap(page: number = 1): Promise<string> {
    const startTime = SitemapMonitor.startGeneration('posts')
    
    try {
      // Check for throttling
      if (SitemapMonitor.shouldThrottle()) {
        SitemapMonitor.logError('posts', 'Generation throttled due to high frequency requests')
        const result = this.xmlGenerator.generateUrlSetXml([])
        SitemapMonitor.completeGeneration('posts', startTime, 0, false, 'Throttled')
        return result
      }

      const settings = await this.configService.getSiteSettings()
      
      if (!settings?.sitemap_enabled || !settings?.sitemap_posts_enabled) {
        const result = this.xmlGenerator.generateUrlSetXml([])
        SitemapMonitor.completeGeneration('posts', startTime, 0, true)
        return result
      }

      const maxUrls = settings.sitemap_max_urls_per_file || 5000
      const posts = await this.dataService.getPosts(page, maxUrls)
      
      if (!posts.length) {
        const result = this.xmlGenerator.generateUrlSetXml([])
        SitemapMonitor.completeGeneration('posts', startTime, 0, true)
        return result
      }

      const urls = this.urlBuilder.buildPostUrls(posts, (updatedAt, defaultFreq) => 
        this.configService.getChangeFrequency(updatedAt, defaultFreq)
      )

      // Validate URLs
      let validUrls = 0
      let invalidUrls = 0
      urls.forEach(urlObj => {
        const validation = SitemapMonitor.validateUrl(urlObj.url)
        if (validation.valid) {
          validUrls++
        } else {
          invalidUrls++
          SitemapMonitor.logError('posts', `Invalid URL: ${urlObj.url} - ${validation.error}`)
        }
      })

      const result = this.xmlGenerator.generateUrlSetXml(urls)
      SitemapMonitor.completeGeneration('posts', startTime, validUrls, true)
      
      if (invalidUrls > 0) {
        console.warn(`[SITEMAP WARNING] ${invalidUrls} invalid URLs found in posts sitemap`)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      SitemapMonitor.completeGeneration('posts', startTime, 0, false, errorMessage)
      console.error('Failed to generate posts sitemap:', error)
      return this.xmlGenerator.generateUrlSetXml([])
    }
  }

  async generatePagesSitemap(): Promise<string> {
    try {
      const settings = await this.configService.getSiteSettings()
      
      if (!settings?.sitemap_enabled || !settings?.sitemap_pages_enabled) {
        return this.xmlGenerator.generateUrlSetXml([])
      }

      const urls = this.urlBuilder.buildStaticPageUrls()
      return this.xmlGenerator.generateUrlSetXml(urls)
    } catch (error) {
      console.error('Failed to generate pages sitemap:', error)
      return this.xmlGenerator.generateUrlSetXml([])
    }
  }

  async generateCategoriesSitemap(): Promise<string> {
    try {
      const settings = await this.configService.getSiteSettings()
      
      if (!settings?.sitemap_enabled || !settings?.sitemap_categories_enabled) {
        return this.xmlGenerator.generateUrlSetXml([])
      }

      const categories = await this.dataService.getCategories()
      
      if (!categories.length) {
        return this.xmlGenerator.generateUrlSetXml([])
      }

      const urls = this.urlBuilder.buildCategoryUrls(categories)
      return this.xmlGenerator.generateUrlSetXml(urls)
    } catch (error) {
      console.error('Failed to generate categories sitemap:', error)
      return this.xmlGenerator.generateUrlSetXml([])
    }
  }

  async generateTagsSitemap(): Promise<string> {
    try {
      const settings = await this.configService.getSiteSettings()
      
      if (!settings?.sitemap_enabled || !settings?.sitemap_tags_enabled) {
        return this.xmlGenerator.generateUrlSetXml([])
      }

      const tags = await this.dataService.getTagsFromPosts()
      
      if (!tags.length) {
        return this.xmlGenerator.generateUrlSetXml([])
      }

      const urls = this.urlBuilder.buildTagUrls(tags)
      return this.xmlGenerator.generateUrlSetXml(urls)
    } catch (error) {
      console.error('Failed to generate tags sitemap:', error)
      return this.xmlGenerator.generateUrlSetXml([])
    }
  }
}
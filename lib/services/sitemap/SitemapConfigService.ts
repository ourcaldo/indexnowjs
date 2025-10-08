import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'

export interface SiteSettings {
  sitemap_enabled: boolean
  sitemap_posts_enabled: boolean
  sitemap_pages_enabled: boolean
  sitemap_categories_enabled: boolean
  sitemap_tags_enabled: boolean
  sitemap_max_urls_per_file: number
  sitemap_change_frequency: string
}

export class SitemapConfigService {
  private settings: SiteSettings | null = null

  async getSiteSettings(): Promise<SiteSettings | null> {
    if (this.settings) return this.settings

    try {
      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_sitemap_settings',
          reason: 'Retrieving sitemap configuration settings for public sitemap generation',
          source: 'services/sitemap/SitemapConfigService',
          metadata: {
            operation_type: 'sitemap_configuration'
          }
        },
        {
          table: 'indb_site_settings',
          operationType: 'select',
          columns: ['sitemap_enabled', 'sitemap_posts_enabled', 'sitemap_pages_enabled', 'sitemap_categories_enabled', 'sitemap_tags_enabled', 'sitemap_max_urls_per_file', 'sitemap_change_frequency']
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_site_settings')
            .select('sitemap_enabled, sitemap_posts_enabled, sitemap_pages_enabled, sitemap_categories_enabled, sitemap_tags_enabled, sitemap_max_urls_per_file, sitemap_change_frequency')
            .single()

          if (error) {
            console.error('Error fetching sitemap settings:', error)
            return null // Return null to trigger default settings
          }

          return data
        }
      )

      if (!data) {
        return this.getDefaultSettings()
      }

      this.settings = data
      return data
    } catch (error) {
      console.error('Failed to get site settings:', error)
      return this.getDefaultSettings()
    }
  }

  private getDefaultSettings(): SiteSettings {
    return {
      sitemap_enabled: true,
      sitemap_posts_enabled: true,
      sitemap_pages_enabled: true,
      sitemap_categories_enabled: true,
      sitemap_tags_enabled: true,
      sitemap_max_urls_per_file: 5000,
      sitemap_change_frequency: 'weekly'
    }
  }

  getChangeFrequency(updatedAt: string, defaultFreq: string): 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' {
    const now = new Date()
    const updateDate = new Date(updatedAt)
    const daysSinceUpdate = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24))

    // Dynamic frequency based on content age
    if (daysSinceUpdate < 1) return 'hourly'
    if (daysSinceUpdate < 7) return 'daily'
    if (daysSinceUpdate < 30) return 'weekly'
    if (daysSinceUpdate < 90) return 'monthly'
    
    return defaultFreq as any || 'monthly'
  }
}
/**
 * Site Settings Service
 * Provides dynamic site configuration from admin panel
 */

import { PUBLIC_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export interface SiteSettings {
  id: string
  site_name: string
  site_tagline: string | null
  site_description: string
  site_logo_url: string | null
  white_logo: string | null
  site_icon_url: string | null
  site_favicon_url: string | null
  contact_email: string | null
  support_email: string | null
  maintenance_mode: boolean
  registration_enabled: boolean
  smtp_host: string | null
  smtp_port: number | null
  smtp_user: string | null
  smtp_pass: string | null
  smtp_from_name: string | null
  smtp_from_email: string | null
  smtp_secure: boolean
  smtp_enabled: boolean
  created_at: string
  updated_at: string
}

// Default fallback settings
const DEFAULT_SETTINGS: SiteSettings = {
  id: '474f9d67-17b5-4e11-9c46-b61614d17a59',
  site_name: 'IndexNow Studio',
  site_tagline: 'Rank Tracking Made Simple for Smarter SEO Decisions',
  site_description: 'Professional URL indexing automation platform',
  site_logo_url: null,
  white_logo: 'https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/IndexNow.png',
  site_icon_url: null,
  site_favicon_url: null,
  contact_email: null,
  support_email: null,
  maintenance_mode: false,
  registration_enabled: true,
  smtp_host: null,
  smtp_port: 465,
  smtp_user: null,
  smtp_pass: null,
  smtp_from_name: 'IndexNow Studio',
  smtp_from_email: null,
  smtp_secure: true,
  smtp_enabled: false,
  created_at: '2025-07-24T18:08:18.048476Z',
  updated_at: '2025-07-25T17:49:10.754Z'
}

class SiteSettingsService {
  private cachedSettings: SiteSettings | null = null
  private cacheExpiry: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  /**
   * Get current site settings with caching
   */
  async getSiteSettings(): Promise<SiteSettings> {
    const now = Date.now()
    
    // Return cached settings if still valid
    if (this.cachedSettings && now < this.cacheExpiry) {
      return this.cachedSettings
    }

    try {
      const response = await fetch(PUBLIC_ENDPOINTS.SETTINGS, {
        credentials: 'include'
      })
      if (response.ok) {
        const result = await response.json()
        // API response structure: { success: true, data: { siteSettings: {...}, packages: {...} } }
        const siteSettings = result.data?.siteSettings
        
        // Validate we have valid settings before caching
        if (siteSettings && typeof siteSettings === 'object') {
          this.cachedSettings = siteSettings
          this.cacheExpiry = now + this.CACHE_DURATION
          return siteSettings
        }
      }
    } catch (error) {
      console.warn('Failed to fetch site settings, using defaults:', error)
    }

    // Return defaults if API fails or returns invalid data
    return DEFAULT_SETTINGS
  }

  /**
   * Get logo URL based on sidebar state
   * @param isExpanded - Whether sidebar is expanded (true = logo, false = icon)
   */
  async getLogoUrl(isExpanded: boolean = true): Promise<string> {
    const settings = await this.getSiteSettings()
    return isExpanded 
      ? settings.site_logo_url || ''
      : settings.site_icon_url || ''
  }

  /**
   * Get favicon URL for browser tab
   */
  async getFaviconUrl(): Promise<string> {
    const settings = await this.getSiteSettings()
    return settings.site_favicon_url || DEFAULT_SETTINGS.site_favicon_url!
  }

  /**
   * Get site title
   */
  async getSiteName(): Promise<string> {
    const settings = await this.getSiteSettings()
    return settings.site_name || ''
  }

  /**
   * Get site description
   */
  async getSiteDescription(): Promise<string> {
    const settings = await this.getSiteSettings()
    return settings.site_description || DEFAULT_SETTINGS.site_description
  }

  /**
   * Clear cache to force refresh
   */
  clearCache(): void {
    this.cachedSettings = null
    this.cacheExpiry = 0
  }

  /**
   * Check if maintenance mode is enabled
   */
  async isMaintenanceMode(): Promise<boolean> {
    const settings = await this.getSiteSettings()
    return settings.maintenance_mode
  }

  /**
   * Check if registration is enabled
   */
  async isRegistrationEnabled(): Promise<boolean> {
    const settings = await this.getSiteSettings()
    return settings.registration_enabled
  }
}

export const siteSettingsService = new SiteSettingsService()
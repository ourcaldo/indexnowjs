/**
 * React Hook for Site Settings
 * Provides reactive site configuration from admin panel
 */

import { useState, useEffect } from 'react'
import { siteSettingsService, SiteSettings } from '@/lib/utils'

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        setError(null)
        const siteSettings = await siteSettingsService.getSiteSettings()
        setSettings(siteSettings)
      } catch (err: any) {
        setError(err.message || 'Failed to load site settings')
        console.error('Site settings hook error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const refreshSettings = async () => {
    siteSettingsService.clearCache()
    const siteSettings = await siteSettingsService.getSiteSettings()
    setSettings(siteSettings)
  }

  return {
    settings,
    loading,
    error,
    refreshSettings
  }
}

export function useSiteLogo(isExpanded: boolean = true) {
  const [logoUrl, setLogoUrl] = useState<string>('')
  
  useEffect(() => {
    const fetchLogo = async () => {
      const url = await siteSettingsService.getLogoUrl(isExpanded)
      setLogoUrl(url)
    }
    fetchLogo()
  }, [isExpanded])

  return logoUrl
}

export function useSiteName() {
  const [siteName, setSiteName] = useState<string>('')
  
  useEffect(() => {
    const fetchName = async () => {
      const name = await siteSettingsService.getSiteName()
      setSiteName(name)
    }
    fetchName()
  }, [])

  return siteName
}

export function useFavicon() {
  const [faviconUrl, setFaviconUrl] = useState<string>('')
  
  useEffect(() => {
    const fetchFavicon = async () => {
      const url = await siteSettingsService.getFaviconUrl()
      setFaviconUrl(url)
      
      // Update favicon in document head
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link')
      link.type = 'image/x-icon'
      link.rel = 'shortcut icon'
      link.href = url
      document.getElementsByTagName('head')[0].appendChild(link)
    }
    fetchFavicon()
  }, [])

  return faviconUrl
}
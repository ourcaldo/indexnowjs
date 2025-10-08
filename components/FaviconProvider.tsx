'use client'

import { useFavicon } from '@/hooks/use-site-settings'

/**
 * Client-side component that automatically updates the favicon
 * across all pages using the site settings from /api/v1/public/settings
 */
export default function FaviconProvider() {
  useFavicon() // Automatically fetches and updates favicon
  return null // This component only handles the favicon side effect
}
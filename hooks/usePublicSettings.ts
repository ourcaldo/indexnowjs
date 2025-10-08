'use client'

import { useQuery } from '@tanstack/react-query'
import { PUBLIC_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export interface PublicSettingsData {
  siteSettings: {
    site_name: string;
    site_tagline: string;
    site_description: string;
    site_logo_url: string | null;
    white_logo: string;
    site_icon_url: string | null;
    site_favicon_url: string | null;
    contact_email: string;
    support_email: string;
    maintenance_mode: boolean;
    registration_enabled: boolean;
  };
  packages: {
    packages: any[];
    count: number;
  };
}

export const usePublicSettings = () => {
  return useQuery({
    queryKey: [PUBLIC_ENDPOINTS.SETTINGS],
    queryFn: async (): Promise<PublicSettingsData> => {
      const response = await fetch(PUBLIC_ENDPOINTS.SETTINGS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        throw new Error(`Public settings API failed: ${response.status} ${response.statusText}`)
      }

      return response.json()
    },
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 10 * 60 * 1000, // 10 minutes - public settings change rarely
    refetchOnWindowFocus: false,
  })
}
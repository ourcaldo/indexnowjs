import { NextRequest } from 'next/server'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

export const GET = publicApiWrapper(async (request: NextRequest) => {
  // Fetch site settings for public consumption using secure wrapper
  const publicSettingsContext = {
    userId: 'system',
    operation: 'public_get_site_settings',
    reason: 'Public API fetching site settings for website display',
    source: 'public/site-settings',
    metadata: {
      endpoint: '/api/v1/public/site-settings',
      method: 'GET'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: request.headers.get('user-agent') || undefined
  }

  const settings = await SecureServiceRoleWrapper.executeSecureOperation(
    publicSettingsContext,
    {
      table: 'indb_site_settings',
      operationType: 'select',
      columns: [
        'site_name', 'site_tagline', 'site_description', 'site_logo_url',
        'white_logo', 'site_icon_url', 'site_favicon_url', 'contact_email',
        'support_email', 'maintenance_mode', 'registration_enabled'
      ]
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_site_settings')
        .select(`
          site_name,
          site_tagline,
          site_description,
          site_logo_url,
          white_logo,
          site_icon_url,
          site_favicon_url,
          contact_email,
          support_email,
          maintenance_mode,
          registration_enabled
        `)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch site settings: ${error.message}`)
      }

      return data
    }
  )

  // Return default public settings if none exist
  if (!settings) {
    return formatSuccess({
      site_name: 'IndexNow Studio',
      site_tagline: 'Rank Tracking Made Simple for Smarter SEO Decisions',
      site_description: 'Professional Google Indexing Tool',
      site_logo_url: null,
      white_logo: 'https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/IndexNow.png',
      site_icon_url: null,
      site_favicon_url: null,
      contact_email: 'contact@indexnow.studio',
      support_email: 'support@indexnow.studio',
      maintenance_mode: false,
      registration_enabled: true
    })
  }

  return formatSuccess({
    site_name: settings.site_name,
    site_tagline: settings.site_tagline,
    site_description: settings.site_description,
    site_logo_url: settings.site_logo_url,
    white_logo: settings.white_logo,
    site_icon_url: settings.site_icon_url,
    site_favicon_url: settings.site_favicon_url,
    contact_email: settings.contact_email,
    support_email: settings.support_email,
    maintenance_mode: settings.maintenance_mode,
    registration_enabled: settings.registration_enabled
  })
})

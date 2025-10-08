import { NextRequest } from 'next/server'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

export const GET = publicApiWrapper(async (request: NextRequest) => {
  // Execute both queries using secure wrapper
  const publicDataContext = {
    userId: 'system',
    operation: 'public_get_site_data_and_packages',
    reason: 'Public API fetching site settings and active packages for website display',
    source: 'public/settings',
    metadata: {
      endpoint: '/api/v1/public/settings',
      method: 'GET'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: request.headers.get('user-agent') || undefined
  }

  const [settingsResult, packagesResult] = await Promise.all([
    // Site Settings
    SecureServiceRoleWrapper.executeSecureOperation(
      publicDataContext,
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

        return { data, error }
      }
    ),

    // Public Packages
    SecureServiceRoleWrapper.executeSecureOperation(
      { ...publicDataContext, operation: 'public_get_active_packages' },
      {
        table: 'indb_payment_packages',
        operationType: 'select',
        columns: [
          'id', 'name', 'slug', 'description', 'currency', 'billing_period',
          'features', 'quota_limits', 'pricing_tiers', 'is_active',
          'sort_order', 'free_trial_enabled'
        ],
        whereConditions: { is_active: true }
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_packages')
          .select(`
            id,
            name,
            slug,
            description,
            currency,
            billing_period,
            features,
            quota_limits,
            pricing_tiers,
            is_active,
            sort_order,
            free_trial_enabled
          `)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        return { data, error }
      }
    )
  ])

  // Process Site Settings
  let siteSettings = null
  if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch site settings: ${settingsResult.error.message}`)
  }

  // Return default public settings if none exist
  if (!settingsResult.data) {
    siteSettings = {
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
    }
  } else {
    // Return only public fields (no SMTP credentials or sensitive data)
    siteSettings = {
      site_name: settingsResult.data.site_name,
      site_tagline: settingsResult.data.site_tagline,
      site_description: settingsResult.data.site_description,
      site_logo_url: settingsResult.data.site_logo_url,
      white_logo: settingsResult.data.white_logo,
      site_icon_url: settingsResult.data.site_icon_url,
      site_favicon_url: settingsResult.data.site_favicon_url,
      contact_email: settingsResult.data.contact_email,
      support_email: settingsResult.data.support_email,
      maintenance_mode: settingsResult.data.maintenance_mode,
      registration_enabled: settingsResult.data.registration_enabled
    }
  }

  // Process Packages
  let packages = []
  if (packagesResult.error) {
    throw new Error(`Failed to fetch packages: ${packagesResult.error.message}`)
  }

  // Format packages for public consumption (remove sensitive data if any)
  packages = packagesResult.data?.map(pkg => ({
    ...pkg,
    // Ensure pricing tiers are properly formatted
    pricing_tiers: pkg.pricing_tiers || {},
    // Ensure quota limits are available
    quota_limits: pkg.quota_limits || {}
  })) || []

  // Build the merged response
  const publicSettings = {
    siteSettings: siteSettings,
    packages: {
      packages: packages,
      count: packages.length
    }
  }

  return formatSuccess(publicSettings)
})

import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { logger } from '@/lib/monitoring/error-handling'
import { supabaseAdmin } from '@/lib/database'

export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Log admin settings access
  if (adminUser?.id) {
    try {
      await ActivityLogger.logAdminSettingsActivity(
        adminUser.id,
        ActivityEventTypes.SITE_SETTINGS_VIEW,
        'Accessed site settings configuration',
        request,
        {
          section: 'site_settings',
          action: 'view_settings',
          adminEmail: adminUser.email
        }
      )
    } catch (logError) {
      logger.error({ error: logError instanceof Error ? logError.message : String(logError) }, 'Failed to log admin settings activity:')
    }
  }

  // Fetch site settings using secure admin operation
  const result = await withDatabaseOperation(
    async () => {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser.id,
          operation: 'get_site_settings',
          source: 'admin/settings/site',
          reason: 'Admin fetching site settings configuration',
          metadata: {
            endpoint: '/api/v1/admin/settings/site',
            method: 'GET'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        },
        { table: 'indb_site_settings', operationType: 'select' },
        async () => {
          const { data: settingsData, error } = await supabaseAdmin
            .from('indb_site_settings')
            .select('*')
            .single()

          if (error) {
            throw new Error(`Failed to fetch site settings: ${error.message}`)
          }
          
          return settingsData
        }
      )
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/settings/site' }
  )

  if (!result.success) {
    return result
  }

  return formatSuccess({ settings: result.data }, undefined, 200)
})

export const PATCH = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const body = await request.json()

  const {
    id,
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
    registration_enabled,
    robots_txt_content,
    sitemap_enabled,
    sitemap_posts_enabled,
    sitemap_pages_enabled,
    sitemap_categories_enabled,
    sitemap_tags_enabled,
    sitemap_max_urls_per_file,
    sitemap_change_frequency
  } = body

  // Update site settings using secure admin operation
  const result = await withDatabaseOperation(
    async () => {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser.id,
          operation: 'update_site_settings',
          source: 'admin/settings/site',
          reason: 'Admin updating site settings configuration',
          metadata: {
            updatedFields: Object.keys(body).filter(key => key !== 'id').join(', '),
            endpoint: '/api/v1/admin/settings/site',
            method: 'PATCH'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        },
        { table: 'indb_site_settings', operationType: 'update' },
        async () => {
          const { data: settingsData, error } = await supabaseAdmin
            .from('indb_site_settings')
            .update({
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
              registration_enabled,
              robots_txt_content,
              sitemap_enabled,
              sitemap_posts_enabled,
              sitemap_pages_enabled,
              sitemap_categories_enabled,
              sitemap_tags_enabled,
              sitemap_max_urls_per_file,
              sitemap_change_frequency,
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (error) {
            throw new Error(`Failed to update site settings: ${error.message}`)
          }
          
          return settingsData
        }
      )
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/settings/site' }
  )

  if (!result.success) {
    return result
  }

  const settings = result.data

  // Trigger ISR revalidation if robots.txt was updated
  if (robots_txt_content !== undefined) {
    try {
      await fetch(new URL('/api/revalidate?secret=revalidate-secret&path=/robots.txt', request.url))
    } catch (revalidateError) {
      logger.warn({ data: [revalidateError] }, 'Failed to revalidate robots.txt:')
    }
  }

  // Trigger sitemap revalidation if sitemap settings were updated
  const sitemapFields = ['sitemap_enabled', 'sitemap_posts_enabled', 'sitemap_pages_enabled', 'sitemap_categories_enabled', 'sitemap_tags_enabled', 'sitemap_max_urls_per_file', 'sitemap_change_frequency']
  const sitemapUpdated = sitemapFields.some(field => body[field] !== undefined)
  
  if (sitemapUpdated) {
    try {
      const sitemapPaths = ['/sitemap.xml', '/sitemap-posts.xml', '/sitemap-pages.xml', '/sitemap-categories.xml', '/sitemap-tags.xml']
      const revalidationPromises = sitemapPaths.map(path =>
        fetch(new URL(`/api/revalidate?secret=revalidate-secret&path=${path}`, request.url))
          .catch(error => logger.warn({ data: [error] }, `Failed to revalidate ${path}:`))
      )
      await Promise.all(revalidationPromises)
    } catch (revalidateError) {
      logger.warn({ data: [revalidateError] }, 'Failed to revalidate sitemaps:')
    }
  }

  // Log site settings update
  if (adminUser?.id) {
    try {
      await ActivityLogger.logAdminSettingsActivity(
        adminUser.id,
        ActivityEventTypes.SITE_SETTINGS_UPDATE,
        'Updated site settings configuration',
        request,
        {
          section: 'site_settings',
          action: 'update_settings',
          adminEmail: adminUser.email,
          updatedFields: Object.keys(body).filter(key => key !== 'id').join(', '),
          siteName: site_name
        }
      )
    } catch (logError) {
      logger.error({ error: logError instanceof Error ? logError.message : String(logError) }, 'Failed to log site settings update activity:')
    }
  }

  return formatSuccess({ settings }, undefined, 200)
})

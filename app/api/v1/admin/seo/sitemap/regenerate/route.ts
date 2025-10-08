import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { revalidatePath } from 'next/cache'
import { logger, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = adminApiWrapper(async (request: NextRequest, adminUser) => {
  try {
    const { type } = await request.json()

    // Revalidate specific sitemap or all sitemaps
    if (type && ['posts', 'categories', 'tags', 'pages'].includes(type)) {
      // Revalidate specific sitemap
      revalidatePath(`/sitemap-${type}.xml`)
      logger.info({ message: `[SITEMAP] Force regenerated: ${type} sitemap` }, 'Info')
    } else {
      // Revalidate all sitemaps
      revalidatePath('/sitemap.xml')
      revalidatePath('/sitemap-posts.xml')
      revalidatePath('/sitemap-categories.xml')
      revalidatePath('/sitemap-tags.xml')
      revalidatePath('/sitemap-pages.xml')
      logger.info({ message: '[SITEMAP] Force regenerated: all sitemaps' }, 'Info')
    }

    return formatSuccess({
      message: type ? `${type} sitemap regenerated` : 'All sitemaps regenerated',
      timestamp: Date.now()
    }, undefined, 200)

  } catch (error: any) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Sitemap regeneration API error:')
    
    return await createStandardError(
      ErrorType.SYSTEM,
      'Failed to regenerate sitemaps',
      500,
      ErrorSeverity.HIGH,
      { error: error instanceof Error ? error.message : String(error) }
    )
  }
})

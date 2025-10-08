import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'

// Default robots.txt content as fallback
const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /

# Sitemap
Sitemap: https://indexnow.studio/sitemap.xml

# Disallow admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /backend/

# Allow important directories
Allow: /blog/
Allow: /pricing/
Allow: /contact/
Allow: /faq/

# Crawl delay
Crawl-delay: 1`

export async function GET() {
  try {
    // Fetch robots.txt content from site settings using SecureWrapper
    const settings = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'get_robots_txt_settings',
        reason: 'Serving robots.txt content to search engines',
        source: 'app/robots.txt/route.ts',
        metadata: { endpoint: 'GET /robots.txt' }
      },
      { table: 'indb_site_settings', operationType: 'select' },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_site_settings')
          .select('robots_txt_content')
          .single()
        
        if (error) throw error
        return data
      }
    )

    let robotsContent = DEFAULT_ROBOTS_TXT

    if (settings?.robots_txt_content) {
      robotsContent = settings.robots_txt_content
    }

    // Use environment variable for base URL
    const baseUrl = process.env.SITEMAP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL
    
    if (!baseUrl) {
      throw new Error('SITEMAP_BASE_URL or NEXT_PUBLIC_BASE_URL environment variable is required')
    }
    
    // Replace placeholder URLs with actual domain
    robotsContent = robotsContent.replace(/https:\/\/indexnow\.studio/g, baseUrl)

    return new NextResponse(robotsContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error serving robots.txt:', error)
    
    // Fallback to default content on any error
    return new NextResponse(DEFAULT_ROBOTS_TXT, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  }
}

// ISR configuration
export const revalidate = 3600 // 1 hour
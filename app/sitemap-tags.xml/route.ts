import { NextResponse } from 'next/server'
import { SitemapOrchestrator } from '@/lib/services/sitemap/SitemapOrchestrator'

export async function GET() {
  try {
    // Use environment variable for base URL
    const baseUrl = process.env.SITEMAP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL
    
    if (!baseUrl) {
      throw new Error('SITEMAP_BASE_URL or NEXT_PUBLIC_BASE_URL environment variable is required')
    }
    
    const orchestrator = new SitemapOrchestrator(baseUrl)
    const sitemap = await orchestrator.generateTagsSitemap()

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error generating tags sitemap:', error)
    
    // Return empty sitemap on error
    const emptySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`
    
    return new NextResponse(emptySitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  }
}

export const revalidate = 3600 // 1 hour
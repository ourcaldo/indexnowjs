import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { SitemapTestUtils } from '@/lib/services/sitemap/SitemapTestUtils'
import { logger, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = adminApiWrapper(async (request: NextRequest, adminUser) => {
  try {
    const { type, baseUrl } = await request.json()

    // Default to current host if no baseUrl provided
    const testBaseUrl = baseUrl || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`

    let results: any

    switch (type) {
      case 'accessibility':
        results = await SitemapTestUtils.testSitemapAccessibility(testBaseUrl)
        break
      
      case 'integration':
        results = await SitemapTestUtils.runIntegrationTests(testBaseUrl)
        break
      
      case 'robots':
        try {
          const robotsResponse = await fetch(`${testBaseUrl}/robots.txt`)
          if (robotsResponse.ok) {
            const robotsContent = await robotsResponse.text()
            results = SitemapTestUtils.validateRobotsTxt(robotsContent)
          } else {
            results = { valid: false, errors: [`Failed to fetch robots.txt: ${robotsResponse.status}`], warnings: [] }
          }
        } catch (error) {
          results = { valid: false, errors: [`Network error: ${error instanceof Error ? error.message : 'Unknown'}`], warnings: [] }
        }
        break
      
      case 'sitemap':
        try {
          const sitemapResponse = await fetch(`${testBaseUrl}/sitemap.xml`)
          if (sitemapResponse.ok) {
            const sitemapContent = await sitemapResponse.text()
            results = SitemapTestUtils.validateSitemapXml(sitemapContent, 'sitemapindex')
          } else {
            results = { valid: false, errors: [`Failed to fetch sitemap.xml: ${sitemapResponse.status}`], warnings: [] }
          }
        } catch (error) {
          results = { valid: false, errors: [`Network error: ${error instanceof Error ? error.message : 'Unknown'}`], warnings: [] }
        }
        break
      
      default:
        return await createStandardError(
          ErrorType.VALIDATION,
          'Invalid test type. Use: accessibility, integration, robots, or sitemap',
          400,
          ErrorSeverity.LOW
        )
    }

    return formatSuccess({
      type,
      baseUrl: testBaseUrl,
      results,
      timestamp: Date.now()
    }, undefined, 200)

  } catch (error: any) {
    logger.error({
      endpoint: '/api/v1/admin/seo/sitemap/test',
      method: 'POST',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Sitemap test API error')
    
    return await createStandardError(
      ErrorType.SYSTEM,
      'Failed to run sitemap tests',
      500,
      ErrorSeverity.HIGH,
      { error: error instanceof Error ? error.message : String(error) }
    )
  }
})

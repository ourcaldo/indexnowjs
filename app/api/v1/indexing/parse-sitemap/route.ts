import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = authenticatedApiWrapper(async (request, auth) => {
  try {
    const body = await request.json()
    const { sitemapUrl } = body

    // Security: Sanitize and validate sitemap URL
    const sanitizeInput = (input: string): string => {
      if (typeof input !== 'string') return ''
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim()
    }

    const validateUrl = (url: string): boolean => {
      try {
        const urlObj = new URL(url)
        return ['http:', 'https:'].includes(urlObj.protocol) && 
               urlObj.hostname.length >= 3 && 
               urlObj.hostname.includes('.')
      } catch {
        return false
      }
    }

    const sanitizedSitemapUrl = sanitizeInput(sitemapUrl)

    if (!sanitizedSitemapUrl) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        'Sitemap URL is required',
        {
          severity: ErrorSeverity.LOW,
          userId: auth.userId,
          endpoint: '/api/v1/indexing/parse-sitemap',
          statusCode: 400
        }
      )
      return formatError(validationError)
    }

    if (!validateUrl(sanitizedSitemapUrl)) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        'Invalid sitemap URL format',
        {
          severity: ErrorSeverity.LOW,
          userId: auth.userId,
          endpoint: '/api/v1/indexing/parse-sitemap',
          statusCode: 400,
          metadata: { sitemapUrl: sanitizedSitemapUrl }
        }
      )
      return formatError(validationError)
    }

    // Parse sitemap and extract URLs
    const urls = await parseSitemapRecursively(sanitizedSitemapUrl)

    return formatSuccess({ urls, count: urls.length })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.EXTERNAL_API,
      error as Error,
      {
        severity: ErrorSeverity.MEDIUM,
        userId: auth.userId,
        endpoint: '/api/v1/indexing/parse-sitemap',
        method: 'POST',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }
})

async function parseSitemapRecursively(sitemapUrl: string): Promise<string[]> {
  const urls: string[] = []
  const processedSitemaps = new Set<string>()

  async function parseSitemap(url: string): Promise<void> {
    if (processedSitemaps.has(url)) return
    processedSitemaps.add(url)

    try {
      const response = await fetch(url)
      if (!response.ok) return

      const xml = await response.text()
      
      // Parse XML using basic regex (in production, use a proper XML parser)
      const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g)
      const sitemapMatches = xml.match(/<sitemap>[\s\S]*?<\/sitemap>/g)

      if (urlMatches) {
        for (const match of urlMatches) {
          const extractedUrl = match.replace(/<\/?loc>/g, '').trim()
          if (extractedUrl && !extractedUrl.includes('.xml')) {
            urls.push(extractedUrl)
          }
        }
      }

      if (sitemapMatches) {
        for (const sitemapMatch of sitemapMatches) {
          const locMatch = sitemapMatch.match(/<loc>(.*?)<\/loc>/)
          if (locMatch && locMatch[1]) {
            await parseSitemap(locMatch[1].trim())
          }
        }
      }
    } catch (error) {
      // Skip failed sitemaps, continue with others
    }
  }

  await parseSitemap(sitemapUrl)
  return Array.from(new Set(urls)) // Remove duplicates
}

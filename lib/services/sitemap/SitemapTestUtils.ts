/**
 * Sitemap Testing & Validation Utilities
 * Implements comprehensive testing strategy for Phase 3.3
 */

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  metrics?: {
    urlCount: number
    invalidUrls: number
    duplicateUrls: number
    responseTimes: number[]
  }
}

export class SitemapTestUtils {
  /**
   * Validate robots.txt content format and rules
   */
  static validateRobotsTxt(content: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const lines = content.split('\n')

    let hasUserAgent = false
    let hasSitemap = false
    let currentUserAgent = ''

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const lineNum = i + 1

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) continue

      // Check User-agent directive
      if (line.toLowerCase().startsWith('user-agent:')) {
        hasUserAgent = true
        currentUserAgent = line.substring(11).trim()
        if (!currentUserAgent) {
          errors.push(`Line ${lineNum}: Empty User-agent directive`)
        }
      }
      // Check Sitemap directive
      else if (line.toLowerCase().startsWith('sitemap:')) {
        hasSitemap = true
        const sitemapUrl = line.substring(8).trim()
        if (!sitemapUrl) {
          errors.push(`Line ${lineNum}: Empty Sitemap directive`)
        } else if (!this.isValidUrl(sitemapUrl)) {
          errors.push(`Line ${lineNum}: Invalid sitemap URL: ${sitemapUrl}`)
        }
      }
      // Check Allow/Disallow directives
      else if (line.toLowerCase().startsWith('allow:') || line.toLowerCase().startsWith('disallow:')) {
        if (!hasUserAgent) {
          errors.push(`Line ${lineNum}: Allow/Disallow directive without preceding User-agent`)
        }
        const path = line.substring(line.indexOf(':') + 1).trim()
        if (path && !path.startsWith('/') && path !== '*') {
          warnings.push(`Line ${lineNum}: Path should start with '/' or be '*'`)
        }
      }
      // Check Crawl-delay directive
      else if (line.toLowerCase().startsWith('crawl-delay:')) {
        const delay = line.substring(12).trim()
        if (isNaN(Number(delay)) || Number(delay) < 0) {
          errors.push(`Line ${lineNum}: Invalid crawl-delay value: ${delay}`)
        }
      }
      // Unknown directive
      else {
        warnings.push(`Line ${lineNum}: Unknown directive: ${line}`)
      }
    }

    // Required checks
    if (!hasUserAgent) {
      errors.push('Missing required User-agent directive')
    }
    if (!hasSitemap) {
      warnings.push('No Sitemap directive found')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate XML sitemap format and structure
   */
  static validateSitemapXml(xmlContent: string, type: 'urlset' | 'sitemapindex' = 'urlset'): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const metrics = {
      urlCount: 0,
      invalidUrls: 0,
      duplicateUrls: 0,
      responseTimes: []
    }

    try {
      // Basic XML structure validation
      if (!xmlContent.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
        errors.push('Missing XML declaration')
      }

      const expectedNamespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
      if (!xmlContent.includes(expectedNamespace)) {
        errors.push('Missing or incorrect sitemap namespace')
      }

      // Check root element
      const expectedRoot = type === 'urlset' ? 'urlset' : 'sitemapindex'
      if (!xmlContent.includes(`<${expectedRoot}`)) {
        errors.push(`Missing root element: ${expectedRoot}`)
      }

      // URL validation for urlset type
      if (type === 'urlset') {
        const urlMatches = xmlContent.match(/<url>[\s\S]*?<\/url>/g) || []
        metrics.urlCount = urlMatches.length

        const seenUrls = new Set<string>()
        
        urlMatches.forEach((urlBlock, index) => {
          const locMatch = urlBlock.match(/<loc>(.*?)<\/loc>/)
          if (!locMatch) {
            errors.push(`URL ${index + 1}: Missing <loc> element`)
            return
          }

          const url = locMatch[1]
          
          // Check for duplicates
          if (seenUrls.has(url)) {
            metrics.duplicateUrls++
            warnings.push(`Duplicate URL found: ${url}`)
          } else {
            seenUrls.add(url)
          }

          // Validate URL format
          if (!this.isValidUrl(url)) {
            metrics.invalidUrls++
            errors.push(`Invalid URL format: ${url}`)
          }

          // Validate lastmod format
          const lastmodMatch = urlBlock.match(/<lastmod>(.*?)<\/lastmod>/)
          if (lastmodMatch) {
            const lastmod = lastmodMatch[1]
            if (!this.isValidDateFormat(lastmod)) {
              warnings.push(`Invalid lastmod format: ${lastmod} for URL: ${url}`)
            }
          }

          // Validate changefreq
          const changefreqMatch = urlBlock.match(/<changefreq>(.*?)<\/changefreq>/)
          if (changefreqMatch) {
            const changefreq = changefreqMatch[1]
            const validFreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
            if (!validFreqs.includes(changefreq)) {
              errors.push(`Invalid changefreq: ${changefreq} for URL: ${url}`)
            }
          }

          // Validate priority
          const priorityMatch = urlBlock.match(/<priority>(.*?)<\/priority>/)
          if (priorityMatch) {
            const priority = parseFloat(priorityMatch[1])
            if (isNaN(priority) || priority < 0 || priority > 1) {
              errors.push(`Invalid priority: ${priorityMatch[1]} for URL: ${url}`)
            }
          }
        })

        // Check URL count limits
        if (metrics.urlCount > 50000) {
          warnings.push(`URL count (${metrics.urlCount}) exceeds recommended limit of 50,000`)
        }
      }

    } catch (error) {
      errors.push(`XML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metrics
    }
  }

  /**
   * Test sitemap accessibility and response times
   */
  static async testSitemapAccessibility(baseUrl: string): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const responseTimes: number[] = []

    const sitemapUrls = [
      '/sitemap.xml',
      '/sitemap-posts.xml',
      '/sitemap-categories.xml',
      '/sitemap-tags.xml',
      '/sitemap-pages.xml',
      '/robots.txt'
    ]

    for (const path of sitemapUrls) {
      try {
        const startTime = Date.now()
        const response = await fetch(`${baseUrl}${path}`)
        const endTime = Date.now()
        const responseTime = endTime - startTime
        responseTimes.push(responseTime)

        if (!response.ok) {
          if (response.status === 404) {
            warnings.push(`${path}: Not found (404) - may be disabled`)
          } else {
            errors.push(`${path}: HTTP ${response.status} - ${response.statusText}`)
          }
        } else {
          // Check content type
          const contentType = response.headers.get('content-type') || ''
          if (path.endsWith('.xml') && !contentType.includes('xml')) {
            warnings.push(`${path}: Unexpected content type: ${contentType}`)
          }
          if (path === '/robots.txt' && !contentType.includes('text/plain')) {
            warnings.push(`${path}: Should have content-type text/plain`)
          }

          // Check response time
          if (responseTime > 5000) {
            warnings.push(`${path}: Slow response time: ${responseTime}ms`)
          }
        }
      } catch (error) {
        errors.push(`${path}: Network error - ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metrics: {
        urlCount: sitemapUrls.length,
        invalidUrls: errors.length,
        duplicateUrls: 0,
        responseTimes
      }
    }
  }

  /**
   * Comprehensive sitemap integration test
   */
  static async runIntegrationTests(baseUrl: string): Promise<{
    robotsTxt: ValidationResult
    mainSitemap: ValidationResult
    accessibility: ValidationResult
    overall: { passed: boolean; summary: string }
  }> {
    const results = {
      robotsTxt: { valid: false, errors: ['Not tested'], warnings: [] },
      mainSitemap: { valid: false, errors: ['Not tested'], warnings: [] },
      accessibility: { valid: false, errors: ['Not tested'], warnings: [] },
      overall: { passed: false, summary: '' }
    }

    try {
      // Test accessibility first
      results.accessibility = await this.testSitemapAccessibility(baseUrl)

      // Test robots.txt
      try {
        const robotsResponse = await fetch(`${baseUrl}/robots.txt`)
        if (robotsResponse.ok) {
          const robotsContent = await robotsResponse.text()
          results.robotsTxt = this.validateRobotsTxt(robotsContent)
        }
      } catch (error) {
        results.robotsTxt = { valid: false, errors: ['Failed to fetch robots.txt'], warnings: [] }
      }

      // Test main sitemap
      try {
        const sitemapResponse = await fetch(`${baseUrl}/sitemap.xml`)
        if (sitemapResponse.ok) {
          const sitemapContent = await sitemapResponse.text()
          results.mainSitemap = this.validateSitemapXml(sitemapContent, 'sitemapindex')
        }
      } catch (error) {
        results.mainSitemap = { valid: false, errors: ['Failed to fetch main sitemap'], warnings: [] }
      }

      // Overall assessment
      const totalErrors = results.robotsTxt.errors.length + 
                         results.mainSitemap.errors.length + 
                         results.accessibility.errors.length
      
      const totalWarnings = results.robotsTxt.warnings.length + 
                           results.mainSitemap.warnings.length + 
                           results.accessibility.warnings.length

      results.overall = {
        passed: totalErrors === 0,
        summary: `Integration test completed: ${totalErrors} errors, ${totalWarnings} warnings`
      }

    } catch (error) {
      results.overall = {
        passed: false,
        summary: `Integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }

    return results
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  private static isValidDateFormat(dateStr: string): boolean {
    // Check ISO 8601 date formats
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/
    return iso8601Regex.test(dateStr)
  }
}
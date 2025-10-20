/**
 * URL Utility Functions
 * 
 * Helper functions for URL manipulation and sanitization
 */

/**
 * Remove query parameters from URL
 * Example: "https://example.com/page?param=value" -> "https://example.com/page"
 * 
 * This is used to clean URLs before storing in database to ensure consistency
 * and prevent storing tracking parameters like ?srsltid=...
 */
export function removeUrlParameters(url: string | null): string | null {
  if (!url) {
    return null
  }

  try {
    // Parse URL
    const urlObj = new URL(url)
    
    // Build clean URL without query parameters or hash
    const cleanUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
    
    // Remove trailing slash if present (unless it's root path)
    return cleanUrl.endsWith('/') && urlObj.pathname !== '/' 
      ? cleanUrl.slice(0, -1) 
      : cleanUrl
      
  } catch (error) {
    // If URL parsing fails, try manual cleanup
    const questionMarkIndex = url.indexOf('?')
    const hashIndex = url.indexOf('#')
    
    let endIndex = url.length
    
    // Find the earliest special character
    if (questionMarkIndex !== -1) {
      endIndex = questionMarkIndex
    }
    if (hashIndex !== -1 && hashIndex < endIndex) {
      endIndex = hashIndex
    }
    
    return url.substring(0, endIndex)
  }
}

/**
 * Extract clean domain from URL
 * Example: "https://www.example.com/page" -> "example.com"
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    return urlObj.hostname.toLowerCase().replace(/^www\./, '')
  } catch (error) {
    // If URL parsing fails, try to extract domain manually
    const cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    return cleanUrl.toLowerCase()
  }
}

/**
 * Normalize URL for comparison
 * - Removes protocol
 * - Removes www
 * - Removes trailing slash
 * - Converts to lowercase
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    let normalized = `${urlObj.hostname}${urlObj.pathname}`
    normalized = normalized.replace(/^www\./, '')
    normalized = normalized.replace(/\/$/, '')
    return normalized.toLowerCase()
  } catch (error) {
    return url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
  }
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Add protocol to URL if missing
 */
export function ensureProtocol(url: string, protocol: 'http' | 'https' = 'https'): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `${protocol}://${url}`
}

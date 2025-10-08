/**
 * URL Validation Service
 * Handles validation of URLs for indexing operations
 */
export class UrlValidator {
  private static instance: UrlValidator;

  constructor() {}

  static getInstance(): UrlValidator {
    if (!UrlValidator.instance) {
      UrlValidator.instance = new UrlValidator();
    }
    return UrlValidator.instance;
  }

  /**
   * Validate a single URL for indexing
   */
  validateUrl(url: string): { isValid: boolean; error?: string } {
    try {
      // Check if URL is not empty
      if (!url || url.trim().length === 0) {
        return { isValid: false, error: 'URL cannot be empty' };
      }

      // Trim whitespace
      const trimmedUrl = url.trim();

      // Check URL format using URL constructor
      const urlObject = new URL(trimmedUrl);

      // Check protocol (must be http or https)
      if (!['http:', 'https:'].includes(urlObject.protocol)) {
        return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
      }

      // Check if hostname exists
      if (!urlObject.hostname) {
        return { isValid: false, error: 'URL must have a valid hostname' };
      }

      // Check for localhost or internal IPs (not indexable by Google)
      if (this.isLocalOrPrivateUrl(urlObject.hostname)) {
        return { isValid: false, error: 'Local and private URLs cannot be indexed by Google' };
      }

      // Check URL length (Google has limits)
      if (trimmedUrl.length > 2048) {
        return { isValid: false, error: 'URL is too long (maximum 2048 characters)' };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Validate multiple URLs
   */
  validateUrls(urls: string[]): { 
    validUrls: string[]; 
    invalidUrls: Array<{ url: string; error: string }> 
  } {
    const validUrls: string[] = [];
    const invalidUrls: Array<{ url: string; error: string }> = [];

    for (const url of urls) {
      const validation = this.validateUrl(url);
      if (validation.isValid) {
        validUrls.push(url.trim());
      } else {
        invalidUrls.push({ url, error: validation.error || 'Unknown validation error' });
      }
    }

    return { validUrls, invalidUrls };
  }

  /**
   * Check if URL is localhost or private IP
   */
  private isLocalOrPrivateUrl(hostname: string): boolean {
    // Check for localhost variations
    if (['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase())) {
      return true;
    }

    // Check for private IP ranges
    const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
    if (privateIpRegex.test(hostname)) {
      return true;
    }

    // Check for .local domains
    if (hostname.endsWith('.local')) {
      return true;
    }

    return false;
  }

  /**
   * Normalize URL for consistent processing
   */
  normalizeUrl(url: string): string {
    try {
      const urlObject = new URL(url.trim());
      
      // Remove hash fragments (not relevant for indexing)
      urlObject.hash = '';
      
      // Remove trailing slash for consistency (except for root)
      if (urlObject.pathname !== '/' && urlObject.pathname.endsWith('/')) {
        urlObject.pathname = urlObject.pathname.slice(0, -1);
      }

      return urlObject.toString();
    } catch (error) {
      // Return original URL if normalization fails
      return url.trim();
    }
  }

  /**
   * Extract unique URLs from a list (removes duplicates)
   */
  deduplicateUrls(urls: string[]): string[] {
    const normalizedUrls = urls.map(url => this.normalizeUrl(url));
    return Array.from(new Set(normalizedUrls));
  }
}
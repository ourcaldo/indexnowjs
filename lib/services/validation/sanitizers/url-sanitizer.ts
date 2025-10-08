/**
 * URL Sanitizer and Validator
 * Secure URL validation and sanitization to prevent SSRF and other URL-based attacks
 * 
 * Part of Enhancement #2: Strengthen Input Validation
 */

import validator from 'validator';
import { VALIDATION_PATTERNS } from '../../../core/constants/ValidationRules';

export interface UrlValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  errors: string[];
  warnings: string[];
}

/**
 * URL Sanitizer Service
 * Provides comprehensive URL validation and sanitization
 */
export class UrlSanitizer {
  private static instance: UrlSanitizer;

  // Blocked domains and IP ranges for SSRF prevention
  private readonly blockedDomains = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '169.254.169.254', // AWS metadata service
    'metadata.google.internal', // GCP metadata service
  ];

  private readonly privateIpRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^224\./,                   // 224.0.0.0/8 (multicast)
    /^::1$/,                    // IPv6 loopback
    /^fe80:/i,                  // IPv6 link-local
    /^fc00:/i,                  // IPv6 unique local
  ];

  static getInstance(): UrlSanitizer {
    if (!UrlSanitizer.instance) {
      UrlSanitizer.instance = new UrlSanitizer();
    }
    return UrlSanitizer.instance;
  }

  /**
   * Comprehensive URL validation and sanitization
   */
  validateAndSanitizeUrl(url: string, options?: {
    allowHttp?: boolean;
    allowPrivateIps?: boolean;
    maxLength?: number;
    requireDomain?: boolean;
  }): UrlValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const opts = {
      allowHttp: false,
      allowPrivateIps: false,
      maxLength: 2048,
      requireDomain: true,
      ...options
    };

    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        errors: ['URL is required and must be a string'],
        warnings: []
      };
    }

    const trimmedUrl = url.trim();

    // Basic format validation
    if (!validator.isURL(trimmedUrl, { 
      protocols: opts.allowHttp ? ['http', 'https'] : ['https'],
      require_protocol: true,
      require_host: true,
      require_valid_protocol: true
    })) {
      errors.push('Invalid URL format');
      return { isValid: false, errors, warnings };
    }

    let urlObj: URL;
    try {
      urlObj = new URL(trimmedUrl);
    } catch (error) {
      errors.push('Failed to parse URL');
      return { isValid: false, errors, warnings };
    }

    // Protocol validation
    if (!opts.allowHttp && urlObj.protocol === 'http:') {
      errors.push('HTTP protocol not allowed, use HTTPS');
    }

    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('Only HTTP and HTTPS protocols are allowed');
    }

    // Length validation
    if (trimmedUrl.length > opts.maxLength) {
      errors.push(`URL exceeds maximum length of ${opts.maxLength} characters`);
    }

    // Domain validation
    if (opts.requireDomain && (!urlObj.hostname || urlObj.hostname.length === 0)) {
      errors.push('URL must have a valid domain');
    }

    // SSRF prevention - check for blocked domains
    if (!opts.allowPrivateIps) {
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check blocked domains
      if (this.blockedDomains.includes(hostname)) {
        errors.push('Access to this domain is not allowed');
      }

      // Check for private IP ranges
      if (this.isPrivateIp(hostname)) {
        errors.push('Access to private IP addresses is not allowed');
      }

      // Check for URL shorteners (potential for abuse)
      if (this.isUrlShortener(hostname)) {
        warnings.push('URL shortener detected - verify the final destination');
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = this.checkSuspiciousPatterns(trimmedUrl);
    warnings.push(...suspiciousPatterns);

    // Sanitize and normalize URL
    const sanitizedUrl = this.normalizeUrl(urlObj);

    return {
      isValid: errors.length === 0,
      sanitizedUrl,
      errors,
      warnings
    };
  }

  /**
   * Validate multiple URLs
   */
  validateUrls(urls: string[], options?: {
    allowHttp?: boolean;
    allowPrivateIps?: boolean;
    maxLength?: number;
    requireDomain?: boolean;
  }): {
    validUrls: string[];
    invalidUrls: Array<{ url: string; errors: string[]; warnings: string[] }>;
    totalWarnings: number;
  } {
    const validUrls: string[] = [];
    const invalidUrls: Array<{ url: string; errors: string[]; warnings: string[] }> = [];
    let totalWarnings = 0;

    for (const url of urls) {
      const result = this.validateAndSanitizeUrl(url, options);
      
      if (result.isValid && result.sanitizedUrl) {
        validUrls.push(result.sanitizedUrl);
        totalWarnings += result.warnings.length;
      } else {
        invalidUrls.push({
          url,
          errors: result.errors,
          warnings: result.warnings
        });
        totalWarnings += result.warnings.length;
      }
    }

    return { validUrls, invalidUrls, totalWarnings };
  }

  /**
   * Sanitize URLs for sitemap processing
   */
  validateSitemapUrl(url: string): UrlValidationResult {
    const result = this.validateAndSanitizeUrl(url, {
      allowHttp: false,
      allowPrivateIps: false,
      maxLength: 2048,
      requireDomain: true
    });

    // Additional sitemap-specific validation
    if (result.isValid) {
      const urlLower = url.toLowerCase();
      if (!urlLower.includes('sitemap') && !urlLower.endsWith('.xml')) {
        result.warnings.push('Sitemap URL should typically contain "sitemap" or end with ".xml"');
      }

      // Check if it's an index sitemap
      if (urlLower.includes('sitemapindex') || urlLower.includes('sitemap_index')) {
        result.warnings.push('This appears to be a sitemap index - ensure it contains individual sitemaps');
      }
    }

    return result;
  }

  /**
   * Check if hostname is a private IP address
   */
  private isPrivateIp(hostname: string): boolean {
    // Remove brackets from IPv6 addresses
    const cleanHostname = hostname.replace(/^\[|\]$/g, '');
    
    return this.privateIpRanges.some(pattern => pattern.test(cleanHostname));
  }

  /**
   * Check if hostname is a known URL shortener
   */
  private isUrlShortener(hostname: string): boolean {
    const shorteners = [
      'bit.ly', 'tinyurl.com', 't.co', 'short.link', 'ow.ly', 
      'tiny.cc', 'is.gd', 'buff.ly', 'shor.by', 'v.gd'
    ];
    
    return shorteners.includes(hostname);
  }

  /**
   * Check for suspicious URL patterns
   */
  private checkSuspiciousPatterns(url: string): string[] {
    const warnings: string[] = [];
    const urlLower = url.toLowerCase();

    // Check for multiple subdomains (potential subdomain takeover)
    const subdomainCount = (url.match(/\./g) || []).length;
    if (subdomainCount > 4) {
      warnings.push('URL contains many subdomains - verify legitimacy');
    }

    // Check for suspicious query parameters
    const suspiciousParams = ['eval', 'exec', 'system', 'cmd', 'shell'];
    if (suspiciousParams.some(param => urlLower.includes(param))) {
      warnings.push('URL contains suspicious query parameters');
    }

    // Check for encoded characters that might be hiding malicious content
    if (url.includes('%') && (url.includes('%2e') || url.includes('%2f') || url.includes('%5c'))) {
      warnings.push('URL contains encoded path traversal characters');
    }

    // Check for IDN homograph attacks
    if (/[^\x00-\x7F]/.test(url)) {
      warnings.push('URL contains non-ASCII characters - verify domain legitimacy');
    }

    // Check for excessive redirects indicator
    if (urlLower.includes('redirect') || urlLower.includes('goto') || urlLower.includes('link')) {
      warnings.push('URL appears to be a redirect - verify final destination');
    }

    return warnings;
  }

  /**
   * Normalize URL for consistent processing
   */
  private normalizeUrl(urlObj: URL): string {
    // Remove hash fragments (not relevant for most validations)
    urlObj.hash = '';
    
    // Remove trailing slash for consistency (except for root)
    if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }

    // Sort query parameters for consistency
    const params = new URLSearchParams(urlObj.search);
    const sortedParams = new URLSearchParams();
    Array.from(params.keys()).sort().forEach(key => {
      sortedParams.append(key, params.get(key) || '');
    });
    urlObj.search = sortedParams.toString();

    // Convert hostname to lowercase
    urlObj.hostname = urlObj.hostname.toLowerCase();

    return urlObj.toString();
  }

  /**
   * Extract domain from URL safely
   */
  extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  /**
   * Check if URL is safe for external requests
   */
  isSafeForRequest(url: string): boolean {
    const result = this.validateAndSanitizeUrl(url, {
      allowHttp: false,
      allowPrivateIps: false,
      maxLength: 2048
    });

    return result.isValid && result.warnings.length === 0;
  }

  /**
   * Bulk deduplicate and sanitize URLs
   */
  deduplicateAndSanitize(urls: string[]): string[] {
    const seen = new Set<string>();
    const results: string[] = [];

    for (const url of urls) {
      const result = this.validateAndSanitizeUrl(url);
      if (result.isValid && result.sanitizedUrl) {
        const normalized = this.normalizeUrl(new URL(result.sanitizedUrl));
        if (!seen.has(normalized)) {
          seen.add(normalized);
          results.push(normalized);
        }
      }
    }

    return results;
  }
}

// Export singleton instance
export const urlSanitizer = UrlSanitizer.getInstance();
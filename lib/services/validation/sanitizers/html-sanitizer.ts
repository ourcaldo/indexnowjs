/**
 * HTML Content Sanitizer
 * Secure HTML sanitization using DOMPurify for CMS content and user inputs
 * 
 * Part of Enhancement #2: Strengthen Input Validation
 */

import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create DOMPurify instance for Node.js environment
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

export interface HtmlSanitizerOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  allowedProtocols?: string[];
  removeComments?: boolean;
  stripTags?: boolean;
}

/**
 * HTML Sanitizer Service
 * Provides secure HTML content sanitization with configurable policies
 */
export class HtmlSanitizer {
  private static instance: HtmlSanitizer;

  static getInstance(): HtmlSanitizer {
    if (!HtmlSanitizer.instance) {
      HtmlSanitizer.instance = new HtmlSanitizer();
    }
    return HtmlSanitizer.instance;
  }

  /**
   * Sanitize HTML content for CMS posts and pages
   * Uses a permissive policy suitable for rich content
   */
  sanitizeCmsContent(html: string): string {
    const config = {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        'blockquote', 'pre', 'code', 'kbd', 'samp', 'var',
        'a', 'img', 'figure', 'figcaption',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'div', 'span', 'section', 'article', 'aside',
        'hr', 'sup', 'sub'
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'title', 'alt', 'src', 'width', 'height',
        'class', 'id', 'style', 'data-*'
      ],
      ALLOWED_URI_REGEXP: /^https?:\/\//,
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      SANITIZE_NAMED_PROPS: true
    };

    return purify.sanitize(html, config).toString();
  }

  /**
   * Sanitize HTML content for user comments and descriptions
   * Uses a restrictive policy for user-generated content
   */
  sanitizeUserContent(html: string): string {
    const config = {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'a', 'ul', 'ol', 'li',
        'blockquote', 'code'
      ],
      ALLOWED_ATTR: ['href', 'title', 'alt'],
      ALLOWED_URI_REGEXP: /^https?:\/\//,
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      SANITIZE_NAMED_PROPS: true
    };

    return purify.sanitize(html, config).toString();
  }

  /**
   * Sanitize HTML for email content
   * Very restrictive policy for email templates
   */
  sanitizeEmailContent(html: string): string {
    const config = {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3',
        'table', 'tr', 'td', 'th', 'div', 'span'
      ],
      ALLOWED_ATTR: ['href', 'style', 'color', 'font-family', 'font-size'],
      ALLOWED_URI_REGEXP: /^https?:\/\//,
      KEEP_CONTENT: true,
      SANITIZE_NAMED_PROPS: true
    };

    return purify.sanitize(html, config).toString();
  }

  /**
   * Strip all HTML tags and return plain text
   * For search indexing and previews
   */
  stripHtml(html: string): string {
    return purify.sanitize(html, {
      ALLOWED_TAGS: [],
      KEEP_CONTENT: true
    }).toString().trim();
  }

  /**
   * Sanitize custom CSS content (admin only)
   * Remove potentially dangerous CSS properties
   */
  sanitizeCss(css: string): string {
    // Remove potentially dangerous CSS properties
    const dangerousProperties = [
      'expression', 'javascript:', 'vbscript:', 'data:',
      'import', '@import', 'behavior', '-moz-binding',
      'position: fixed', 'position:fixed'
    ];

    let sanitized = css;
    
    dangerousProperties.forEach(prop => {
      const regex = new RegExp(prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    return sanitized;
  }

  /**
   * Sanitize JavaScript content (admin only)
   * Basic sanitization for custom scripts
   */
  sanitizeJs(js: string): string {
    // Remove potentially dangerous JavaScript patterns
    const dangerousPatterns = [
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /document\.write/gi,
      /document\.cookie/gi,
      /window\.location/gi,
      /localStorage/gi,
      /sessionStorage/gi,
      /XMLHttpRequest/gi,
      /fetch\s*\(/gi
    ];

    let sanitized = js;
    
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  /**
   * Sanitize HTML with custom options
   */
  sanitizeCustom(html: string, options: HtmlSanitizerOptions): string {
    const config: any = {
      KEEP_CONTENT: true,
      RETURN_DOM: false
    };

    if (options.allowedTags) {
      config.ALLOWED_TAGS = options.allowedTags;
    }

    if (options.allowedAttributes) {
      config.ALLOWED_ATTR = options.allowedAttributes;
    }

    if (options.allowedProtocols) {
      config.ALLOWED_URI_REGEXP = new RegExp(`^(${options.allowedProtocols.join('|')}):`);
    }

    if (options.stripTags) {
      config.ALLOWED_TAGS = [];
    }

    return purify.sanitize(html, config).toString();
  }

  /**
   * Validate HTML structure and report issues
   */
  validateHtml(html: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    try {
      // Check for basic HTML structure issues
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      // Check for unclosed tags
      const openTags = html.match(/<[^\/][^>]*>/g) || [];
      const closeTags = html.match(/<\/[^>]*>/g) || [];
      
      if (openTags.length !== closeTags.length) {
        issues.push('HTML contains unclosed tags');
      }

      // Check for dangerous scripts
      const scripts = doc.querySelectorAll('script');
      if (scripts.length > 0) {
        issues.push('HTML contains script tags');
      }

      // Check for external resources without HTTPS
      const images = doc.querySelectorAll('img[src]');
      images.forEach((img: Element, index: number) => {
        const src = img.getAttribute('src');
        if (src && src.startsWith('http://')) {
          issues.push(`Image ${index + 1} uses insecure HTTP protocol`);
        }
      });

      // Check for external links without proper attributes
      const links = doc.querySelectorAll('a[href^="http"]');
      links.forEach((link: Element, index: number) => {
        const rel = link.getAttribute('rel');
        const target = link.getAttribute('target');
        
        if (target === '_blank' && !rel?.includes('noopener')) {
          issues.push(`External link ${index + 1} missing 'noopener' for security`);
        }
      });

      return {
        isValid: issues.length === 0,
        issues
      };

    } catch (error) {
      issues.push(`HTML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, issues };
    }
  }
}

// Export singleton instance
export const htmlSanitizer = HtmlSanitizer.getInstance();
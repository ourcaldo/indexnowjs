/**
 * General Input Sanitizer
 * Provides general input sanitization for various data types
 * 
 * Part of Enhancement #2: Strengthen Input Validation
 */

import validator from 'validator';
import { VALIDATION_PATTERNS, FIELD_LIMITS } from '../../../core/constants/ValidationRules';

export interface SanitizationOptions {
  removeHtml?: boolean;
  escapeHtml?: boolean;
  trim?: boolean;
  maxLength?: number;
  allowSpecialChars?: boolean;
}

/**
 * General Input Sanitizer Service
 * Provides comprehensive input sanitization for user data
 */
export class InputSanitizer {
  private static instance: InputSanitizer;

  static getInstance(): InputSanitizer {
    if (!InputSanitizer.instance) {
      InputSanitizer.instance = new InputSanitizer();
    }
    return InputSanitizer.instance;
  }

  /**
   * Sanitize text input (names, titles, descriptions)
   */
  sanitizeText(input: string, options?: SanitizationOptions): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const opts = {
      removeHtml: true,
      escapeHtml: false,
      trim: true,
      maxLength: FIELD_LIMITS.DESCRIPTION.max,
      allowSpecialChars: false,
      ...options
    };

    let sanitized = input;

    // Trim whitespace
    if (opts.trim) {
      sanitized = sanitized.trim();
    }

    // Remove HTML tags
    if (opts.removeHtml) {
      sanitized = validator.stripLow(sanitized);
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Escape HTML entities
    if (opts.escapeHtml) {
      sanitized = validator.escape(sanitized);
    }

    // Remove special characters if not allowed
    if (!opts.allowSpecialChars) {
      sanitized = sanitized.replace(/[<>'"&\x00\x08\x09\x0a\x0c\x0d]/g, '');
    }

    // Limit length
    if (opts.maxLength && sanitized.length > opts.maxLength) {
      sanitized = sanitized.substring(0, opts.maxLength);
    }

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');

    return sanitized;
  }

  /**
   * Sanitize email input
   */
  sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    return validator.normalizeEmail(email.trim()) || '';
  }

  /**
   * Sanitize phone number input
   */
  sanitizePhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    // Remove all non-numeric characters except + and -
    return phone.replace(/[^\d\+\-\(\)\s]/g, '').trim();
  }

  /**
   * Sanitize search query input
   */
  sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    let sanitized = query.trim();

    // Remove potentially dangerous SQL characters
    sanitized = sanitized.replace(/[';-]/g, '');

    // Remove excessive wildcards
    sanitized = sanitized.replace(/[%*]{3,}/g, '**');

    // Limit length
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100);
    }

    return sanitized;
  }

  /**
   * Sanitize filename for uploads
   */
  sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return 'untitled';
    }

    let sanitized = filename.trim();

    // Remove path separators
    sanitized = sanitized.replace(/[/\\]/g, '');

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f\x80-\x9f]/g, '');

    // Replace spaces with underscores
    sanitized = sanitized.replace(/\s+/g, '_');

    // Limit length (preserve extension)
    const lastDot = sanitized.lastIndexOf('.');
    if (lastDot > -1 && sanitized.length > 100) {
      const name = sanitized.substring(0, lastDot);
      const ext = sanitized.substring(lastDot);
      sanitized = name.substring(0, 100 - ext.length) + ext;
    } else if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100);
    }

    // Ensure it doesn't start with dot or dash
    sanitized = sanitized.replace(/^[\.\-]+/, '');

    return sanitized || 'untitled';
  }

  /**
   * Sanitize JSON input
   */
  sanitizeJson(jsonString: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!jsonString || typeof jsonString !== 'string') {
      return { isValid: false, sanitized: '{}', error: 'Invalid JSON input' };
    }

    try {
      // Parse and re-stringify to ensure valid JSON
      const parsed = JSON.parse(jsonString.trim());
      
      // Remove potentially dangerous properties
      const sanitized = this.sanitizeJsonObject(parsed);
      
      return { 
        isValid: true, 
        sanitized: JSON.stringify(sanitized) 
      };
    } catch (error) {
      return { 
        isValid: false, 
        sanitized: '{}', 
        error: `JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Sanitize a parsed JSON object
   */
  private sanitizeJsonObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeJsonObject(item));
    }

    const sanitized: any = {};
    const dangerousKeys = ['__proto__', 'constructor', 'prototype', 'eval', 'function'];

    for (const [key, value] of Object.entries(obj)) {
      // Skip dangerous keys
      if (dangerousKeys.includes(key.toLowerCase())) {
        continue;
      }

      // Sanitize key name
      const sanitizedKey = this.sanitizeText(key, { 
        removeHtml: true, 
        maxLength: 50, 
        allowSpecialChars: false 
      });

      if (sanitizedKey) {
        // Recursively sanitize nested objects
        if (typeof value === 'object' && value !== null) {
          sanitized[sanitizedKey] = this.sanitizeJsonObject(value);
        } else if (typeof value === 'string') {
          sanitized[sanitizedKey] = this.sanitizeText(value, { 
            removeHtml: true, 
            maxLength: 1000, 
            allowSpecialChars: true 
          });
        } else {
          sanitized[sanitizedKey] = value;
        }
      }
    }

    return sanitized;
  }

  /**
   * Sanitize SQL-like parameters to prevent injection
   */
  sanitizeSqlParam(param: string): string {
    if (!param || typeof param !== 'string') {
      return '';
    }

    let sanitized = param.trim();

    // Remove SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(\b(OR|AND)\s+[\w\s]*\s*(=|LIKE)\s*[\w\s]*)/gi,
      /(--|\/\*|\*\/|;|\||&)/g,
      /('|('')|"|(""))/g
    ];

    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  /**
   * Sanitize user input for display
   */
  sanitizeForDisplay(input: string, options?: {
    preserveLineBreaks?: boolean;
    maxLength?: number;
    allowBasicFormatting?: boolean;
  }): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const opts = {
      preserveLineBreaks: false,
      maxLength: 500,
      allowBasicFormatting: false,
      ...options
    };

    let sanitized = input.trim();

    // Escape HTML entities
    sanitized = validator.escape(sanitized);

    // Preserve line breaks if requested
    if (opts.preserveLineBreaks) {
      sanitized = sanitized.replace(/\n/g, '<br>');
    }

    // Allow basic formatting if requested
    if (opts.allowBasicFormatting) {
      sanitized = sanitized.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      sanitized = sanitized.replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    // Limit length
    if (opts.maxLength && sanitized.length > opts.maxLength) {
      sanitized = sanitized.substring(0, opts.maxLength) + '...';
    }

    return sanitized;
  }

  /**
   * Validate and sanitize pagination parameters
   */
  sanitizePaginationParams(params: { page?: string | number; limit?: string | number }): {
    page: number;
    limit: number;
  } {
    let page = 1;
    let limit = 10;

    // Sanitize page
    if (params.page) {
      const pageNum = typeof params.page === 'string' ? parseInt(params.page, 10) : params.page;
      if (Number.isInteger(pageNum) && pageNum > 0) {
        page = Math.min(pageNum, 1000); // Max 1000 pages
      }
    }

    // Sanitize limit
    if (params.limit) {
      const limitNum = typeof params.limit === 'string' ? parseInt(params.limit, 10) : params.limit;
      if (Number.isInteger(limitNum) && limitNum > 0) {
        limit = Math.min(limitNum, 100); // Max 100 items per page
      }
    }

    return { page, limit };
  }

  /**
   * Comprehensive input sanitization with multiple options
   */
  sanitizeInput(input: any, type: 'text' | 'email' | 'url' | 'phone' | 'json' | 'filename' | 'search'): string {
    if (!input) {
      return '';
    }

    const stringInput = String(input);

    switch (type) {
      case 'text':
        return this.sanitizeText(stringInput);
      case 'email':
        return this.sanitizeEmail(stringInput);
      case 'phone':
        return this.sanitizePhoneNumber(stringInput);
      case 'filename':
        return this.sanitizeFilename(stringInput);
      case 'search':
        return this.sanitizeSearchQuery(stringInput);
      case 'json':
        return this.sanitizeJson(stringInput).sanitized;
      default:
        return this.sanitizeText(stringInput);
    }
  }
}

// Export singleton instance
export const inputSanitizer = InputSanitizer.getInstance();
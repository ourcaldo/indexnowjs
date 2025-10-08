/**
 * Validation Middleware for API Requests
 * Centralized validation middleware for Next.js API routes
 * 
 * Part of Enhancement #2: Strengthen Input Validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimiter } from '../validators/rate-limiter';
import { htmlSanitizer } from '../sanitizers/html-sanitizer';
import { urlSanitizer } from '../sanitizers/url-sanitizer';
import { inputSanitizer } from '../sanitizers/input-sanitizer';
import { VALIDATION_PATTERNS, BaseSchemas } from '../../../core/constants/ValidationRules';

export interface ValidationOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimitConfig?: {
    windowMs: number;
    maxRequests: number;
  };
  validateBody?: z.ZodSchema<any>;
  validateQuery?: z.ZodSchema<any>;
  validateParams?: z.ZodSchema<any>;
  pathParams?: Record<string, string>; // Next.js dynamic route params
  sanitizeHtml?: boolean;
  sanitizeUrls?: boolean;
  maxBodySize?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: {
    body?: any;
    query?: any;
    params?: any;
  };
  user?: any;
}

/**
 * Validation Middleware Service
 * Provides comprehensive request validation for API endpoints
 */
export class ValidationMiddleware {
  private static instance: ValidationMiddleware;

  static getInstance(): ValidationMiddleware {
    if (!ValidationMiddleware.instance) {
      ValidationMiddleware.instance = new ValidationMiddleware();
    }
    return ValidationMiddleware.instance;
  }

  /**
   * Main validation middleware function
   */
  async validateRequest(
    request: NextRequest,
    options: ValidationOptions = {}
  ): Promise<{ response?: NextResponse; validationResult: ValidationResult }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitizedData: any = {};

    try {
      // 1. Rate Limiting
      if (options.rateLimitConfig) {
        const clientId = this.getClientIdentifier(request);
        const rateLimit = rateLimiter.checkRateLimit(clientId, options.rateLimitConfig);
        
        if (!rateLimit.allowed) {
          return {
            response: NextResponse.json(
              { error: 'Too many requests' },
              { 
                status: 429,
                headers: {
                  'Retry-After': rateLimit.retryAfter?.toString() || '60',
                  'X-RateLimit-Limit': options.rateLimitConfig.maxRequests.toString(),
                  'X-RateLimit-Remaining': '0',
                  'X-RateLimit-Reset': rateLimit.resetTime.toString()
                }
              }
            ),
            validationResult: { isValid: false, errors: ['Rate limit exceeded'], warnings: [] }
          };
        }
      }

      // 2. Content Length Validation
      const contentLength = parseInt(request.headers.get('content-length') || '0');
      const maxBodySize = options.maxBodySize || 10 * 1024 * 1024; // 10MB default
      
      if (contentLength > maxBodySize) {
        errors.push(`Request body too large. Maximum size: ${maxBodySize} bytes`);
      }

      // 3. Authentication (if required)
      let user;
      if (options.requireAuth) {
        const authResult = await this.validateAuthentication(request);
        if (!authResult.isValid) {
          return {
            response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
            validationResult: { isValid: false, errors: authResult.errors, warnings: [] }
          };
        }
        user = authResult.user;
      }

      // 4. Admin Authorization (if required)
      if (options.requireAdmin) {
        if (!user || !user.isAdmin) {
          return {
            response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
            validationResult: { isValid: false, errors: ['Admin access required'], warnings: [] }
          };
        }
      }

      // 5. Request Body Validation
      if (options.validateBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const bodyValidation = await this.validateRequestBody(request, options.validateBody);
        if (!bodyValidation.isValid) {
          errors.push(...bodyValidation.errors);
        } else {
          sanitizedData.body = bodyValidation.data;
        }
        warnings.push(...bodyValidation.warnings);
      }

      // 6. Query Parameters Validation
      if (options.validateQuery) {
        const queryValidation = this.validateQueryParams(request, options.validateQuery);
        if (!queryValidation.isValid) {
          errors.push(...queryValidation.errors);
        } else {
          sanitizedData.query = queryValidation.data;
        }
        warnings.push(...queryValidation.warnings);
      }

      // 7. URL Parameters Validation
      if (options.validateParams) {
        const paramsValidation = this.validateUrlParams(
          request, 
          options.validateParams,
          options.pathParams
        );
        if (!paramsValidation.isValid) {
          errors.push(...paramsValidation.errors);
        } else {
          sanitizedData.params = paramsValidation.data;
        }
        warnings.push(...paramsValidation.warnings);
      }

      // 8. Content Sanitization
      if (options.sanitizeHtml && sanitizedData.body) {
        sanitizedData.body = this.sanitizeHtmlContent(sanitizedData.body);
      }

      if (options.sanitizeUrls && sanitizedData.body) {
        const urlSanitization = this.sanitizeUrlContent(sanitizedData.body);
        sanitizedData.body = urlSanitization.data;
        warnings.push(...urlSanitization.warnings);
      }

      // Return validation result
      const validationResult: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedData,
        user
      };

      if (errors.length > 0) {
        return {
          response: NextResponse.json(
            { error: 'Validation failed', details: errors },
            { status: 400 }
          ),
          validationResult
        };
      }

      return { validationResult };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      return {
        response: NextResponse.json(
          { error: 'Validation error occurred' },
          { status: 500 }
        ),
        validationResult: {
          isValid: false,
          errors: [`Validation processing failed: ${errorMessage}`],
          warnings: []
        }
      };
    }
  }

  /**
   * Validate request body
   */
  private async validateRequestBody(
    request: NextRequest,
    schema: z.ZodSchema<any>
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[]; data?: any }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const rawBody = await request.text();
      
      if (!rawBody.trim()) {
        return { isValid: false, errors: ['Request body is required'], warnings: [] };
      }

      // Parse JSON
      let bodyData;
      try {
        bodyData = JSON.parse(rawBody);
      } catch (error) {
        return { isValid: false, errors: ['Invalid JSON in request body'], warnings: [] };
      }

      // Sanitize JSON data
      const jsonSanitization = inputSanitizer.sanitizeJson(rawBody);
      if (!jsonSanitization.isValid) {
        errors.push(jsonSanitization.error || 'JSON sanitization failed');
      }

      // Validate with Zod schema
      const validation = schema.safeParse(bodyData);
      if (!validation.success) {
        const zodErrors = validation.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        errors.push(...zodErrors);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: validation.success ? validation.data : undefined
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Body validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Validate query parameters
   */
  private validateQueryParams(
    request: NextRequest,
    schema: z.ZodSchema<any>
  ): { isValid: boolean; errors: string[]; warnings: string[]; data?: any } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const url = new URL(request.url);
      const queryParams: Record<string, any> = {};

      // Convert URLSearchParams to object
      Array.from(url.searchParams.entries()).forEach(([key, value]) => {
        // Sanitize each parameter
        const sanitizedKey = inputSanitizer.sanitizeText(key, { maxLength: 50 });
        const sanitizedValue = inputSanitizer.sanitizeText(value, { maxLength: 1000 });
        
        if (sanitizedKey) {
          queryParams[sanitizedKey] = sanitizedValue;
        }
      });

      // Validate with Zod schema
      const validation = schema.safeParse(queryParams);
      if (!validation.success) {
        const zodErrors = validation.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        errors.push(...zodErrors);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: validation.success ? validation.data : undefined
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Query validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Validate URL parameters (path parameters) - Enhanced for Next.js dynamic routes
   */
  private validateUrlParams(
    request: NextRequest,
    schema: z.ZodSchema<any>,
    pathParams?: Record<string, string>
  ): { isValid: boolean; errors: string[]; warnings: string[]; data?: any } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      let params: Record<string, string> = {};
      
      // If pathParams provided (from Next.js params), use those
      if (pathParams) {
        params = { ...pathParams };
      } else {
        // Fallback: Extract from URL pattern (improved detection)
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);
        
        // Enhanced pattern matching for common Next.js dynamic routes
        if (pathSegments.length >= 4) {
          const lastSegment = pathSegments[pathSegments.length - 1];
          
          // Check for UUID pattern (most common for [id] routes)
          if (VALIDATION_PATTERNS.UUID.test(lastSegment)) {
            params.id = lastSegment;
          }
          
          // Check for slug pattern
          else if (VALIDATION_PATTERNS.SLUG.test(lastSegment)) {
            params.slug = lastSegment;
          }
          
          // Handle specific route patterns
          if (pathSegments.includes('keywords') && pathSegments.length >= 5) {
            const keywordId = pathSegments[pathSegments.indexOf('keywords') + 1];
            if (VALIDATION_PATTERNS.UUID.test(keywordId)) {
              params.keywordId = keywordId;
            }
          }
          
          if (pathSegments.includes('service-accounts') && pathSegments.length >= 5) {
            const accountId = pathSegments[pathSegments.indexOf('service-accounts') + 1];
            if (VALIDATION_PATTERNS.UUID.test(accountId)) {
              params.id = accountId;
            }
          }
        }
      }

      // Sanitize parameter values before validation
      const sanitizedParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
          const sanitizedValue = inputSanitizer.sanitizeText(value, { 
            maxLength: 100,
            removeHtml: true,
            allowSpecialChars: false 
          });
          if (sanitizedValue) {
            sanitizedParams[key] = sanitizedValue;
          }
        }
      }

      // Validate with Zod schema
      const validation = schema.safeParse(sanitizedParams);
      if (!validation.success) {
        const zodErrors = validation.error.errors.map(err => 
          `URL parameter ${err.path.join('.')}: ${err.message}`
        );
        errors.push(...zodErrors);
        
        // Add security warning for potential injection attempts
        Object.values(params).forEach(value => {
          if (typeof value === 'string' && (
            value.includes('<script') || 
            value.includes('javascript:') || 
            value.includes('vbscript:') ||
            value.includes('../')
          )) {
            warnings.push(`Potential security risk detected in URL parameter: ${value.substring(0, 50)}`);
          }
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: validation.success ? validation.data : sanitizedParams
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`URL params validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Validate authentication using Supabase integration
   */
  private async validateAuthentication(request: NextRequest): Promise<{ isValid: boolean; errors: string[]; user?: any }> {
    try {
      // Import the existing Supabase auth function
      const { getServerAuthUser } = await import('../../../auth/server-auth');
      
      // Use the existing authentication logic
      const authUser = await getServerAuthUser(request);
      
      if (!authUser) {
        return { 
          isValid: false, 
          errors: ['Authentication failed - invalid or missing token'] 
        };
      }

      return {
        isValid: true,
        errors: [],
        user: authUser
      };

    } catch (error) {
      console.error('Validation middleware auth error:', error);
      return {
        isValid: false,
        errors: [`Authentication validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Sanitize HTML content in request data
   */
  private sanitizeHtmlContent(data: any): any {
    if (typeof data === 'string') {
      return htmlSanitizer.sanitizeUserContent(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeHtmlContent(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeHtmlContent(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Sanitize URL content in request data
   */
  private sanitizeUrlContent(data: any): { data: any; warnings: string[] } {
    const warnings: string[] = [];

    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string' && VALIDATION_PATTERNS.URL.test(value)) {
        const result = urlSanitizer.validateAndSanitizeUrl(value);
        if (!result.isValid) {
          warnings.push(`Invalid URL found: ${value}`);
          return value; // Keep original if validation fails
        }
        warnings.push(...result.warnings);
        return result.sanitizedUrl || value;
      }

      if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item));
      }

      if (typeof value === 'object' && value !== null) {
        const sanitized: any = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
      }

      return value;
    };

    return {
      data: sanitizeValue(data),
      warnings
    };
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(request: NextRequest): string {
    // Try to get user ID from auth, fallback to IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || request.headers.get('host') || 'unknown';
    
    return `client:${ip}`;
  }

  /**
   * Create validation middleware for specific endpoints
   */
  createEndpointValidator(options: ValidationOptions) {
    return async (request: NextRequest) => {
      return this.validateRequest(request, options);
    };
  }
}

// Pre-configured validation middleware for common scenarios
export const validationMiddleware = ValidationMiddleware.getInstance();

// Common validation schemas for reuse
export const CommonValidationSchemas = {
  pagination: z.object({
    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(1000)).optional().default('1'),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(1000)).optional().default('10'),
  }),

  idParam: z.object({
    id: BaseSchemas.uuid,
  }),

  slugParam: z.object({
    slug: BaseSchemas.slug,
  }),

  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  bulkOperation: z.object({
    operation: z.enum(['create', 'update', 'delete']),
    items: z.array(z.any()).min(1).max(1000),
  }),
};

// Export utility functions
export const withValidation = (options: ValidationOptions) => {
  return validationMiddleware.createEndpointValidator(options);
};
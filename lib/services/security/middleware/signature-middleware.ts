/**
 * Signature Validation Middleware
 * Integrates request signature validation into the API security stack
 * 
 * Part of Enhancement #6: API Security Middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { signatureValidator, SignatureConfig, SignatureValidationResult } from '../validators/signature-validator';

export interface SignatureMiddlewareOptions {
  enabled?: boolean;
  securityLevel?: 'low' | 'medium' | 'high' | 'critical';
  customConfig?: Partial<SignatureConfig>;
  bypassForPublicEndpoints?: boolean;
  logInvalidSignatures?: boolean;
}

export interface SignatureMiddlewareResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  shouldContinue: boolean;
  response?: NextResponse;
  validationResult?: SignatureValidationResult;
}

/**
 * Signature Validation Middleware
 * Validates HMAC signatures for API requests
 */
export class SignatureMiddleware {
  private static instance: SignatureMiddleware;

  static getInstance(): SignatureMiddleware {
    if (!SignatureMiddleware.instance) {
      SignatureMiddleware.instance = new SignatureMiddleware();
    }
    return SignatureMiddleware.instance;
  }

  /**
   * Validate request signature
   */
  async validateRequest(
    request: NextRequest,
    options: SignatureMiddlewareOptions = {}
  ): Promise<SignatureMiddlewareResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if signature validation is enabled
      if (options.enabled === false) {
        return {
          isValid: true,
          errors: [],
          warnings: ['Signature validation disabled'],
          shouldContinue: true
        };
      }

      // Skip validation for public endpoints if configured
      if (options.bypassForPublicEndpoints && this.isPublicEndpoint(request)) {
        return {
          isValid: true,
          errors: [],
          warnings: ['Signature validation bypassed for public endpoint'],
          shouldContinue: true
        };
      }

      // CRITICAL FIX: Get request body for signature calculation with proper error handling
      let body: string;
      try {
        body = await this.getRequestBody(request);
      } catch (bodyError) {
        console.error('Request body reading failed for signature validation:', bodyError);
        return {
          isValid: false,
          errors: [`Failed to read request body: ${bodyError instanceof Error ? bodyError.message : 'Unknown error'}`],
          warnings: [],
          shouldContinue: false,
          response: NextResponse.json(
            { 
              error: 'Request processing failed',
              code: 'BODY_READ_ERROR'
            },
            { status: 400 }
          )
        };
      }

      // Configure signature validation
      const config = this.buildSignatureConfig(options);

      // Validate signature
      const validationResult = await signatureValidator.validateSignature(
        request as any,
        body,
        config
      );

      // Handle validation result
      if (!validationResult.isValid) {
        // Log security event
        if (options.logInvalidSignatures !== false) {
          this.logSecurityEvent(request, validationResult, body);
        }

        return {
          isValid: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          shouldContinue: false,
          response: NextResponse.json(
            { 
              error: 'Invalid request signature',
              code: 'SIGNATURE_VALIDATION_FAILED'
            },
            { status: 401 }
          ),
          validationResult
        };
      }

      return {
        isValid: true,
        errors: [],
        warnings: validationResult.warnings,
        shouldContinue: true,
        validationResult
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Signature middleware error:', error);

      return {
        isValid: false,
        errors: [`Signature validation error: ${errorMessage}`],
        warnings: [],
        shouldContinue: false,
        response: NextResponse.json(
          { 
            error: 'Signature validation failed',
            code: 'SIGNATURE_MIDDLEWARE_ERROR'
          },
          { status: 500 }
        )
      };
    }
  }

  /**
   * Get request body for signature calculation (FIXED: Prevents body consumption issues)
   */
  private async getRequestBody(request: NextRequest): Promise<string> {
    try {
      // Check if request has body
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        return '';
      }

      // CRITICAL FIX: Use arrayBuffer instead of text for better compatibility
      // This prevents encoding issues and stream consumption problems
      const clonedRequest = request.clone();
      
      // Handle potential race conditions with body reading
      let body: string;
      try {
        // First attempt: use arrayBuffer for better compatibility
        const arrayBuffer = await clonedRequest.arrayBuffer();
        body = new TextDecoder('utf-8').decode(arrayBuffer);
      } catch (bufferError) {
        console.warn('ArrayBuffer approach failed, falling back to text():', bufferError);
        // Fallback: try direct text read on a fresh clone
        const fallbackRequest = request.clone();
        body = await fallbackRequest.text();
      }
      
      return body || '';
    } catch (error) {
      console.error('CRITICAL: Failed to read request body for signature validation:', error);
      // Allow graceful fallback for body reading errors
      
      return '';
    }
  }

  /**
   * Build signature configuration from options
   */
  private buildSignatureConfig(options: SignatureMiddlewareOptions): Partial<SignatureConfig> {
    let config: Partial<SignatureConfig> = {};

    // Apply security level preset
    if (options.securityLevel) {
      const presetConfig = signatureValidator.createConfig(options.securityLevel);
      config = { ...presetConfig };
    }

    // Apply custom configuration
    if (options.customConfig) {
      config = { ...config, ...options.customConfig };
    }

    return config;
  }

  /**
   * Check if endpoint is public and should bypass signature validation
   */
  private isPublicEndpoint(request: NextRequest): boolean {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Public endpoints that don't require signature validation
    const publicPatterns = [
      /^\/api\/v1\/public\//,
      /^\/api\/v1\/auth\/register$/,
      /^\/api\/v1\/auth\/login$/,
      /^\/api\/v1\/system\/health$/,
      /^\/api\/v1\/system\/status$/,
      /^\/sitemap/,
      /^\/robots\.txt$/,
      /^\/favicon\.ico$/
    ];

    return publicPatterns.some(pattern => pattern.test(pathname));
  }

  /**
   * Log security events for monitoring
   */
  private logSecurityEvent(
    request: NextRequest,
    validationResult: SignatureValidationResult,
    body: string
  ): void {
    const url = new URL(request.url);
    
    const securityEvent = {
      type: 'SIGNATURE_VALIDATION_FAILED',
      timestamp: new Date().toISOString(),
      method: request.method,
      path: url.pathname,
      query: url.search,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      userAgent: request.headers.get('user-agent'),
      clientIp: this.getClientIp(request),
      requestId: this.generateRequestId(),
      bodySize: body.length,
      hasSignature: !!validationResult.signature,
      hasTimestamp: !!validationResult.timestamp
    };

    // Log to console (in production, this would go to security monitoring system)
    console.warn('Security Event:', JSON.stringify(securityEvent, null, 2));

    // In production, you would send this to your security monitoring system:
    // await SecurityMonitoringService.logEvent(securityEvent);
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    return ip.trim();
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create middleware function for specific endpoint
   */
  createEndpointMiddleware(options: SignatureMiddlewareOptions) {
    return async (request: NextRequest) => {
      return this.validateRequest(request, options);
    };
  }
}

// Export singleton instance
export const signatureMiddleware = SignatureMiddleware.getInstance();

// Pre-configured middleware for common use cases
export const SignatureMiddlewares = {
  LOW_SECURITY: signatureMiddleware.createEndpointMiddleware({
    enabled: true,
    securityLevel: 'low',
    bypassForPublicEndpoints: true
  }),
  
  MEDIUM_SECURITY: signatureMiddleware.createEndpointMiddleware({
    enabled: true,
    securityLevel: 'medium',
    bypassForPublicEndpoints: false
  }),
  
  HIGH_SECURITY: signatureMiddleware.createEndpointMiddleware({
    enabled: true,
    securityLevel: 'high',
    bypassForPublicEndpoints: false,
    logInvalidSignatures: true
  }),
  
  CRITICAL_SECURITY: signatureMiddleware.createEndpointMiddleware({
    enabled: true,
    securityLevel: 'critical',
    bypassForPublicEndpoints: false,
    logInvalidSignatures: true
  })
};
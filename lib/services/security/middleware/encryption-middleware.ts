/**
 * Response Encryption Middleware
 * Integrates response encryption into the API middleware stack
 * 
 * Part of Enhancement #6: API Security Middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { responseEncryptor, EncryptionOptions, EncryptedResponse } from '../encryption/response-encryptor';

export interface ResponseEncryptionMiddlewareOptions {
  enabled?: boolean;
  encryptionLevel?: 'basic' | 'enhanced' | 'maximum';
  forceEncryption?: boolean;
  sensitiveEndpoints?: RegExp[];
  excludeEndpoints?: RegExp[];
  logEncryption?: boolean;
}

export interface EncryptionMiddlewareResult {
  shouldEncrypt: boolean;
  encryptedResponse?: NextResponse;
  originalResponse?: any;
  metadata: {
    encryptionApplied: boolean;
    encryptionLevel: string;
    fieldsEncrypted: string[];
    performanceImpact: number;
  };
}

/**
 * Response Encryption Middleware
 * Selectively encrypts API responses based on sensitivity and configuration
 */
export class ResponseEncryptionMiddleware {
  private static instance: ResponseEncryptionMiddleware;

  static getInstance(): ResponseEncryptionMiddleware {
    if (!ResponseEncryptionMiddleware.instance) {
      ResponseEncryptionMiddleware.instance = new ResponseEncryptionMiddleware();
    }
    return ResponseEncryptionMiddleware.instance;
  }

  /**
   * Process response for encryption
   */
  async processResponse(
    request: NextRequest,
    responseData: any,
    userRole: string = 'user',
    options: ResponseEncryptionMiddlewareOptions = {}
  ): Promise<EncryptionMiddlewareResult> {
    const startTime = performance.now();
    
    try {
      // Check if encryption is enabled
      if (options.enabled === false) {
        return this.createResult(false, responseData, 'disabled', [], 0);
      }

      const url = new URL(request.url);
      const endpoint = url.pathname;

      // Check exclusion rules
      if (this.shouldExcludeEndpoint(endpoint, options.excludeEndpoints)) {
        return this.createResult(false, responseData, 'excluded', [], 0);
      }

      // Check inclusion rules
      const shouldEncrypt = this.shouldEncryptEndpoint(endpoint, options);

      if (!shouldEncrypt && !options.forceEncryption) {
        return this.createResult(false, responseData, 'not_required', [], 0);
      }

      // Configure encryption options
      const encryptionOptions: EncryptionOptions = {
        enabled: true,
        encryptionLevel: options.encryptionLevel || 'basic',
        forceEncryption: options.forceEncryption
      };

      // Encrypt response
      const encryptionResult = await responseEncryptor.encryptResponse(
        responseData,
        endpoint,
        userRole,
        encryptionOptions
      );

      const performanceImpact = performance.now() - startTime;

      // Log encryption event if enabled
      if (options.logEncryption) {
        this.logEncryptionEvent(request, encryptionResult, performanceImpact);
      }

      if (encryptionResult.shouldEncrypt && encryptionResult.encrypted) {
        // Create encrypted response
        const encryptedResponse = NextResponse.json(encryptionResult.encrypted, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Encrypted': 'true',
            'X-Encryption-Version': '1.0',
            'X-Key-Id': encryptionResult.encrypted.keyId
          }
        });

        return {
          shouldEncrypt: true,
          encryptedResponse,
          metadata: {
            encryptionApplied: true,
            encryptionLevel: encryptionResult.metadata.encryptionLevel,
            fieldsEncrypted: encryptionResult.metadata.fieldsEncrypted,
            performanceImpact
          }
        };
      }

      return this.createResult(
        false, 
        responseData, 
        encryptionResult.metadata.encryptionLevel, 
        encryptionResult.metadata.fieldsEncrypted, 
        performanceImpact
      );

    } catch (error) {
      console.error('Response encryption middleware error:', error);
      
      // Return original response if encryption fails
      const performanceImpact = performance.now() - startTime;
      return this.createResult(false, responseData, 'error', [], performanceImpact);
    }
  }

  /**
   * Check if endpoint should be excluded from encryption
   */
  private shouldExcludeEndpoint(
    endpoint: string,
    excludePatterns?: RegExp[]
  ): boolean {
    const defaultExclusions = [
      /\/api\/v1\/public\//,
      /\/api\/v1\/system\/health/,
      /\/api\/v1\/system\/status/,
      /\/sitemap/,
      /\.(js|css|png|jpg|jpeg|gif|svg|ico)$/
    ];

    const patterns = [...defaultExclusions, ...(excludePatterns || [])];
    return patterns.some(pattern => pattern.test(endpoint));
  }

  /**
   * Check if endpoint should be encrypted
   */
  private shouldEncryptEndpoint(
    endpoint: string,
    options: ResponseEncryptionMiddlewareOptions
  ): boolean {
    // Check sensitive endpoints
    const sensitivePatterns = [
      /\/api\/v1\/billing\//,
      /\/api\/v1\/payments\//,
      /\/api\/v1\/admin\/users\//,
      /\/api\/v1\/admin\/settings\/api-keys/,
      /\/api\/v1\/auth\/user\/profile/,
      ...(options.sensitiveEndpoints || [])
    ];

    return sensitivePatterns.some(pattern => pattern.test(endpoint));
  }

  /**
   * Create standardized result object
   */
  private createResult(
    shouldEncrypt: boolean,
    responseData: any,
    encryptionLevel: string,
    fieldsEncrypted: string[],
    performanceImpact: number
  ): EncryptionMiddlewareResult {
    return {
      shouldEncrypt,
      originalResponse: responseData,
      metadata: {
        encryptionApplied: shouldEncrypt,
        encryptionLevel,
        fieldsEncrypted,
        performanceImpact
      }
    };
  }

  /**
   * Log encryption events for monitoring
   */
  private logEncryptionEvent(
    request: NextRequest,
    encryptionResult: any,
    performanceImpact: number
  ): void {
    const url = new URL(request.url);
    
    const encryptionEvent = {
      type: 'RESPONSE_ENCRYPTION',
      timestamp: new Date().toISOString(),
      method: request.method,
      path: url.pathname,
      encryptionApplied: encryptionResult.shouldEncrypt,
      encryptionLevel: encryptionResult.metadata.encryptionLevel,
      fieldsEncrypted: encryptionResult.metadata.fieldsEncrypted,
      originalSize: encryptionResult.metadata.responseSize,
      encryptedSize: encryptionResult.metadata.encryptedSize,
      performanceImpact: Math.round(performanceImpact * 100) / 100,
      userAgent: request.headers.get('user-agent'),
      clientIp: this.getClientIp(request)
    };

    console.log('Encryption Event:', JSON.stringify(encryptionEvent, null, 2));
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    return forwarded?.split(',')[0] || realIp || 'unknown';
  }

  /**
   * Create middleware function for specific configuration
   */
  createEndpointMiddleware(options: ResponseEncryptionMiddlewareOptions) {
    return async (request: NextRequest, responseData: any, userRole?: string) => {
      return this.processResponse(request, responseData, userRole, options);
    };
  }
}

// Export singleton instance
export const responseEncryptionMiddleware = ResponseEncryptionMiddleware.getInstance();

// Pre-configured middleware for common use cases
export const EncryptionMiddlewares = {
  BASIC: responseEncryptionMiddleware.createEndpointMiddleware({
    enabled: true,
    encryptionLevel: 'basic',
    logEncryption: false
  }),
  
  ENHANCED: responseEncryptionMiddleware.createEndpointMiddleware({
    enabled: true,
    encryptionLevel: 'enhanced',
    logEncryption: true
  }),
  
  MAXIMUM: responseEncryptionMiddleware.createEndpointMiddleware({
    enabled: true,
    encryptionLevel: 'maximum',
    forceEncryption: true,
    logEncryption: true
  })
};
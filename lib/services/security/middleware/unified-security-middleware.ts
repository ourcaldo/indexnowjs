/**
 * Unified Security Middleware
 * Orchestrates all security layers into a single comprehensive middleware stack
 * 
 * Part of Enhancement #6: API Security Middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { validationMiddleware, ValidationOptions, ValidationResult } from '../../validation/middleware/validation-middleware';
import { signatureMiddleware, SignatureMiddlewareOptions, SignatureMiddlewareResult } from './signature-middleware';
import { responseEncryptionMiddleware, ResponseEncryptionMiddlewareOptions, EncryptionMiddlewareResult } from './encryption-middleware';
import { apiVersionController, VersionValidationResult } from './version-middleware';

export interface UnifiedSecurityConfig {
  // Core security features
  enableAuthentication?: boolean;
  enableAuthorization?: boolean;
  enableRateLimit?: boolean;
  enableInputValidation?: boolean;
  
  // Enhanced features (Enhancement #6)
  enableSignatureValidation?: boolean;
  enableResponseEncryption?: boolean;
  enableVersionControl?: boolean;
  
  // Security levels
  securityLevel?: 'basic' | 'enhanced' | 'maximum';
  
  // Endpoint-specific configurations
  validationOptions?: ValidationOptions;
  signatureOptions?: SignatureMiddlewareOptions;
  encryptionOptions?: ResponseEncryptionMiddlewareOptions;
  
  // Advanced options
  logSecurityEvents?: boolean;
  bypassForPublicEndpoints?: boolean;
  performanceMonitoring?: boolean;
}

export interface SecurityMiddlewareResult {
  isValid: boolean;
  shouldContinue: boolean;
  securityLevel: string;
  appliedFeatures: string[];
  errors: string[];
  warnings: string[];
  
  // Individual results
  validationResult?: ValidationResult;
  signatureResult?: SignatureMiddlewareResult;
  versionResult?: VersionValidationResult;
  
  // Response handling
  response?: NextResponse;
  responseProcessor?: (data: any) => Promise<NextResponse>;
  
  // Performance metrics
  processingTime: number;
  securityOverhead: number;
}

/**
 * Unified Security Middleware
 * Provides comprehensive security orchestration for API endpoints
 */
export class UnifiedSecurityMiddleware {
  private static instance: UnifiedSecurityMiddleware;

  static getInstance(): UnifiedSecurityMiddleware {
    if (!UnifiedSecurityMiddleware.instance) {
      UnifiedSecurityMiddleware.instance = new UnifiedSecurityMiddleware();
    }
    return UnifiedSecurityMiddleware.instance;
  }

  /**
   * Process request through unified security stack
   */
  async processRequest(
    request: NextRequest,
    config: UnifiedSecurityConfig = {}
  ): Promise<SecurityMiddlewareResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const appliedFeatures: string[] = [];

    try {
      // Apply security level defaults
      const effectiveConfig = this.applySecurityLevelDefaults(config);

      // 1. API Version Control (if enabled)
      let versionResult: VersionValidationResult | undefined;
      if (effectiveConfig.enableVersionControl) {
        versionResult = await apiVersionController.validateVersion(request);
        appliedFeatures.push('version-control');
        
        if (!versionResult.isValid) {
          return this.createErrorResult(
            versionResult.errors,
            versionResult.warnings,
            appliedFeatures,
            performance.now() - startTime,
            versionResult.response
          );
        }
        
        warnings.push(...versionResult.warnings);
        warnings.push(...versionResult.deprecationWarnings);
      }

      // 2. Request Signature Validation (if enabled)
      let signatureResult: SignatureMiddlewareResult | undefined;
      if (effectiveConfig.enableSignatureValidation) {
        const signatureOptions: SignatureMiddlewareOptions = {
          enabled: true,
          ...effectiveConfig.signatureOptions
        };
        
        signatureResult = await signatureMiddleware.validateRequest(request, signatureOptions);
        appliedFeatures.push('signature-validation');
        
        if (!signatureResult.shouldContinue) {
          errors.push(...signatureResult.errors);
          return this.createErrorResult(
            errors,
            [...warnings, ...signatureResult.warnings],
            appliedFeatures,
            performance.now() - startTime,
            signatureResult.response
          );
        }
        
        warnings.push(...signatureResult.warnings);
      }

      // 3. Standard Validation Middleware (enhanced)
      let validationResult: ValidationResult | undefined;
      if (effectiveConfig.enableInputValidation || effectiveConfig.enableAuthentication || effectiveConfig.enableRateLimit) {
        const validationOptions: ValidationOptions = {
          requireAuth: effectiveConfig.enableAuthentication,
          requireAdmin: effectiveConfig.enableAuthorization,
          rateLimitConfig: effectiveConfig.enableRateLimit ? {
            windowMs: versionResult?.rateLimit?.windowMs || 60 * 1000,
            maxRequests: versionResult?.rateLimit?.maxRequests || 100
          } : undefined,
          ...effectiveConfig.validationOptions
        };

        const { response, validationResult: result } = await validationMiddleware.validateRequest(
          request,
          validationOptions
        );

        validationResult = result;
        appliedFeatures.push('input-validation');
        
        if (effectiveConfig.enableAuthentication) appliedFeatures.push('authentication');
        if (effectiveConfig.enableAuthorization) appliedFeatures.push('authorization');
        if (effectiveConfig.enableRateLimit) appliedFeatures.push('rate-limiting');

        if (!result.isValid) {
          errors.push(...result.errors);
          return this.createErrorResult(
            errors,
            [...warnings, ...result.warnings],
            appliedFeatures,
            performance.now() - startTime,
            response
          );
        }

        warnings.push(...result.warnings);
      }

      // 4. Create response processor for encryption (if enabled)
      let responseProcessor: ((data: any) => Promise<NextResponse>) | undefined;
      if (effectiveConfig.enableResponseEncryption) {
        responseProcessor = async (responseData: any) => {
          const encryptionOptions: ResponseEncryptionMiddlewareOptions = {
            enabled: true,
            ...effectiveConfig.encryptionOptions
          };

          const userRole = validationResult?.user?.role || 'user';
          const encryptionResult = await responseEncryptionMiddleware.processResponse(
            request,
            responseData,
            userRole,
            encryptionOptions
          );

          if (encryptionResult.shouldEncrypt && encryptionResult.encryptedResponse) {
            return encryptionResult.encryptedResponse;
          }

          // Return standard response if not encrypted
          return NextResponse.json(responseData);
        };
        
        appliedFeatures.push('response-encryption');
      }

      const processingTime = performance.now() - startTime;

      // Log security event if enabled
      if (effectiveConfig.logSecurityEvents) {
        this.logSecurityEvent(request, {
          appliedFeatures,
          securityLevel: effectiveConfig.securityLevel || 'basic',
          processingTime,
          warnings,
          versionInfo: versionResult?.version
        });
      }

      return {
        isValid: true,
        shouldContinue: true,
        securityLevel: effectiveConfig.securityLevel || 'basic',
        appliedFeatures,
        errors,
        warnings,
        validationResult,
        signatureResult,
        versionResult,
        responseProcessor,
        processingTime,
        securityOverhead: processingTime
      };

    } catch (error) {
      console.error('Unified security middleware error:', error);
      const processingTime = performance.now() - startTime;
      
      return this.createErrorResult(
        [`Security processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        appliedFeatures,
        processingTime,
        NextResponse.json({ error: 'Security validation failed' }, { status: 500 })
      );
    }
  }

  /**
   * Apply security level defaults to configuration
   */
  private applySecurityLevelDefaults(config: UnifiedSecurityConfig): UnifiedSecurityConfig {
    const level = config.securityLevel || 'basic';
    
    const levelDefaults = {
      basic: {
        enableAuthentication: true,
        enableInputValidation: true,
        enableRateLimit: true,
        enableSignatureValidation: false,
        enableResponseEncryption: false,
        enableVersionControl: false,
        logSecurityEvents: false
      },
      enhanced: {
        enableAuthentication: true,
        enableAuthorization: true,
        enableInputValidation: true,
        enableRateLimit: true,
        enableSignatureValidation: true,
        enableResponseEncryption: false,
        enableVersionControl: true,
        logSecurityEvents: true,
        signatureOptions: { securityLevel: 'medium' }
      },
      maximum: {
        enableAuthentication: true,
        enableAuthorization: true,
        enableInputValidation: true,
        enableRateLimit: true,
        enableSignatureValidation: true,
        enableResponseEncryption: true,
        enableVersionControl: true,
        logSecurityEvents: true,
        signatureOptions: { securityLevel: 'critical' },
        encryptionOptions: { encryptionLevel: 'maximum' }
      }
    };

    const defaults = levelDefaults[level];
    return { ...defaults, ...config };
  }

  /**
   * Create error result
   */
  private createErrorResult(
    errors: string[],
    warnings: string[],
    appliedFeatures: string[],
    processingTime: number,
    response?: NextResponse
  ): SecurityMiddlewareResult {
    return {
      isValid: false,
      shouldContinue: false,
      securityLevel: 'error',
      appliedFeatures,
      errors,
      warnings,
      response,
      processingTime,
      securityOverhead: processingTime
    };
  }

  /**
   * Log security events for monitoring
   */
  private logSecurityEvent(
    request: NextRequest,
    eventData: {
      appliedFeatures: string[];
      securityLevel: string;
      processingTime: number;
      warnings: string[];
      versionInfo?: string;
    }
  ): void {
    const url = new URL(request.url);
    
    const securityEvent = {
      type: 'UNIFIED_SECURITY_CHECK',
      timestamp: new Date().toISOString(),
      method: request.method,
      path: url.pathname,
      securityLevel: eventData.securityLevel,
      appliedFeatures: eventData.appliedFeatures,
      processingTime: Math.round(eventData.processingTime * 100) / 100,
      warnings: eventData.warnings,
      apiVersion: eventData.versionInfo,
      userAgent: request.headers.get('user-agent'),
      clientIp: this.getClientIp(request)
    };

    console.log('Security Event:', JSON.stringify(securityEvent, null, 2));
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
   * Create endpoint-specific middleware
   */
  createEndpointMiddleware(config: UnifiedSecurityConfig) {
    return async (request: NextRequest) => {
      return this.processRequest(request, config);
    };
  }
}

// Export singleton instance
export const unifiedSecurityMiddleware = UnifiedSecurityMiddleware.getInstance();

// Pre-configured security middlewares for common use cases
export const SecurityMiddlewares = {
  // Basic security (current level)
  BASIC: unifiedSecurityMiddleware.createEndpointMiddleware({
    securityLevel: 'basic'
  }),

  // Enhanced security (with signatures)
  ENHANCED: unifiedSecurityMiddleware.createEndpointMiddleware({
    securityLevel: 'enhanced'
  }),

  // Maximum security (all features)
  MAXIMUM: unifiedSecurityMiddleware.createEndpointMiddleware({
    securityLevel: 'maximum'
  }),

  // Public endpoints (minimal security)
  PUBLIC: unifiedSecurityMiddleware.createEndpointMiddleware({
    enableAuthentication: false,
    enableInputValidation: true,
    enableRateLimit: true,
    enableSignatureValidation: false,
    enableResponseEncryption: false,
    bypassForPublicEndpoints: true
  }),

  // Admin endpoints (maximum security)
  ADMIN: unifiedSecurityMiddleware.createEndpointMiddleware({
    securityLevel: 'maximum',
    enableAuthorization: true,
    signatureOptions: { securityLevel: 'critical' },
    encryptionOptions: { encryptionLevel: 'maximum' },
    logSecurityEvents: true
  }),

  // Payment endpoints (critical security)
  PAYMENT: unifiedSecurityMiddleware.createEndpointMiddleware({
    securityLevel: 'maximum',
    enableSignatureValidation: true,
    enableResponseEncryption: true,
    signatureOptions: { securityLevel: 'critical' },
    encryptionOptions: { encryptionLevel: 'enhanced' },
    logSecurityEvents: true
  })
};
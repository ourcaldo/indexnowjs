/**
 * Request Signature Validator
 * Implements HMAC-SHA256 request signature validation for API security
 * 
 * Part of Enhancement #6: API Security Middleware
 */

import crypto from 'crypto';

export interface SignatureConfig {
  algorithm: 'HMAC-SHA256' | 'HMAC-SHA512';
  secretKey: string;
  timestampToleranceMs: number;
  requiredHeaders: string[];
  signatureHeader: string;
  timestampHeader: string;
}

export interface SignatureValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  timestamp?: number;
  signature?: string;
}

/**
 * Request Signature Validator
 * Validates HMAC signatures to ensure request integrity and authenticity
 */
export class RequestSignatureValidator {
  private static instance: RequestSignatureValidator;
  private defaultConfig: SignatureConfig;

  private constructor() {
    this.defaultConfig = {
      algorithm: 'HMAC-SHA256',
      secretKey: process.env.API_SIGNATURE_SECRET || '',
      timestampToleranceMs: 5 * 60 * 1000, // 5 minutes
      requiredHeaders: ['content-type', 'authorization'],
      signatureHeader: 'x-signature',
      timestampHeader: 'x-timestamp',
    };
  }

  static getInstance(): RequestSignatureValidator {
    if (!RequestSignatureValidator.instance) {
      RequestSignatureValidator.instance = new RequestSignatureValidator();
    }
    return RequestSignatureValidator.instance;
  }

  /**
   * Validate request signature
   */
  async validateSignature(
    request: Request,
    body: string,
    config?: Partial<SignatureConfig>
  ): Promise<SignatureValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const cfg = { ...this.defaultConfig, ...config };

    try {
      // Check if signature validation is enabled
      if (!cfg.secretKey) {
        // Always allow bypass with development warnings (no production mode)
        warnings.push('WARNING: Signature validation disabled - no secret key configured');
        console.warn('SECURITY WARNING: Signature validation is disabled');
        return { isValid: true, errors, warnings };
      }

      // Extract signature and timestamp from headers
      const signature = this.getHeader(request, cfg.signatureHeader);
      const timestampStr = this.getHeader(request, cfg.timestampHeader);

      if (!signature) {
        errors.push(`Missing required signature header: ${cfg.signatureHeader}`);
      }

      if (!timestampStr) {
        errors.push(`Missing required timestamp header: ${cfg.timestampHeader}`);
      }

      if (errors.length > 0) {
        return { isValid: false, errors, warnings };
      }

      // Validate timestamp
      const timestamp = parseInt(timestampStr!, 10);
      if (isNaN(timestamp)) {
        errors.push('Invalid timestamp format');
        return { isValid: false, errors, warnings };
      }

      const timestampValidation = this.validateTimestamp(timestamp, cfg.timestampToleranceMs);
      if (!timestampValidation.isValid) {
        errors.push(...timestampValidation.errors);
        warnings.push(...timestampValidation.warnings);
      }

      // Generate expected signature
      const signatureData = this.buildSignatureData(request, body, timestamp, cfg);
      const expectedSignature = this.generateSignature(signatureData, cfg.secretKey, cfg.algorithm);

      // Constant-time comparison to prevent timing attacks
      const isValidSignature = this.constantTimeCompare(signature!, expectedSignature);

      if (!isValidSignature) {
        errors.push('Invalid request signature');
        
        // Security logging for invalid signatures
        console.warn('Invalid signature detected:', {
          method: request.method,
          url: request.url,
          timestamp,
          providedSignature: signature?.substring(0, 8) + '...',
          expectedSignature: expectedSignature.substring(0, 8) + '...'
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        timestamp,
        signature: signature!
      };

    } catch (error) {
      console.error('Signature validation error:', error);
      return {
        isValid: false,
        errors: [`Signature validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Generate signature for a request (for client-side use)
   */
  generateRequestSignature(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string,
    timestamp: number,
    secretKey: string,
    algorithm: 'HMAC-SHA256' | 'HMAC-SHA512' = 'HMAC-SHA256'
  ): string {
    const signatureData = this.buildSignatureDataFromParts(
      method,
      url,
      headers,
      body,
      timestamp,
      this.defaultConfig
    );
    
    return this.generateSignature(signatureData, secretKey, algorithm);
  }

  /**
   * Build signature data string from request components
   */
  private buildSignatureData(
    request: Request,
    body: string,
    timestamp: number,
    config: SignatureConfig
  ): string {
    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    
    // Extract required headers
    config.requiredHeaders.forEach(headerName => {
      const value = this.getHeader(request, headerName);
      if (value) {
        headers[headerName.toLowerCase()] = value;
      }
    });

    return this.buildSignatureDataFromParts(
      request.method,
      url.pathname + url.search,
      headers,
      body,
      timestamp,
      config
    );
  }

  /**
   * Build signature data from individual components
   */
  private buildSignatureDataFromParts(
    method: string,
    path: string,
    headers: Record<string, string>,
    body: string,
    timestamp: number,
    config: SignatureConfig
  ): string {
    const parts: string[] = [
      method.toUpperCase(),
      path,
      timestamp.toString()
    ];

    // Add required headers in alphabetical order
    const sortedHeaders = Object.keys(headers).sort();
    sortedHeaders.forEach(key => {
      parts.push(`${key}:${headers[key]}`);
    });

    // Add body hash for integrity
    const bodyHash = crypto.createHash('sha256').update(body || '').digest('hex');
    parts.push(bodyHash);

    return parts.join('\n');
  }

  /**
   * Generate HMAC signature
   */
  private generateSignature(
    data: string,
    secretKey: string,
    algorithm: 'HMAC-SHA256' | 'HMAC-SHA512'
  ): string {
    const hmacAlgorithm = algorithm === 'HMAC-SHA256' ? 'sha256' : 'sha512';
    return crypto
      .createHmac(hmacAlgorithm, secretKey)
      .update(data, 'utf8')
      .digest('hex');
  }

  /**
   * Validate timestamp to prevent replay attacks
   */
  private validateTimestamp(
    timestamp: number,
    toleranceMs: number
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const now = Date.now();
    const diff = Math.abs(now - timestamp);

    if (diff > toleranceMs) {
      errors.push(`Request timestamp too old or too far in future. Difference: ${diff}ms, Tolerance: ${toleranceMs}ms`);
    }

    // Warn if timestamp is more than 1 minute old but within tolerance
    if (diff > 60 * 1000 && diff <= toleranceMs) {
      warnings.push(`Request timestamp is ${Math.round(diff / 1000)}s old`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(provided: string, expected: string): boolean {
    if (provided.length !== expected.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < provided.length; i++) {
      result |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Get header value (case-insensitive)
   */
  private getHeader(request: Request, headerName: string): string | null {
    // Try standard headers API
    if (request.headers && typeof request.headers.get === 'function') {
      return request.headers.get(headerName);
    }

    // Fallback for different request objects
    const headers = (request as any).headers || {};
    
    // Case-insensitive header lookup
    const keys = Object.keys(headers);
    const matchingKey = keys.find(key => key.toLowerCase() === headerName.toLowerCase());
    
    return matchingKey ? headers[matchingKey] : null;
  }

  /**
   * Create signature configuration for specific security levels
   */
  createConfig(securityLevel: 'low' | 'medium' | 'high' | 'critical'): SignatureConfig {
    const baseConfig = { ...this.defaultConfig };

    switch (securityLevel) {
      case 'low':
        return {
          ...baseConfig,
          timestampToleranceMs: 15 * 60 * 1000, // 15 minutes
          requiredHeaders: ['content-type']
        };

      case 'medium':
        return {
          ...baseConfig,
          timestampToleranceMs: 5 * 60 * 1000, // 5 minutes
          requiredHeaders: ['content-type', 'authorization']
        };

      case 'high':
        return {
          ...baseConfig,
          algorithm: 'HMAC-SHA512',
          timestampToleranceMs: 2 * 60 * 1000, // 2 minutes
          requiredHeaders: ['content-type', 'authorization', 'user-agent']
        };

      case 'critical':
        return {
          ...baseConfig,
          algorithm: 'HMAC-SHA512',
          timestampToleranceMs: 30 * 1000, // 30 seconds
          requiredHeaders: ['content-type', 'authorization', 'user-agent', 'x-forwarded-for']
        };

      default:
        return baseConfig;
    }
  }
}

// Export singleton instance
export const signatureValidator = RequestSignatureValidator.getInstance();

// Pre-configured security levels
export const SignatureConfigs = {
  LOW: signatureValidator.createConfig('low'),
  MEDIUM: signatureValidator.createConfig('medium'),
  HIGH: signatureValidator.createConfig('high'),
  CRITICAL: signatureValidator.createConfig('critical')
};
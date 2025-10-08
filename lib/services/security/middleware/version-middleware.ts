/**
 * API Version Control Middleware
 * Provides advanced API versioning with deprecation warnings and feature flags
 * 
 * Part of Enhancement #6: API Security Middleware
 */

import { NextRequest, NextResponse } from 'next/server';

export interface VersionConfig {
  supportedVersions: string[];
  deprecatedVersions: VersionDeprecation[];
  versionSpecificRateLimit: Record<string, RateLimit>;
  featureFlags: Record<string, VersionFeature[]>;
  defaultVersion: string;
  enforceVersioning: boolean;
}

export interface VersionDeprecation {
  version: string;
  deprecatedAt: Date;
  sunsetAt: Date;
  migrationGuide: string;
  warningMessage: string;
}

export interface RateLimit {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

export interface VersionFeature {
  feature: string;
  enabledVersions: string[];
  description: string;
  requiresAuth?: boolean;
}

export interface VersionValidationResult {
  isValid: boolean;
  version: string;
  errors: string[];
  warnings: string[];
  deprecationWarnings: string[];
  rateLimit?: RateLimit;
  features: string[];
  response?: NextResponse;
}

/**
 * API Version Controller
 * Manages API versioning, deprecation, and feature flags
 */
export class ApiVersionController {
  private static instance: ApiVersionController;
  private config: VersionConfig;

  private constructor() {
    this.config = {
      supportedVersions: ['v1', 'v2'],
      deprecatedVersions: [],
      versionSpecificRateLimit: {
        'v1': { windowMs: 60 * 1000, maxRequests: 100 },
        'v2': { windowMs: 60 * 1000, maxRequests: 150 }
      },
      featureFlags: {
        'signature-validation': [
          { feature: 'signature-validation', enabledVersions: ['v2'], description: 'Request signature validation' }
        ],
        'response-encryption': [
          { feature: 'response-encryption', enabledVersions: ['v2'], description: 'Response encryption' }
        ],
        'advanced-rate-limiting': [
          { feature: 'advanced-rate-limiting', enabledVersions: ['v2'], description: 'Advanced rate limiting' }
        ]
      },
      defaultVersion: 'v1',
      enforceVersioning: false
    };
  }

  static getInstance(): ApiVersionController {
    if (!ApiVersionController.instance) {
      ApiVersionController.instance = new ApiVersionController();
    }
    return ApiVersionController.instance;
  }

  /**
   * Validate API version and apply version-specific rules
   */
  async validateVersion(request: NextRequest): Promise<VersionValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const deprecationWarnings: string[] = [];

    try {
      // Extract version from URL path or header
      const version = this.extractVersion(request);

      // Validate version support
      if (!this.config.supportedVersions.includes(version)) {
        if (this.config.enforceVersioning) {
          errors.push(`Unsupported API version: ${version}. Supported versions: ${this.config.supportedVersions.join(', ')}`);
          
          return {
            isValid: false,
            version,
            errors,
            warnings,
            deprecationWarnings,
            features: [],
            response: NextResponse.json(
              {
                error: 'Unsupported API version',
                supportedVersions: this.config.supportedVersions,
                migrationGuide: '/docs/api/migration'
              },
              { status: 400 }
            )
          };
        } else {
          warnings.push(`Unknown API version ${version}, falling back to ${this.config.defaultVersion}`);
        }
      }

      // Check for deprecation warnings
      const deprecation = this.getDeprecationInfo(version);
      if (deprecation) {
        deprecationWarnings.push(deprecation.warningMessage);
        
        // Check if version is past sunset date
        if (new Date() > deprecation.sunsetAt) {
          errors.push(`API version ${version} has been sunset. Please migrate to a supported version.`);
          
          return {
            isValid: false,
            version,
            errors,
            warnings,
            deprecationWarnings,
            features: [],
            response: NextResponse.json(
              {
                error: 'API version sunset',
                sunsetDate: deprecation.sunsetAt.toISOString(),
                migrationGuide: deprecation.migrationGuide
              },
              { status: 410 }
            )
          };
        }
      }

      // Get version-specific rate limits
      const rateLimit = this.config.versionSpecificRateLimit[version];

      // Get enabled features for this version
      const features = this.getEnabledFeatures(version);

      return {
        isValid: true,
        version,
        errors,
        warnings,
        deprecationWarnings,
        rateLimit,
        features
      };

    } catch (error) {
      console.error('Version validation error:', error);
      
      return {
        isValid: false,
        version: this.config.defaultVersion,
        errors: [`Version validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        deprecationWarnings,
        features: [],
        response: NextResponse.json(
          { error: 'Version validation error' },
          { status: 500 }
        )
      };
    }
  }

  /**
   * Apply version-specific rules to response
   */
  applyVersionRules(
    response: NextResponse,
    validationResult: VersionValidationResult
  ): NextResponse {
    // Add version headers
    response.headers.set('X-API-Version', validationResult.version);
    response.headers.set('X-Supported-Versions', this.config.supportedVersions.join(', '));

    // Add deprecation warnings
    if (validationResult.deprecationWarnings.length > 0) {
      response.headers.set('Deprecation', 'true');
      response.headers.set('X-Deprecation-Warning', validationResult.deprecationWarnings.join('; '));
    }

    // Add feature information
    if (validationResult.features.length > 0) {
      response.headers.set('X-Available-Features', validationResult.features.join(', '));
    }

    return response;
  }

  /**
   * Extract version from request
   */
  private extractVersion(request: NextRequest): string {
    const url = new URL(request.url);
    
    // Try to extract from URL path (/api/v1/, /api/v2/, etc.)
    const pathMatch = url.pathname.match(/\/api\/(v\d+)\//);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Try to extract from Accept header (application/vnd.api+json;version=v1)
    const acceptHeader = request.headers.get('accept') || '';
    const headerMatch = acceptHeader.match(/version=v(\d+)/);
    if (headerMatch) {
      return `v${headerMatch[1]}`;
    }

    // Try to extract from custom version header
    const versionHeader = request.headers.get('x-api-version');
    if (versionHeader) {
      return versionHeader;
    }

    // Default to configured default version
    return this.config.defaultVersion;
  }

  /**
   * Get deprecation information for a version
   */
  private getDeprecationInfo(version: string): VersionDeprecation | null {
    return this.config.deprecatedVersions.find(dep => dep.version === version) || null;
  }

  /**
   * Get enabled features for a version
   */
  private getEnabledFeatures(version: string): string[] {
    const features: string[] = [];
    
    Object.values(this.config.featureFlags).forEach(featureList => {
      featureList.forEach(feature => {
        if (feature.enabledVersions.includes(version)) {
          features.push(feature.feature);
        }
      });
    });

    return features;
  }

  /**
   * Check if a feature is enabled for a version
   */
  isFeatureEnabled(feature: string, version: string): boolean {
    const featureList = this.config.featureFlags[feature];
    if (!featureList) return false;

    return featureList.some(f => f.enabledVersions.includes(version));
  }

  /**
   * Add deprecation for a version
   */
  addDeprecation(deprecation: VersionDeprecation): void {
    // Remove existing deprecation for the same version
    this.config.deprecatedVersions = this.config.deprecatedVersions.filter(
      dep => dep.version !== deprecation.version
    );
    
    // Add new deprecation
    this.config.deprecatedVersions.push(deprecation);
    
    console.log(`Added deprecation for API version ${deprecation.version}`);
  }

  /**
   * Add or update feature flag
   */
  addFeatureFlag(flagName: string, feature: VersionFeature): void {
    if (!this.config.featureFlags[flagName]) {
      this.config.featureFlags[flagName] = [];
    }
    
    // Remove existing feature with same name
    this.config.featureFlags[flagName] = this.config.featureFlags[flagName].filter(
      f => f.feature !== feature.feature
    );
    
    // Add new feature
    this.config.featureFlags[flagName].push(feature);
    
    console.log(`Added feature flag: ${flagName} for versions ${feature.enabledVersions.join(', ')}`);
  }

  /**
   * Update version-specific rate limits
   */
  updateRateLimit(version: string, rateLimit: RateLimit): void {
    this.config.versionSpecificRateLimit[version] = rateLimit;
    console.log(`Updated rate limit for version ${version}:`, rateLimit);
  }

  /**
   * Get version statistics
   */
  getVersionStats(): {
    supportedVersions: number;
    deprecatedVersions: number;
    totalFeatures: number;
    versionWithRateLimits: number;
  } {
    return {
      supportedVersions: this.config.supportedVersions.length,
      deprecatedVersions: this.config.deprecatedVersions.length,
      totalFeatures: Object.keys(this.config.featureFlags).length,
      versionWithRateLimits: Object.keys(this.config.versionSpecificRateLimit).length
    };
  }

  /**
   * Export configuration (for backup/debugging)
   */
  exportConfig(): VersionConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<VersionConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('Updated version configuration');
  }
}

// Export singleton instance
export const apiVersionController = ApiVersionController.getInstance();

// Pre-configured deprecation warnings
export const DeprecationExamples = {
  V1_DEPRECATION: {
    version: 'v1',
    deprecatedAt: new Date('2025-01-01'),
    sunsetAt: new Date('2025-12-31'),
    migrationGuide: '/docs/api/v1-to-v2-migration',
    warningMessage: 'API v1 is deprecated and will be sunset on 2025-12-31. Please migrate to v2.'
  }
};
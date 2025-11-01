/**
 * Configuration-related type definitions for IndexNow Studio
 */

// Database configuration
export interface DatabaseConfig {
  url: string;
  key: string;
  schema: string;
  ssl: boolean;
  poolSize: number;
  timeout: number;
  retryAttempts: number;
  enableLogging: boolean;
}

// Email configuration
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  enableDebug: boolean;
}

// Payment configuration
export interface PaymentConfig {
  providers: {
    paddle: {
      apiKey: string;
      clientToken: string;
      environment: 'sandbox' | 'production';
      webhookUrl: string;
      vendorId?: string;
    };
    stripe?: {
      secretKey: string;
      publishableKey: string;
      webhookSecret: string;
    };
  };
  defaultCurrency: string;
  enableRecurring: boolean;
}

// Application configuration
export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  baseUrl: string;
  apiUrl: string;
  debug: boolean;
  maintenance: boolean;
  features: FeatureFlags;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

export interface FeatureFlags {
  rankTracking: boolean;
  bulkOperations: boolean;
  webhooks: boolean;
  apiAccess: boolean;
  advancedAnalytics: boolean;
  multiTenant: boolean;
  sso: boolean;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiry: string;
  refreshTokenExpiry: string;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
}

export interface MonitoringConfig {
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'console' | 'file' | 'external';
  };
  metrics: {
    enabled: boolean;
    endpoint?: string;
    interval: number;
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
}
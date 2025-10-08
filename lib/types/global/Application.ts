/**
 * Global application-level type definitions for IndexNow Studio
 */

// Environment and configuration
export type Environment = 'development' | 'production' | 'testing';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Application configuration
export interface ApplicationConfig {
  environment: Environment;
  version: string;
  buildDate: string;
  logLevel: LogLevel;
  features: FeatureFlags;
  limits: ApplicationLimits;
}

// Feature flags
export interface FeatureFlags {
  enableRankTracking: boolean;
  enablePaymentGateways: boolean;
  enableBulkOperations: boolean;
  enableAdvancedAnalytics: boolean;
  enableApiAccess: boolean;
  enableWebhooks: boolean;
  enableSSO: boolean;
  enableTrials: boolean;
  maintenanceMode: boolean;
}

// Application limits and quotas
export interface ApplicationLimits {
  maxJobsPerUser: number;
  maxUrlsPerJob: number;
  maxServiceAccountsPerUser: number;
  maxKeywordsPerUser: number;
  maxConcurrentJobs: number;
  rateLimitPerMinute: number;
  fileSizeLimit: number; // in bytes
  sessionTimeout: number; // in minutes
}

// Navigation and routing
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  children?: NavigationItem[];
  isActive?: boolean;
  isDisabled?: boolean;
  badge?: string | number;
  requiredRole?: string[];
}

// Theme and UI
export type ThemeMode = 'light' | 'dark' | 'auto';
export type UISize = 'sm' | 'md' | 'lg';
export type UIVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  accentColor: string;
  fontSize: UISize;
  compactMode: boolean;
}

// Error tracking and monitoring
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  timestamp: Date;
  environment: Environment;
  buildVersion: string;
}

// System health and status
export type SystemStatus = 'operational' | 'degraded' | 'maintenance' | 'outage';

export interface SystemHealth {
  status: SystemStatus;
  services: ServiceHealth[];
  lastUpdated: Date;
  incidents?: Incident[];
}

export interface ServiceHealth {
  name: string;
  status: SystemStatus;
  responseTime?: number;
  uptime?: number;
  lastCheck: Date;
  details?: Record<string, any>;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
  startedAt: Date;
  resolvedAt?: Date;
  updates: IncidentUpdate[];
}

export interface IncidentUpdate {
  id: string;
  message: string;
  timestamp: Date;
  status: string;
}

// Analytics and tracking
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  errorRate: number;
  activeUsers: number;
  timestamp: Date;
}
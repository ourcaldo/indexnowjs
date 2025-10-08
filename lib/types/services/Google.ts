/**
 * Google service-related type definitions for IndexNow Studio
 */

// Google API Client types - moved from external
export interface GoogleServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface GoogleIndexingRequest {
  url: string;
  type: 'URL_UPDATED' | 'URL_DELETED';
}

export interface GoogleIndexingResponse {
  urlNotificationMetadata: {
    url: string;
    latestUpdate: {
      url: string;
      type: 'URL_UPDATED' | 'URL_DELETED';
      notifyTime: string;
    };
  };
}

// Google API Client types
export interface GoogleApiClientConfig {
  credentials: GoogleServiceAccount;
  projectId: string;
  scopes: string[];
  quotaLimits: {
    daily: number;
    perMinute: number;
  };
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export interface GoogleApiClientOptions {
  timeout?: number;
  userAgent?: string;
  rateLimiting?: boolean;
  caching?: boolean;
  cacheTtl?: number;
}

// Google Indexing API specific types
export interface IndexingApiRequest {
  url: string;
  type: 'URL_UPDATED' | 'URL_DELETED';
  metadata?: {
    jobId?: string;
    batchId?: string;
    priority?: number;
    userId?: string;
  };
}

export interface IndexingApiResponse {
  url: string;
  status: 'SUCCESS' | 'INVALID_URL' | 'FORBIDDEN' | 'QUOTA_EXCEEDED' | 'INTERNAL_ERROR';
  statusCode: number;
  message?: string;
  timestamp: Date;
  metadata?: {
    quotaUsed?: number;
    quotaRemaining?: number;
    processingTime?: number;
  };
}

export interface BatchIndexingRequest {
  requests: IndexingApiRequest[];
  batchSize?: number;
  delayBetweenBatches?: number;
  continueOnError?: boolean;
  priority?: number;
}

export interface BatchIndexingResponse {
  batchId: string;
  total: number;
  successful: number;
  failed: number;
  results: IndexingApiResponse[];
  startedAt: Date;
  completedAt: Date;
  processingTime: number;
  quotaUsed: number;
}

// Quota management types
export interface QuotaUsage {
  serviceAccountId: string;
  daily: {
    used: number;
    limit: number;
    remaining: number;
    resetAt: Date;
  };
  perMinute: {
    used: number;
    limit: number;
    remaining: number;
    resetAt: Date;
  };
  lastUpdated: Date;
}

export interface QuotaManager {
  checkQuota: (serviceAccountId: string, requestCount: number) => Promise<boolean>;
  updateQuota: (serviceAccountId: string, requestCount: number) => Promise<void>;
  getQuotaUsage: (serviceAccountId: string) => Promise<QuotaUsage>;
  resetQuota: (serviceAccountId: string, type: 'daily' | 'minute') => Promise<void>;
}

// Service account management types
export interface ServiceAccountManager {
  credentials: GoogleServiceAccount;
  isActive: boolean;
  quotaLimits: {
    daily: number;
    perMinute: number;
  };
  currentUsage: QuotaUsage;
  healthStatus: ServiceAccountHealth;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceAccountHealth {
  status: 'healthy' | 'warning' | 'error' | 'disabled';
  lastCheck: Date;
  checks: HealthCheck[];
}

export interface HealthCheck {
  type: 'authentication' | 'quota' | 'permissions' | 'connectivity';
  status: 'pass' | 'fail' | 'warning';
  message?: string;
  timestamp: Date;
  responseTime?: number;
}

// Load balancing types
export interface LoadBalancer {
  selectServiceAccount: (requestCount: number) => Promise<string | null>;
  getAvailableAccounts: () => Promise<ServiceAccountManager[]>;
  updateAccountHealth: (accountId: string, health: ServiceAccountHealth) => Promise<void>;
  rebalance: () => Promise<void>;
}

export interface LoadBalancingStrategy {
  type: 'round-robin' | 'least-used' | 'weighted' | 'health-based';
  weights?: Record<string, number>;
  healthThreshold?: number;
  maxRetries?: number;
}

// Authentication and token management
export interface TokenManager {
  getAccessToken: (serviceAccountId: string) => Promise<string>;
  refreshToken: (serviceAccountId: string) => Promise<string>;
  validateToken: (token: string) => Promise<boolean>;
  revokeToken: (serviceAccountId: string) => Promise<void>;
  clearTokenCache: (serviceAccountId?: string) => Promise<void>;
}

export interface AccessToken {
  token: string;
  expiresAt: Date;
  scopes: string[];
  serviceAccountId: string;
  isValid: boolean;
}

// Error handling types
export interface GoogleApiError {
  code: string;
  message: string;
  status: number;
  details?: {
    domain?: string;
    reason?: string;
    location?: string;
    locationType?: string;
  };
  retryable: boolean;
  quotaExceeded: boolean;
  serviceAccountId?: string;
  url?: string;
  timestamp: Date;
}

export interface GoogleErrorHandler {
  handleError: (error: GoogleApiError) => Promise<void>;
  shouldRetry: (error: GoogleApiError, retryCount: number) => boolean;
  getRetryDelay: (retryCount: number) => number;
  logError: (error: GoogleApiError) => Promise<void>;
}

// Monitoring and analytics types
export interface ApiMetrics {
  serviceAccountId: string;
  period: {
    start: Date;
    end: Date;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    quotaExceeded: number;
  };
  performance: {
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p95ResponseTime: number;
  };
  quotaUsage: {
    daily: QuotaUsage['daily'];
    perMinute: QuotaUsage['perMinute'];
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    recent: GoogleApiError[];
  };
}

export interface MonitoringService {
  trackRequest: (serviceAccountId: string, request: IndexingApiRequest, response: IndexingApiResponse) => Promise<void>;
  getMetrics: (serviceAccountId: string, period: { start: Date; end: Date }) => Promise<ApiMetrics>;
  generateReport: (serviceAccountIds: string[], period: { start: Date; end: Date }) => Promise<ApiReport>;
  setAlert: (alert: ApiAlert) => Promise<void>;
}

export interface ApiReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    quotaUtilization: number;
  };
  serviceAccounts: ApiMetrics[];
  trends: {
    requests: Array<{ date: Date; count: number }>;
    successRate: Array<{ date: Date; rate: number }>;
    responseTime: Array<{ date: Date; time: number }>;
  };
  recommendations: string[];
}

export interface ApiAlert {
  id: string;
  type: 'quota_threshold' | 'error_rate' | 'response_time' | 'service_down';
  threshold: number;
  serviceAccountIds: string[];
  enabled: boolean;
  notifications: {
    email?: string[];
    webhook?: string;
    slack?: string;
  };
  createdAt: Date;
  lastTriggered?: Date;
}

// Webhook and callback types
export interface WebhookPayload {
  event: 'indexing_completed' | 'indexing_failed' | 'quota_exceeded' | 'service_account_error';
  data: {
    serviceAccountId: string;
    url?: string;
    status?: string;
    error?: GoogleApiError;
    timestamp: Date;
  };
  metadata?: Record<string, any>;
}

export interface WebhookHandler {
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  retryConfig: {
    maxRetries: number;
    timeout: number;
  };
}

// Configuration types
export interface GoogleServiceConfig {
  defaultQuotaLimits: {
    daily: number;
    perMinute: number;
  };
  loadBalancing: LoadBalancingStrategy;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  caching: {
    enabled: boolean;
    tokenTtl: number;
    responseTtl: number;
  };
  monitoring: {
    enabled: boolean;
    metricsRetention: number; // days
    alerting: boolean;
  };
  webhooks: WebhookHandler[];
}

// Service factory types
export interface GoogleServiceFactory {
  createIndexingService: (config: GoogleApiClientConfig) => GoogleIndexingService;
  createTokenManager: () => TokenManager;
  createQuotaManager: () => QuotaManager;
  createLoadBalancer: (strategy: LoadBalancingStrategy) => LoadBalancer;
  createMonitoringService: () => MonitoringService;
}

export interface GoogleIndexingService {
  submitUrl: (request: IndexingApiRequest) => Promise<IndexingApiResponse>;
  submitBatch: (request: BatchIndexingRequest) => Promise<BatchIndexingResponse>;
  getQuotaUsage: () => Promise<QuotaUsage>;
  healthCheck: () => Promise<HealthCheck[]>;
  getMetrics: (period: { start: Date; end: Date }) => Promise<ApiMetrics>;
}
/**
 * SeRanking API Type Definitions
 * Type definitions for SeRanking keyword export API integration
 */

// SeRanking API Request Types
export interface SeRankingKeywordExportRequest {
  keywords: string[];
  source: string; // Country code like 'us', 'uk', etc.
  sort?: 'cpc' | 'volume' | 'competition' | 'difficulty';
  sort_order?: 'asc' | 'desc';
  cols?: string; // Comma-separated: 'keyword,volume,cpc,competition,difficulty,history_trend'
}

// SeRanking API Response Types
export interface SeRankingKeywordData {
  is_data_found: boolean;
  keyword: string;
  volume: number | null;
  cpc: number | null;
  competition: number | null;
  difficulty: number | null;
  history_trend: Record<string, number> | null;
}

export type SeRankingApiResponse = SeRankingKeywordData[];

// API Client Configuration
export interface SeRankingClientConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// API Request Configuration
export interface ApiRequestConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: FormData | URLSearchParams | string;
  timeout?: number;
}

// Rate Limiting Types
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export interface RateLimitState {
  minuteRequests: number[];
  hourRequests: number[];
  dailyRequests: number[];
  lastReset: {
    minute: Date;
    hour: Date;
    day: Date;
  };
}

// Error Types
export enum SeRankingErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  QUOTA_EXCEEDED_ERROR = 'QUOTA_EXCEEDED_ERROR',
  INVALID_REQUEST_ERROR = 'INVALID_REQUEST_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface SeRankingError extends Error {
  type: SeRankingErrorType;
  statusCode?: number;
  response?: any;
  retryable: boolean;
  context?: any;
  timestamp?: Date;
  originalError?: Error;
  circuitBreakerState?: any;
}

// Quota Management Types
export interface QuotaStatus {
  current_usage: number;
  quota_limit: number;
  quota_remaining: number;
  usage_percentage: number;
  reset_date: Date;
  is_approaching_limit: boolean;
  is_quota_exceeded: boolean;
}

export interface QuotaAlert {
  threshold: number;
  enabled: boolean;
  last_triggered?: Date;
}

// Metrics and Monitoring Types
export interface ApiMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  cache_hits: number;
  cache_misses: number;
  last_request_time?: Date;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time?: number;
  last_check: Date;
  error_message?: string;
  error?: string;
  warning?: string;
  timestamp?: Date;
}

// Service Response Types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    type: SeRankingErrorType;
    message: string;
    details?: any;
  };
  metadata?: {
    source: 'cache' | 'api';
    timestamp: Date;
    quota_remaining?: number;
    response_time?: number;
  };
}

// Bulk Processing Types
export interface BulkKeywordRequest {
  keyword: string;
  country_code: string;
  language_code?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface BulkProcessingJob {
  id: string;
  keywords: BulkKeywordRequest[];
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
  };
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  error_message?: string;
  estimated_completion?: Date;
}

// Validation Types
export interface KeywordValidationResult {
  isValid: boolean;
  keyword: string;
  country_code: string;
  errors: string[];
  warnings: string[];
}

export interface ApiResponseValidationResult {
  isValid: boolean;
  data?: SeRankingKeywordData[];
  errors: string[];
  warnings: string[];
  fixed_data?: SeRankingKeywordData[];
}

// Integration Settings Types
export interface IntegrationSettings {
  service_name: string;
  api_key: string;
  api_url: string;
  api_quota_limit: number;
  api_quota_used: number;
  quota_reset_date: Date;
  is_active: boolean;
  rate_limits: RateLimitConfig;
  alert_settings: {
    quota_alerts: QuotaAlert[];
    error_notifications: boolean;
    performance_alerts: boolean;
  };
}

// Export utility type for better developer experience
export type SeRankingServiceConfig = {
  client: SeRankingClientConfig;
  rateLimit: RateLimitConfig;
  quotaAlerts: QuotaAlert[];
  enableMetrics: boolean;
  enableHealthChecks: boolean;
};
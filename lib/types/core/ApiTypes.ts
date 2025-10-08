/**
 * API-related type definitions for IndexNow Studio
 */

import { NextRequest } from 'next/server';

// Request/Response types
export interface ApiRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  userId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

// Middleware types
export interface MiddlewareContext {
  request: ApiRequest;
  params?: Record<string, string>;
  searchParams?: URLSearchParams;
}

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  userId: string;
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: any;
}

// Cache types
export interface CacheConfig {
  ttl: number;
  key: string;
  tags?: string[];
}

export interface CacheableResponse<T = any> extends ApiResponse<T> {
  cacheInfo?: {
    cached: boolean;
    key: string;
    ttl: number;
    createdAt: string;
  };
}

// Health check types
export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: any;
  timestamp: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthCheckResult[];
  uptime: number;
  version: string;
  timestamp: string;
}

// Webhook types
export interface WebhookPayload<T = any> {
  event: string;
  data: T;
  timestamp: string;
  signature?: string;
  source: string;
}

export interface WebhookResponse {
  received: boolean;
  processed: boolean;
  message?: string;
  errors?: string[];
}

// File upload types
export interface UploadConfig {
  maxSize: number;
  allowedTypes: string[];
  destination: string;
}

export interface UploadResult {
  success: boolean;
  filename?: string;
  path?: string;
  size?: number;
  mimetype?: string;
  error?: string;
}

// Search and filter types
export interface SearchOptions {
  query?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  page?: number;
  limit?: number;
}

export interface FilterOption {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'ilike';
  value: any;
}

// Bulk operation types
export interface BulkOperation<T = any> {
  action: 'create' | 'update' | 'delete';
  data: T[];
  options?: {
    skipValidation?: boolean;
    continueOnError?: boolean;
  };
}

export interface BulkOperationResult<T = any> {
  successful: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Audit trail types
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface AuditOptions {
  includeChanges?: boolean;
  includeMetadata?: boolean;
  resource?: string;
  action?: string;
}

// Export/Import types
export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  filters?: Record<string, any>;
  fields?: string[];
  includeHeaders?: boolean;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
}

export interface ImportOptions {
  format: 'json' | 'csv' | 'xlsx';
  skipHeaders?: boolean;
  mapping?: Record<string, string>;
  validation?: boolean;
  updateExisting?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}
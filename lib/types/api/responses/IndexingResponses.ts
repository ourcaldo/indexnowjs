/**
 * Indexing-related API response types for IndexNow Studio
 */

import type { ApiResponse, PaginatedResponse } from '../../common/ResponseTypes';
import type { IndexingJob, JobProgress, ServiceAccount, JobStatistics } from '../../business/IndexingTypes';

// Job management responses
export interface CreateJobResponse extends ApiResponse<{
  job: IndexingJob;
  estimatedCompletionTime?: Date;
  urlsToProcess: number;
}> {}

export interface GetJobResponse extends ApiResponse<IndexingJob> {}

export interface GetJobsResponse extends PaginatedResponse<IndexingJob> {}

export interface UpdateJobResponse extends ApiResponse<IndexingJob> {}

export interface DeleteJobResponse extends ApiResponse<{
  deleted: boolean;
  deletedAt: Date;
  jobId: string;
}> {}

export interface ProcessJobResponse extends ApiResponse<{
  started: boolean;
  startedAt: Date;
  estimatedCompletionTime?: Date;
  progress: JobProgress;
}> {}

export interface CloneJobResponse extends ApiResponse<{
  cloned: boolean;
  originalJobId: string;
  newJob: IndexingJob;
}> {}

// Job progress and monitoring responses
export interface GetJobProgressResponse extends ApiResponse<JobProgress> {}

export interface GetJobStatisticsResponse extends ApiResponse<JobStatistics> {}

export interface GetJobAnalyticsResponse extends ApiResponse<{
  overview: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    successRate: number;
  };
  trends: {
    jobsOverTime: Array<{ date: Date; count: number }>;
    urlsOverTime: Array<{ date: Date; count: number }>;
    successRate: Array<{ date: Date; rate: number }>;
  };
  breakdown: {
    byType: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    byStatus: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    byServiceAccount: Array<{
      serviceAccountId: string;
      serviceAccountName: string;
      count: number;
      successRate: number;
    }>;
  };
}> {}

// URL submission responses
export interface SubmitUrlResponse extends ApiResponse<{
  submitted: boolean;
  submittedAt: Date;
  url: string;
  status: string;
  estimatedProcessingTime?: number;
  quotaUsed: number;
  quotaRemaining: number;
}> {}

export interface BatchSubmitUrlsResponse extends ApiResponse<{
  batchId: string;
  totalUrls: number;
  acceptedUrls: number;
  rejectedUrls: number;
  results: Array<{
    url: string;
    status: 'accepted' | 'rejected';
    reason?: string;
  }>;
  estimatedCompletionTime?: Date;
}> {}

export interface BulkUrlResponse extends ApiResponse<{
  processed: boolean;
  batchId: string;
  totalUrls: number;
  successfulUrls: number;
  failedUrls: number;
  results: Array<{
    url: string;
    status: 'success' | 'failed';
    response?: any;
    error?: string;
  }>;
  processingTime: number;
  quotaUsed: number;
}> {}

// Sitemap parsing responses
export interface SitemapParseResponse extends ApiResponse<{
  sitemapUrl: string;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  urls: Array<{
    url: string;
    lastModified?: Date;
    changeFreq?: string;
    priority?: number;
    isValid: boolean;
    error?: string;
  }>;
  images?: Array<{
    url: string;
    title?: string;
    caption?: string;
    location: string;
  }>;
  videos?: Array<{
    url: string;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    location: string;
  }>;
  parseTime: number;
}> {}

export interface SitemapValidateResponse extends ApiResponse<{
  isValid: boolean;
  sitemapUrl: string;
  errors: Array<{
    type: string;
    message: string;
    line?: number;
    column?: number;
  }>;
  warnings: Array<{
    type: string;
    message: string;
    line?: number;
    column?: number;
  }>;
  statistics: {
    totalUrls: number;
    uniqueUrls: number;
    duplicateUrls: number;
    invalidUrls: number;
    accessibleUrls: number;
    inaccessibleUrls: number;
  };
}> {}

// Service account responses
export interface CreateServiceAccountResponse extends ApiResponse<{
  serviceAccount: ServiceAccount;
  isActive: boolean;
  quotaLimits: {
    daily: number;
    perMinute: number;
  };
}> {}

export interface GetServiceAccountsResponse extends PaginatedResponse<ServiceAccount> {}

export interface GetServiceAccountResponse extends ApiResponse<ServiceAccount> {}

export interface UpdateServiceAccountResponse extends ApiResponse<ServiceAccount> {}

export interface DeleteServiceAccountResponse extends ApiResponse<{
  deleted: boolean;
  deletedAt: Date;
  serviceAccountId: string;
  jobsTransferred?: number;
  transferredTo?: string;
}> {}

export interface TestServiceAccountResponse extends ApiResponse<{
  isValid: boolean;
  testedAt: Date;
  testUrl?: string;
  response?: {
    status: string;
    responseTime: number;
    quotaUsed: number;
  };
  error?: string;
  permissions: {
    canSubmitUrls: boolean;
    canDeleteUrls: boolean;
    hasRequiredScopes: boolean;
  };
}> {}

// Quota management responses
export interface GetQuotaUsageResponse extends ApiResponse<{
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
}> {}

export interface GetIndexingQuotaHistoryResponse extends PaginatedResponse<{
  date: Date;
  serviceAccountId: string;
  dailyUsage: number;
  dailyLimit: number;
  requestCount: number;
  successfulRequests: number;
  failedRequests: number;
}> {}

// Bulk operations responses
export interface BulkJobResponse extends ApiResponse<{
  processed: boolean;
  action: string;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  results: Array<{
    jobId: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}> {}

export interface BulkTagResponse extends ApiResponse<{
  updated: boolean;
  action: string;
  jobIds: string[];
  tags: string[];
  affectedJobs: number;
}> {}

// Job alerts and monitoring responses
export interface CreateJobAlertResponse extends ApiResponse<{
  alert: {
    id: string;
    jobId: string;
    type: string;
    threshold?: number;
    isActive: boolean;
    notificationMethods: string[];
    createdAt: Date;
  };
}> {}

export interface GetJobAlertsResponse extends PaginatedResponse<{
  id: string;
  jobId: string;
  jobName: string;
  type: string;
  threshold?: number;
  isActive: boolean;
  notificationMethods: string[];
  lastTriggered?: Date;
  createdAt: Date;
}> {}

export interface UpdateJobAlertResponse extends ApiResponse<{
  alert: {
    id: string;
    jobId: string;
    type: string;
    threshold?: number;
    isActive: boolean;
    notificationMethods: string[];
    updatedAt: Date;
  };
}> {}

// Health check and monitoring responses
export interface SystemHealthResponse extends ApiResponse<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    lastCheck: Date;
    details?: any;
  }>;
  uptime: number;
  version: string;
  lastCheck: Date;
}> {}

export interface GetSystemMetricsResponse extends ApiResponse<{
  period: { start: Date; end: Date };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    quotaUtilization: number;
    activeJobs: number;
    completedJobs: number;
  };
  trends: {
    requests: Array<{ timestamp: Date; count: number }>;
    successRate: Array<{ timestamp: Date; rate: number }>;
    responseTime: Array<{ timestamp: Date; time: number }>;
  };
}> {}

// Error responses
export interface IndexingErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: {
    jobId?: string;
    url?: string;
    serviceAccountId?: string;
    quotaExceeded?: boolean;
    retryable?: boolean;
    suggestion?: string;
  };
  timestamp: string;
}

// Type aliases for common responses
export type IndexingApiResponse<T = any> = ApiResponse<T>;
export type IndexingPaginatedResponse<T = any> = PaginatedResponse<T>;
export type IndexingResponse<T> = ApiResponse<T> | IndexingErrorResponse;
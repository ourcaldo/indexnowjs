/**
 * Indexing-related type definitions for IndexNow Studio
 */

// Job types
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'scheduled';
export type JobType = 'sitemap' | 'url-list' | 'single-url' | 'bulk-upload';
export type ScheduleType = 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type SubmissionType = 'URL_UPDATED' | 'URL_DELETED';
export type SubmissionStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';

// Core interfaces
export interface IndexingJob {
  id: string;
  userId: string;
  name: string;
  type: JobType;
  status: JobStatus;
  scheduleType: ScheduleType;
  cronExpression?: string;
  sourceData: JobSourceData;
  totalUrls: number;
  processedUrls: number;
  successfulUrls: number;
  failedUrls: number;
  serviceAccountId?: string;
  tags?: string[];
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface JobSourceData {
  urls?: string[];
  sitemapUrl?: string;
  content?: string;
  file?: {
    name: string;
    size: number;
    type: string;
  };
}

export interface JobSubmission {
  id: string;
  jobId: string;
  url: string;
  type: SubmissionType;
  status: SubmissionStatus;
  responseData?: GoogleIndexingResponse;
  errorMessage?: string;
  submittedAt?: Date;
  processedAt?: Date;
  retryCount: number;
  retryAt?: Date;
}

export interface JobProgress {
  jobId: string;
  status: JobStatus;
  totalUrls: number;
  processedUrls: number;
  successfulUrls: number;
  failedUrls: number;
  progressPercentage: number;
  currentUrl?: string;
  estimatedCompletion?: Date;
  processingRate?: number; // URLs per minute
  elapsedTime?: number; // in seconds
}

export interface JobStatistics {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalUrls: number;
  successfulUrls: number;
  failedUrls: number;
  averageProcessingTime: number;
  successRate: number;
}

// Service Account types
export interface ServiceAccount {
  id: string;
  userId: string;
  name: string;
  email: string;
  projectId: string;
  credentials: string; // Encrypted JSON
  dailyQuotaLimit: number;
  minuteQuotaLimit: number;
  dailyQuotaUsed: number;
  minuteQuotaUsed: number;
  quotaResetDate: Date;
  isActive: boolean;
  isVerified: boolean;
  lastUsedAt?: Date;
  errorCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceAccountQuota {
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  dailyPercentage: number;
  minuteLimit: number;
  minuteUsed: number;
  minuteRemaining: number;
  minutePercentage: number;
  resetAt: Date;
  isExceeded: boolean;
}

export interface ServiceAccountStatus {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isHealthy: boolean;
  quota: ServiceAccountQuota;
  lastCheck: Date;
  errors?: string[];
}

// Request/Response types
export interface CreateJobRequest {
  name: string;
  type: JobType;
  scheduleType: ScheduleType;
  cronExpression?: string;
  sourceData: JobSourceData;
  serviceAccountId?: string;
  tags?: string[];
  priority?: number;
}

export interface UpdateJobRequest {
  name?: string;
  scheduleType?: ScheduleType;
  cronExpression?: string;
  serviceAccountId?: string;
  tags?: string[];
  priority?: number;
  isActive?: boolean;
}

export interface CreateServiceAccountRequest {
  name: string;
  credentialsFile: File | string;
  dailyQuotaLimit?: number;
  minuteQuotaLimit?: number;
}

export interface UpdateServiceAccountRequest {
  name?: string;
  dailyQuotaLimit?: number;
  minuteQuotaLimit?: number;
  isActive?: boolean;
}

export interface ProcessJobRequest {
  jobId: string;
  serviceAccountId?: string;
  priority?: boolean;
}

export interface BulkUrlRequest {
  urls: string[];
  type?: SubmissionType;
  serviceAccountId?: string;
  priority?: boolean;
}

export interface SitemapParseRequest {
  sitemapUrl: string;
  maxUrls?: number;
  includeImages?: boolean;
  includeVideos?: boolean;
}

export interface SitemapParseResponse {
  urls: string[];
  totalUrls: number;
  parsedAt: Date;
  metadata?: {
    lastModified?: Date;
    sitemapType?: string;
    imageUrls?: string[];
    videoUrls?: string[];
  };
}

// Google API types
export interface GoogleIndexingRequest {
  url: string;
  type: SubmissionType;
}

export interface GoogleIndexingResponse {
  urlNotificationMetadata: {
    url: string;
    latestUpdate: {
      url: string;
      type: string;
      notifyTime: string;
    };
  };
}

export interface GoogleApiError {
  error: {
    code: number;
    message: string;
    status: string;
    details?: any[];
  };
}

// Batch processing types
export interface BatchJob {
  id: string;
  name: string;
  jobs: string[]; // Job IDs
  totalJobs: number;
  processedJobs: number;
  successfulJobs: number;
  failedJobs: number;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface BatchJobRequest {
  name: string;
  jobIds: string[];
  sequential?: boolean;
  delay?: number; // Delay between jobs in ms
}

// Schedule types
export interface JobSchedule {
  id: string;
  jobId: string;
  type: ScheduleType;
  cronExpression?: string;
  timezone?: string;
  isActive: boolean;
  nextRun?: Date;
  lastRun?: Date;
  runCount: number;
  failureCount: number;
  maxFailures?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleOptions {
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  maxRuns?: number;
  maxFailures?: number;
}

// Monitoring types
export interface JobMonitoring {
  jobId: string;
  notifications: {
    onStart?: boolean;
    onComplete?: boolean;
    onFailure?: boolean;
    onQuotaAlert?: boolean;
  };
  alertThresholds: {
    failureRate?: number; // Percentage
    processingTime?: number; // Minutes
    quotaUsage?: number; // Percentage
  };
  webhooks?: string[];
}

export interface JobAlert {
  id: string;
  jobId: string;
  type: 'failure' | 'quota' | 'timeout' | 'error';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

// Quota management types
export interface QuotaUsage {
  serviceAccountId: string;
  date: Date;
  dailyUsed: number;
  hourlyUsage: number[];
  peakHour: number;
  efficiency: number; // Success rate
}

export interface QuotaAlert {
  id: string;
  serviceAccountId: string;
  type: 'daily' | 'minute' | 'approaching';
  threshold: number;
  currentUsage: number;
  message: string;
  sentAt: Date;
}

// URL validation types
export interface UrlValidation {
  url: string;
  isValid: boolean;
  errors?: string[];
  metadata?: {
    domain: string;
    protocol: string;
    statusCode?: number;
    contentType?: string;
    lastModified?: Date;
    size?: number;
  };
}

export interface BulkUrlValidation {
  total: number;
  valid: number;
  invalid: number;
  results: UrlValidation[];
}

// Export/Import types for indexing
export interface JobExportOptions {
  includeSubmissions?: boolean;
  includeStatistics?: boolean;
  format: 'json' | 'csv' | 'xlsx';
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface JobImportOptions {
  format: 'json' | 'csv' | 'xlsx';
  updateExisting?: boolean;
  validateUrls?: boolean;
  skipInvalid?: boolean;
}
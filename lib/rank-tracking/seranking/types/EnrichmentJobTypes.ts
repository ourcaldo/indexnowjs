/**
 * Enrichment Job Type Definitions
 * Types for keyword enrichment job queue and processing system
 */

import { Database } from '../../../database/database-types';
import { 
  SeRankingKeywordData,
  ServiceResponse,
  QuotaStatus 
} from './SeRankingTypes';
import {
  KeywordBankEntity,
  KeywordBankInsert
} from './KeywordBankTypes';

// Job Status Types
export enum EnrichmentJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
  RETRYING = 'retrying'
}

// Job Priority Levels
export enum JobPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

// Job Types
export enum EnrichmentJobType {
  SINGLE_KEYWORD = 'single_keyword',
  BULK_ENRICHMENT = 'bulk_enrichment',
  CACHE_REFRESH = 'cache_refresh',
  BATCH_UPDATE = 'batch_update',
  SCHEDULED_ENRICHMENT = 'scheduled_enrichment'
}

// Base Job Configuration
export interface EnrichmentJobConfig {
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  priority: JobPriority;
  preserveOrder: boolean;
  enableRateLimiting: boolean;
  quotaThreshold: number;
  notifyOnCompletion: boolean;
}

// Default job configuration
export const DEFAULT_JOB_CONFIG: EnrichmentJobConfig = {
  batchSize: 25,
  maxRetries: 3,
  retryDelayMs: 5000,
  timeoutMs: 300000, // 5 minutes
  priority: JobPriority.NORMAL,
  preserveOrder: false,
  enableRateLimiting: true,
  quotaThreshold: 0.8,
  notifyOnCompletion: false
};

// Job Progress Tracking
export interface JobProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  currentKeyword?: string;
  currentBatch?: number;
  totalBatches?: number;
  startedAt: Date;
  estimatedCompletionAt?: Date;
  averageProcessingTime?: number;
  remainingTime?: number;
}

// Job Result Types
export interface KeywordEnrichmentResult {
  keyword: string;
  countryCode: string;
  languageCode: string;
  success: boolean;
  data?: KeywordBankEntity;
  fromCache: boolean;
  processingTime: number;
  error?: {
    type: string;
    message: string;
    code?: string;
    retryable: boolean;
  };
  apiCallMade: boolean;
  quotaUsed: number;
}

export interface JobResult {
  jobId: string;
  status: EnrichmentJobStatus;
  results: KeywordEnrichmentResult[];
  summary: {
    totalKeywords: number;
    successfulEnrichments: number;
    failedEnrichments: number;
    skippedKeywords: number;
    cacheHits: number;
    apiCallsMade: number;
    quotaUsed: number;
    processingTime: number;
    averageTimePerKeyword: number;
  };
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

// Job Input Types
export interface SingleKeywordJobData {
  keyword: string;
  countryCode: string;
  languageCode?: string;
  forceRefresh?: boolean;
  metadata?: Record<string, any>;
}

export interface BulkEnrichmentJobData {
  keywords: Array<{
    keyword: string;
    countryCode: string;
    languageCode?: string;
  }>;
  forceRefresh?: boolean;
  metadata?: Record<string, any>;
}

export interface CacheRefreshJobData {
  filterCriteria: {
    countryCode?: string;
    languageCode?: string;
    olderThanDays?: number;
    keywords?: string[];
  };
  metadata?: Record<string, any>;
}

export type EnrichmentJobData = 
  | SingleKeywordJobData 
  | BulkEnrichmentJobData 
  | CacheRefreshJobData;

// Complete Job Definition
export interface EnrichmentJob {
  id: string;
  userId: string;
  type: EnrichmentJobType;
  status: EnrichmentJobStatus;
  priority: JobPriority;
  config: EnrichmentJobConfig;
  data: EnrichmentJobData;
  progress: JobProgress;
  result?: JobResult;
  retryCount: number;
  lastRetryAt?: Date;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
  workerId?: string;
  lockedAt?: Date;
}

// Queue Management Types
export interface QueuedJob {
  job: EnrichmentJob;
  enqueuedAt: Date;
  attempts: number;
  lastError?: string;
}

export interface QueueStats {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  averageProcessingTime: number;
  throughput: number; // jobs per hour
  queueHealth: 'healthy' | 'degraded' | 'critical';
  oldestQueuedJob?: Date;
  quotaStatus?: QuotaStatus;
  workerStatus: {
    activeWorkers: number;
    idleWorkers: number;
    totalWorkers: number;
  };
}

export interface QueueFilter {
  status?: EnrichmentJobStatus[];
  priority?: JobPriority[];
  type?: EnrichmentJobType[];
  userId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

// Worker Types
export interface WorkerConfig {
  workerId: string;
  maxConcurrentJobs: number;
  processingTimeout: number;
  heartbeatInterval: number;
  enableMetrics: boolean;
  autoScale: boolean;
  idleTimeout: number;
}

export interface WorkerStatus {
  workerId: string;
  status: 'idle' | 'processing' | 'stopping' | 'error';
  currentJobs: number;
  maxJobs: number;
  startedAt: Date;
  lastHeartbeat: Date;
  totalProcessed: number;
  totalErrors: number;
  averageProcessingTime: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

// Database Integration Types (extends existing job tables)
export interface EnrichmentJobRecord {
  id: string;
  user_id: string;
  name: string;
  type: string; // 'keyword_enrichment'
  job_type: EnrichmentJobType;
  status: EnrichmentJobStatus;
  priority: JobPriority;
  config: EnrichmentJobConfig;
  source_data: EnrichmentJobData;
  progress_data: JobProgress;
  result_data?: JobResult;
  retry_count: number;
  last_retry_at?: string;
  next_retry_at?: string;
  worker_id?: string;
  locked_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Database operation types
export type EnrichmentJobInsert = Omit<EnrichmentJobRecord, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type EnrichmentJobUpdate = Partial<Omit<EnrichmentJobRecord, 'id' | 'created_at'>> & {
  updated_at?: string;
};

// API Response Types
export interface CreateJobResponse {
  success: boolean;
  jobId?: string;
  estimatedCompletion?: Date;
  queuePosition?: number;
  error?: string;
}

export interface JobStatusResponse {
  success: boolean;
  job?: EnrichmentJob;
  progress?: JobProgress;
  result?: JobResult;
  error?: string;
}

export interface QueueOperationResponse {
  success: boolean;
  affectedJobs?: number;
  message?: string;
  error?: string;
}

// Event Types for job monitoring
export enum JobEventType {
  JOB_CREATED = 'job_created',
  JOB_STARTED = 'job_started',
  JOB_PROGRESS = 'job_progress',
  JOB_COMPLETED = 'job_completed',
  JOB_FAILED = 'job_failed',
  JOB_CANCELLED = 'job_cancelled',
  JOB_RETRYING = 'job_retrying',
  WORKER_STARTED = 'worker_started',
  WORKER_STOPPED = 'worker_stopped',
  QUEUE_PAUSED = 'queue_paused',
  QUEUE_RESUMED = 'queue_resumed'
}

export interface JobEvent {
  type: JobEventType;
  jobId: string;
  workerId?: string;
  timestamp: Date;
  data?: any;
  userId?: string;
}

// Utility types for API contracts
export interface EnqueueJobRequest {
  type: EnrichmentJobType;
  data: EnrichmentJobData;
  config?: Partial<EnrichmentJobConfig>;
  priority?: JobPriority;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export interface BatchEnqueueRequest {
  jobs: EnqueueJobRequest[];
  globalConfig?: Partial<EnrichmentJobConfig>;
}

// Error types specific to job processing
export enum JobErrorType {
  VALIDATION_ERROR = 'validation_error',
  QUOTA_EXCEEDED = 'quota_exceeded',
  API_ERROR = 'api_error',
  TIMEOUT_ERROR = 'timeout_error',
  WORKER_ERROR = 'worker_error',
  CANCELLATION_ERROR = 'cancellation_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface JobError {
  type: JobErrorType;
  message: string;
  code?: string;
  details?: any;
  retryable: boolean;
  timestamp: Date;
  context?: {
    jobId: string;
    workerId?: string;
    keyword?: string;
    batchIndex?: number;
  };
}

// Export utility type unions
export type AnyJobData = SingleKeywordJobData | BulkEnrichmentJobData | CacheRefreshJobData;
export type JobStatusFilter = EnrichmentJobStatus | EnrichmentJobStatus[];
export type JobPriorityFilter = JobPriority | JobPriority[];
export type JobTypeFilter = EnrichmentJobType | EnrichmentJobType[];
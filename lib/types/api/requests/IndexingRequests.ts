/**
 * Indexing-related API request types for IndexNow Studio
 */

import { z } from 'zod';

// Job creation and management
export interface CreateJobRequest {
  name: string;
  type: 'sitemap' | 'url-list' | 'single-url' | 'bulk-upload';
  scheduleType: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  cronExpression?: string;
  sourceData: JobSourceData;
  serviceAccountId?: string;
  tags?: string[];
  priority?: number;
  scheduledAt?: Date;
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
    data?: string; // base64 encoded file data
  };
}

export interface UpdateJobRequest {
  jobId: string;
  name?: string;
  scheduleType?: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  cronExpression?: string;
  serviceAccountId?: string;
  tags?: string[];
  priority?: number;
  scheduledAt?: Date;
  isActive?: boolean;
}

export interface ProcessJobRequest {
  jobId: string;
  forceRestart?: boolean;
  skipValidation?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface DeleteJobRequest {
  jobId: string;
  reason?: string;
  forceDelete?: boolean; // Delete even if job is running
}

export interface CloneJobRequest {
  jobId: string;
  name: string;
  scheduleType?: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  cronExpression?: string;
  scheduledAt?: Date;
}

// Bulk operations
export interface BulkUrlRequest {
  urls: string[];
  type: 'URL_UPDATED' | 'URL_DELETED';
  serviceAccountId?: string;
  priority?: number;
  batchSize?: number;
  metadata?: Record<string, any>;
}

export interface BulkJobRequest {
  jobIds: string[];
  action: 'start' | 'pause' | 'stop' | 'delete' | 'clone';
  reason?: string;
  metadata?: Record<string, any>;
}

export interface BulkTagRequest {
  jobIds: string[];
  action: 'add' | 'remove' | 'replace';
  tags: string[];
}

// URL submission
export interface SubmitUrlRequest {
  url: string;
  type: 'URL_UPDATED' | 'URL_DELETED';
  serviceAccountId?: string;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface BatchSubmitUrlsRequest {
  submissions: UrlSubmissionData[];
  serviceAccountId?: string;
  batchSize?: number;
  delayBetweenBatches?: number; // milliseconds
}

export interface UrlSubmissionData {
  url: string;
  type: 'URL_UPDATED' | 'URL_DELETED';
  priority?: number;
  metadata?: Record<string, any>;
}

// Sitemap parsing
export interface SitemapParseRequest {
  sitemapUrl: string;
  validateUrls?: boolean;
  includeImages?: boolean;
  includeVideos?: boolean;
  includeNews?: boolean;
  maxUrls?: number;
  filterPatterns?: string[];
  metadata?: Record<string, any>;
}

export interface SitemapValidateRequest {
  sitemapUrl: string;
  checkAccessibility?: boolean;
  checkFormat?: boolean;
  maxDepth?: number;
}

// Service account management
export interface CreateServiceAccountRequest {
  name: string;
  email: string;
  credentials: GoogleServiceAccountCredentials;
  dailyQuotaLimit?: number;
  minuteQuotaLimit?: number;
  isActive?: boolean;
  description?: string;
}

export interface GoogleServiceAccountCredentials {
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
  universe_domain?: string;
}

export interface UpdateServiceAccountRequest {
  serviceAccountId: string;
  name?: string;
  dailyQuotaLimit?: number;
  minuteQuotaLimit?: number;
  isActive?: boolean;
  description?: string;
  credentials?: GoogleServiceAccountCredentials;
}

export interface TestServiceAccountRequest {
  serviceAccountId: string;
  testUrl?: string;
}

export interface DeleteServiceAccountRequest {
  serviceAccountId: string;
  reason?: string;
  transferJobsTo?: string; // Another service account ID
}

// Job monitoring and analytics
export interface GetJobAnalyticsRequest {
  jobIds?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  metrics?: string[];
}

export interface GetQuotaUsageRequest {
  serviceAccountIds?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  groupBy?: 'hour' | 'day' | 'week' | 'month';
}

export interface CreateJobAlertRequest {
  jobId: string;
  type: 'completion' | 'failure' | 'quota_warning' | 'slow_processing';
  threshold?: number;
  isActive?: boolean;
  notificationMethods: ('email' | 'webhook' | 'sms')[];
  webhookUrl?: string;
  emailRecipients?: string[];
}

export interface UpdateJobAlertRequest {
  alertId: string;
  type?: 'completion' | 'failure' | 'quota_warning' | 'slow_processing';
  threshold?: number;
  isActive?: boolean;
  notificationMethods?: ('email' | 'webhook' | 'sms')[];
  webhookUrl?: string;
  emailRecipients?: string[];
}

// Zod validation schemas
export const googleServiceAccountSchema = z.object({
  type: z.string(),
  project_id: z.string(),
  private_key_id: z.string(),
  private_key: z.string(),
  client_email: z.string().email(),
  client_id: z.string(),
  auth_uri: z.string().url(),
  token_uri: z.string().url(),
  auth_provider_x509_cert_url: z.string().url(),
  client_x509_cert_url: z.string().url(),
  universe_domain: z.string().optional()
});

export const createServiceAccountSchema = z.object({
  name: z.string().min(1, 'Service account name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Valid email is required'),
  credentials: googleServiceAccountSchema,
  dailyQuotaLimit: z.number().min(0).max(10000).optional(),
  minuteQuotaLimit: z.number().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional()
});

export const createJobSchema = z.object({
  name: z.string().min(1, 'Job name is required').max(100, 'Name must be less than 100 characters'),
  type: z.enum(['sitemap', 'url-list', 'single-url', 'bulk-upload']),
  scheduleType: z.enum(['one-time', 'hourly', 'daily', 'weekly', 'monthly', 'custom']),
  cronExpression: z.string().optional(),
  sourceData: z.object({
    urls: z.array(z.string().url()).optional(),
    sitemapUrl: z.string().url().optional(),
    content: z.string().optional(),
    file: z.object({
      name: z.string(),
      size: z.number(),
      type: z.string(),
      data: z.string().optional()
    }).optional()
  }),
  serviceAccountId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().min(1).max(10).optional(),
  scheduledAt: z.date().optional(),
  metadata: z.record(z.any()).optional()
});

export const bulkUrlSchema = z.object({
  urls: z.array(z.string().url()).min(1, 'At least one URL is required').max(1000, 'Maximum 1000 URLs per request'),
  type: z.enum(['URL_UPDATED', 'URL_DELETED']),
  serviceAccountId: z.string().uuid().optional(),
  priority: z.number().min(1).max(10).optional(),
  batchSize: z.number().min(1).max(100).optional(),
  metadata: z.record(z.any()).optional()
});

export const sitemapParseSchema = z.object({
  sitemapUrl: z.string().url('Please enter a valid sitemap URL'),
  validateUrls: z.boolean().optional(),
  includeImages: z.boolean().optional(),
  includeVideos: z.boolean().optional(),
  includeNews: z.boolean().optional(),
  maxUrls: z.number().min(1).max(50000).optional(),
  filterPatterns: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

// Type inference from schemas
export type CreateServiceAccountRequestBody = z.infer<typeof createServiceAccountSchema>;
export type CreateJobRequestBody = z.infer<typeof createJobSchema>;
export type BulkUrlRequestBody = z.infer<typeof bulkUrlSchema>;
export type SitemapParseRequestBody = z.infer<typeof sitemapParseSchema>;
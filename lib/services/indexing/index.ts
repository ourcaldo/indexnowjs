// Main services
export { IndexingService } from './IndexingService';
export { GoogleApiClient } from './GoogleApiClient';
export { JobQueue } from './JobQueue';
export { QuotaManager } from './QuotaManager';
export { RetryHandler } from './RetryHandler';

// Validation services
export { UrlValidator } from '../validation/UrlValidator';
export { JobValidator } from '../validation/JobValidator';

// Type definitions for the indexing services
export interface IndexingJob {
  id: string;
  user_id: string;
  name: string;
  type: 'manual' | 'sitemap';
  status: string;
  source_data: any;
  total_urls: number;
  processed_urls: number;
  successful_urls: number;
  failed_urls: number;
  progress_percentage: number;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UrlSubmission {
  id: string;
  job_id: string;
  url: string;
  status: string;
  retry_count: number;
  service_account_id?: string;
  error_message?: string;
}

export interface ServiceAccount {
  id: string;
  user_id: string;
  name: string;
  email: string;
  is_active: boolean;
  daily_quota_limit: number;
  created_at: string;
  updated_at: string;
}
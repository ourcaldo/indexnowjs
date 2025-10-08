// TypeScript types for Supabase database tables
// Generated from the database schema

export interface Database {
  public: {
    Tables: {
      indb_auth_user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          phone_number: string | null
          country: string | null
          role: 'user' | 'admin' | 'super_admin'
          email_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          phone_number?: string | null
          country?: string | null
          role?: 'user' | 'admin' | 'super_admin'
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          phone_number?: string | null
          country?: string | null
          role?: 'user' | 'admin' | 'super_admin'
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      indb_auth_user_settings: {
        Row: {
          id: string
          user_id: string
          timeout_duration: number
          retry_attempts: number
          email_job_completion: boolean
          email_job_failure: boolean
          email_quota_alerts: boolean
          default_schedule: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
          email_daily_report: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          timeout_duration?: number
          retry_attempts?: number
          email_job_completion?: boolean
          email_job_failure?: boolean
          email_quota_alerts?: boolean
          default_schedule?: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
          email_daily_report?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timeout_duration?: number
          retry_attempts?: number
          email_job_completion?: boolean
          email_job_failure?: boolean
          email_quota_alerts?: boolean
          default_schedule?: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
          email_daily_report?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      indb_google_service_accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          encrypted_credentials: string
          is_active: boolean
          daily_quota_limit: number
          minute_quota_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          encrypted_credentials: string
          is_active?: boolean
          daily_quota_limit?: number
          minute_quota_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          encrypted_credentials?: string
          is_active?: boolean
          daily_quota_limit?: number
          minute_quota_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      indb_keyword_countries: {
        Row: {
          id: string
          name: string
          iso2_code: string
          iso3_code: string
          numeric_code: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          iso2_code: string
          iso3_code: string
          numeric_code: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          iso2_code?: string
          iso3_code?: string
          numeric_code?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      indb_keyword_bank: {
        Row: {
          id: string
          keyword: string
          country_id: string
          language_code: string
          is_data_found: boolean
          volume: number | null
          cpc: number | null
          competition: number | null
          difficulty: number | null
          history_trend: any | null
          keyword_intent: string | null
          data_updated_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          keyword: string
          country_id: string
          language_code?: string
          is_data_found?: boolean
          volume?: number | null
          cpc?: number | null
          competition?: number | null
          difficulty?: number | null
          history_trend?: any | null
          keyword_intent?: string | null
          data_updated_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          keyword?: string
          country_id?: string
          language_code?: string
          is_data_found?: boolean
          volume?: number | null
          cpc?: number | null
          competition?: number | null
          difficulty?: number | null
          history_trend?: any | null
          keyword_intent?: string | null
          data_updated_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      indb_keyword_domains: {
        Row: {
          id: string
          user_id: string
          domain_name: string
          display_name: string | null
          is_active: boolean
          verification_status: 'pending' | 'verified' | 'failed'
          verification_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          domain_name: string
          display_name?: string | null
          is_active?: boolean
          verification_status?: 'pending' | 'verified' | 'failed'
          verification_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          domain_name?: string
          display_name?: string | null
          is_active?: boolean
          verification_status?: 'pending' | 'verified' | 'failed'
          verification_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      indb_keyword_keywords: {
        Row: {
          id: string
          user_id: string
          domain_id: string
          keyword: string
          device_type: 'desktop' | 'mobile'
          country_id: string
          tags: string[]
          is_active: boolean
          last_check_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          domain_id: string
          keyword: string
          device_type?: 'desktop' | 'mobile'
          country_id: string
          tags?: string[]
          is_active?: boolean
          last_check_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          domain_id?: string
          keyword?: string
          device_type?: 'desktop' | 'mobile'
          country_id?: string
          tags?: string[]
          is_active?: boolean
          last_check_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      indb_keyword_rankings: {
        Row: {
          id: string
          keyword_id: string
          position: number | null
          url: string | null
          search_volume: number | null
          difficulty_score: number | null
          check_date: string
          created_at: string
        }
        Insert: {
          id?: string
          keyword_id: string
          position?: number | null
          url?: string | null
          search_volume?: number | null
          difficulty_score?: number | null
          check_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          keyword_id?: string
          position?: number | null
          url?: string | null
          search_volume?: number | null
          difficulty_score?: number | null
          check_date?: string
          created_at?: string
        }
      }
      indb_keyword_usage: {
        Row: {
          id: string
          user_id: string
          keywords_used: number
          keywords_limit: number
          period_start: string
          period_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          keywords_used?: number
          keywords_limit?: number
          period_start?: string
          period_end?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          keywords_used?: number
          keywords_limit?: number
          period_start?: string
          period_end?: string
          created_at?: string
          updated_at?: string
        }
      }
      indb_google_quota_usage: {
        Row: {
          id: string
          service_account_id: string
          date: string
          requests_made: number
          requests_successful: number
          requests_failed: number
          last_request_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_account_id: string
          date: string
          requests_made?: number
          requests_successful?: number
          requests_failed?: number
          last_request_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_account_id?: string
          date?: string
          requests_made?: number
          requests_successful?: number
          requests_failed?: number
          last_request_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      indb_indexing_jobs: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'manual' | 'sitemap'
          status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled'
          schedule_type: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
          cron_expression: string | null
          source_data: any // JSONB
          total_urls: number
          processed_urls: number
          successful_urls: number
          failed_urls: number
          progress_percentage: number
          started_at: string | null
          completed_at: string | null
          next_run_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'manual' | 'sitemap'
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled'
          schedule_type?: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
          cron_expression?: string | null
          source_data?: any
          total_urls?: number
          processed_urls?: number
          successful_urls?: number
          failed_urls?: number
          progress_percentage?: number
          started_at?: string | null
          completed_at?: string | null
          next_run_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'manual' | 'sitemap'
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled'
          schedule_type?: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
          cron_expression?: string | null
          source_data?: any
          total_urls?: number
          processed_urls?: number
          successful_urls?: number
          failed_urls?: number
          progress_percentage?: number
          started_at?: string | null
          completed_at?: string | null
          next_run_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      indb_enrichment_jobs: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string // 'keyword_enrichment'
          job_type: 'single_keyword' | 'bulk_enrichment' | 'cache_refresh' | 'batch_update' | 'scheduled_enrichment'
          status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'retrying'
          priority: number // 1=low, 2=normal, 3=high, 4=critical
          config: any // JSONB - EnrichmentJobConfig
          source_data: any // JSONB - EnrichmentJobData
          progress_data: any // JSONB - JobProgress
          result_data: any | null // JSONB - JobResult
          retry_count: number
          last_retry_at: string | null
          next_retry_at: string | null
          worker_id: string | null
          locked_at: string | null
          started_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          error_message: string | null
          metadata: any | null // JSONB
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: string
          job_type: 'single_keyword' | 'bulk_enrichment' | 'cache_refresh' | 'batch_update' | 'scheduled_enrichment'
          status?: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'retrying'
          priority?: number
          config?: any
          source_data?: any
          progress_data?: any
          result_data?: any | null
          retry_count?: number
          last_retry_at?: string | null
          next_retry_at?: string | null
          worker_id?: string | null
          locked_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          error_message?: string | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          job_type?: 'single_keyword' | 'bulk_enrichment' | 'cache_refresh' | 'batch_update' | 'scheduled_enrichment'
          status?: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'retrying'
          priority?: number
          config?: any
          source_data?: any
          progress_data?: any
          result_data?: any | null
          retry_count?: number
          last_retry_at?: string | null
          next_retry_at?: string | null
          worker_id?: string | null
          locked_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          error_message?: string | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      indb_indexing_url_submissions: {
        Row: {
          id: string
          job_id: string
          service_account_id: string | null
          url: string
          status: 'pending' | 'submitted' | 'indexed' | 'failed' | 'skipped'
          submitted_at: string | null
          indexed_at: string | null
          response_data: any // JSONB
          error_message: string | null
          retry_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          service_account_id?: string | null
          url: string
          status?: 'pending' | 'submitted' | 'indexed' | 'failed' | 'skipped'
          submitted_at?: string | null
          indexed_at?: string | null
          response_data?: any
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          service_account_id?: string | null
          url?: string
          status?: 'pending' | 'submitted' | 'indexed' | 'failed' | 'skipped'
          submitted_at?: string | null
          indexed_at?: string | null
          response_data?: any
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      indb_notifications_dashboard: {
        Row: {
          id: string
          user_id: string
          type: 'info' | 'success' | 'warning' | 'error'
          title: string
          message: string
          is_read: boolean
          action_url: string | null
          metadata: any // JSONB
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'info' | 'success' | 'warning' | 'error'
          title: string
          message: string
          is_read?: boolean
          action_url?: string | null
          metadata?: any
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'info' | 'success' | 'warning' | 'error'
          title?: string
          message?: string
          is_read?: boolean
          action_url?: string | null
          metadata?: any
          expires_at?: string | null
          created_at?: string
        }
      }
      indb_analytics_daily_stats: {
        Row: {
          id: string
          user_id: string
          date: string
          total_jobs: number
          completed_jobs: number
          failed_jobs: number
          total_urls_submitted: number
          total_urls_indexed: number
          total_urls_failed: number
          quota_usage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          total_jobs?: number
          completed_jobs?: number
          failed_jobs?: number
          total_urls_submitted?: number
          total_urls_indexed?: number
          total_urls_failed?: number
          quota_usage?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          total_jobs?: number
          completed_jobs?: number
          failed_jobs?: number
          total_urls_submitted?: number
          total_urls_indexed?: number
          total_urls_failed?: number
          quota_usage?: number
          created_at?: string
          updated_at?: string
        }
      }
      indb_site_integration: {
        Row: {
          id: string
          user_id: string
          service_name: string
          api_key: string
          api_url: string
          api_quota_limit: number
          api_quota_used: number
          quota_reset_date: string
          quota_reset_interval: string
          is_active: boolean
          rate_limits: any
          alert_settings: any
          last_health_check: string | null
          health_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          service_name: string
          api_key?: string
          api_url?: string
          api_quota_limit?: number
          api_quota_used?: number
          quota_reset_date?: string
          quota_reset_interval?: string
          is_active?: boolean
          rate_limits?: any
          alert_settings?: any
          last_health_check?: string | null
          health_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          service_name?: string
          api_key?: string
          api_url?: string
          api_quota_limit?: number
          api_quota_used?: number
          quota_reset_date?: string
          quota_reset_interval?: string
          is_active?: boolean
          rate_limits?: any
          alert_settings?: any
          last_health_check?: string | null
          health_status?: string
          created_at?: string
          updated_at?: string
        }
      }
      indb_seranking_usage_logs: {
        Row: {
          id: string
          integration_id: string
          operation_type: string
          request_count: number
          successful_requests: number
          failed_requests: number
          response_time_ms: number | null
          timestamp: string
          date: string
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          integration_id: string
          operation_type: string
          request_count?: number
          successful_requests?: number
          failed_requests?: number
          response_time_ms?: number | null
          timestamp?: string
          date?: string
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          integration_id?: string
          operation_type?: string
          request_count?: number
          successful_requests?: number
          failed_requests?: number
          response_time_ms?: number | null
          timestamp?: string
          date?: string
          metadata?: any | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type UserProfile = Database['public']['Tables']['indb_auth_user_profiles']['Row']
export type UserSettings = Database['public']['Tables']['indb_auth_user_settings']['Row']
export type ServiceAccount = Database['public']['Tables']['indb_google_service_accounts']['Row']
export type IndexingJob = Database['public']['Tables']['indb_indexing_jobs']['Row']
export type UrlSubmission = Database['public']['Tables']['indb_indexing_url_submissions']['Row']
export type DashboardNotification = Database['public']['Tables']['indb_notifications_dashboard']['Row']
export type DailyStats = Database['public']['Tables']['indb_analytics_daily_stats']['Row']
export type KeywordCountry = Database['public']['Tables']['indb_keyword_countries']['Row']
export type KeywordDomain = Database['public']['Tables']['indb_keyword_domains']['Row']
export type KeywordKeyword = Database['public']['Tables']['indb_keyword_keywords']['Row']
export type KeywordRanking = Database['public']['Tables']['indb_keyword_rankings']['Row']
export type KeywordUsage = Database['public']['Tables']['indb_keyword_usage']['Row']
export type SiteIntegration = Database['public']['Tables']['indb_site_integration']['Row']
export type SeRankingIntegration = Database['public']['Tables']['indb_site_integration']['Row']
export type SeRankingUsageLog = Database['public']['Tables']['indb_seranking_usage_logs']['Row']

// Insert types
export type InsertUserProfile = Database['public']['Tables']['indb_auth_user_profiles']['Insert']
export type InsertUserSettings = Database['public']['Tables']['indb_auth_user_settings']['Insert']
export type InsertServiceAccount = Database['public']['Tables']['indb_google_service_accounts']['Insert']
export type InsertIndexingJob = Database['public']['Tables']['indb_indexing_jobs']['Insert']
export type InsertUrlSubmission = Database['public']['Tables']['indb_indexing_url_submissions']['Insert']
export type InsertDashboardNotification = Database['public']['Tables']['indb_notifications_dashboard']['Insert']
export type InsertKeywordCountry = Database['public']['Tables']['indb_keyword_countries']['Insert']
export type InsertKeywordDomain = Database['public']['Tables']['indb_keyword_domains']['Insert']
export type InsertKeywordKeyword = Database['public']['Tables']['indb_keyword_keywords']['Insert']
export type InsertKeywordRanking = Database['public']['Tables']['indb_keyword_rankings']['Insert']
export type InsertKeywordUsage = Database['public']['Tables']['indb_keyword_usage']['Insert']
export type InsertSiteIntegration = Database['public']['Tables']['indb_site_integration']['Insert']
export type InsertSeRankingIntegration = Database['public']['Tables']['indb_site_integration']['Insert']
export type InsertSeRankingUsageLog = Database['public']['Tables']['indb_seranking_usage_logs']['Insert']

// Update types
export type UpdateUserProfile = Database['public']['Tables']['indb_auth_user_profiles']['Update']
export type UpdateUserSettings = Database['public']['Tables']['indb_auth_user_settings']['Update']
export type UpdateServiceAccount = Database['public']['Tables']['indb_google_service_accounts']['Update']
export type UpdateIndexingJob = Database['public']['Tables']['indb_indexing_jobs']['Update']
export type UpdateUrlSubmission = Database['public']['Tables']['indb_indexing_url_submissions']['Update']
export type UpdateKeywordDomain = Database['public']['Tables']['indb_keyword_domains']['Update']
export type UpdateKeywordKeyword = Database['public']['Tables']['indb_keyword_keywords']['Update']
export type UpdateKeywordRanking = Database['public']['Tables']['indb_keyword_rankings']['Update']
export type UpdateKeywordUsage = Database['public']['Tables']['indb_keyword_usage']['Update']
export type UpdateSiteIntegration = Database['public']['Tables']['indb_site_integration']['Update']
export type UpdateSeRankingIntegration = Database['public']['Tables']['indb_site_integration']['Update']
export type UpdateSeRankingUsageLog = Database['public']['Tables']['indb_seranking_usage_logs']['Update']
import { supabase, supabaseAdmin } from '../database/supabase'
import { Database } from './database-types'

// Type aliases for convenience
type UserProfile = Database['public']['Tables']['indb_auth_user_profiles']['Row']
type UserSettings = Database['public']['Tables']['indb_auth_user_settings']['Row']
type IndexingJob = Database['public']['Tables']['indb_indexing_jobs']['Row']
type UrlSubmission = Database['public']['Tables']['indb_indexing_url_submissions']['Row']
type ServiceAccount = Database['public']['Tables']['indb_google_service_accounts']['Row']
type QuotaUsage = Database['public']['Tables']['indb_google_quota_usage']['Row']
type DashboardNotification = Database['public']['Tables']['indb_notifications_dashboard']['Row']

type InsertUserProfile = Database['public']['Tables']['indb_auth_user_profiles']['Insert']
type InsertUserSettings = Database['public']['Tables']['indb_auth_user_settings']['Insert']
type InsertIndexingJob = Database['public']['Tables']['indb_indexing_jobs']['Insert']
type InsertUrlSubmission = Database['public']['Tables']['indb_indexing_url_submissions']['Insert']
type InsertServiceAccount = Database['public']['Tables']['indb_google_service_accounts']['Insert']

type UpdateUserProfile = Database['public']['Tables']['indb_auth_user_profiles']['Update']
type UpdateUserSettings = Database['public']['Tables']['indb_auth_user_settings']['Update']
type UpdateIndexingJob = Database['public']['Tables']['indb_indexing_jobs']['Update']
type UpdateUrlSubmission = Database['public']['Tables']['indb_indexing_url_submissions']['Update']

export class DatabaseService {
  // ============================================================================
  // USER PROFILES & SETTINGS
  // ============================================================================

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('indb_auth_user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('indb_auth_user_profiles')
      .insert(profile)
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      return null
    }

    return data
  }

  async updateUserProfile(userId: string, updates: UpdateUserProfile): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('indb_auth_user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return null
    }

    return data
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('indb_auth_user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching user settings:', error)
      return null
    }

    return data
  }

  async updateUserSettings(userId: string, updates: UpdateUserSettings): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('indb_auth_user_settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user settings:', error)
      return null
    }

    return data
  }

  // ============================================================================
  // INDEXING JOBS
  // ============================================================================

  async getJobs(userId: string, page: number = 1, limit: number = 10): Promise<{
    jobs: IndexingJob[];
    count: number;
  }> {
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('indb_indexing_jobs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching jobs:', error)
      return { jobs: [], count: 0 }
    }

    return { jobs: data || [], count: count || 0 }
  }

  async getJob(jobId: string, userId: string): Promise<IndexingJob | null> {
    const { data, error } = await supabase
      .from('indb_indexing_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching job:', error)
      return null
    }

    return data
  }

  async createJob(job: InsertIndexingJob): Promise<IndexingJob | null> {
    const { data, error } = await supabase
      .from('indb_indexing_jobs')
      .insert(job)
      .select()
      .single()

    if (error) {
      console.error('Error creating job:', error)
      return null
    }

    return data
  }

  async updateJob(jobId: string, userId: string, updates: UpdateIndexingJob): Promise<IndexingJob | null> {
    const { data, error } = await supabase
      .from('indb_indexing_jobs')
      .update(updates)
      .eq('id', jobId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating job:', error)
      return null
    }

    return data
  }

  async deleteJob(jobId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('indb_indexing_jobs')
      .delete()
      .eq('id', jobId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting job:', error)
      return false
    }

    return true
  }

  // ============================================================================
  // URL SUBMISSIONS
  // ============================================================================

  async getJobSubmissions(jobId: string, page: number = 1, limit: number = 20): Promise<{
    submissions: UrlSubmission[];
    count: number;
  }> {
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('indb_indexing_url_submissions')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching submissions:', error)
      return { submissions: [], count: 0 }
    }

    return { submissions: data || [], count: count || 0 }
  }

  async createUrlSubmissions(submissions: InsertUrlSubmission[]): Promise<UrlSubmission[]> {
    const { data, error } = await supabase
      .from('indb_indexing_url_submissions')
      .insert(submissions)
      .select()

    if (error) {
      console.error('Error creating URL submissions:', error)
      return []
    }

    return data || []
  }

  async updateUrlSubmission(submissionId: string, updates: UpdateUrlSubmission): Promise<UrlSubmission | null> {
    const { data, error } = await supabase
      .from('indb_indexing_url_submissions')
      .update(updates)
      .eq('id', submissionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating URL submission:', error)
      return null
    }

    return data
  }

  // ============================================================================
  // SERVICE ACCOUNTS
  // ============================================================================

  async getServiceAccounts(userId: string): Promise<ServiceAccount[]> {
    const { data, error } = await supabase
      .from('indb_google_service_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching service accounts:', error)
      return []
    }

    return data || []
  }

  async createServiceAccount(account: InsertServiceAccount): Promise<ServiceAccount | null> {
    const { data, error } = await supabase
      .from('indb_google_service_accounts')
      .insert(account)
      .select()
      .single()

    if (error) {
      console.error('Error creating service account:', error)
      return null
    }

    return data
  }

  async getActiveServiceAccounts(userId: string): Promise<ServiceAccount[]> {
    const { data, error } = await supabase
      .from('indb_google_service_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching active service accounts:', error)
      return []
    }

    return data || []
  }

  // ============================================================================
  // QUOTA USAGE
  // ============================================================================

  async getQuotaUsage(serviceAccountId: string, date: string): Promise<QuotaUsage | null> {
    const { data, error } = await supabase
      .from('indb_google_quota_usage')
      .select('*')
      .eq('service_account_id', serviceAccountId)
      .eq('date', date)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found error
      console.error('Error fetching quota usage:', error)
      return null
    }

    return data
  }

  async updateQuotaUsage(serviceAccountId: string, date: string, usage: {
    requests_made?: number;
    requests_successful?: number;
    requests_failed?: number;
  }): Promise<QuotaUsage | null> {
    const { data, error } = await supabase
      .from('indb_google_quota_usage')
      .upsert({
        service_account_id: serviceAccountId,
        date,
        ...usage,
        last_request_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating quota usage:', error)
      return null
    }

    return data
  }

  // ============================================================================
  // DASHBOARD STATS
  // ============================================================================

  async getDashboardStats(userId: string): Promise<{
    stats: any;
    recent_activity: IndexingJob[];
  }> {
    // Get job statistics
    const { data: jobs, error: jobsError } = await supabase
      .from('indb_indexing_jobs')
      .select('status, total_urls, processed_urls, successful_urls, failed_urls')
      .eq('user_id', userId)

    if (jobsError) {
      console.error('Error fetching job stats:', jobsError)
      return { stats: {}, recent_activity: [] }
    }

    // Calculate stats
    const stats = {
      total_jobs: jobs?.length || 0,
      active_jobs: jobs?.filter(j => j.status === 'running').length || 0,
      completed_jobs: jobs?.filter(j => j.status === 'completed').length || 0,
      failed_jobs: jobs?.filter(j => j.status === 'failed').length || 0,
      pending_jobs: jobs?.filter(j => j.status === 'pending').length || 0,
      total_urls_indexed: jobs?.reduce((sum, job) => sum + (job.successful_urls || 0), 0) || 0,
      total_urls_failed: jobs?.reduce((sum, job) => sum + (job.failed_urls || 0), 0) || 0,
      total_urls_processed: jobs?.reduce((sum, job) => sum + (job.processed_urls || 0), 0) || 0,
      total_urls_submitted: jobs?.reduce((sum, job) => sum + (job.total_urls || 0), 0) || 0,
    }

    // Calculate success rate
    const statsWithSuccessRate = {
      ...stats,
      success_rate: stats.total_urls_processed > 0 
        ? parseFloat(((stats.total_urls_indexed / stats.total_urls_processed) * 100).toFixed(1))
        : 0
    }

    // Get recent activity
    const { data: recentJobs, error: recentError } = await supabase
      .from('indb_indexing_jobs')
      .select('id, name, status, successful_urls, total_urls, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    return {
      stats: statsWithSuccessRate,
      recent_activity: (recentJobs || []) as any[],
    }
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  async getNotifications(userId: string, unreadOnly: boolean = false): Promise<DashboardNotification[]> {
    let query = supabase
      .from('indb_notifications_dashboard')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data || []
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('indb_notifications_dashboard')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error marking notification as read:', error)
      return false
    }

    return true
  }
}

// Singleton instance
export const db = new DatabaseService()

// Export supabaseAdmin for API routes
export { supabaseAdmin }
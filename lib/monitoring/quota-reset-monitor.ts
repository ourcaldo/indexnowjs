import { supabaseAdmin } from '../database/supabase'
import { SecureServiceRoleWrapper } from '../services/security/SecureServiceRoleWrapper'
import cron from 'node-cron'

/**
 * Quota Reset Monitor
 * 
 * Monitors Google quota reset times and automatically resumes paused jobs
 * when service account quotas are reset (midnight Pacific Time).
 */
export class QuotaResetMonitor {
  private static instance: QuotaResetMonitor
  private isStarted = false

  static getInstance(): QuotaResetMonitor {
    if (!QuotaResetMonitor.instance) {
      QuotaResetMonitor.instance = new QuotaResetMonitor()
    }
    return QuotaResetMonitor.instance
  }

  start() {
    if (this.isStarted) {
      console.log('📊 Quota reset monitor already running')
      return
    }

    // Run every hour at minute 5 to check for quota resets
    // Google quota resets at midnight Pacific Time (UTC-8/UTC-7)
    cron.schedule('5 * * * *', async () => {
      await this.checkAndResumeJobs()
    }, {
      timezone: 'America/Los_Angeles' // Pacific Time
    })

    // Also run a more frequent check every 15 minutes during reset hours
    cron.schedule('*/15 * * * *', async () => {
      const now = new Date()
      const pacificHour = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"})).getHours()
      
      // Check more frequently around midnight Pacific (23:30 to 00:30)
      if (pacificHour === 23 || pacificHour === 0) {
        await this.checkAndResumeJobs()
      }
    })

    this.isStarted = true
    console.log('🕐 Quota reset monitor started - checking for quota resets and resuming paused jobs')
  }

  async checkAndReactivateAccounts(): Promise<void> {
    await this.checkAndResumeJobs()
  }

  private async checkAndResumeJobs() {
    try {
      console.log('🔄 Checking for quota resets and paused jobs to resume...')

      // 1. Check and reactivate service accounts that may have quota reset
      await this.reactivateServiceAccounts()

      // 2. Resume jobs that were paused due to quota exhaustion
      await this.resumePausedJobs()

      // 3. Clean up old quota exhausted notifications
      await this.cleanupOldNotifications()

    } catch (error) {
      console.error('Error in quota reset monitor:', error)
    }
  }

  private async reactivateServiceAccounts() {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'reactivate_service_accounts_after_quota_reset',
          reason: 'Quota reset monitor checking and reactivating service accounts after Google quota reset',
          source: 'QuotaResetMonitor.reactivateServiceAccounts',
          metadata: {
            operation_type: 'quota_reset_reactivation'
          }
        },
        { table: 'indb_google_service_accounts', operationType: 'select' },
        async () => {
          // Get all service accounts that were deactivated due to quota exhaustion
          const { data: inactiveAccounts, error } = await supabaseAdmin
            .from('indb_google_service_accounts')
            .select('id, name, email, user_id')
            .eq('is_active', false)

          if (error) {
            console.error('Error fetching inactive service accounts:', error)
            throw error
          }

          if (!inactiveAccounts || inactiveAccounts.length === 0) {
            return
          }

          console.log(`🔄 Found ${inactiveAccounts.length} inactive service accounts to potentially reactivate`)

          // For each service account, check if we should reactivate it
          for (const account of inactiveAccounts) {
            // Check if there's quota usage from today (indicating quota reset)
            const today = new Date().toISOString().split('T')[0]
            
            const { data: todayUsage } = await supabaseAdmin
              .from('indb_google_quota_usage')
              .select('requests_made')
              .eq('service_account_id', account.id)
              .eq('date', today)
              .single()

            // If no usage today OR usage is very low, assume quota has reset
            const todayRequests = todayUsage?.requests_made || 0
            
            if (todayRequests < 10) { // Quota likely reset if less than 10 requests used today
              await supabaseAdmin
                .from('indb_google_service_accounts')
                .update({
                  is_active: true,
                  updated_at: new Date().toISOString()
                })
                .eq('id', account.id)

              console.log(`✅ Reactivated service account: ${account.name} (${account.email})`)
            }
          }
        }
      )

    } catch (error) {
      console.error('Error reactivating service accounts:', error)
    }
  }

  private async resumePausedJobs() {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'resume_paused_jobs_after_quota_reset',
          reason: 'Quota reset monitor resuming jobs that were paused due to quota exhaustion after quota reset',
          source: 'QuotaResetMonitor.resumePausedJobs',
          metadata: {
            operation_type: 'job_resumption_after_quota_reset'
          }
        },
        { table: 'indb_indexing_jobs', operationType: 'select' },
        async () => {
          // Get jobs that were paused due to quota exhaustion
          const { data: pausedJobs, error } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .select('id, user_id, name, error_message')
            .eq('status', 'paused')
            .ilike('error_message', '%quota exhausted%')

          if (error) {
            console.error('Error fetching paused jobs:', error)
            throw error
          }

          if (!pausedJobs || pausedJobs.length === 0) {
            return
          }

          console.log(`🔄 Found ${pausedJobs.length} paused jobs to potentially resume`)

          for (const job of pausedJobs) {
            // Check if user has active service accounts
            const { data: activeAccounts } = await supabaseAdmin
              .from('indb_google_service_accounts')
              .select('id')
              .eq('user_id', job.user_id)
              .eq('is_active', true)

            if (activeAccounts && activeAccounts.length > 0) {
              // Resume the job
              await supabaseAdmin
                .from('indb_indexing_jobs')
                .update({
                  status: 'pending',
                  error_message: null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', job.id)

              console.log(`▶️ Resumed job: ${job.name} (${job.id}) - service accounts reactivated`)
            }
          }
        }
      )

    } catch (error) {
      console.error('Error resuming paused jobs:', error)
    }
  }

  private async cleanupOldNotifications() {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'cleanup_old_quota_notifications',
          reason: 'Quota reset monitor cleaning up old quota exhausted notifications older than 24 hours',
          source: 'QuotaResetMonitor.cleanupOldNotifications',
          metadata: {
            operation_type: 'notification_cleanup',
            cutoff_hours: 24
          }
        },
        { table: 'indb_notifications_dashboard', operationType: 'delete' },
        async () => {
          // Remove quota exhausted notifications older than 24 hours
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

          await supabaseAdmin
            .from('indb_notifications_dashboard')
            .delete()
            .eq('type', 'service_account_quota_exhausted')
            .lt('created_at', yesterday)

          console.log('🧹 Cleaned up old quota exhausted notifications')
        }
      )

    } catch (error) {
      console.error('Error cleaning up notifications:', error)
    }
  }

  stop() {
    this.isStarted = false
    console.log('📊 Quota reset monitor stopped')
  }
}
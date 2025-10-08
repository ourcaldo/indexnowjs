import { supabaseAdmin } from '../../database/supabase';
import { SecureServiceRoleWrapper } from '../security/SecureServiceRoleWrapper';

/**
 * Quota Management Service
 * Handles service account quota tracking, user quota consumption, and quota exhaustion
 * SECURITY: All operations use SecureWrapper for admin-level quota management
 */
export class QuotaManager {
  private static instance: QuotaManager;

  constructor() {}

  static getInstance(): QuotaManager {
    if (!QuotaManager.instance) {
      QuotaManager.instance = new QuotaManager();
    }
    return QuotaManager.instance;
  }

  /**
   * Update quota usage for a service account
   */
  async updateQuotaUsage(serviceAccountId: string, successful: boolean): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get current quota usage and update with SecureWrapper
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'update_service_account_quota_usage',
          reason: 'System quota tracking - updating daily quota usage for service account',
          source: 'QuotaManager.updateQuotaUsage',
          metadata: {
            serviceAccountId,
            successful,
            date: today,
            operation_type: 'quota_usage_tracking'
          }
        },
        {
          table: 'indb_google_quota_usage',
          operationType: 'select'
        },
        async () => {
          // Get current quota usage for today
          const { data: currentUsage, error: fetchError } = await supabaseAdmin
            .from('indb_google_quota_usage')
            .select('*')
            .eq('service_account_id', serviceAccountId)
            .eq('date', today)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error fetching current quota usage:', fetchError);
            return;
          }

          // Calculate new usage numbers
          const currentRequestsMade = currentUsage?.requests_made || 0;
          const currentRequestsSuccessful = currentUsage?.requests_successful || 0;
          const currentRequestsFailed = currentUsage?.requests_failed || 0;

          const updatedUsage = {
            service_account_id: serviceAccountId,
            date: today,
            requests_made: currentRequestsMade + 1,
            requests_successful: successful ? currentRequestsSuccessful + 1 : currentRequestsSuccessful,
            requests_failed: successful ? currentRequestsFailed : currentRequestsFailed + 1,
            last_request_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // If record doesn't exist, add created_at
          if (!currentUsage) {
            (updatedUsage as any).created_at = new Date().toISOString();
          }

          // Upsert quota usage record
          const { error: upsertError } = await supabaseAdmin
            .from('indb_google_quota_usage')
            .upsert(updatedUsage, {
              onConflict: 'service_account_id,date'
            });

          if (upsertError) {
            console.error('Error updating quota usage:', upsertError);
            throw upsertError;
          } else {
            console.log(`📊 Updated quota for service account ${serviceAccountId}: ${updatedUsage.requests_made} requests (${updatedUsage.requests_successful} successful, ${updatedUsage.requests_failed} failed)`);
          }
        }
      );
    } catch (error) {
      console.error('Error in updateQuotaUsage:', error);
    }
  }

  /**
   * Update user's daily quota consumption in user profiles table
   */
  async updateUserQuotaConsumption(userId: string, urlCount: number): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'update_user_quota_consumption',
          reason: 'System quota tracking - updating user daily quota consumption for indexing usage',
          source: 'QuotaManager.updateUserQuotaConsumption',
          metadata: {
            targetUserId: userId,
            urlCount,
            operation_type: 'user_quota_tracking'
          }
        },
        {
          table: 'indb_auth_user_profiles',
          operationType: 'update'
        },
        async () => {
          // Get current user quota
          const { data: profile, error: fetchError } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select('daily_quota_used, daily_quota_reset_date')
            .eq('user_id', userId)
            .single();

          if (fetchError) {
            console.error('Error fetching user profile for quota update:', fetchError);
            throw fetchError;
          }

          const today = new Date().toISOString().split('T')[0];
          const currentQuotaUsed = profile?.daily_quota_used || 0;
          const resetDate = profile?.daily_quota_reset_date;

          // Reset quota if it's a new day
          let updatedQuotaUsed = currentQuotaUsed;
          if (resetDate !== today) {
            updatedQuotaUsed = 0; // Reset for new day
          }

          // Add the consumed URLs
          updatedQuotaUsed += urlCount;

          // Update user's quota consumption
          const { error: updateError } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .update({
              daily_quota_used: updatedQuotaUsed,
              daily_quota_reset_date: today,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('Error updating user quota consumption:', updateError);
            throw updateError;
          } else {
            console.log(`📊 Updated user ${userId} quota: ${updatedQuotaUsed} URLs used today`);
          }
        }
      );
    } catch (error) {
      console.error('Error in updateUserQuotaConsumption:', error);
    }
  }

  /**
   * Get remaining quota for a service account
   */
  async getRemainingQuota(serviceAccountId: string): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_service_account_remaining_quota',
          reason: 'System quota checking - calculating remaining quota for service account',
          source: 'QuotaManager.getRemainingQuota',
          metadata: {
            serviceAccountId,
            date: today,
            operation_type: 'quota_status_check'
          }
        },
        {
          table: 'indb_google_service_accounts',
          operationType: 'select'
        },
        async () => {
          // Get service account quota limit
          const { data: serviceAccount } = await supabaseAdmin
            .from('indb_google_service_accounts')
            .select('daily_quota_limit')
            .eq('id', serviceAccountId)
            .single();

          const dailyLimit = serviceAccount?.daily_quota_limit || 200; // Default Google API limit

          // Get current usage
          const { data: usage } = await supabaseAdmin
            .from('indb_google_quota_usage')
            .select('requests_made')
            .eq('service_account_id', serviceAccountId)
            .eq('date', today)
            .single();

          const usedToday = usage?.requests_made || 0;
          return Math.max(0, dailyLimit - usedToday);
        }
      );
    } catch (error) {
      console.error('Error getting remaining quota:', error);
      return 0;
    }
  }

  /**
   * Handle service account quota exhaustion
   */
  async handleServiceAccountQuotaExhausted(serviceAccountId: string): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'handle_service_account_quota_exhausted',
          reason: 'System quota management - handling quota exhaustion by deactivating service account and pausing related jobs',
          source: 'QuotaManager.handleServiceAccountQuotaExhausted',
          metadata: {
            serviceAccountId,
            operation_type: 'quota_exhaustion_handling'
          }
        },
        {
          table: 'indb_google_service_accounts',
          operationType: 'update'
        },
        async () => {
          // 1. Mark service account as quota exhausted
          await supabaseAdmin
            .from('indb_google_service_accounts')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', serviceAccountId);
          
          // 2. Pause all jobs using this service account
          const { data: activeJobs } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .select('id, user_id')
            .eq('status', 'running');
          
          if (activeJobs && activeJobs.length > 0) {
            // Get user_id from service account
            const { data: serviceAccount } = await supabaseAdmin
              .from('indb_google_service_accounts')
              .select('user_id')
              .eq('id', serviceAccountId)
              .single();
            
            if (serviceAccount) {
              // Pause jobs for this user
              const userJobs = activeJobs.filter(job => job.user_id === serviceAccount.user_id);
              
              for (const job of userJobs) {
                await supabaseAdmin
                  .from('indb_indexing_jobs')
                  .update({
                    status: 'paused',
                    error_message: 'Service account quota exhausted. Jobs will resume after quota reset (midnight Pacific Time).',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', job.id);
                
                console.log(`⏸️ Paused job ${job.id} due to service account quota exhaustion`);
              }
            }
          }
        }
      );
      
      // 3. Create quota exhausted notification (separate SecureWrapper call)
      await this.createQuotaExhaustedNotification(serviceAccountId);
      
      console.log(`🚫 Service account ${serviceAccountId} quota exhausted - jobs paused until quota reset`);
      
    } catch (error) {
      console.error('Error handling service account quota exhaustion:', error);
    }
  }

  /**
   * Create notification for quota exhausted service account
   */
  private async createQuotaExhaustedNotification(serviceAccountId: string): Promise<void> {
    try {
      console.log(`🔔 Creating quota exhausted notification for service account: ${serviceAccountId}`);
      
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'create_quota_exhausted_notification',
          reason: 'System notification - creating user notification for service account quota exhaustion',
          source: 'QuotaManager.createQuotaExhaustedNotification',
          metadata: {
            serviceAccountId,
            operation_type: 'quota_notification'
          }
        },
        {
          table: 'indb_google_service_accounts',
          operationType: 'select'
        },
        async () => {
          // Get service account and user info
          const { data: serviceAccount, error: fetchError } = await supabaseAdmin
            .from('indb_google_service_accounts')
            .select('user_id, name, email')
            .eq('id', serviceAccountId)
            .single();
          
          if (fetchError) {
            console.error('Error fetching service account for notification:', fetchError);
            throw fetchError;
          }
          
          if (!serviceAccount) {
            console.warn('Service account not found for notification creation:', serviceAccountId);
            throw new Error(`Service account ${serviceAccountId} not found`);
          }
          
          console.log(`📧 Creating notification for user ${serviceAccount.user_id}, service account: ${serviceAccount.name} (${serviceAccount.email})`);
          
          const { data: notification, error: insertError } = await supabaseAdmin
            .from('indb_notifications_dashboard')
            .insert({
              user_id: serviceAccount.user_id,
              type: 'error', // Use valid type - 'error' is appropriate for quota exhaustion
              title: 'Service Account Quota Exhausted',
              message: `Service account "${serviceAccount.name}" (${serviceAccount.email}) has exhausted its daily quota. Jobs have been paused and will resume automatically after quota reset (midnight Pacific Time).`,
              metadata: {
                notification_type: 'service_account_quota_exhausted', // Store the specific type in metadata
                service_account_id: serviceAccountId,
                service_account_name: serviceAccount.name,
                service_account_email: serviceAccount.email,
                quota_reset_time: 'midnight Pacific Time'
              },
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
              created_at: new Date().toISOString(),
              is_read: false
            })
            .select()
            .single();
          
          if (insertError) {
            console.error('Error inserting quota exhausted notification:', insertError);
            throw insertError;
          }
          
          if (notification) {
            console.log(`✅ Successfully created quota exhausted notification:`, notification.id);
          }
        }
      );
      
    } catch (error) {
      console.error('Error creating quota exhausted notification:', error);
    }
  }
}
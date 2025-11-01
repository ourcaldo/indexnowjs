import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { JobErrorHandler } from './JobErrorHandler'

export class TrialMonitorService {
  

  /**
   * Check for trials that have ended and update their status
   */
  static async processExpiredTrials(): Promise<void> {
    const jobId = `trial-monitor-${Date.now()}`;
    
    await JobErrorHandler.withJobErrorHandling(
      async () => {
        const now = new Date()

        // Find trials that have expired
        const { data: expiredTrials, error } = await SecureServiceRoleWrapper.executeSecureOperation(
          {
            userId: 'system',
            operation: 'get_expired_trials',
            reason: 'Trial monitor service finding expired trials for automatic status updates',
            source: 'TrialMonitorService.processExpiredTrials',
            metadata: {
              checkTime: now.toISOString(),
              targetStatus: 'active',
              operation: 'find_expired_trials'
            }
          },
          { table: 'indb_auth_user_profiles', operationType: 'select' },
          async () => {
            const { data, error } = await supabaseAdmin
              .from('indb_auth_user_profiles')
              .select(`
                user_id,
                email,
                full_name,
                expires_at,
                trial_status,
                auto_billing_enabled,
                package_id
              `)
              .eq('trial_status', 'active')
              .lt('expires_at', now.toISOString());

            if (error) {
              throw error;
            }

            return { data, error };
          }
        );

        if (error) {
          throw error;
        }

        if (!expiredTrials || expiredTrials.length === 0) {
          return { processed: 0 };
        }

        JobErrorHandler.logJobProgress(
          {
            jobId,
            jobType: 'trial_monitoring',
            jobName: 'Trial Monitor'
          },
          {
            processed: 0,
            total: expiredTrials.length
          }
        );

        // Process each expired trial
        let processedCount = 0;
        for (const trial of expiredTrials) {
          // CRITICAL FIX: For ALL expired trials, user should NOT have any package until Paddle payment is processed
          // Whether auto_billing_enabled is true or false, user loses access when trial ends
          // Only when Paddle webhook confirms successful payment, user regains access
          await SecureServiceRoleWrapper.executeSecureOperation(
            {
              userId: 'system',
              operation: 'end_expired_trial',
              reason: 'Trial monitor service ending expired trial and removing package access',
              source: 'TrialMonitorService.processExpiredTrials',
              metadata: {
                targetUserId: trial.user_id,
                userEmail: trial.email,
                autoBillingEnabled: trial.auto_billing_enabled,
                previousPackageId: trial.package_id,
                trialEndTime: now.toISOString()
              }
            },
            { 
              table: 'indb_auth_user_profiles', 
              operationType: 'update',
              data: {
                trial_status: 'ended',
                package_id: null,
                subscribed_at: null,
                expires_at: null
              }
            },
            async () => {
              await supabaseAdmin
                .from('indb_auth_user_profiles')
                .update({
                  trial_status: 'ended',
                  package_id: null,     // Remove package access immediately when trial ends
                  subscribed_at: null,  // Clear subscription info
                  expires_at: null      // Clear expiration
                })
                .eq('user_id', trial.user_id);

              return true;
            }
          );

          processedCount++;
          JobErrorHandler.logJobProgress(
            {
              jobId,
              jobType: 'trial_monitoring',
              jobName: 'Trial Monitor'
            },
            {
              processed: processedCount,
              total: expiredTrials.length
            }
          );
        }

        return { processed: processedCount };
      },
      {
        jobId,
        jobType: 'trial_monitoring',
        jobName: 'Trial Monitor',
        metadata: { operation: 'process_expired_trials' }
      }
    );
  }


  /**
   * Main monitoring job - runs all checks
   */
  static async runTrialMonitorJob(): Promise<void> {
    await this.processExpiredTrials();
  }
}
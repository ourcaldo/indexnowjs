import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'

interface UserQuotaInfo {
  user_id: string
  package_id: string
  daily_quota_used: number
  daily_quota_limit: number
  is_unlimited: boolean
  quota_exhausted: boolean
  package_name: string
}

export class QuotaService {
  
  /**
   * Get user's current quota information
   */
  static async getUserQuota(userId: string): Promise<UserQuotaInfo | null> {
    try {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_user_quota_info',
          reason: 'Quota service retrieving user quota information and handling daily quota reset',
          source: 'QuotaService.getUserQuota',
          metadata: {
            targetUserId: userId,
            operation_type: 'quota_info_retrieval'
          }
        },
        { table: 'indb_auth_user_profiles', operationType: 'select' },
        async () => {
          // Get user profile with package information
          const { data: profile, error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select(`
              user_id,
              package_id,
              daily_quota_used,
              daily_quota_reset_date,
              package:indb_payment_packages(
                id,
                name,
                quota_limits
              )
            `)
            .eq('user_id', userId)
            .single()

          if (error || !profile || !profile.package) {
            console.error('Failed to fetch user quota:', error)
            return null
          }

          const packageData = Array.isArray(profile.package) ? profile.package[0] : profile.package
          const dailyLimit = packageData?.quota_limits?.daily_urls || 0
          const isUnlimited = dailyLimit === -1
          
          // Get real quota usage directly from user profile (most accurate)
          let dailyQuotaUsed = profile.daily_quota_used || 0
          
          // Reset quota if it's a new day
          const today = new Date().toISOString().split('T')[0]
          const resetDate = profile.daily_quota_reset_date
          
          if (resetDate !== today) {
            // Reset quota for new day
            await supabaseAdmin
              .from('indb_auth_user_profiles')
              .update({
                daily_quota_used: 0,
                daily_quota_reset_date: today,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
            
            dailyQuotaUsed = 0
          }

          return {
            user_id: userId,
            package_id: profile.package_id,
            daily_quota_used: dailyQuotaUsed,
            daily_quota_limit: dailyLimit,
            is_unlimited: isUnlimited,
            quota_exhausted: !isUnlimited && dailyQuotaUsed >= dailyLimit,
            package_name: packageData?.name || 'Unknown'
          }
        }
      )
    } catch (error) {
      console.error('Error getting user quota:', error)
      return null
    }
  }

  /**
   * Check if user has available quota for URL submission
   */
  static async canSubmitUrls(userId: string, urlCount: number = 1): Promise<{
    canSubmit: boolean
    remainingQuota: number
    quotaExhausted: boolean
    message?: string
  }> {
    const quotaInfo = await this.getUserQuota(userId)
    
    if (!quotaInfo) {
      return {
        canSubmit: false,
        remainingQuota: 0,
        quotaExhausted: true,
        message: 'Unable to check quota limits'
      }
    }

    if (quotaInfo.is_unlimited) {
      return {
        canSubmit: true,
        remainingQuota: -1,
        quotaExhausted: false
      }
    }

    const remainingQuota = quotaInfo.daily_quota_limit - quotaInfo.daily_quota_used
    const canSubmit = remainingQuota >= urlCount

    return {
      canSubmit,
      remainingQuota,
      quotaExhausted: remainingQuota <= 0,
      message: canSubmit ? undefined : `Insufficient quota. You need ${urlCount} URLs but only have ${remainingQuota} remaining.`
    }
  }

  /**
   * Consume quota when URLs are submitted (DEPRECATED - Use GoogleIndexingProcessor.updateUserQuotaConsumption instead)
   * This method is kept for backward compatibility but quota consumption now happens during actual processing
   */
  static async consumeQuota(userId: string, urlCount: number): Promise<boolean> {
    console.warn('QuotaService.consumeQuota is deprecated. Quota consumption now happens during actual URL processing.')
    return true // Always return true since quota is consumed during processing
  }

  /**
   * Reset quota if it's a new day
   */
  static async resetQuotaIfNeeded(userId: string): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'reset_user_quota_if_needed',
          reason: 'Quota service resetting user daily quota if new day detected',
          source: 'QuotaService.resetQuotaIfNeeded',
          metadata: {
            targetUserId: userId,
            operation_type: 'quota_daily_reset'
          }
        },
        { table: 'indb_auth_user_profiles', operationType: 'update' },
        async () => {
          const today = new Date().toISOString().split('T')[0]
          
          const { error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .update({
              daily_quota_used: 0,
              daily_quota_reset_date: today,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .lt('daily_quota_reset_date', today)

          if (error) {
            console.error('Failed to reset quota:', error)
            throw error
          }
        }
      )
    } catch (error) {
      console.error('Error resetting quota:', error)
    }
  }

  /**
   * Reset all users' quotas (run daily via cron)
   */
  static async resetAllQuotas(): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'reset_all_user_quotas',
          reason: 'Quota service daily cron job resetting all user quotas for new day',
          source: 'QuotaService.resetAllQuotas',
          metadata: {
            operation_type: 'mass_quota_reset',
            trigger: 'daily_cron'
          }
        },
        { table: 'indb_auth_user_profiles', operationType: 'update' },
        async () => {
          const today = new Date().toISOString().split('T')[0]
          
          const { error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .update({
              daily_quota_used: 0,
              daily_quota_reset_date: today,
              updated_at: new Date().toISOString()
            })
            .lt('daily_quota_reset_date', today)

          if (error) {
            console.error('Failed to reset all quotas:', error)
            throw error
          } else {
            console.log('Successfully reset daily quotas for all users')
          }
        }
      )
    } catch (error) {
      console.error('Error resetting all quotas:', error)
    }
  }

  /**
   * Get quota usage statistics for admin dashboard
   */
  static async getQuotaStats(): Promise<{
    totalUsers: number
    usersAtLimit: number
    totalQuotaUsed: number
    averageQuotaUsage: number
  }> {
    try {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_quota_usage_statistics',
          reason: 'Quota service generating usage statistics for admin dashboard monitoring',
          source: 'QuotaService.getQuotaStats',
          metadata: {
            operation_type: 'admin_statistics_report'
          }
        },
        { table: 'indb_auth_user_profiles', operationType: 'select' },
        async () => {
          const { data: profiles, error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select(`
              daily_quota_used,
              package:indb_payment_packages(quota_limits)
            `)

          if (error || !profiles) {
            return { totalUsers: 0, usersAtLimit: 0, totalQuotaUsed: 0, averageQuotaUsage: 0 }
          }

          const totalUsers = profiles.length
          let usersAtLimit = 0
          let totalQuotaUsed = 0

          profiles.forEach(profile => {
            const quotaUsed = profile.daily_quota_used || 0
            const packageData = Array.isArray(profile.package) ? profile.package[0] : profile.package
            const quotaLimit = packageData?.quota_limits?.daily_urls || 0
            
            totalQuotaUsed += quotaUsed
            
            if (quotaLimit !== -1 && quotaUsed >= quotaLimit) {
              usersAtLimit++
            }
          })

          return {
            totalUsers,
            usersAtLimit,
            totalQuotaUsed,
            averageQuotaUsage: totalUsers > 0 ? Math.round(totalQuotaUsed / totalUsers) : 0
          }
        }
      )
    } catch (error) {
      console.error('Error getting quota stats:', error)
      return { totalUsers: 0, usersAtLimit: 0, totalQuotaUsed: 0, averageQuotaUsage: 0 }
    }
  }
}
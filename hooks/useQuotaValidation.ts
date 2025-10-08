'use client'

import { useGlobalQuotaManager } from './useGlobalQuotaManager'

export function useQuotaValidation() {
  const { quotaInfo, canCreateJob, refreshQuota } = useGlobalQuotaManager()

  // Validate if user can create a job with specified URL count
  const validateJobCreation = async (urlCount: number) => {
    // Refresh quota data to get latest information
    await refreshQuota()
    
    const validation = canCreateJob(urlCount)
    
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
        quotaInfo: quotaInfo
      }
    }

    return {
      success: true,
      quotaInfo: quotaInfo
    }
  }

  // Check if quota is near exhaustion (>90%)
  const isQuotaNearExhaustion = () => {
    if (!quotaInfo || quotaInfo.is_unlimited) return false
    
    const usagePercentage = (quotaInfo.daily_quota_used / quotaInfo.daily_quota_limit) * 100
    return usagePercentage >= 90
  }

  // Get quota usage percentage
  const getQuotaUsagePercentage = () => {
    if (!quotaInfo || quotaInfo.is_unlimited) return 0
    return Math.min(100, (quotaInfo.daily_quota_used / quotaInfo.daily_quota_limit) * 100)
  }

  return {
    validateJobCreation,
    isQuotaNearExhaustion,
    getQuotaUsagePercentage,
    quotaInfo,
    refreshQuota
  }
}
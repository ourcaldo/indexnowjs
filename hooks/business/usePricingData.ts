'use client'

import { useState, useEffect } from 'react'
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/currency-utils'
import { PUBLIC_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export interface PricingTierData {
  promo_price: number
  period_label: string
  regular_price: number
  paddle_price_id?: string
}

export interface PackageData {
  id: string
  name: string
  slug: string
  description: string
  features: string[]
  quota_limits: {
    daily_urls?: number
    keywords_limit?: number
    concurrent_jobs?: number
    service_accounts?: number
  }
  pricing_tiers: {
    annual?: PricingTierData
    monthly?: PricingTierData
  }
  is_popular?: boolean
  is_active?: boolean
  sort_order?: number
}

export interface PriceInfo {
  price: number
  originalPrice?: number
  period: string
  discount?: number
  periodLabel?: string
  paddlePriceId?: string
}

export type BillingPeriod = 'monthly' | 'annual'

export interface UsePricingDataOptions {
  initialPeriod?: BillingPeriod
  maxPackages?: number
}

export const usePricingData = (options: UsePricingDataOptions = {}) => {
  const { initialPeriod = 'monthly', maxPackages } = options
  
  const [packages, setPackages] = useState<PackageData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>(initialPeriod)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(PUBLIC_ENDPOINTS.SETTINGS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        const data = result?.success === true && result.data ? result.data : result
        if (data.packages && data.packages.packages && Array.isArray(data.packages.packages)) {
          let packagesData = data.packages.packages.map((pkg: any) => ({
            ...pkg,
            is_popular: pkg.is_popular || pkg.slug === 'premium'
          })) as PackageData[]
          
          if (maxPackages) {
            packagesData = packagesData.slice(0, maxPackages)
          }
          
          setPackages(packagesData)
        }
      } else {
        throw new Error('Failed to load packages')
      }
    } catch (err) {
      console.error('Failed to load packages:', err)
      setError('Failed to load packages')
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return formatCurrencyUtil(price)
  }

  const getPricing = (pkg: PackageData, period: BillingPeriod = selectedPeriod): PriceInfo => {
    if (!pkg.pricing_tiers || typeof pkg.pricing_tiers !== 'object') {
      return { 
        price: 0, 
        period: pkg.description || period,
        periodLabel: period 
      }
    }
    
    const periodData = pkg.pricing_tiers[period]
    if (!periodData) {
      return { 
        price: 0, 
        period: pkg.description || period,
        periodLabel: period 
      }
    }
    
    const price = periodData.promo_price || periodData.regular_price
    const originalPrice = (periodData.regular_price && periodData.regular_price > 0 && periodData.regular_price !== periodData.promo_price) 
      ? periodData.regular_price 
      : undefined
    const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined
    
    return { 
      price,
      originalPrice,
      period: periodData.period_label,
      periodLabel: periodData.period_label,
      discount: discount && discount > 0 ? discount : undefined,
      paddlePriceId: periodData.paddle_price_id
    }
  }

  const getFeaturesList = (pkg: PackageData): string[] => {
    const features: string[] = []
    
    const keywordLimit = pkg.quota_limits?.keywords_limit || 0
    const serviceAccounts = pkg.quota_limits?.service_accounts || 1
    const concurrentJobs = pkg.quota_limits?.concurrent_jobs || 1
    const dailyUrls = pkg.quota_limits?.daily_urls || 0
    
    if (keywordLimit === -1) {
      features.push('Unlimited Keywords')
    } else if (keywordLimit >= 1000) {
      features.push(`${Math.floor(keywordLimit / 1000)}K+ Keywords`)
    } else if (keywordLimit > 0) {
      features.push(`${keywordLimit} Keywords`)
    }
    
    if (serviceAccounts === -1) {
      features.push('Unlimited Service Accounts')
    } else if (serviceAccounts === 1) {
      features.push('1 Service Account')
    } else if (serviceAccounts > 1) {
      features.push(`${serviceAccounts} Service Accounts`)
    }
    
    if (dailyUrls === -1) {
      features.push('Unlimited Daily Indexing')
    } else if (dailyUrls > 0) {
      features.push(`${dailyUrls} Daily URL Quota`)
    }
    
    if (concurrentJobs > 1) {
      features.push(`${concurrentJobs} Concurrent Jobs`)
    }
    
    if (pkg.features && Array.isArray(pkg.features)) {
      pkg.features.forEach(feature => {
        if (feature && !features.some(f => f.toLowerCase().includes(feature.toLowerCase().substring(0, 10)))) {
          features.push(feature)
        }
      })
    }
    
    return features
  }

  const getAvailablePeriods = (): BillingPeriod[] => {
    if (packages.length === 0) return ['monthly', 'annual']
    
    const firstPackage = packages[0]
    const periods = Object.keys(firstPackage.pricing_tiers) as BillingPeriod[]
    
    const periodOrder: BillingPeriod[] = ['monthly', 'annual']
    
    return periodOrder.filter(period => periods.includes(period))
  }

  const getPeriodLabel = (period: BillingPeriod): string => {
    if (packages.length === 0) return period
    
    const firstPackage = packages[0]
    const periodData = firstPackage.pricing_tiers[period]
    
    return periodData?.period_label || period
  }

  const getSavingsPercentage = (period: BillingPeriod): number | null => {
    if (period === 'monthly' || packages.length === 0) return null
    
    const firstPackage = packages[0]
    const monthlyPrice = getPricing(firstPackage, 'monthly').price
    const periodPrice = getPricing(firstPackage, period).price
    
    if (monthlyPrice === 0 || periodPrice === 0) return null
    
    const periodMultiplier = period === 'annual' ? 12 : 1
    const monthlyEquivalent = periodPrice / periodMultiplier
    
    if (monthlyEquivalent >= monthlyPrice) return null
    
    return Math.round(((monthlyPrice - monthlyEquivalent) / monthlyPrice) * 100)
  }

  return {
    packages,
    selectedPeriod,
    isLoading,
    error,
    
    setSelectedPeriod,
    reloadData: loadPackages,
    
    formatPrice,
    getPricing,
    getFeaturesList,
    getAvailablePeriods,
    getPeriodLabel,
    getSavingsPercentage
  }
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/database/supabase-browser'
import { getUserCurrency, formatCurrency as formatCurrencyUtil } from '@/lib/utils/currency-utils'
import { AUTH_ENDPOINTS, PUBLIC_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export interface PricingTierData {
  IDR: {
    promo_price: number
    period_label: string
    regular_price: number
  }
  USD: {
    promo_price: number
    period_label: string
    regular_price: number
  }
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
    annual: PricingTierData
    monthly: PricingTierData
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
}

export type BillingPeriod = 'monthly' | 'annual'
export type Currency = 'USD' | 'IDR'

export interface UsePricingDataOptions {
  initialPeriod?: BillingPeriod
  maxPackages?: number
}

export const usePricingData = (options: UsePricingDataOptions = {}) => {
  const { initialPeriod = 'monthly', maxPackages } = options
  
  const [packages, setPackages] = useState<PackageData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>(initialPeriod)
  const [currency, setCurrency] = useState<Currency>('USD')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load packages and detect currency
  useEffect(() => {
    detectCurrencyAndLoadPackages()
  }, [])

  const detectCurrencyAndLoadPackages = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      let detectedCurrency: Currency = 'USD'
      
      if (user) {
        // User is logged in - get country from profile
        const { data: profile } = await supabase
          .from('indb_auth_user_profiles')
          .select('country')
          .eq('user_id', user.id)
          .single()
        
        if (profile?.country) {
          detectedCurrency = getUserCurrency(profile.country)
        }
      } else {
        // User not logged in - use IP detection
        try {
          const locationResponse = await fetch(AUTH_ENDPOINTS.DETECT_LOCATION, {
            credentials: 'include'
          })
          if (locationResponse.ok) {
            const locationData = await locationResponse.json()
            if (locationData.country) {
              detectedCurrency = getUserCurrency(locationData.country)
            }
          }
        } catch (error) {
          // Fall back to USD
        }
      }
      
      setCurrency(detectedCurrency)
      await loadPackages()
      
    } catch (err) {
      console.error('Failed to detect currency:', err)
      setError('Failed to load pricing data')
      setCurrency('USD')
      await loadPackages()
    } finally {
      setIsLoading(false)
    }
  }

  const loadPackages = async () => {
    try {
      const response = await fetch(PUBLIC_ENDPOINTS.SETTINGS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.packages && data.packages.packages && Array.isArray(data.packages.packages)) {
          let packagesData = data.packages.packages.map((pkg: any) => ({
            ...pkg,
            is_popular: pkg.is_popular || pkg.slug === 'premium' // Default Premium as popular if not set
          })) as PackageData[]
          
          // Limit packages if specified
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
    }
  }

  // Format price using currency
  const formatPrice = (price: number, targetCurrency: Currency = currency) => {
    return formatCurrencyUtil(price, targetCurrency)
  }

  // Get pricing information for a package and period
  const getPricing = (pkg: PackageData, period: BillingPeriod = selectedPeriod): PriceInfo => {
    if (!pkg.pricing_tiers || typeof pkg.pricing_tiers !== 'object') {
      return { 
        price: 0, 
        period: pkg.description || period,
        periodLabel: period 
      }
    }
    
    const periodData = pkg.pricing_tiers[period]
    if (!periodData || !periodData[currency]) {
      return { 
        price: 0, 
        period: pkg.description || period,
        periodLabel: period 
      }
    }
    
    const tierData = periodData[currency]
    const price = tierData.promo_price || tierData.regular_price
    const originalPrice = (tierData.regular_price && tierData.regular_price > 0 && tierData.regular_price !== tierData.promo_price) ? tierData.regular_price : undefined
    const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined
    
    return { 
      price,
      originalPrice,
      period: tierData.period_label,
      periodLabel: tierData.period_label,
      discount: discount && discount > 0 ? discount : undefined
    }
  }

  // Extract features list from package
  const getFeaturesList = (pkg: PackageData): string[] => {
    const features: string[] = []
    
    const keywordLimit = pkg.quota_limits?.keywords_limit || 0
    const serviceAccounts = pkg.quota_limits?.service_accounts || 1
    const concurrentJobs = pkg.quota_limits?.concurrent_jobs || 1
    const dailyUrls = pkg.quota_limits?.daily_urls || 0
    
    // Add keyword limit
    if (keywordLimit === -1) {
      features.push('Unlimited Keywords')
    } else if (keywordLimit >= 1000) {
      features.push(`${Math.floor(keywordLimit / 1000)}K+ Keywords`)
    } else if (keywordLimit > 0) {
      features.push(`${keywordLimit} Keywords`)
    }
    
    // Add service accounts
    if (serviceAccounts === -1) {
      features.push('Unlimited Service Accounts')
    } else if (serviceAccounts === 1) {
      features.push('1 Service Account')
    } else if (serviceAccounts > 1) {
      features.push(`${serviceAccounts} Service Accounts`)
    }
    
    // Add daily URLs for indexing
    if (dailyUrls === -1) {
      features.push('Unlimited Daily Indexing')
    } else if (dailyUrls > 0) {
      features.push(`${dailyUrls} Daily URL Quota`)
    }
    
    // Add concurrent jobs
    if (concurrentJobs > 1) {
      features.push(`${concurrentJobs} Concurrent Jobs`)
    }
    
    // Add package-specific features from database features array
    if (pkg.features && Array.isArray(pkg.features)) {
      pkg.features.forEach(feature => {
        if (feature && !features.some(f => f.toLowerCase().includes(feature.toLowerCase().substring(0, 10)))) {
          features.push(feature)
        }
      })
    }
    
    return features
  }

  // Get available billing periods
  const getAvailablePeriods = (): BillingPeriod[] => {
    if (packages.length === 0) return ['monthly', 'annual']
    
    const firstPackage = packages[0]
    const periods = Object.keys(firstPackage.pricing_tiers) as BillingPeriod[]
    
    // Define the order: monthly → annual
    const periodOrder: BillingPeriod[] = ['monthly', 'annual']
    
    return periodOrder.filter(period => periods.includes(period))
  }

  // Get period label for display
  const getPeriodLabel = (period: BillingPeriod): string => {
    if (packages.length === 0) return period
    
    const firstPackage = packages[0]
    const periodData = firstPackage.pricing_tiers[period]
    
    return periodData?.[currency]?.period_label || period
  }

  // Get savings percentage for a period compared to monthly
  const getSavingsPercentage = (period: BillingPeriod): number | null => {
    if (period === 'monthly' || packages.length === 0) return null
    
    const firstPackage = packages[0]
    const monthlyPrice = getPricing(firstPackage, 'monthly').price
    const periodPrice = getPricing(firstPackage, period).price
    
    if (monthlyPrice === 0 || periodPrice === 0) return null
    
    // Calculate monthly equivalent for period price
    const periodMultiplier = period === 'annual' ? 12 : 1
    const monthlyEquivalent = periodPrice / periodMultiplier
    
    if (monthlyEquivalent >= monthlyPrice) return null
    
    return Math.round(((monthlyPrice - monthlyEquivalent) / monthlyPrice) * 100)
  }

  return {
    // Data
    packages,
    selectedPeriod,
    currency,
    isLoading,
    error,
    
    // Actions
    setSelectedPeriod,
    setCurrency,
    reloadData: detectCurrencyAndLoadPackages,
    
    // Helpers
    formatPrice,
    getPricing,
    getFeaturesList,
    getAvailablePeriods,
    getPeriodLabel,
    getSavingsPercentage
  }
}
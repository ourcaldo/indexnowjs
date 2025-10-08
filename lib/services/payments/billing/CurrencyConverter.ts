/**
 * Currency Converter Service
 * Handles currency conversion with caching and fallback rates
 */

export interface ExchangeRate {
  from_currency: string
  to_currency: string
  rate: number
  updated_at: Date
}

export class CurrencyConverter {
  private static readonly CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds
  private static readonly FALLBACK_RATES: Record<string, number> = {
    'USD_IDR': 15800,  // Fallback rate USD to IDR
    'IDR_USD': 0.0000633, // Fallback rate IDR to USD
  }

  private static cache: Map<string, { rate: number; timestamp: number }> = new Map()

  /**
   * Convert amount from one currency to another
   */
  static async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount
    }

    const rate = await this.getExchangeRate(fromCurrency, toCurrency)
    return amount * rate
  }

  /**
   * Get exchange rate between two currencies
   */
  static async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const cacheKey = `${fromCurrency}_${toCurrency}`
    
    // Check cache first
    const cachedRate = this.getCachedRate(cacheKey)
    if (cachedRate !== null) {
      return cachedRate
    }

    try {
      // Try to get live rate
      const liveRate = await this.fetchLiveRate(fromCurrency, toCurrency)
      
      // Cache the rate
      this.cacheRate(cacheKey, liveRate)
      
      return liveRate
    } catch (error) {
      console.error('Failed to fetch live exchange rate:', error)
      
      // Fall back to static rate
      const fallbackRate = this.FALLBACK_RATES[cacheKey]
      if (fallbackRate) {
        console.warn(`Using fallback rate for ${cacheKey}: ${fallbackRate}`)
        return fallbackRate
      }
      
      throw new Error(`No exchange rate available for ${fromCurrency} to ${toCurrency}`)
    }
  }

  /**
   * Fetch live exchange rate from API
   */
  private static async fetchLiveRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // You can replace this with your preferred exchange rate API
    // For now, using a simple approach with exchangerate-api.com
    
    try {
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
      )
      
      if (!response.ok) {
        throw new Error(`Exchange rate API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.rates || !data.rates[toCurrency]) {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`)
      }
      
      return data.rates[toCurrency]
    } catch (error) {
      console.error('Exchange rate API error:', error)
      throw error
    }
  }

  /**
   * Get cached exchange rate
   */
  private static getCachedRate(cacheKey: string): number | null {
    const cached = this.cache.get(cacheKey)
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.rate
    }
    
    return null
  }

  /**
   * Cache exchange rate
   */
  private static cacheRate(cacheKey: string, rate: number): void {
    this.cache.set(cacheKey, {
      rate,
      timestamp: Date.now()
    })
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get all cached rates (for debugging)
   */
  static getCacheStatus(): Array<{ pair: string; rate: number; age: number }> {
    const now = Date.now()
    const status: Array<{ pair: string; rate: number; age: number }> = []
    
    this.cache.forEach((value, key) => {
      status.push({
        pair: key,
        rate: value.rate,
        age: Math.round((now - value.timestamp) / 1000) // age in seconds
      })
    })
    
    return status
  }

  /**
   * Format currency amount
   */
  static formatAmount(amount: number, currency: string): string {
    const formatters: Record<string, Intl.NumberFormat> = {
      'USD': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      'IDR': new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }),
    }

    const formatter = formatters[currency] || new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency 
    })

    return formatter.format(amount)
  }

  /**
   * Convert USD to IDR (commonly used conversion)
   */
  static async convertUsdToIdr(usdAmount: number): Promise<number> {
    return await this.convert(usdAmount, 'USD', 'IDR')
  }

  /**
   * Convert IDR to USD (commonly used conversion)
   */
  static async convertIdrToUsd(idrAmount: number): Promise<number> {
    return await this.convert(idrAmount, 'IDR', 'USD')
  }
}
/**
 * Currency utility functions for handling multi-currency support
 * Indonesia users see IDR prices, others see USD prices
 */

export interface CurrencyConfig {
  currency: string;
  locale: string;
  symbol: string;
}

// Currency configurations
export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  IDR: {
    currency: 'IDR',
    locale: 'id-ID',
    symbol: 'Rp'
  },
  USD: {
    currency: 'USD',
    locale: 'en-US',
    symbol: '$'
  }
}

/**
 * Determines currency based on user's country
 * Indonesia -> IDR, all others -> USD
 */
export function getUserCurrency(country: string | null | undefined): 'IDR' | 'USD' {
  if (!country) return 'USD'
  
  // Normalize country name for comparison
  const normalizedCountry = country.toLowerCase().trim()
  
  // Check if country is Indonesia (various possible formats)
  const indonesiaVariants = ['indonesia', 'id', 'idn', 'republic of indonesia']
  
  return indonesiaVariants.includes(normalizedCountry) ? 'IDR' : 'USD'
}

/**
 * Formats currency amount based on currency type
 */
export function formatCurrency(amount: number, currency: 'IDR' | 'USD' = 'USD'): string {
  const config = CURRENCY_CONFIGS[currency]
  
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Gets appropriate pricing tiers based on currency
 * Assumes packages have both IDR and USD pricing tiers in the database
 */
export function getCurrencyPricing(pricing_tiers: any, currency: 'IDR' | 'USD', billing_period: string) {
  if (!pricing_tiers || typeof pricing_tiers !== 'object') {
    return null
  }
  
  // Try to get pricing for the specific billing period
  const tier = pricing_tiers[billing_period]
  if (!tier) {
    return null
  }
  
  // For now, we assume the pricing_tiers already contain the correct currency pricing
  // This might need adjustment based on how pricing is stored in the database
  return {
    price: tier.promo_price || tier.regular_price,
    originalPrice: tier.promo_price ? tier.regular_price : undefined,
    discount: tier.discount_percentage
  }
}

/**
 * Validates if a country string is valid Indonesia format
 */
export function isIndonesianUser(country: string | null | undefined): boolean {
  return getUserCurrency(country) === 'IDR'
}

/**
 * Gets currency symbol for display
 */
export function getCurrencySymbol(currency: 'IDR' | 'USD'): string {
  return CURRENCY_CONFIGS[currency].symbol
}

/**
 * Converts price between currencies (if needed for future exchange rate support)
 * For now, assumes packages already have correct pricing in database
 */
export function convertPrice(amount: number, fromCurrency: 'IDR' | 'USD', toCurrency: 'IDR' | 'USD'): number {
  if (fromCurrency === toCurrency) return amount
  
  // For now, return the original amount
  // This could be extended with exchange rate APIs in the future
  return amount
}
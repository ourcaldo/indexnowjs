/**
 * Currency utility functions for USD-only pricing
 * All prices are displayed in USD. Paddle handles currency conversion at checkout.
 */

/**
 * Formats currency amount in USD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Gets currency symbol (always $)
 */
export function getCurrencySymbol(): string {
  return '$'
}

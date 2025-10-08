/**
 * Currency Converter Utility
 * Handles USD to IDR conversion for Midtrans payment processing
 * Note: Midtrans only accepts IDR currency
 */

interface ExchangeRate {
  usd_to_idr: number;
  updated_at: string;
}

// Fallback exchange rate (approximate)
const FALLBACK_USD_TO_IDR_RATE = 15800;

/**
 * Convert USD amount to IDR using current exchange rate
 * @param usdAmount - Amount in USD
 * @returns Amount in IDR (rounded to nearest integer)
 */
export async function convertUsdToIdr(usdAmount: number): Promise<number> {
  try {
    // Try to get current exchange rate from a free API
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (response.ok) {
      const data = await response.json();
      const idrRate = data.rates?.IDR;
      
      if (idrRate && typeof idrRate === 'number') {
        return Math.round(usdAmount * idrRate);
      }
    }
  } catch (error) {
    console.error('Failed to fetch current exchange rate, using fallback:', error);
  }

  // Use fallback rate if API fails
  return Math.round(usdAmount * FALLBACK_USD_TO_IDR_RATE);
}

/**
 * Format IDR amount with proper Indonesian Rupiah formatting
 * @param idrAmount - Amount in IDR
 * @returns Formatted IDR string (e.g., "Rp 158,000")
 */
export function formatIdrCurrency(idrAmount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(idrAmount);
}

/**
 * Convert and format USD to IDR
 * @param usdAmount - Amount in USD
 * @returns Formatted IDR string
 */
export async function convertAndFormatUsdToIdr(usdAmount: number): Promise<string> {
  const idrAmount = await convertUsdToIdr(usdAmount);
  return formatIdrCurrency(idrAmount);
}

/**
 * Get current USD to IDR exchange rate
 * @returns Current exchange rate or fallback rate
 */
export async function getCurrentExchangeRate(): Promise<number> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (response.ok) {
      const data = await response.json();
      const idrRate = data.rates?.IDR;
      
      if (idrRate && typeof idrRate === 'number') {
        return idrRate;
      }
    }
  } catch (error) {
    console.error('Failed to fetch current exchange rate:', error);
  }

  return FALLBACK_USD_TO_IDR_RATE;
}

/**
 * Validate IDR amount for Midtrans (minimum amount requirements)
 * @param idrAmount - Amount in IDR
 * @returns true if amount is valid for Midtrans
 */
export function validateMidtransAmount(idrAmount: number): boolean {
  // Midtrans minimum transaction amount is IDR 1,000
  return idrAmount >= 1000;
}
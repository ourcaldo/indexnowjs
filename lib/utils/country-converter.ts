/**
 * Country Code Converter
 * 
 * Converts ISO2 country codes to full country names and vice versa
 * Uses the comprehensive countries list from lib/utils/countries.ts
 */

import { countries, findCountryByCode } from './countries'

/**
 * Convert ISO2 country code to full country name
 * Example: "ID" -> "Indonesia", "US" -> "United States"
 * 
 * Falls back to the code itself if not found in the mapping
 */
export function convertCountryCodeToName(countryCode: string): string {
  const country = findCountryByCode(countryCode.toUpperCase())
  
  if (country) {
    return country.name
  }
  
  // Fallback: return the code itself if not found
  // This ensures API calls don't fail even for unmapped countries
  return countryCode.toUpperCase()
}

/**
 * Convert full country name to ISO2 code
 * Example: "Indonesia" -> "ID", "United States" -> "US"
 * 
 * Returns null if country name not found
 */
export function convertCountryNameToCode(countryName: string): string | null {
  const normalizedName = countryName.toLowerCase()
  
  const country = countries.find(c => 
    c.name.toLowerCase() === normalizedName ||
    c.name.toLowerCase().includes(normalizedName)
  )
  
  return country ? country.code : null
}

/**
 * Check if country code is valid
 */
export function isValidCountryCode(countryCode: string): boolean {
  return findCountryByCode(countryCode.toUpperCase()) !== undefined
}

/**
 * Get all supported country codes
 */
export function getAllCountryCodes(): string[] {
  return countries.map(c => c.code)
}

/**
 * Get all supported country names
 */
export function getAllCountryNames(): string[] {
  return countries.map(c => c.name)
}

/**
 * Get country info by code
 */
export function getCountryInfo(countryCode: string): { code: string; name: string; flag: string } | null {
  const country = findCountryByCode(countryCode.toUpperCase())
  return country || null
}

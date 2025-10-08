/**
 * IP Address and Device Detection Utilities for Activity Logging
 * Comprehensive tracking for security and analytics purposes
 */

import { NextRequest } from 'next/server'
import { headers } from 'next/headers'

// Safely load GeoIP with error handling for missing data files
let geoip: any = null
try {
  geoip = require('geoip-lite')
  // Test if data files are accessible
  if (geoip) {
    geoip.lookup('8.8.8.8') // Test lookup to verify data files work
  }
} catch (error: any) {
  console.warn('GeoIP-lite failed to initialize:', error?.message || 'Unknown error')
  console.warn('Location tracking will use fallback IP-API service')
  geoip = null
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop'
  browser: string
  os: string
  version?: string
}

export interface LocationData {
  country?: string
  region?: string
  city?: string
  timezone?: string
  latitude?: number
  longitude?: number
  isp?: string
}

/**
 * Extract real IP address from various headers considering proxies
 */
export function getClientIP(request?: NextRequest): string | null {
  if (request) {
    // Check various headers for real IP (for server-side API routes)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const clientIP = request.headers.get('x-client-ip')
    
    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwarded.split(',')[0].trim()
    }
    
    if (realIP) return realIP
    if (clientIP) return clientIP
    
    // Fallback - NextRequest doesn't have ip property in this version
    return null
  }
  
  // Client-side extraction not available without request context
  return null
}

/**
 * Parse User-Agent string to extract device information
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase()
  
  // Determine device type
  let type: DeviceInfo['type'] = 'desktop'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    type = 'mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    type = 'tablet'
  }
  
  // Determine browser
  let browser = 'Unknown'
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome'
  } else if (ua.includes('firefox')) {
    browser = 'Firefox'
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari'
  } else if (ua.includes('edg')) {
    browser = 'Edge'
  } else if (ua.includes('opr') || ua.includes('opera')) {
    browser = 'Opera'
  }
  
  // Determine OS
  let os = 'Unknown'
  if (ua.includes('windows')) {
    os = 'Windows'
  } else if (ua.includes('mac')) {
    os = 'macOS'
  } else if (ua.includes('linux')) {
    os = 'Linux'
  } else if (ua.includes('android')) {
    os = 'Android'
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS'
  }
  
  return { type, browser, os }
}

/**
 * Get comprehensive device and location info from request
 */
export async function getRequestInfo(request?: NextRequest): Promise<{
  ipAddress: string | null
  userAgent: string | null
  deviceInfo: DeviceInfo | null
  locationData: LocationData | null
}> {
  let ipAddress: string | null = null
  let userAgent: string | null = null
  let deviceInfo: DeviceInfo | null = null
  let locationData: LocationData | null = null
  
  if (request) {
    // Server-side extraction
    ipAddress = getClientIP(request)
    userAgent = request.headers.get('user-agent')
    
    if (userAgent) {
      deviceInfo = parseUserAgent(userAgent)
    }
    
    // Get location data using multiple methods
    if (ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== '::1' && !ipAddress.startsWith('192.168.') && !ipAddress.startsWith('10.')) {
      // Method 1: Try GeoIP-lite first if available
      if (geoip) {
        try {
          const geoData = geoip.lookup(ipAddress)
          if (geoData) {
            locationData = {
              country: geoData.country,
              region: geoData.region,
              city: geoData.city,
              timezone: geoData.timezone,
              latitude: geoData.ll?.[0],
              longitude: geoData.ll?.[1],
            }
          }
        } catch (geoError: any) {
          console.warn('GeoIP-lite lookup failed for IP:', ipAddress, 'Error:', geoError?.message)
        }
      }
      
      // Method 2: Use IP-API service if GeoIP failed or unavailable
      if (!locationData) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000)
          
          const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,regionName,city,timezone,lat,lon,isp`, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'IndexNow-Pro/1.0'
            }
          })
          
          clearTimeout(timeoutId)
          
          if (response.ok) {
            const ipApiData = await response.json()
            if (ipApiData.status === 'success') {
              // Debug: Log what IP-API actually returns
              console.log('IP-API Response for', ipAddress, ':', {
                country: ipApiData.country,
                countryCode: ipApiData.countryCode,
                region: ipApiData.regionName
              })
              
              locationData = {
                country: ipApiData.country,
                region: ipApiData.regionName,
                city: ipApiData.city,
                timezone: ipApiData.timezone,
                latitude: ipApiData.lat,
                longitude: ipApiData.lon,
                isp: ipApiData.isp
              }
              console.log('Successfully retrieved location via IP-API for:', ipAddress)
            }
          }
        } catch (ipApiError: any) {
          console.warn('IP-API lookup failed for IP:', ipAddress, 'Error:', ipApiError?.message)
        }
      }
    }
    
    // Fallback: Extract location from headers if available (from CDN/proxy)
    if (!locationData) {
      const country = request.headers.get('cf-ipcountry') || request.headers.get('x-country-code')
      const region = request.headers.get('cf-region') || request.headers.get('x-region')
      const city = request.headers.get('cf-ipcity') || request.headers.get('x-city')
      const timezone = request.headers.get('cf-timezone') || request.headers.get('x-timezone')
      
      if (country || region || city || timezone) {
        locationData = { 
          country: country || undefined, 
          region: region || undefined, 
          city: city || undefined, 
          timezone: timezone || undefined 
        }
      }
    }
  } else {
    // Client-side extraction - use browser APIs if available
    if (typeof window !== 'undefined') {
      userAgent = navigator.userAgent
      if (userAgent) {
        deviceInfo = parseUserAgent(userAgent)
      }
    }
  }
  
  return {
    ipAddress,
    userAgent,
    deviceInfo,
    locationData
  }
}

/**
 * Format device info for display
 */
export function formatDeviceInfo(deviceInfo?: DeviceInfo | null): string {
  if (!deviceInfo) return 'Unknown Device'
  
  const { type, browser, os } = deviceInfo
  return `${browser} on ${os} (${type.charAt(0).toUpperCase() + type.slice(1)})`
}

/**
 * Format location data for display
 */
export function formatLocationData(locationData?: LocationData | null): string {
  if (!locationData) return 'Unknown Location'
  
  const parts = []
  if (locationData.city) parts.push(locationData.city)
  if (locationData.region) parts.push(locationData.region)
  if (locationData.country) parts.push(locationData.country)
  
  return parts.length > 0 ? parts.join(', ') : 'Unknown Location'
}

/**
 * Get security risk level based on device/location patterns
 */
export function getSecurityRiskLevel(
  ipAddress: string | null,
  deviceInfo: DeviceInfo | null,
  locationData: LocationData | null,
  previousIPs: string[] = [],
  previousDevices: DeviceInfo[] = []
): 'low' | 'medium' | 'high' {
  let riskScore = 0
  
  // New IP address
  if (ipAddress && !previousIPs.includes(ipAddress)) {
    riskScore += 1
  }
  
  // New device type
  if (deviceInfo && !previousDevices.some(d => d.type === deviceInfo.type && d.browser === deviceInfo.browser)) {
    riskScore += 1
  }
  
  // Location-based risk (if available)
  if (locationData?.country) {
    // Add logic for high-risk countries if needed
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR'] // Example
    if (highRiskCountries.includes(locationData.country)) {
      riskScore += 2
    }
  }
  
  // Determine risk level
  if (riskScore >= 3) return 'high'
  if (riskScore >= 2) return 'medium'
  return 'low'
}
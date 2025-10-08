/**
 * API URL utility for constructing proper API endpoints
 * Handles client-side vs server-side URL construction to avoid CORS issues
 * @deprecated Use centralized endpoints from @/lib/core/constants/ApiEndpoints instead
 */

import { API_BASE } from '@/lib/core/constants/ApiEndpoints';

export const getApiUrl = (endpoint: string): string => {
  // Server-side: use relative URLs to avoid CORS
  if (typeof window === 'undefined') {
    return `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  }
  
  // Client-side: use centralized API base
  const baseUrl = API_BASE.V1.replace('/v1', '')
  return `${baseUrl}${endpoint.startsWith('/v1') ? endpoint : `/v1${endpoint}`}`
}

/**
 * Helper function for making API requests with proper URL construction
 */
export const makeApiRequest = async (endpoint: string, options?: RequestInit) => {
  const url = getApiUrl(endpoint)
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // Essential for cross-subdomain authentication
    ...options,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP Error: ${response.status}`)
  }

  return response.json()
}
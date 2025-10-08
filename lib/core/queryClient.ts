import { QueryClient } from '@tanstack/react-query'
import { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from '@/lib/core/api-response-formatter'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export class ApiError extends Error {
  id: string
  type: ErrorType
  severity: ErrorSeverity
  timestamp: string
  statusCode: number

  constructor(errorResponse: ApiErrorResponse['error']) {
    super(errorResponse.message)
    this.name = 'ApiError'
    this.id = errorResponse.id
    this.type = errorResponse.type
    this.severity = errorResponse.severity
    this.timestamp = errorResponse.timestamp
    this.statusCode = errorResponse.statusCode
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000, 
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

export const apiRequest = async (url: string, options?: RequestInit) => {
  const fullUrl = url.startsWith('http') || url.includes('/api/v1') ? url : 
    url.startsWith('/') ? url : `/${url}`
  
  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
    ...options,
  })

  const jsonResponse = await response.json().catch(() => ({}))

  const isStandardizedFormat = 'success' in jsonResponse

  if (!response.ok) {
    if (isStandardizedFormat && jsonResponse.success === false) {
      throw new ApiError(jsonResponse.error)
    } else {
      throw new Error(jsonResponse.error || `HTTP Error: ${response.status}`)
    }
  }

  if (isStandardizedFormat && jsonResponse.success === true) {
    return jsonResponse.data
  } else {
    return jsonResponse
  }
}

export default queryClient

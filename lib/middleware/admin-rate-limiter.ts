import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/error-handling'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for tracking failed attempts by IP
const rateLimitStore = new Map<string, RateLimitEntry>()

// Configuration
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes in milliseconds

/**
 * Clean up expired entries from the rate limit store
 * Runs periodically to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  const entries = Array.from(rateLimitStore.entries())
  for (const [ip, entry] of entries) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(ip)
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000)

/**
 * Check if IP is currently rate limited (without incrementing)
 * @param request - Next.js request object
 * @returns true if IP is blocked, false otherwise
 */
export function isRateLimited(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry) {
    return false
  }

  // Check if window has expired
  if (now > entry.resetTime) {
    rateLimitStore.delete(ip)
    return false
  }

  // Check if limit exceeded
  return entry.count > MAX_ATTEMPTS
}

/**
 * Record a failed authentication attempt
 * @param request - Next.js request object
 * @returns true if rate limit now exceeded, false otherwise
 */
export function recordFailedAttempt(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry) {
    // First attempt - create new entry
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS
    })
    return false
  }

  // Check if window has expired
  if (now > entry.resetTime) {
    // Reset the window
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS
    })
    return false
  }

  // Increment attempt count
  entry.count++

  // Check if limit exceeded and log if so
  if (entry.count > MAX_ATTEMPTS) {
    logger.warn({
      ipAddress: ip,
      attemptCount: entry.count,
      maxAttempts: MAX_ATTEMPTS,
      windowMs: WINDOW_MS,
      resetTime: new Date(entry.resetTime).toISOString(),
      userAgent: request.headers.get('user-agent') || 'unknown',
      endpoint: request.nextUrl.pathname
    }, 'Admin rate limit exceeded - potential brute force attack')

    return true
  }

  return false
}

/**
 * Create rate limit error response
 * @param request - Next.js request object
 * @returns NextResponse with 429 status
 */
export function createRateLimitResponse(request: NextRequest): NextResponse {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  const entry = rateLimitStore.get(ip)
  const retryAfter = entry ? Math.ceil((entry.resetTime - Date.now()) / 1000) : 900

  return new NextResponse(
    JSON.stringify({
      error: true,
      message: 'Too many failed authentication attempts. Please try again later.',
      retryAfter: retryAfter,
      retryAfterMinutes: Math.ceil(retryAfter / 60)
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': MAX_ATTEMPTS.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': (entry?.resetTime || Date.now()).toString()
      }
    }
  )
}

/**
 * Reset rate limit for an IP (useful for successful authentication)
 * @param request - Next.js request object
 */
export function resetRateLimit(request: NextRequest): void {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  rateLimitStore.delete(ip)
}

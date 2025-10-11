import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { adminMiddleware } from './app/backend/admin/middleware'

// Subdomain detection and routing
function getSubdomain(request: NextRequest): string | null {
  const hostname = request.headers.get('host') || ''
  
  // Extract hostnames from environment URLs for EXACT matching
  const dashboardHost = process.env.NEXT_PUBLIC_DASHBOARD_URL ? new URL(process.env.NEXT_PUBLIC_DASHBOARD_URL).host : null
  const backendHost = process.env.NEXT_PUBLIC_BACKEND_URL ? new URL(process.env.NEXT_PUBLIC_BACKEND_URL).host : null
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL).host : null
  const baseHost = process.env.NEXT_PUBLIC_BASE_URL ? new URL(process.env.NEXT_PUBLIC_BASE_URL).host : null
  
  // EXACT matching only - no pattern matching bullshit
  if (dashboardHost && hostname === dashboardHost) return 'dashboard'
  if (backendHost && hostname === backendHost) return 'backend'  
  if (apiHost && hostname === apiHost) return 'api'
  if (baseHost && hostname === baseHost) return 'www'
  
  return 'www' // Default fallback
}

function getSubdomainRewrite(subdomain: string, pathname: string): string | null {
  // Exempt auth pages from subdomain rewriting to prevent login redirect loops
  // Only exempt for dashboard subdomain - backend needs rewrites for its own login
  const authPages = ['/login', '/register', '/auth/', '/resend-verification']
  const isDashboardAuthPage = subdomain === 'dashboard' && authPages.some(page => pathname.startsWith(page))
  
  switch (subdomain) {
    case 'dashboard':
      // Rewrite dashboard.domain.com/xyz to /dashboard/xyz
      if (pathname.startsWith('/dashboard')) return null // Already correct
      if (isDashboardAuthPage) return null // Don't rewrite dashboard auth pages
      return `/dashboard${pathname === '/' ? '' : pathname}`
      
    case 'backend':
      // Rewrite backend.domain.com/xyz to /backend/admin/xyz
      if (pathname.startsWith('/backend/admin')) return null // Already correct
      // Always rewrite on backend subdomain (including /login → /backend/admin/login)
      return `/backend/admin${pathname === '/' ? '' : pathname}`
      
    case 'api':
      // API subdomain should serve API routes directly
      if (pathname.startsWith('/api')) return null // Already correct
      return `/api${pathname}`
      
    case 'www':
    default:
      // Main site - serve public routes
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/backend/admin')) {
        return null // Let these routes handle their own redirects
      }
      return null // Serve as-is for public routes
  }
}

// Route protection configuration
interface RouteProtection {
  patterns: string[]
  authLevel: 'user' | 'admin' | 'super_admin'
  redirect?: string
}

const PROTECTED_ROUTES: RouteProtection[] = [
  // User authentication required (removed /verify from here as it needs special handling)
  {
    patterns: ['/dashboard'],
    authLevel: 'user',
    redirect: '/login'
  },
  // Admin authentication required
  {
    patterns: ['/api/system/', '/api/revalidate', '/api/debug/'],
    authLevel: 'admin',
    redirect: '/backend/admin/login'
  },
  // User-specific API routes requiring authentication
  {
    patterns: ['/api/v1/auth/user/', '/api/v1/billing/'],
    authLevel: 'user',
    redirect: '/login'
  }
]

// Public routes that should never be protected
const PUBLIC_ROUTES = [
  '/auth/',
  '/backend/admin/login',
  '/api/health',
  '/api/midtrans/webhook',
  '/api/v1/payments/midtrans/webhook',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/session',
  '/api/v1/auth/detect-location',
  // Add API subdomain equivalents (original paths before rewrite)
  '/v1/payments/midtrans/webhook',
  '/v1/auth/login',
  '/v1/auth/register',
  '/v1/auth/session',
  '/v1/auth/detect-location',
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms'
]

// =============================================
// DYNAMIC CORS CONFIGURATION
// =============================================

/**
 * Get dynamically allowed origins based on environment variables only
 * This enables environment-aware CORS (dev, staging, prod) without hardcoded domains
 */
function getDynamicAllowedOrigins(): string[] {
  // Base origins from environment variables
  const envOrigins = [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_DASHBOARD_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  ].filter(Boolean) as string[] // Remove any undefined values

  // Return combined list of dynamic origins
  return [...envOrigins]
}

/**
 * Enhanced CORS headers setup for cross-subdomain requests
 */
function setCORSHeaders(response: NextResponse, origin: string | null, isAllowed: boolean, pathname?: string): NextResponse {
  // For API routes, be more permissive with cross-subdomain requests
  const isApiRoute = pathname?.startsWith('/api/')
  
  if (isApiRoute && origin) {
    // Check if origin is from same base domain (more permissive for API routes)
    const isSameDomainOrigin = checkSameDomainOrigin(origin)
    
    if (isSameDomainOrigin || isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    } else {
      // For API routes, still allow the request but without credentials
      response.headers.set('Access-Control-Allow-Origin', '*')
    }
  } else if (isAllowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  response.headers.set('Access-Control-Allow-Headers', 
    'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name')
  response.headers.set('Access-Control-Max-Age', '86400') // 24 hours preflight cache
  response.headers.set('Vary', 'Origin')
  
  return response
}

/**
 * Check if origin is from the same base domain (for cross-subdomain requests)
 */
function checkSameDomainOrigin(origin: string): boolean {
  try {
    const originUrl = new URL(origin)
    const originHostname = originUrl.hostname
    
    // Check against environment variable base domains
    const envUrls = [
      process.env.NEXT_PUBLIC_BASE_URL,
      process.env.NEXT_PUBLIC_DASHBOARD_URL,
      process.env.NEXT_PUBLIC_BACKEND_URL,
      process.env.NEXT_PUBLIC_API_BASE_URL,
    ].filter(Boolean)
    
    for (const envUrl of envUrls) {
      try {
        const envHostname = new URL(envUrl as string).hostname
        
        // Extract base domain from both
        const originParts = originHostname.split('.')
        const envParts = envHostname.split('.')
        
        // Check if they share the same base domain (last 2 parts)
        if (originParts.length >= 2 && envParts.length >= 2) {
          const originBase = originParts.slice(-2).join('.')
          const envBase = envParts.slice(-2).join('.')
          
          if (originBase === envBase) {
            return true
          }
        }
        
        // Also check for exact hostname match
        if (originHostname === envHostname) {
          return true
        }
      } catch (e) {
        continue
      }
    }
    
    // Check for localhost variations
    if (originHostname.includes('localhost') || originHostname.includes('127.0.0.1')) {
      return true
    }
    
    return false
  } catch (e) {
    return false
  }
}

/**
 * Handle OPTIONS preflight requests with proper CORS headers
 */
function handlePreflightRequest(origin: string | null, isAllowed: boolean, pathname?: string): NextResponse {
  const response = new NextResponse(null, { status: 200 })
  return setCORSHeaders(response, origin, isAllowed, pathname)
}

async function checkUserAuthentication(request: NextRequest, effectivePath: string): Promise<{ user: any; role: string } | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // Cannot set cookies in middleware
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // For admin routes, check admin role using centralized service client
    if (effectivePath.startsWith('/api/system/') || 
        effectivePath.startsWith('/api/debug/') ||
        effectivePath === '/api/revalidate' ||
        effectivePath.startsWith('/backend/admin')) {
      
      // Use secure service role wrapper for admin role verification
      const { SecureServiceRoleHelpers } = await import('./lib/services/security/SecureServiceRoleWrapper')
      
      // Security validation: Only query profile for the authenticated user
      if (!user?.id) {
        return null
      }

      try {
        // Create secure operation context for admin role check
        const operationContext = {
          userId: user.id,
          operation: 'admin_role_verification',
          reason: `Verify admin permissions for protected route access: ${effectivePath}`,
          source: 'middleware',
          metadata: {
            route: effectivePath,
            requestMethod: request.method,
            userAgent: request.headers.get('user-agent') || 'unknown'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     request.headers.get('x-real-ip') || 
                     'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }

        // Get user role using secure service role wrapper
        const profiles = await SecureServiceRoleHelpers.secureSelect(
          operationContext,
          'indb_auth_user_profiles',
          ['role'],
          { user_id: user.id }
        )

        if (!profiles || profiles.length === 0) {
          return null
        }

        const profile = profiles[0]
        return { user, role: profile.role }

      } catch (error) {
        console.error('Secure service role admin check failed:', error)
        return null
      }
    }

    return { user, role: 'user' }
    
  } catch (error) {
    return null
  }
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

function getRequiredAuthLevel(pathname: string): { authLevel: string; redirect: string } | null {
  for (const protection of PROTECTED_ROUTES) {
    if (protection.patterns.some(pattern => pathname.startsWith(pattern))) {
      return { authLevel: protection.authLevel, redirect: protection.redirect || '/login' }
    }
  }
  return null
}

function hasRequiredAccess(userRole: string, requiredLevel: string): boolean {
  const roleHierarchy = {
    'user': 1,
    'admin': 2,
    'super_admin': 3
  }
  
  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
  const requiredLevelValue = roleHierarchy[requiredLevel as keyof typeof roleHierarchy] || 0
  
  return userLevel >= requiredLevelValue
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // =============================================
  // STEP 1: DYNAMIC CORS HANDLING (Single Source of Truth)
  // =============================================
  
  const origin = request.headers.get('origin')
  const allowedOrigins = getDynamicAllowedOrigins()
  
  // Enhanced origin validation for allowed domains
  const isAllowedOrigin = Boolean(origin && allowedOrigins.includes(origin))
  
  // Handle OPTIONS preflight requests with enhanced headers
  if (request.method === 'OPTIONS') {
    return handlePreflightRequest(origin, isAllowedOrigin, pathname)
  }
  
  // STEP 1: Handle URL canonicalization FIRST (prevent duplicate URLs)
  const subdomain = getSubdomain(request) || 'www'
  
  // Redirect /login on www/root domain to dashboard subdomain (permanent redirect)
  if (subdomain === 'www' && pathname === '/login') {
    const dashboardLoginUrl = new URL('/login', process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard.indexnow.studio')
    return NextResponse.redirect(dashboardLoginUrl, { status: 308 })
  }
  
  // Dashboard subdomain canonical URL cleanup: /dashboard/* → /*
  if (subdomain === 'dashboard' && pathname.startsWith('/dashboard')) {
    const canonicalUrl = new URL(request.url)
    canonicalUrl.pathname = pathname.replace('/dashboard', '') || '/'
    return NextResponse.redirect(canonicalUrl)
  }
  
  // Backend subdomain canonical URL cleanup: /backend/admin/* → /*
  if (subdomain === 'backend' && pathname.startsWith('/backend/admin')) {
    const canonicalUrl = new URL(request.url)
    canonicalUrl.pathname = pathname.replace('/backend/admin', '') || '/'
    return NextResponse.redirect(canonicalUrl)
  }
  
  // STEP 2: Handle authentication checks BEFORE rewrites (anti-loop pattern)
  const authPages = ['/login', '/register', '/auth/', '/resend-verification']
  const isDashboardAuthPage = subdomain === 'dashboard' && authPages.some(page => pathname.startsWith(page))
  const isBackendAuthPage = subdomain === 'backend' && authPages.some(page => pathname.startsWith(page))
  
  // Dashboard authentication protection
  if (subdomain === 'dashboard' && !isDashboardAuthPage) {
    const authResult = await checkUserAuthentication(request, '/dashboard')
    if (!authResult) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }
  
  // Backend admin authentication protection (requires super_admin role)
  if (subdomain === 'backend' && !isBackendAuthPage) {
    const authResult = await checkUserAuthentication(request, '/backend/admin')
    if (!authResult || !hasRequiredAccess(authResult.role, 'super_admin')) {
      // Redirect to /login on backend subdomain (will be rewritten to /backend/admin/login internally)
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }
  
  // STEP 3: Handle subdomain routing - compute effective path for internal rewrites
  const rewritePath = getSubdomainRewrite(subdomain, pathname)
  const effectivePath = rewritePath || pathname
  
  // BLOCK Sentry monitoring HEAD requests to /api endpoint
  if (request.method === 'HEAD' && pathname === '/api') {
    const userAgent = request.headers.get('user-agent')
    const hasSentryHeaders = request.headers.get('sentry-trace') || 
                             request.headers.get('baggage')?.includes('sentry-')
    
    // Block Sentry monitoring requests to prevent 404 spam
    if (userAgent === 'node' && hasSentryHeaders) {
      return setCORSHeaders(new NextResponse(null, { status: 204 }), origin, isAllowedOrigin, pathname)
    }
  }


  // Handle admin routes with dedicated middleware, except login page
  if (effectivePath.startsWith('/backend/admin') && effectivePath !== '/backend/admin/login') {
    const adminResponse = await adminMiddleware(request)
    // If admin middleware returns a response and we need to rewrite, preserve the response but rewrite URL
    if (rewritePath && adminResponse) {
      const url = request.nextUrl.clone()
      url.pathname = rewritePath
      const rewriteResponse = NextResponse.rewrite(url)
      // Copy headers from adminResponse to preserve auth effects
      adminResponse.headers.forEach((value, key) => {
        rewriteResponse.headers.set(key, value)
      })
      adminResponse.cookies.getAll().forEach(cookie => {
        rewriteResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      return setCORSHeaders(rewriteResponse, origin, isAllowedOrigin, pathname)
    }
    return setCORSHeaders(adminResponse, origin, isAllowedOrigin, pathname)
  }
  
  // Allow login page to bypass admin middleware completely
  if (effectivePath === '/backend/admin/login') {
    if (rewritePath) {
      const url = request.nextUrl.clone()
      url.pathname = rewritePath
      return setCORSHeaders(NextResponse.rewrite(url), origin, isAllowedOrigin, pathname)
    }
    return setCORSHeaders(NextResponse.next(), origin, isAllowedOrigin, pathname)
  }

  // Allow all public routes
  if (isPublicRoute(effectivePath)) {
    if (rewritePath) {
      const url = request.nextUrl.clone()
      url.pathname = rewritePath
      return setCORSHeaders(NextResponse.rewrite(url), origin, isAllowedOrigin, pathname)
    }
    return setCORSHeaders(NextResponse.next(), origin, isAllowedOrigin, pathname)
  }

  // Check if route requires protection
  const protection = getRequiredAuthLevel(effectivePath)
  if (!protection) {
    if (rewritePath) {
      const url = request.nextUrl.clone()
      url.pathname = rewritePath
      return setCORSHeaders(NextResponse.rewrite(url), origin, isAllowedOrigin, pathname)
    }
    return setCORSHeaders(NextResponse.next(), origin, isAllowedOrigin, pathname)
  }

  // Verify authentication for protected routes
  const authResult = await checkUserAuthentication(request, effectivePath)
  
  if (!authResult) {
    // No authentication - redirect to appropriate login
    const redirectUrl = new URL(protection.redirect, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Check if user has required access level
  if (!hasRequiredAccess(authResult.role, protection.authLevel)) {
    // Insufficient privileges - redirect to appropriate login
    const redirectUrl = new URL(protection.redirect, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // User is authenticated and has required access level
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // For dashboard routes, refresh session if needed
  if (effectivePath.startsWith('/dashboard')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // This will refresh session if expired
    await supabase.auth.getUser()
  }

  // Apply rewrite if needed while preserving all auth effects
  if (rewritePath) {
    const url = request.nextUrl.clone()
    url.pathname = rewritePath
    const rewriteResponse = NextResponse.rewrite(url)
    // Copy headers and cookies from original response
    response.headers.forEach((value, key) => {
      rewriteResponse.headers.set(key, value)
    })
    response.cookies.getAll().forEach(cookie => {
      rewriteResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    // Add enhanced CORS headers using dynamic system
    return setCORSHeaders(rewriteResponse, origin, isAllowedOrigin, pathname)
  }

  // Add enhanced CORS headers to regular response using dynamic system
  return setCORSHeaders(response, origin, isAllowedOrigin, pathname)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
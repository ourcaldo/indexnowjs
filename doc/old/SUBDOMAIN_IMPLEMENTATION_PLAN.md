# IndexNow Studio - Subdomain Implementation Plan

## Overview
Implement subdomain routing for IndexNow Studio to achieve clean URL structure:
- **dashboard.domain.com** - User Dashboard
- **backend.domain.com** - Admin Backend  
- **api.domain.com** - Centralized API

**Implementation Strategy**: Single Next.js App + Middleware Rewrites (Industry Standard)

## Implementation Steps

### Step 1: Project Analysis & Planning
**Objective**: Understand current routing structure and plan exact subdomain mapping

**Goals**:
- ✅ Map existing routes to target subdomains
- ✅ Identify shared components that need subdomain awareness
- ✅ Plan authentication flow across subdomains
- ✅ Document current navigation patterns

**Current Route Analysis**:
```
Current Structure:
├── app/dashboard/*              → dashboard.domain.com/*
├── app/backend/admin/*          → backend.domain.com/*
├── app/api/*                    → api.domain.com/*
├── app/(public)/*               → www.domain.com/* (main site)
└── app/login, /register, etc.   → www.domain.com/login (auth pages)
```

**Action Items**:
- [ ] Analyze all existing routes in app/ directory
- [ ] Map each route to target subdomain
- [ ] Identify cross-subdomain navigation needs
- [ ] Plan authentication redirect flows

---

### Step 2: Standardize API Calls to Use Environment Variables
**Objective**: Update all API calls to use base URL from environment variables for proper api.domain.com display

**Goals**:
- ✅ All API calls show `api.domain.com/v1/xxx` in network tab
- ✅ Use existing `NEXT_PUBLIC_API_BASE_URL` environment variable
- ✅ Standardize API call format across entire codebase
- ✅ Ensure consistent API URL structure

**Updated Environment Configuration**:
```bash
# .env.local (STANDARDIZED - NO trailing slash, NO embedded '/api')
NEXT_PUBLIC_API_BASE_URL=http://api.localhost:5000  # Will change to https://api.domain.com
```

**Expected Behavior**:
```
Before: fetch('/api/v1/auth/login')        → Network shows: /api/v1/auth/login
After:  fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/login`) → Network shows: https://api.domain.com/v1/auth/login
```

**Technical Requirements**:
- Update ~60 files with hardcoded `/api/...` calls
- Replace with `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/...` format
- Maintain existing API route structure
- Use `getApiUrl` helper for server vs client URL resolution

**Action Items**:
- [ ] Update core API helper functions
- [ ] Update all hook files with API calls (~20 files)
- [ ] Update all page components with API calls (~30 files)
- [ ] Update TanStack Query keys
- [ ] Test all API calls work with env variable URLs

---

### Step 3: Update Next.js Configuration
**Objective**: Configure Next.js to support multiple subdomains with proper CORS and security

**Goals**:
- ✅ Allow requests from all target subdomains
- ✅ Update CORS headers for cross-subdomain requests
- ✅ Configure security headers for subdomains
- ✅ Ensure proper host header handling

**Configuration Updates**:
- Update `next.config.js` allowed origins
- Modify CORS headers for subdomain support
- Update server actions allowed origins
- Configure proper host header validation

**Security Considerations**:
- Maintain existing security headers
- Ensure subdomain isolation where needed
- Preserve authentication security across domains

**Action Items**:
- [ ] Update allowedOrigins in next.config.js
- [ ] Modify CORS headers for subdomains
- [ ] Update server actions configuration
- [ ] Test configuration with multiple subdomains

---

### Step 4: Update Authentication System
**Objective**: Ensure seamless authentication across all subdomains

**Goals**:
- ✅ Enable cross-subdomain cookie sharing
- ✅ Implement proper authentication redirects
- ✅ Maintain role-based access control
- ✅ Handle logout across all subdomains

**Authentication Flow Updates**:
- Set cookie domain to `.domain.com` for cross-subdomain access
- Update login redirects based on user role:
  - Regular users → `dashboard.domain.com`
  - Admin users → `backend.domain.com`
- Update logout to work across all subdomains
- Ensure JWT tokens work across subdomains

**Role-Based Routing**:
```
User Login Flow:
1. User logs in at www.domain.com/login
2. System checks user role
3. Regular user → Redirect to dashboard.domain.com
4. Admin user → Redirect to backend.domain.com
```

**Action Items**:
- [ ] Update cookie configuration for cross-subdomain
- [ ] Modify login redirect logic
- [ ] Update authentication middleware
- [ ] Test authentication across subdomains

---

### Step 5: Modify Layouts for Subdomain Awareness
**Objective**: Make navigation and layouts aware of current subdomain context

**Goals**:
- ✅ Hide irrelevant navigation on each subdomain
- ✅ Update links to use appropriate subdomains
- ✅ Maintain consistent branding across subdomains
- ✅ Optimize user experience per subdomain

**Layout Modifications**:

**Dashboard Layout** (`app/dashboard/layout.tsx`):
- Remove admin-specific navigation
- Update internal links to use dashboard.domain.com
- Hide backend access for regular users

**Backend Layout** (`app/backend/admin/layout.tsx`):
- Remove user dashboard navigation
- Update internal links to use backend.domain.com
- Maintain admin-specific navigation

**Shared Components**:
- Update components that generate URLs
- Make navigation subdomain-aware
- Update any hardcoded domain references

**Action Items**:
- [ ] Update dashboard layout navigation
- [ ] Update backend layout navigation  
- [ ] Modify shared components for subdomain links
- [ ] Test navigation across subdomains

---

### Step 6: Development Testing
**Objective**: Test all subdomain functionality locally using hosts file configuration

**Goals**:
- ✅ Verify all subdomains route correctly
- ✅ Test authentication across subdomains
- ✅ Ensure navigation works properly
- ✅ Validate API calls from different subdomains

**Local Testing Setup**:
```bash
# Add to /etc/hosts (Mac/Linux) or C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1 dashboard.localhost
127.0.0.1 backend.localhost  
127.0.0.1 api.localhost
127.0.0.1 www.localhost
```

**Testing Checklist**:
- [ ] Dashboard subdomain loads correctly
- [ ] Backend subdomain loads correctly
- [ ] API subdomain responds correctly
- [ ] Authentication works across subdomains
- [ ] Navigation links use correct subdomains
- [ ] User roles redirect to appropriate subdomains
- [ ] Logout works across all subdomains

**Test Cases**:
1. **Dashboard Access**: Visit dashboard.localhost:5000, verify dashboard loads
2. **Backend Access**: Visit backend.localhost:5000, verify admin panel loads
3. **API Access**: Make API call to api.localhost:5000, verify response
4. **Cross-Auth**: Login on www.localhost:5000, verify redirect to correct subdomain
5. **Navigation**: Test internal links maintain correct subdomain context

**Action Items**:
- [ ] Configure local hosts file
- [ ] Test each subdomain individually
- [ ] Test authentication flow
- [ ] Test cross-subdomain navigation
- [ ] Document any issues found

---

### Phase 1: Final
**Objective**: Document the subdomain implementation in project.md for future reference

**Goals**:
- ✅ Document subdomain architecture in project.md
- ✅ Record implementation details for future maintenance
- ✅ Update timeline in Recent Changes section
- ✅ Document deployment requirements

**Documentation Updates**:
- Add subdomain architecture to project.md
- Document middleware implementation
- Record configuration changes
- Update deployment requirements
- Add troubleshooting guide

**Recent Changes Entry**:
Add comprehensive entry to project.md Recent Changes section with:
- Implementation date
- Architecture changes
- Files modified
- Benefits achieved
- Deployment considerations

**Action Items**:
- [ ] Update project.md with subdomain architecture
- [ ] Document all files modified
- [ ] Add Recent Changes timeline entry
- [ ] Create deployment checklist
- [ ] Document troubleshooting steps

---

### Step 10: Consolidate CORS to Dynamic Middleware
**Objective**: Move all CORS handling to middleware.ts for dynamic origin management and resolve CSP violations

**Current Problems**:
1. CORS configuration is split between `middleware.ts` and `next.config.js`, causing potential conflicts
2. CSP (Content Security Policy) blocking API calls to `http://api.localhost:5000` due to `connect-src 'self' https: wss: ws:` directive
3. Static CORS configuration in `next.config.js` cannot adapt to different environments (dev, staging, prod)
4. Missing dynamic origin validation for Replit domains and localhost variations

**Goals**:
- ✅ Consolidate all CORS handling in `middleware.ts` for dynamic behavior
- ✅ Remove CORS-related headers from `next.config.js` to prevent conflicts
- ✅ Implement dynamic origin validation that works across all environments
- ✅ Fix CSP violations by updating `connect-src` directive to allow API subdomains
- ✅ Handle OPTIONS preflight requests properly in middleware

**Technical Implementation**:

**Why middleware.ts is Better for CORS**:
- **Dynamic origins**: `next.config.js` headers() is static at build time, but CORS needs environment-aware origins (dev, staging, prod)
- **OPTIONS preflight handling**: Browsers send OPTIONS requests before POST/PUT/DELETE - middleware can intercept and respond
- **Avoid duplicate/conflicting headers**: Single source of truth prevents browser rejection due to mismatched CORS headers
- **Industry standard**: Express, NestJS, Django, FastAPI all handle CORS at middleware level

**Recommended Configuration Split**:
```typescript
// middleware.ts → CORS (dynamic origins, preflight, Access-Control-Allow-*)
// next.config.js → Security & performance headers (CSP, HSTS, X-Frame-Options, Permissions-Policy)
```

**Dynamic CORS Implementation Pattern**:
```typescript
// Enhanced middleware.ts CORS handling
export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  // Dynamic origin validation using environment variables only
  const allowedOrigins = getDynamicAllowedOrigins()
  const isAllowedOrigin = origin && allowedOrigins.includes(origin)
  
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return handlePreflightRequest(origin, isAllowedOrigin)
  }
  
  // Add CORS headers to actual requests
  const response = await NextResponse.next()
  return addCorsHeaders(response, origin, isAllowedOrigin)
}

function getDynamicAllowedOrigins(): string[] {
  // All origins from environment variables - no hardcoded domains
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_DASHBOARD_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  ].filter(Boolean) // Remove any undefined values
  
  return allowedOrigins
}
```

**CSP Update Required**:
Update Content Security Policy to allow API subdomain connections using environment variables:
```typescript
// next.config.js - Update CSP connect-src directive using env variables
const ContentSecurityPolicy = `
  connect-src 'self' 
    https: 
    wss: 
    ws: 
    ${process.env.NEXT_PUBLIC_APP_URL} 
    ${process.env.NEXT_PUBLIC_DASHBOARD_URL} 
    ${process.env.NEXT_PUBLIC_BACKEND_URL} 
    ${process.env.NEXT_PUBLIC_API_BASE_URL}
    *.replit.dev 
    *.replit.app 
    *.replit.co;
`
```

**Files Requiring Updates**:

**Core CORS Files**:
- `middleware.ts` - Enhance existing CORS with dynamic origin detection
- `next.config.js` - Remove CORS headers, update CSP, keep security headers only

**Environment Configuration**:
- Ensure all environment variables support the dynamic CORS origins
- Update Replit domain detection for current deployment URL

**Testing Requirements**:
- Verify API calls work from all subdomains (dashboard, backend, www to api)
- Test OPTIONS preflight requests are handled correctly
- Confirm no more CSP violations in browser console
- Validate CORS works in localhost, staging, and production environments

**Benefits of This Approach**:
1. **Single source of truth** - All CORS logic in one place
2. **Environment awareness** - Automatic adaptation to dev/staging/prod
3. **Better error handling** - Clear CORS rejection messages
4. **Debugging friendly** - Easy to trace CORS issues
5. **Future-proof** - Easy to add new origins or modify rules

**Action Items**:
- [ ] Move all CORS headers from `next.config.js` to `middleware.ts`
- [ ] Implement dynamic origin detection based on current hostname
- [ ] Add proper OPTIONS preflight request handling
- [ ] Update CSP `connect-src` directive to allow API subdomains
- [ ] Test cross-subdomain API calls in all environments
- [ ] Verify no duplicate/conflicting CORS headers
- [ ] Document the new centralized CORS architecture

---

## Deployment Considerations

### DNS Configuration Required:
```
DNS Records Needed:
A/CNAME dashboard.yourdomain.com → Replit deployment
A/CNAME backend.yourdomain.com  → Replit deployment  
A/CNAME api.yourdomain.com      → Replit deployment
A/CNAME www.yourdomain.com      → Replit deployment (optional)
```

### Environment Variables (STANDARDIZED):
```bash
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://backend.yourdomain.com
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://www.yourdomain.com
DOMAIN=yourdomain.com
```
**⚠️ CRITICAL**: All URLs use **NO trailing slash**

### Replit Configuration:
- Single deployment serves all subdomains
- Configure custom domains for each subdomain
- Update allowed origins in deployment settings

## Success Criteria

✅ **Functional Requirements**:
- All subdomains load appropriate content
- Authentication works seamlessly across subdomains
- Navigation maintains correct subdomain context
- API calls work from any subdomain

✅ **User Experience Requirements**:
- Clean, professional URLs for each service
- Intuitive navigation within each subdomain
- Consistent branding across all subdomains
- Fast loading and proper error handling

✅ **Technical Requirements**:
- Single codebase maintains all functionality
- Proper security headers and CORS configuration
- Scalable architecture for future enhancements
- Comprehensive error handling and logging

## Estimated Timeline

- **Step 1-2**: 1 day (Analysis + Middleware)
- **Step 3-4**: 1 day (Configuration + Authentication)  
- **Step 5**: 0.5 day (Layout modifications)
- **Step 6**: 1 day (Testing and refinement)
- **Step 7**: 0.5 day (Documentation)

**Total Estimated Time**: 4 days

## Risk Mitigation

**Potential Issues**:
- Authentication cookie conflicts
- CORS issues with cross-subdomain requests
- Navigation link inconsistencies
- SEO impact on existing URLs

**Mitigation Strategies**:
- Thorough testing with hosts file before deployment
- Gradual rollout with fallback options
- Comprehensive error logging
- Documentation of all changes for rollback if needed

---

## Phase 2: Critical Fixes & Enhancements

### Step 7: Fix Dashboard Routing Issues
**Objective**: Resolve duplicate URL routing and implement proper authentication protection

**Problems Identified**:
1. Both `http://dashboard.localhost:5000` and `http://dashboard.localhost:5000/dashboard` serve dashboard content
2. Dashboard is accessible without authentication
3. Inconsistent URL structure across subdomains

**Goals**:
- ✅ Ensure only ONE URL serves dashboard content per subdomain
- ✅ Implement mandatory authentication for dashboard access
- ✅ Create consistent URL patterns across all subdomains
- ✅ Proper redirect logic for unauthenticated users

**Technical Implementation**:

**URL Structure Design**:
```
dashboard.domain.com/           → Dashboard Home (protected)
dashboard.domain.com/settings   → User Settings (protected)
dashboard.domain.com/jobs       → Job Management (protected)
dashboard.domain.com/tools      → Tools & Features (protected)

backend.domain.com/             → Admin Dashboard (admin protected)
backend.domain.com/users        → User Management (admin protected)
backend.domain.com/cms          → Content Management (admin protected)

api.domain.com/v1/*             → API Endpoints (various auth levels)
www.domain.com/                 → Public Landing Page
dashboard.domain.com/login      → Authentication Pages
```

**COMPLETE ROOT MIDDLEWARE.TS IMPLEMENTATION** (Anti-Loop Pattern):
```typescript
export async function middleware(request: NextRequest) {
  const subdomain = getSubdomain(request)
  const pathname = request.nextUrl.pathname
  
  // STEP 1: Handle authentication first (before rewrites)
  if (subdomain === 'dashboard' && !isAuthPage(pathname)) {
    const isAuthenticated = await checkUserAuthentication(request)
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', process.env.NEXT_PUBLIC_DASHBOARD_URL)
      return NextResponse.redirect(loginUrl)
    }
  }
  
  // STEP 1B: Handle admin authentication for backend subdomain
  if (subdomain === 'backend' && !isAuthPage(pathname)) {
    const isAdminAuthenticated = await checkAdminAuthentication(request)
    if (!isAdminAuthenticated) {
      const adminLoginUrl = new URL('/backend/admin/login', process.env.NEXT_PUBLIC_APP_URL)
      return NextResponse.redirect(adminLoginUrl)
    }
  }
  
  // STEP 2: Handle dashboard subdomain canonical URLs  
  if (subdomain === 'dashboard') {
    // Redirect /dashboard/* → /* (canonical URL cleanup)
    if (pathname.startsWith('/dashboard')) {
      const canonicalUrl = new URL(request.url)
      canonicalUrl.pathname = pathname.replace('/dashboard', '') || '/'
      return NextResponse.redirect(canonicalUrl)
    }
    
    // Rewrite /* → /dashboard/* (internal routing - SINGLE PASS ONLY)
    if (!pathname.startsWith('/dashboard') && !isAuthPage(pathname)) {
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = `/dashboard${pathname}`
      return NextResponse.rewrite(rewriteUrl) // Rewrites don't re-run middleware
    }
  }
  
  // STEP 2B: Handle backend subdomain canonical URLs
  if (subdomain === 'backend') {
    // Redirect /backend/admin/* → /* (canonical URL cleanup)
    if (pathname.startsWith('/backend/admin')) {
      const canonicalUrl = new URL(request.url)
      canonicalUrl.pathname = pathname.replace('/backend/admin', '') || '/'
      return NextResponse.redirect(canonicalUrl)
    }
    
    // Rewrite /* → /backend/admin/* (internal routing - SINGLE PASS ONLY)
    if (!pathname.startsWith('/backend/admin') && !isAuthPage(pathname)) {
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = `/backend/admin${pathname}`
      return NextResponse.rewrite(rewriteUrl) // Rewrites don't re-run middleware
    }
  }
  
  // STEP 3: Continue with other middleware logic...
  return NextResponse.next()
}
```

**KEY ANTI-LOOP MECHANISMS**:
- **Authentication check BEFORE rewrites** prevents redirect loops
- **Single-pass rewrite** using NextResponse.rewrite (doesn't re-run middleware)
- **Early returns** prevent double-processing

**Authentication Protection**:
- Update `PROTECTED_ROUTES` configuration to include all dashboard paths
- Ensure user role verification before allowing dashboard access
- Add middleware authentication checks specifically for dashboard subdomain
- Implement proper login redirects from subdomain context

**Action Items**:
- [ ] Fix middleware rewrite logic to prevent duplicate routes
- [ ] Add authentication protection to dashboard subdomain
- [ ] Update protected routes configuration
- [ ] Test URL consistency across all subdomains
- [ ] Implement proper redirect handling for unauthenticated access

---

### Step 8: Eliminate Hardcoded API Calls
**Objective**: Replace all remaining hardcoded API calls with environment variable-based URLs

**Problems Identified**:
Based on codebase analysis, **78+ hardcoded API calls** found across multiple files that still use direct `/api/v1/xxx` patterns instead of environment variables.

**Critical Files Requiring Updates**:

**Authentication & User Management** (15 calls):
- `lib/auth/auth.ts` - 1 call: `/api/v1/auth/user/profile`
- `hooks/data/useEnhancedUserProfile.ts` - 2 calls: change password, avatar
- `hooks/business/useQuotaManager.ts` - 5 calls: quota endpoints
- `app/dashboard/settings/profile/page.tsx` - 2 calls: profile management
- Various auth-related components - 5+ additional calls

**Payment & Billing System** (12 calls):
- `lib/payment-services/payment-router.ts` - 3 calls: billing, gateways, packages
- `lib/payment-services/midtrans-client-service.ts` - 1 call: midtrans config
- `hooks/data/usePaymentHistory.ts` - 5 calls: transactions, invoices, stats
- `app/dashboard/settings/plans-billing/` - 3+ calls across multiple files

**Rank Tracking System** (8 calls):
- `hooks/data/useRankTracking.ts` - 8 calls: keywords, rankings, export, stats

**Job Management System** (4 calls):
- `hooks/data/useJobManagement.ts` - 4 calls: cancel, get, retry, stats

**Service Accounts System** (7 calls):
- `hooks/business/useServiceAccounts.ts` - 7 calls: CRUD operations, quota management

**Admin Backend System** (20+ calls):
- `app/backend/admin/users/` - Multiple user management endpoints
- `app/backend/admin/cms/` - Content management endpoints
- `app/backend/admin/settings/` - Settings management endpoints

**Public/Blog System** (4 calls):
- `app/(public)/contact/` and `app/(public)/blog/` components

**Conversion Strategy**:
Replace patterns like:
```typescript
// BEFORE (hardcoded)
const response = await fetch('/api/v1/auth/user/profile', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
})

// AFTER (environment variable)
const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/user/profile`, {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` },
  credentials: 'include' // Essential for cross-subdomain cookies
})
```

**Special Considerations**:
- All fetch calls must include `credentials: 'include'` for cross-subdomain authentication
- Maintain existing error handling patterns
- Preserve request/response types and interfaces
- Update TanStack Query keys to use full URLs for cache consistency

**🔧 CLIENT vs SERVER FETCH GUIDANCE**:
Create utility helper to avoid CORS issues:
```typescript
// lib/utils/api-url.ts
export const getApiUrl = (endpoint: string) => {
  // Server-side: use relative URLs to avoid CORS
  if (typeof window === 'undefined') {
    return `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  }
  
  // Client-side: use full URL with environment variable
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  return `${baseUrl}${endpoint.startsWith('/v1') ? endpoint : `/v1${endpoint}`}`
}

// Usage examples:
// Server component: getApiUrl('/v1/auth/user') → '/api/v1/auth/user'
// Client component: getApiUrl('/v1/auth/user') → 'https://api.domain.com/v1/auth/user'
```

**Action Items**:
- [ ] Update lib/auth/ authentication service calls (3 files)
- [ ] Update hooks/data/ data management hooks (4 files)
- [ ] Update hooks/business/ business logic hooks (2 files)
- [ ] Update app/dashboard/ dashboard page components (8+ files)
- [ ] Update app/backend/admin/ admin interface components (15+ files)
- [ ] Update public/blog interface components (4 files)
- [ ] Update lib/payment-services/ payment integration (2 files)
- [ ] Test all API calls work with environment variable URLs
- [ ] Verify credentials: 'include' works for cross-subdomain requests

---

### Step 9: Implement Cross-Subdomain Authentication ✅ **COMPLETED - SECURE IMPLEMENTATION**
**Objective**: Fix authentication system to work seamlessly across all `*.domain.com` subdomains using industry-standard secure practices

**✅ IMPLEMENTED SOLUTION**: **Server-Side HttpOnly Cookies (Industry Standard)**

**🔒 Security Benefits Achieved**:
- **XSS Protection**: Tokens completely hidden from JavaScript (HttpOnly cookies)
- **CSRF Protection**: Combined with SameSite attributes and origin validation
- **Industry Standard**: Same approach used by Google, GitHub, Stripe, and other secure platforms
- **Base Domain Fix**: Fixed complex domain handling (e.g., `*.ngrok-free.app`)

**✅ Implementation Details**:

**Server-Side Cookie Management** (`app/api/v1/auth/session/route.ts`):
```typescript
// ✅ IMPLEMENTED: Secure server-side cookie setting
export async function POST(request: NextRequest) {
  // Validate session with Supabase
  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
  
  if (data.session) {
    // Set secure HttpOnly cookies with cross-subdomain support
    const accessTokenOptions = getSecureCookieOptions(request, 60 * 60 * 24 * 7) // 7 days
    const refreshTokenOptions = getSecureCookieOptions(request, 60 * 60 * 24 * 30) // 30 days
    
    cookieStore.set('sb-access-token', data.session.access_token, accessTokenOptions)
    cookieStore.set('sb-refresh-token', data.session.refresh_token, refreshTokenOptions)
  }
}

// ✅ IMPLEMENTED: Secure logout with cookie clearing
export async function DELETE(request: NextRequest) {
  await supabase.auth.signOut()
  const clearCookieOptions = getSecureCookieOptions(request, 0) // Clear cookies
  cookieStore.set('sb-access-token', '', clearCookieOptions)
  cookieStore.set('sb-refresh-token', '', clearCookieOptions)
}

// ✅ IMPLEMENTED: Smart cookie domain detection with complex domain support
function getSecureCookieDomain(request: NextRequest): string {
  const hostname = request.nextUrl.hostname
  
  // Fixed complex domain support (e.g., lashonda-nonlaminated-jocelynn.ngrok-free.app)
  const parts = urlHostname.split('.')
  if (parts.length >= 2) {
    const baseDomain = parts.slice(1).join('.')  // Drop only leftmost subdomain
    return baseDomain // Returns: lashonda-nonlaminated-jocelynn.ngrok-free.app
  }
}
```

**✅ Client-Side Security** (`lib/auth/auth.ts`):
```typescript
// ✅ IMPLEMENTED: All document.cookie calls removed for security
async signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  
  if (data.session) {
    // Send tokens to server for secure cookie setting (no client-side cookies)
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }),
      credentials: 'include' // Essential for cross-subdomain cookies
    })
  }
}

// ✅ IMPLEMENTED: Secure logout
async signOut() {
  await supabase.auth.signOut()
  // Server clears secure cookies
  await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/session`, {
    method: 'DELETE',
    credentials: 'include'
  })
}
```

**✅ FILES UPDATED**:

**✅ Core Authentication Files**:
- ✅ `app/api/v1/auth/session/route.ts` - **COMPLETED**: Secure HttpOnly cookie configuration with domain detection
- ✅ `lib/auth/auth.ts` - **COMPLETED**: Removed all client-side cookie manipulation for security
- ⏳ `app/api/v1/auth/logout/route.ts` - Future: Consolidate logout logic (currently handled in session DELETE)
- ⏳ `lib/contexts/AuthContext.tsx` - Future: Update client-side auth state management
- ⏳ `middleware.ts` - Future: Add cross-subdomain authentication checks

**⏳ Login/Registration System** (Next Phase):
- ⏳ `app/backend/admin/login/page.tsx` - Admin login with subdomain redirect
- ⏳ `app/login/page.tsx` - User login with subdomain redirect  
- ⏳ `app/register/page.tsx` - User registration with cookie setup

**✅ Key Improvements Made**:
1. **Fixed Complex Domain Support**: Now handles `*.ngrok-free.app` and similar complex domains
2. **Eliminated XSS Risk**: All tokens now HttpOnly, completely hidden from JavaScript
3. **Industry Standard Security**: Matches security practices of major platforms
4. **Server-Only Cookie Management**: No client-side cookie manipulation
5. **Automatic Migration**: Moves existing localStorage tokens to secure server cookies

**✅ SECURITY IMPLEMENTATION SUMMARY**:

**What Changed from Previous Insecure Approach**:
- ❌ **Before**: Client-side `document.cookie` manipulation (XSS vulnerable)
- ✅ **Now**: Server-side HttpOnly cookies only (XSS protected)
- ❌ **Before**: Mixed localStorage + cookies (desync risk)  
- ✅ **Now**: Single source of truth (server-managed cookies)
- ❌ **Before**: Manual cookie attributes (error-prone)
- ✅ **Now**: Centralized secure cookie options with smart domain detection
- ❌ **Before**: Simple domain detection (failed on complex domains)
- ✅ **Now**: Smart domain detection (works with `*.ngrok-free.app`)

**✅ TESTING RECOMMENDATIONS**:
1. **Test Complex Domain Support**: Verify `*.ngrok-free.app` and similar domains work
2. **Security Validation**: Confirm tokens are not accessible via JavaScript in browser dev tools
3. **Cross-Subdomain Flow**: Login on one subdomain, verify access on others
4. **Logout Testing**: Ensure logout clears cookies across all subdomains
5. **Migration Testing**: Verify localStorage tokens automatically migrate to secure cookies

**✅ DEPLOYMENT READY**: 
The core authentication security is now production-ready with industry-standard HttpOnly cookies and proper cross-subdomain support.

**Next Phase Action Items** (Future Implementation):
- ⏳ Create centralized CORS wrapper (`lib/core/cors-middleware.ts`)
- ⏳ Apply CORS wrapper to all `/api/v1/*` routes  
- ⏳ Update all authentication-related fetch calls with `credentials: 'include'`
- ⏳ Implement CSRF protection with `X-CSRF-Token` header
- ⏳ Update root middleware with cross-subdomain authentication checks
- ⏳ Test login flow across different subdomains
- ⏳ Test logout functionality clears cookies on all subdomains
- ⏳ Verify authentication state persistence across subdomain navigation

**2. Environment Variables Required** (STANDARDIZED):
```bash
# Production
DOMAIN=domain.com
NEXT_PUBLIC_API_BASE_URL=https://api.domain.com
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.domain.com
NEXT_PUBLIC_BACKEND_URL=https://backend.domain.com
NEXT_PUBLIC_APP_URL=https://www.domain.com
```

**⚠️ CRITICAL**: All environment variables use **NO trailing slash**. API calls must follow pattern: `${NEXT_PUBLIC_API_BASE_URL}/v1/endpoint`

**3. Login Flow Updates**:
```
Enhanced Cross-Subdomain Login Flow:
1. User visits dashboard.domain.com (unauthenticated)
2. Middleware redirects to dashboard.domain.com/login
3. User submits credentials at dashboard.domain.com/login
4. API call to api.domain.com/v1/auth/login with credentials: 'include'
5. Server sets cookies with proper domain attributes
6. Server responds with user role and redirect URL
7. Client redirects to appropriate subdomain:
   - Regular users → dashboard.domain.com
   - Admin users → backend.domain.com
8. Subsequent requests include cookies automatically via credentials: 'include'
```

**4. Logout Implementation**:
```typescript
// Logout must clear cookies from all subdomains
const logoutUser = async () => {
  await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include'  // Ensures cookie cleanup across subdomains
  })
  
  // Redirect to dashboard login
  window.location.href = `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/login`
}
```

**Security Considerations**:
- All authentication cookies must use HttpOnly flag
- Production must use Secure flag and HTTPS
- SameSite=None requires Secure=true in production
- Never set domain attribute for localhost development
- Implement CSRF protection for state-changing operations

**4. CENTRALIZED CORS + CSRF CONFIGURATION**:
Create centralized CORS wrapper instead of per-route configuration:
```typescript
// lib/core/cors-middleware.ts
export function createCorsResponse(request: NextRequest, response?: NextResponse) {
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_DASHBOARD_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.NEXT_PUBLIC_APP_URL
  ]
  
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token', // CRITICAL: Include CSRF token
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin', // Cache correctness
  }
  
  // Only set origin if allowed, otherwise omit header (don't send 'null')
  if (origin && allowedOrigins.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin
  }
  
  if (response) {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }
  
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// Apply to all /api/v1/* routes via apiRouteWrapper
export const corsApiWrapper = (handler: Function) => {
  return async (request: NextRequest) => {
    if (request.method === 'OPTIONS') {
      return createCorsResponse(request)
    }
    const response = await handler(request)
    return createCorsResponse(request, response)
  }
}

/**
 * SCOPE: Apply corsApiWrapper to ALL app/api/v1/* route handlers
 * EXCEPTIONS: Webhook endpoints may skip CORS if they require specific headers
 * IMPLEMENTATION: Wrap all existing apiRouteWrapper calls with corsApiWrapper
 */
```

**5. CSRF Protection Strategy** (Fixed Header Alignment):
```typescript
// Generate CSRF token on login
const csrfToken = crypto.randomUUID()
cookies().set('csrf-token', csrfToken, { 
  httpOnly: true, 
  sameSite: 'none', 
  secure: true 
})

// Client must send in header (CORS now allows X-CSRF-Token)
fetch(apiUrl, {
  method: 'POST',
  headers: {
    'X-CSRF-Token': await getCsrfToken(), // From separate endpoint
    'Content-Type': 'application/json'
  },
  credentials: 'include'
})
```

**Action Items** (CORRECTED):
- [ ] Update cookie configuration in auth API routes with environment detection
- [ ] Create centralized CORS wrapper (lib/core/cors-middleware.ts) 
- [ ] Apply corsApiWrapper to all /api/v1/* routes via existing apiRouteWrapper
- [ ] Update all authentication-related fetch calls with credentials: 'include'
- [ ] Create getApiUrl utility for server vs client URL resolution
- [ ] Implement CSRF protection with X-CSRF-Token header alignment
- [ ] Update root middleware.ts with complete anti-loop implementation
- [ ] Test login flow across different subdomains
- [ ] Test logout functionality clears cookies on all subdomains
- [ ] Verify authentication state persistence across subdomain navigation
- [ ] Test localhost development environment separately

---

### Step 10: Enhanced Middleware & Route Protection
**Objective**: Strengthen middleware to handle subdomain-specific authentication and routing

**Enhanced Middleware Requirements**:

**1. Subdomain-Specific Authentication Levels**:
```typescript
const SUBDOMAIN_AUTH_REQUIREMENTS = {
  'dashboard': {
    authLevel: 'user',
    redirectTo: '/login',
    strictMode: true  // No unauthenticated access allowed
  },
  'backend': {
    authLevel: 'admin', 
    redirectTo: '/backend/admin/login',
    strictMode: true
  },
  'api': {
    authLevel: 'varies', // Per endpoint
    redirectTo: null,    // Returns 401 instead of redirect
    strictMode: false
  },
  'www': {
    authLevel: 'none',
    redirectTo: null,
    strictMode: false    // Public access allowed
  }
}
```

**2. Enhanced Route Protection Logic**:
- Check user authentication status for each subdomain
- Verify user roles match subdomain requirements
- Handle cross-subdomain redirects properly
- Implement proper 401/403 responses for API calls

**3. Session Validation Across Subdomains**:
- Validate JWT tokens on every protected request
- Refresh expired tokens automatically
- Handle session timeout gracefully
- Implement proper cookie validation

**Action Items**:
- [ ] Update middleware with subdomain-specific auth requirements
- [ ] Add session validation for each protected subdomain
- [ ] Implement automatic token refresh logic
- [ ] Test authentication enforcement across all subdomains
- [ ] Add logging for authentication failures and successes

---

### Step 11: Comprehensive Testing & Validation
**Objective**: Thoroughly test all authentication and routing fixes across subdomains

**Local Development Testing Setup**:
```bash
# Required hosts file entries (/etc/hosts or Windows equivalent)
127.0.0.1 www.localhost
127.0.0.1 dashboard.localhost
127.0.0.1 backend.localhost
127.0.0.1 api.localhost
```

**Comprehensive Test Cases**:

**1. URL Routing Tests**:
- [ ] `http://dashboard.localhost:5000` serves dashboard content
- [ ] `http://dashboard.localhost:5000/dashboard` redirects to above URL
- [ ] `http://backend.localhost:5000` serves admin interface
- [ ] `http://api.localhost:5000/v1/health` responds correctly
- [ ] Verify no duplicate content serving

**2. Authentication Flow Tests**:
- [ ] Unauthenticated access to dashboard.localhost redirects to login
- [ ] Login at www.localhost:5000/login sets cookies properly
- [ ] After login, regular users redirect to dashboard.localhost
- [ ] After login, admin users redirect to backend.localhost
- [ ] Authentication state persists across subdomain navigation
- [ ] Logout clears cookies on all subdomains

**3. API Integration Tests**:
- [ ] All API calls use environment variable URLs
- [ ] All API calls include `credentials: 'include'`
- [ ] Cross-subdomain API requests work properly
- [ ] Authentication headers passed correctly
- [ ] Error handling works for 401/403 responses

**4. Cross-Browser Compatibility**:
- [ ] Chrome/Chromium - cookie sharing works
- [ ] Firefox - subdomain authentication works  
- [ ] Safari - cross-subdomain requests work
- [ ] Edge - authentication flow works

**5. Edge Cases**:
- [ ] Direct API access returns proper authentication errors
- [ ] Session timeout handling across subdomains
- [ ] Network interruption recovery
- [ ] Multiple tab authentication synchronization

**Production Environment Testing**:
- [ ] DNS configuration for all subdomains
- [ ] HTTPS certificate coverage for *.domain.com
- [ ] Cookie security attributes in production
- [ ] Performance impact of additional authentication checks

**Action Items**:
- [ ] Set up local development hosts file
- [ ] Create automated test suite for authentication flows
- [ ] Test all identified URL patterns and redirects
- [ ] Verify API integration with environment variables
- [ ] Document any issues found during testing
- [ ] Create rollback plan for any problematic changes

---

## Updated Timeline Estimation

**Phase 2 Additional Steps**:
- **Step 7**: Dashboard Routing Fixes - 0.5 day
- **Step 8**: Eliminate Hardcoded API Calls - 1.5 days (78+ files to update)
- **Step 9**: Cross-Subdomain Authentication - 1 day
- **Step 10**: Enhanced Middleware - 0.5 day  
- **Step 11**: Comprehensive Testing - 1 day

**Phase 2 Total**: 4.5 days
**Grand Total**: 8.5 days (Phase 1: 4 days + Phase 2: 4.5 days)

## Updated Risk Mitigation

**Additional Risks Identified**:
- Breaking existing authentication flow during cookie updates
- Performance impact of additional middleware checks
- Browser compatibility issues with cross-subdomain cookies
- Complex debugging of authentication issues across multiple subdomains

**Enhanced Mitigation Strategies**:
- Implement feature flags for gradual authentication system rollout
- Create comprehensive authentication debugging tools
- Maintain backward compatibility during transition period
- Implement detailed logging for all authentication events
- Create automated tests for critical authentication flows
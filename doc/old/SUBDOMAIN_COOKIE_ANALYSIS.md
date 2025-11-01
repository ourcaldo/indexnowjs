# Subdomain Cookie Authentication Analysis & Fix Plan

## Issue Summary
After implementing subdomain architecture, users can login successfully (no 502 error) and session cookie is created, but users get redirected back to login page instead of accessing dashboard content.

## Debug Output Analysis
```
🔍 DEBUG: hostname = localhost
🔍 DEBUG: envUrls = [
  'https://dashboard.indexnow.studio',
  'https://backend.indexnow.studio', 
  'https://api.indexnow.studio'
]
🔍 DEBUG: hostname.includes(indexnow.studio) = false
❌ DEBUG: No matching domain found, returning empty string
```

## Root Cause Analysis

### 1. **Hostname Mismatch Issue**
- **Problem**: Request hostname is `localhost` but environment variables are production domains (`indexnow.studio`)
- **Effect**: Domain detection fails, cookies set without cross-subdomain support
- **Evidence**: `hostname.includes(indexnow.studio) = false` because `localhost` ≠ `indexnow.studio`

### 2. **Cookie Name Change**
- **Problem**: Supabase SSR now creates `sb-base-auth-token` instead of separate `sb-access-token` + `sb-refresh-token`
- **Evidence**: Browser shows only `sb-base-auth-token` cookie created
- **Impact**: Authentication middleware/components likely looking for old cookie names

### 3. **Cookie Domain Setting**
- **Problem**: Cookie domain being set to `api.indexnow.studio` instead of `.indexnow.studio`
- **Effect**: Cookie only available on API subdomain, not dashboard/backend subdomains
- **Evidence**: Browser dev tools show Domain column = `api.indexnow.studio`

### 4. **Authentication Flow Mismatch**
- **Problem**: Authentication components expect old cookie structure
- **Effect**: Dashboard doesn't recognize valid session, redirects to login

## Environment Variables Confirmed
```
NEXT_PUBLIC_BASE_URL=https://indexnow.studio
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.indexnow.studio
NEXT_PUBLIC_BACKEND_URL=https://backend.indexnow.studio
NEXT_PUBLIC_API_BASE_URL=https://api.indexnow.studio
```

## Cookie Expected vs Actual

### Expected (Original):
- `sb-access-token` with domain `.indexnow.studio`
- `sb-refresh-token` with domain `.indexnow.studio`

### Actual (Current):
- `sb-base-auth-token` with domain `api.indexnow.studio`

## Fix Plan

### Phase 1: Fix Domain Detection Logic
1. **Handle Local Development**: Allow both localhost testing and production domain matching
2. **Fix Domain Extraction**: Extract base domain correctly from environment URLs
3. **Set Proper Cookie Domain**: Ensure cookies use `.indexnow.studio` for cross-subdomain access

### Phase 2: Update Authentication Components
1. **Find Cookie Reading Logic**: Locate where authentication state is checked
2. **Update Cookie Names**: Change from `sb-access-token`/`sb-refresh-token` to `sb-base-auth-token`
3. **Test Cross-Subdomain Access**: Verify cookies work across all subdomains

### Phase 3: Clean Up & Test
1. **Remove Debug Logging**: Clean up console.log statements
2. **Test Full Flow**: Login → Dashboard → Backend → API access
3. **Verify Cookie Behavior**: Confirm proper domain, httpOnly, secure attributes

## Implementation Strategy

### 1. Immediate Fix: Domain Detection
```typescript
function getBaseDomain(request: NextRequest): string {
  const hostname = request.nextUrl.hostname
  
  // Always return indexnow.studio for this project regardless of hostname
  // This handles both localhost development and production
  return 'indexnow.studio'
}
```

### 2. Cookie Setting Fix
```typescript
setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => {
    const cookieOptions = {
      ...options,
      domain: '.indexnow.studio' // Force cross-subdomain
    }
    cookieStore.set(name, value, cookieOptions)
  })
}
```

### 3. Authentication Component Updates
- Search for `sb-access-token` usage
- Replace with `sb-base-auth-token`
- Update session validation logic

## Expected Outcome
After fixes:
1. ✅ Login sets `sb-base-auth-token` with domain `.indexnow.studio`
2. ✅ Cookie accessible on `dashboard.indexnow.studio`
3. ✅ Dashboard recognizes authentication state
4. ✅ No redirect loop to login page
5. ✅ Seamless cross-subdomain authentication

## Files to Modify
1. `app/api/v1/auth/session/route.ts` - Cookie domain logic
2. Authentication middleware/components - Cookie name references
3. Any client-side session checking code

## Testing Checklist
- [ ] Login creates proper cross-subdomain cookie
- [ ] Dashboard loads without login redirect
- [ ] Backend admin panel accessible
- [ ] API calls include authentication
- [ ] Logout clears cookies from all subdomains
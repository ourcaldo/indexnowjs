# API Centralization Plan

## Objective
Centralize all API endpoint calls to use environment variables through the ApiEndpoints.ts file instead of direct `process.env.NEXT_PUBLIC_API_BASE_URL` usage or hardcoded `/api/` paths.

## Current State Analysis

### Files Using Direct `process.env.NEXT_PUBLIC_API_BASE_URL`:
- **Configuration & Utils**: next.config.js, middleware.ts, lib/utils/site-settings.ts, lib/utils/api-url.ts, lib/core/queryClient.ts, lib/core/api/ApiClient.ts, lib/auth/auth.ts
- **Hooks**: useUserProfile.ts, usePublicSettings.ts, usePaymentProcessor.ts, useKeywordUsage.ts, useGlobalQuotaManager.ts, useDashboardData.ts, useActivityLogger.ts, useTrialManager.ts, useServiceAccounts.ts, useQuotaManager.ts, usePricingData.ts, usePaymentHistory.ts, usePageData.ts
- **Pages & Components**: Multiple dashboard pages, admin pages, public pages, components

### Files Using Direct `/api/` paths:
- hooks/useSocketIO.ts, components/checkout/PaymentErrorBoundary.tsx, lib/payment-services/recurring-billing-job.ts, app/api/v1/rank-tracking/keywords/route.ts, app/api/midtrans/webhook/route.ts, app/api/v1/admin/settings/site/route.ts

## Implementation Plan

### Phase 1: Audit ApiEndpoints.ts
- [x] Review current ApiEndpoints.ts structure
- [ ] Identify missing endpoints that are used directly in the codebase
- [ ] Add any missing endpoints to ApiEndpoints.ts

### Phase 2: Update Core Infrastructure
- [ ] Ensure ApiClient.ts uses centralized endpoints
- [ ] Update lib/utils/api-url.ts to work with centralized approach
- [ ] Review and update middleware.ts if needed

### Phase 3: Replace Direct API Calls
- [ ] **Hooks** (19 files): Replace all direct env usage with imports from ApiEndpoints.ts
- [ ] **Dashboard Pages** (15+ files): Update all dashboard-related API calls
- [ ] **Admin Pages** (15+ files): Update all admin panel API calls
- [ ] **Public Pages** (5+ files): Update blog, contact, and other public API calls
- [ ] **Components** (5+ files): Update trial, checkout, and other component API calls

### Phase 4: Fix Direct `/api/` Usage
- [ ] useSocketIO.ts: Replace `/api/` with environment variable
- [ ] PaymentErrorBoundary.tsx: Replace `/api/` with environment variable  
- [ ] recurring-billing-job.ts: Replace `/api/` with environment variable
- [ ] API routes: Update server-side routes to use consistent approach

### Phase 5: Testing & Validation
- [ ] Test all API endpoints are working
- [ ] Verify environment switching works correctly
- [ ] Test both client-side and server-side calls
- [ ] Validate WebSocket connections
- [ ] Test payment flows

## Key Patterns to Implement

### Before (Direct Usage):
```typescript
fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/rank-tracking/countries`)
fetch('/api/v1/auth/session')
```

### After (Centralized):
```typescript
import { RANK_TRACKING_ENDPOINTS, AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
fetch(RANK_TRACKING_ENDPOINTS.COUNTRIES)
fetch(AUTH_ENDPOINTS.SESSION)
```

## Missing Endpoints to Add
Based on audit, these endpoints may need to be added to ApiEndpoints.ts:
- Contact form submission endpoints
- Blog/CMS public endpoints
- WebSocket specific endpoints
- Any payment-specific endpoints not covered
- User activity/profile specific endpoints

## Environment Variables Structure
Current expected structure:
```
NEXT_PUBLIC_BASE_URL=https://indexnow.studio
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.indexnow.studio
NEXT_PUBLIC_BACKEND_URL=https://backend.indexnow.studio
NEXT_PUBLIC_API_BASE_URL=https://api.indexnow.studio
```

## Success Criteria
- [ ] Zero direct `process.env.NEXT_PUBLIC_API_BASE_URL` usage in components/hooks/pages
- [ ] Zero hardcoded `/api/` paths in client-side code
- [ ] All API calls use centralized endpoints from ApiEndpoints.ts
- [ ] Environment switching works seamlessly
- [ ] No broken functionality

## Implementation Order
1. Add missing endpoints to ApiEndpoints.ts
2. Update hooks (highest impact, used across multiple components)
3. Update pages (dashboard, admin, public)
4. Update individual components
5. Fix server-side API routes
6. Test and validate all functionality
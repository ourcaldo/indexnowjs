# IndexNow Studio - Project Setup

## Recent Changes
- **[x] Oct 20, 2025**: Implemented Firecrawl Rank Tracking Enhancements - Rate Limiting, Country Mapping & URL Sanitization:
  - **Enhancement #1 - Rate Limiter**: Created FirecrawlRateLimiter service with sliding window algorithm (30 req/min limit, 28 effective with safety buffer)
    - Blocks until slot available (max 65s timeout) to prevent 429 errors
    - Tracks requests per API key in-memory with automatic cleanup
    - Integrated in RankTrackerService before all Firecrawl API calls
  - **Enhancement #2 - Country Converter**: Enhanced country code conversion to use comprehensive countries.ts mapping (250+ countries)
    - Replaced hardcoded ~50 country mapping with centralized utility
    - Bidirectional conversion: ISO2 ↔ Full country name
    - Graceful fallback returns code if country not found
  - **Enhancement #3 - URL Sanitization**: Implemented URL cleaning utility to remove query parameters before database storage
    - Strips `?` and `#` fragments from URLs for data consistency
    - Example: `https://cetta.id/en/?srsltid=ABC` → `https://cetta.id/en`
    - Integrated in RankTracker.storeRankResult() for both rank_history and rankings tables
  - **Impact**: Eliminates 429 rate limit errors, supports all countries, ensures clean URL data in database
  - **Files**: Created lib/rank-tracking/firecrawl-rate-limiter.ts, lib/utils/country-converter.ts, lib/utils/url-utils.ts, updated lib/rank-tracking/rank-tracker-service.ts and lib/rank-tracking/rank-tracker.ts
- **[x] Oct 20, 2025**: Fixed device/country selectors not rendering in desktop header (CRITICAL BUG FIX):
  - **Issue**: Device and Country selectors invisible on /indexnow/overview and /indexnow/rank-history pages in production
  - **Root Cause**: Pathname check in DashboardHeader.tsx looked for `/dashboard/indexnow/` prefix, but production URLs redirect to `/indexnow/*` (without /dashboard prefix)
  - **Fix**: Updated pathname check from `pathname?.startsWith('/dashboard/indexnow/')` to `pathname?.includes('/indexnow/overview') || pathname?.includes('/indexnow/rank-history')`
  - **Impact**: Selectors now render correctly on both local development and production environments
  - **Files**: components/DashboardHeader.tsx (line 59)
- **[x] Oct 20, 2025**: Enhanced dashboard UI/UX with improved header navigation and sidebar accordion animations:
  - **Created**: DeviceCountryFilterContext for centralized device/country filter state management (mirrors DomainContext pattern)
  - **Enhanced**: DashboardHeader with conditional device/country selectors on /indexnow/overview and /indexnow/rank-history pages (desktop only)
    - Display order: Device selector → Country selector → Add Keywords button
    - Selectors only appear on /indexnow/* routes in desktop view
  - **Updated**: Notification icon visibility - now shown only on main dashboard page (/), hidden on /indexnow/* pages (desktop only)
  - **Improved**: Overview and rank-history pages to use shared DeviceCountryFilterContext
    - Inline device/country filters hidden on desktop with lg:hidden class
    - Mobile/tablet layouts unchanged - selectors remain in page content
  - **Enhanced**: Sidebar quota accordion animation with smooth 300ms transitions
    - Arrow rotation: updated from 200ms to 300ms ease-in-out
    - Button container: added overflow-hidden with max-height and opacity transitions
    - Result: Smooth expand/collapse animation for upgrade button
  - **Impact**: Improved header consistency, cleaner desktop layout with centralized filters, smoother accordion interactions
  - **Files**: Created lib/contexts/DeviceCountryFilterContext.tsx, updated components/DashboardHeader.tsx, app/dashboard/layout.tsx, app/dashboard/indexnow/overview/page.tsx, app/dashboard/indexnow/rank-history/page.tsx, components/Sidebar.tsx
- **[x] Oct 16, 2025**: Removed all WebSocket/Socket.IO functionality:
  - **Removed**: Complete WebSocket infrastructure (Socket.IO server, client hooks, providers)
  - **Deleted**: 9 files including useSocketIO, useGlobalWebSocket, useFastIndexingWebSocket, SocketIOBroadcaster
  - **Updated**: 15+ files to remove WebSocket dependencies and broadcasting logic
  - **Simplified**: Server now uses standard Next.js HTTP server without Socket.IO
  - **Uninstalled**: socket.io, socket.io-client, ws packages (23 packages total)
  - **Impact**: No real-time features - application uses polling/refresh for updates
  - **Result**: Simplified architecture, reduced bundle size, better deployment compatibility
- **[x] Oct 11, 2025**: Fixed LSP TypeScript errors in backend admin pages:
  - **Issue**: Missing API endpoint constants causing TypeScript compilation errors in 3 files
  - **Root Cause**: Admin pages referenced PACKAGE_BY_ID, PAYMENT_GATEWAY_BY_ID, PAYMENT_GATEWAY_DEFAULT, CMS_POST_BY_ID, and CMS_POST_STATUS endpoints that didn't exist in ADMIN_ENDPOINTS
  - **Fixed**: Added 5 missing endpoint helpers to lib/core/constants/ApiEndpoints.ts:
    1. PACKAGE_BY_ID: (id) => `/admin/settings/packages/${id}`
    2. PAYMENT_GATEWAY_BY_ID: (id) => `/admin/settings/payments/${id}`
    3. PAYMENT_GATEWAY_DEFAULT: (id) => `/admin/settings/payments/${id}/default`
    4. CMS_POST_BY_ID: (id) => `/admin/cms/posts/${id}`
    5. CMS_POST_STATUS: (id) => `/admin/cms/posts/${id}/status`
  - **Fixed**: pricing_tiers initialization issue in packages page (line 149: removed empty object default, line 220: added type casting)
  - **Result**: Zero LSP errors - clean TypeScript compilation across all backend admin pages
- **[x] Oct 11, 2025** (VERIFIED): Fixed ALL API response format mismatches in backend/admin dashboard after implementing secureWrapper and global error handling:
  - **Verification Complete**: All 11 files confirmed to correctly access wrapped API responses using `data.data?.XXX` pattern
  - **Status**: Production-ready - no undefined errors or data access issues
- **[x] Oct 11, 2025**: Fixed ALL API response format mismatches in backend/admin dashboard after implementing secureWrapper and global error handling:
  - **Root Cause**: APIs now return standardized `{success: true, data: T, timestamp: string}` format via formatSuccess() wrapper
  - **Impact**: Frontend components were accessing `data.stats` instead of `data.data.stats` causing undefined errors
  - **Fixed 11 files** with systematic data access updates using optional chaining:
    1. Dashboard page: `data.stats` → `data.data?.stats`
    2. Users page: `data.users` → `data.data?.users`
    3. Packages Settings: `data.packages` → `data.data?.packages`
    4. Payments Settings: `data.gateways` → `data.data?.gateways`
    5. Site Settings: `data.settings` → `data.data?.settings`
    6. Activity page: `data.logs` → `data.data?.logs`, `data.pagination` → `data.data?.pagination`
    7. Orders page: `setOrdersData(data)` → `setOrdersData(data.data)`
    8. SystemIntegration component: 3 API calls fixed for serviceAccounts, quotaUsage, apiStats
    9. useUserData hook: 4 API calls fixed for user, activityLogs, securityData, availablePackages
    10. CMS Posts page: `data.posts` → `data.data?.posts`
    11. CMS Edit Post page: `data.post` → `data.data?.post`
  - **Result**: All backend/admin pages now correctly access wrapped API responses, eliminating undefined errors
- **[x] Oct 10, 2025** (FINAL FIX): Resolved toLocaleString error after 4 attempts with comprehensive root cause analysis:
  - **Root Cause 1**: Double-nesting inconsistency - `allDomainKeywordsData` default return was `{ data: { data: [] } }` instead of `{ data: [], pagination: {...} }`
  - **Root Cause 2**: Missing type-safety check - `pagination.total` could be undefined even with fallback object
  - **Fix 1**: Corrected default return structure (line 169) to match expected single-nested format
  - **Fix 2**: Added type-safe check `typeof pagination?.total === 'number' ? pagination.total : 0` (line 333)
  - **Result**: Triple-layer defense (data structure + type check + component formatters) prevents undefined from reaching toLocaleString
- **[x] Oct 10, 2025**: Fixed 3 critical bugs with deep dive analysis (toLocaleString error, login redirect, billing data):
  - **Overview toLocaleString error** (DEEP DIVE): Root cause was data structure mismatch - frontend expected double-nested data but API unwraps to single level
    - Fixed data access: `keywordsData?.data?.data` → `keywordsData?.data` and `keywordsData?.data?.pagination` → `keywordsData?.pagination`
    - Added formatNumber() in RankOverviewStats to defensively handle undefined values before toLocaleString
    - Triple-layer defense: correct data access + component formatter + StatCard formatValue guard
  - **Login redirect glitch**: Fixed with isCheckingAuth state + router.replace() to prevent login form flash for authenticated users
  - **Billing empty data**: Fixed API response unwrapping in 3 loaders to properly extract from { success: true, data: {...} } format

## Overview
IndexNow Studio is a Next.js application designed for SEO rank tracking and seamless integration with the IndexNow API. Its primary purpose is to provide businesses with a robust platform for monitoring their search engine rankings, managing content, and accelerating content indexing through IndexNow. The project aims to offer a comprehensive solution for SEO professionals and content creators, enhancing visibility and driving organic traffic.

## User Preferences
I prefer iterative development with clear, concise explanations at each step. Please ask for confirmation before implementing significant changes or architectural decisions. I value code readability and maintainability, preferring well-structured and documented solutions. Ensure that any changes maintain backward compatibility where possible and adhere to established coding standards.

## System Architecture
The application is built on **Next.js 15.5.0 with Turbopack** for optimized performance. **Supabase** serves as the backend, handling database operations, user authentication via JWT, and real-time subscriptions. Styling is managed with **Tailwind CSS** complemented by **Radix UI components** for a modern and accessible interface. Content editing utilizes **Tiptap** for rich text capabilities, while **TanStack Query** manages state. The UI/UX emphasizes a professional, modern, card-based layout using Shadcn/ui components, semantic color systems with CSS variables, and responsive design for mobile-first access. Technical implementations include comprehensive server-side and client-side analytics integration with multiple providers, robust error handling via Sentry, and a unified analytics API.

Core features include:
- **CMS**: For managing pages, posts, and categories.
- **Authentication & Authorization**: Secure user access and roles.
- **Admin Dashboard**: For user, order, and overall system management.
- **SEO Rank Tracking**: Monitoring keyword positions with historical data and trend indicators.
- **IndexNow API Integration**: For rapid content indexing.
- **Billing & Subscription Management**: Integrated with Midtrans.
- **Analytics**: Multi-provider integration (GA4, GTM, Sentry, Posthog, Customer.io) with environment-based activation and cross-subdomain support, including comprehensive server-side error tracking.

## External Dependencies
- **Supabase**: Database, Authentication, Real-time services.
- **Midtrans**: Payment gateway for billing and subscriptions.
- **IndexNow API**: For search engine indexing.
- **Google Analytics 4 (GA4)**: Web analytics.
- **Google Tag Manager (GTM)**: Tag management.
- **Sentry**: Error tracking and performance monitoring.
- **Posthog**: Product analytics.
- **Customer.io**: Customer engagement platform.
- **IP-API**: Fallback for GeoIP services.
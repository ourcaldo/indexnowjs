# IndexNow Studio - Project Setup

## Recent Changes
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
- **Real-time Features**: Enabled via WebSocket connections.
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
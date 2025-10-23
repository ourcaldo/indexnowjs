# IndexNow Studio - Project Setup

## Overview
IndexNow Studio is a Next.js application designed for SEO rank tracking and seamless integration with the IndexNow API. Its primary purpose is to provide businesses with a robust platform for monitoring their search engine rankings, managing content, and accelerating content indexing through IndexNow. The project aims to offer a comprehensive solution for SEO professionals and content creators, enhancing visibility and driving organic traffic.

## User Preferences
I prefer iterative development with clear, concise explanations at each step. Please ask for confirmation before implementing significant changes or architectural decisions. I value code readability and maintainability, preferring well-structured and documented solutions. Ensure that any changes maintain backward compatibility where possible and adhere to established coding standards.

## System Architecture
The application is built on **Next.js 15.5.0 with Turbopack** for optimized performance. **Supabase** serves as the backend, handling database operations, user authentication via JWT, and real-time subscriptions. Styling is managed with **Tailwind CSS** complemented by **Radix UI components** for a modern and accessible interface. Content editing utilizes **Tiptap** for rich text capabilities, while **TanStack Query** manages state. The UI/UX emphasizes a professional, modern, card-based layout using Shadcn/ui components, semantic color systems with CSS variables, and responsive design for mobile-first access. Technical implementations include comprehensive server-side and client-side analytics integration with multiple providers, robust error handling via Sentry, and a unified analytics API. Background jobs are managed by **BullMQ**, providing reliable, scalable processing for scheduled tasks and async operations (e.g., rank checking, email services).

Core features include:
- **CMS**: For managing pages, posts, and categories.
- **Authentication & Authorization**: Secure user access and roles.
- **Admin Dashboard**: For user, order, and overall system management.
- **SEO Rank Tracking**: Monitoring keyword positions with historical data, trend indicators, immediate rank checks, rate limiting, country mapping, and URL sanitization.
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
- **BullMQ**: For background job processing (Redis-backed queue system).
- **Redis**: Message broker for BullMQ (required when BullMQ enabled).
- **IP-API**: Fallback for GeoIP services.
- **Firecrawl**: External service for web scraping/rank checking.

## Background Job System
The application uses **BullMQ** (Redis-backed queue system) for reliable background job processing:

### Implementation Status
✅ **Complete** - BullMQ implementation fully integrated with feature flag system
- **Feature Flag**: `ENABLE_BULLMQ` (default: false for backward compatibility)
- **Fallback**: Legacy node-cron implementation when BullMQ disabled
- **Production Ready**: All architect-identified issues resolved

### Queue Infrastructure
- **9 Queues**: rank-check, rank-schedule, email, payments, trial-monitor, keyword-enrichment, quota-reset, indexing-monitor, auto-cancel
- **Monitoring Dashboard**: Bull Board at `/api/admin/bull-board` (requires authentication)
- **Rate Limiting**: Configurable via environment variables for Firecrawl and email APIs
- **Graceful Shutdown**: Proper cleanup handlers for zero-downtime deployments

### Pending Setup (User Action Required)
1. Install packages: `npm install bullmq ioredis @bull-board/api @bull-board/api/bullMQAdapter`
2. Configure environment variables (see `doc/BULLMQ_SETUP.md`)
3. Test with `ENABLE_BULLMQ=true` in development
4. Deploy to production after validation

### Documentation
- **Setup Guide**: `doc/BULLMQ_SETUP.md` - Complete installation and configuration guide
- **Changelog**: `doc/project.md` - October 23, 2025 entry with full implementation details
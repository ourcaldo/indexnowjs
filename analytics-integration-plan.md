# Analytics Integration Plan - GetAnalytics.io
**IndexNow Studio - Pre-Production Analytics Integration**

## Table of Contents
1. [Overview](#overview)
2. [Environment Variables Configuration](#environment-variables-configuration)
3. [File Structure & Architecture](#file-structure--architecture)
4. [Implementation Steps](#implementation-steps)
5. [Subdomain Configuration](#subdomain-configuration)
6. [Testing Strategy](#testing-strategy)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This plan details the integration of **GetAnalytics.io** into IndexNow Studio to support multiple analytics providers across all subdomains with environment-based configuration.

### Analytics Providers to Integrate
1. **Google Analytics 4 (GA4)** - Web analytics and user behavior tracking
2. **Google Tag Manager (GTM)** - Tag management and marketing tools
3. **Sentry** - Error tracking and performance monitoring
4. **Posthog** - Product analytics and feature flags
5. **Customer.io** - Customer engagement and messaging

### Key Requirements
- ✅ Environment-based activation (only active when env vars are filled)
- ✅ Works across all subdomains (domain.com, dashboard.domain.com, backend.domain.com, api.domain.com)
- ✅ Well-refactored, modular code structure
- ✅ Production-ready implementation
- ✅ Type-safe TypeScript implementation
- ✅ No user-facing console.log statements
- ✅ Centralized configuration management

### Integration Approach

**GetAnalytics.io Official Plugins:**
- ✅ Google Analytics 4 → `@analytics/google-analytics`
- ✅ Google Tag Manager → `@analytics/google-tag-manager`
- ✅ Customer.io → `@analytics/customerio`

**Direct SDK Integration (No Official GetAnalytics.io Plugin):**
- ⚠️ Sentry → Use `@sentry/browser` and `@sentry/nextjs` alongside GetAnalytics.io
- ⚠️ Posthog → Use `posthog-js` alongside GetAnalytics.io

---

## Environment Variables Configuration

### 1. Add to `.env.local`

```bash
# ============================================
# ANALYTICS CONFIGURATION
# ============================================

# Google Analytics 4
# Get from: https://analytics.google.com/ → Admin → Data Streams → Measurement ID
NEXT_PUBLIC_GA4_MEASUREMENT_ID=

# Google Tag Manager
# Get from: https://tagmanager.google.com/ → Container ID (format: GTM-XXXXXXX)
NEXT_PUBLIC_GTM_CONTAINER_ID=

# Sentry Configuration
# Get from: https://sentry.io/ → Project Settings → Client Keys (DSN)
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_TRACE_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_ERROR_RATE=1.0
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=

# Posthog Configuration
# Get from: https://posthog.com/ → Project Settings → API Key
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Customer.io Configuration
# Get from: https://customer.io/ → Settings → API Credentials → Site ID
NEXT_PUBLIC_CUSTOMERIO_SITE_ID=

# Analytics Debug Mode (set to 'true' in development only)
NEXT_PUBLIC_ANALYTICS_DEBUG=false
```

### 2. Environment Variable Validation

Only activate analytics when environment variables are populated. If a variable is empty or missing, that specific analytics provider will be disabled.

---

## File Structure & Architecture

### Directory Structure

```
lib/
├── analytics/
│   ├── index.ts                      # Main analytics export
│   ├── types.ts                      # TypeScript types
│   ├── config.ts                     # Environment configuration
│   ├── analytics-client.ts           # GetAnalytics.io client initialization
│   ├── sentry-client.ts              # Sentry client initialization
│   ├── posthog-client.ts             # Posthog client initialization
│   ├── plugins/
│   │   ├── ga4-plugin.ts             # GA4 plugin configuration
│   │   ├── gtm-plugin.ts             # GTM plugin configuration
│   │   └── customerio-plugin.ts      # Customer.io plugin configuration
│   └── utils/
│       ├── logger.ts                 # Internal logging utility
│       └── validators.ts             # Config validation utilities
│
components/
├── providers/
│   └── AnalyticsProvider.tsx         # Client-side analytics provider
│
hooks/
└── useAnalytics.ts                   # Analytics React hook
```

---

## Implementation Steps

### Step 1: Install Required Dependencies

```bash
npm install analytics @analytics/google-analytics @analytics/google-tag-manager @analytics/customerio
npm install @sentry/nextjs posthog-js
```

### Step 2: Create Analytics Configuration (`lib/analytics/config.ts`)

```typescript
/**
 * Analytics Configuration
 * Environment-based configuration for all analytics providers
 */

export interface AnalyticsConfig {
  // GetAnalytics.io providers
  ga4: {
    enabled: boolean;
    measurementId?: string;
  };
  gtm: {
    enabled: boolean;
    containerId?: string;
  };
  customerio: {
    enabled: boolean;
    siteId?: string;
  };
  
  // Direct SDK providers
  sentry: {
    enabled: boolean;
    dsn?: string;
    environment: string;
    traceSampleRate: number;
    replaysSessionSampleRate: number;
    replaysOnErrorSampleRate: number;
  };
  posthog: {
    enabled: boolean;
    apiKey?: string;
    apiHost: string;
  };
  
  // Global settings
  debug: boolean;
}

/**
 * Get analytics configuration from environment variables
 * Only enables analytics when env vars are populated
 */
export function getAnalyticsConfig(): AnalyticsConfig {
  const ga4MeasurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const gtmContainerId = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID;
  const customerioSiteId = process.env.NEXT_PUBLIC_CUSTOMERIO_SITE_ID;
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const isDebug = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === 'true';

  return {
    ga4: {
      enabled: Boolean(ga4MeasurementId),
      measurementId: ga4MeasurementId,
    },
    gtm: {
      enabled: Boolean(gtmContainerId),
      containerId: gtmContainerId,
    },
    customerio: {
      enabled: Boolean(customerioSiteId),
      siteId: customerioSiteId,
    },
    sentry: {
      enabled: Boolean(sentryDsn),
      dsn: sentryDsn,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',
      traceSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACE_SAMPLE_RATE || '0.1'),
      replaysSessionSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_RATE || '0.1'),
      replaysOnErrorSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ERROR_RATE || '1.0'),
    },
    posthog: {
      enabled: Boolean(posthogKey),
      apiKey: posthogKey,
      apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    },
    debug: isDebug,
  };
}

/**
 * Get current subdomain for analytics context
 */
export function getSubdomainContext(): string {
  if (typeof window === 'undefined') return 'server';
  
  const hostname = window.location.hostname;
  
  if (hostname.includes('dashboard')) return 'dashboard';
  if (hostname.includes('backend')) return 'backend';
  if (hostname.includes('api')) return 'api';
  
  return 'www';
}
```

### Step 3: Create GetAnalytics.io Client (`lib/analytics/analytics-client.ts`)

```typescript
import Analytics from 'analytics';
import googleAnalytics from '@analytics/google-analytics';
import googleTagManager from '@analytics/google-tag-manager';
import customerio from '@analytics/customerio';
import { getAnalyticsConfig, getSubdomainContext } from './config';

/**
 * Initialize GetAnalytics.io client with environment-based plugins
 * Plugins are only added when their environment variables are configured
 */
export function createAnalyticsClient() {
  const config = getAnalyticsConfig();
  const plugins: any[] = [];

  // Add GA4 plugin if configured
  if (config.ga4.enabled && config.ga4.measurementId) {
    plugins.push(
      googleAnalytics({
        measurementIds: [config.ga4.measurementId],
      })
    );
  }

  // Add GTM plugin if configured
  if (config.gtm.enabled && config.gtm.containerId) {
    plugins.push(
      googleTagManager({
        containerId: config.gtm.containerId,
      })
    );
  }

  // Add Customer.io plugin if configured
  if (config.customerio.enabled && config.customerio.siteId) {
    plugins.push(
      customerio({
        siteId: config.customerio.siteId,
      })
    );
  }

  // Initialize analytics client
  const analytics = Analytics({
    app: 'indexnow-studio',
    debug: config.debug,
    plugins,
  });

  return analytics;
}

/**
 * Singleton analytics client instance
 */
let analyticsClient: ReturnType<typeof createAnalyticsClient> | null = null;

/**
 * Get or create analytics client instance
 */
export function getAnalyticsClient() {
  if (typeof window === 'undefined') {
    return null; // Server-side, return null
  }

  if (!analyticsClient) {
    analyticsClient = createAnalyticsClient();
  }

  return analyticsClient;
}
```

### Step 4: Create Sentry Client (`lib/analytics/sentry-client.ts`)

```typescript
import * as Sentry from '@sentry/nextjs';
import { getAnalyticsConfig, getSubdomainContext } from './config';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only initializes when SENTRY_DSN is configured
 */
export function initializeSentry() {
  if (typeof window === 'undefined') return; // Client-side only

  const config = getAnalyticsConfig();

  if (!config.sentry.enabled || !config.sentry.dsn) {
    return; // Sentry not configured
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: config.sentry.traceSampleRate,
    replaysSessionSampleRate: config.sentry.replaysSessionSampleRate,
    replaysOnErrorSampleRate: config.sentry.replaysOnErrorSampleRate,
    beforeSend(event) {
      // Add subdomain context
      if (event.contexts) {
        event.contexts.subdomain = {
          name: getSubdomainContext(),
        };
      }
      return event;
    },
  });
}

/**
 * Capture exception with Sentry
 */
export function captureException(error: Error, context?: Record<string, any>) {
  const config = getAnalyticsConfig();
  
  if (!config.sentry.enabled) return;

  Sentry.captureException(error, {
    extra: {
      ...context,
      subdomain: getSubdomainContext(),
    },
  });
}

/**
 * Capture message with Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  const config = getAnalyticsConfig();
  
  if (!config.sentry.enabled) return;

  Sentry.captureMessage(message, {
    level,
    extra: {
      ...context,
      subdomain: getSubdomainContext(),
    },
  });
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: { id: string; email?: string; username?: string }) {
  const config = getAnalyticsConfig();
  
  if (!config.sentry.enabled) return;

  Sentry.setUser(user);
}

/**
 * Clear user context from Sentry
 */
export function clearSentryUser() {
  const config = getAnalyticsConfig();
  
  if (!config.sentry.enabled) return;

  Sentry.setUser(null);
}
```

### Step 5: Create Posthog Client (`lib/analytics/posthog-client.ts`)

```typescript
import posthog from 'posthog-js';
import { getAnalyticsConfig, getSubdomainContext } from './config';

/**
 * Initialize Posthog for product analytics
 * Only initializes when POSTHOG_KEY is configured
 */
export function initializePosthog() {
  if (typeof window === 'undefined') return; // Client-side only

  const config = getAnalyticsConfig();

  if (!config.posthog.enabled || !config.posthog.apiKey) {
    return; // Posthog not configured
  }

  posthog.init(config.posthog.apiKey, {
    api_host: config.posthog.apiHost,
    loaded: (posthog) => {
      if (config.debug) {
        posthog.debug();
      }
    },
    capture_pageview: false, // We'll manually capture pageviews
    capture_pageleave: true,
    autocapture: true,
  });

  // Set subdomain as super property
  posthog.register({
    subdomain: getSubdomainContext(),
  });
}

/**
 * Get Posthog client instance
 */
export function getPosthogClient() {
  const config = getAnalyticsConfig();
  
  if (!config.posthog.enabled) return null;

  return posthog;
}

/**
 * Track Posthog event
 */
export function trackPosthogEvent(event: string, properties?: Record<string, any>) {
  const config = getAnalyticsConfig();
  
  if (!config.posthog.enabled) return;

  posthog.capture(event, {
    ...properties,
    subdomain: getSubdomainContext(),
  });
}

/**
 * Identify user in Posthog
 */
export function identifyPosthogUser(userId: string, properties?: Record<string, any>) {
  const config = getAnalyticsConfig();
  
  if (!config.posthog.enabled) return;

  posthog.identify(userId, properties);
}

/**
 * Reset Posthog user
 */
export function resetPosthogUser() {
  const config = getAnalyticsConfig();
  
  if (!config.posthog.enabled) return;

  posthog.reset();
}
```

### Step 6: Create Main Analytics Export (`lib/analytics/index.ts`)

```typescript
import { getAnalyticsClient } from './analytics-client';
import { initializeSentry, captureException, captureMessage, setSentryUser, clearSentryUser } from './sentry-client';
import { initializePosthog, trackPosthogEvent, identifyPosthogUser, resetPosthogUser } from './posthog-client';
import { getAnalyticsConfig, getSubdomainContext } from './config';

/**
 * Initialize all analytics providers
 * Should be called once on application load (client-side)
 */
export function initializeAnalytics() {
  if (typeof window === 'undefined') return;

  initializeSentry();
  initializePosthog();
}

/**
 * Track page view across all analytics providers
 */
export function trackPageView(path?: string) {
  const analytics = getAnalyticsClient();
  const config = getAnalyticsConfig();

  // GetAnalytics.io page tracking
  if (analytics) {
    analytics.page({
      url: path || window.location.pathname,
      subdomain: getSubdomainContext(),
    });
  }

  // Posthog page tracking
  if (config.posthog.enabled) {
    trackPosthogEvent('$pageview', {
      url: path || window.location.pathname,
    });
  }
}

/**
 * Track custom event across all analytics providers
 */
export function trackEvent(event: string, properties?: Record<string, any>) {
  const analytics = getAnalyticsClient();
  const config = getAnalyticsConfig();

  const enrichedProperties = {
    ...properties,
    subdomain: getSubdomainContext(),
  };

  // GetAnalytics.io event tracking
  if (analytics) {
    analytics.track(event, enrichedProperties);
  }

  // Posthog event tracking
  if (config.posthog.enabled) {
    trackPosthogEvent(event, enrichedProperties);
  }
}

/**
 * Identify user across all analytics providers
 */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  const analytics = getAnalyticsClient();
  const config = getAnalyticsConfig();

  // GetAnalytics.io identification
  if (analytics) {
    analytics.identify(userId, traits);
  }

  // Sentry user identification
  if (config.sentry.enabled) {
    setSentryUser({
      id: userId,
      email: traits?.email,
      username: traits?.username,
    });
  }

  // Posthog user identification
  if (config.posthog.enabled) {
    identifyPosthogUser(userId, traits);
  }
}

/**
 * Reset user identification across all analytics providers
 */
export function resetUser() {
  const analytics = getAnalyticsClient();
  const config = getAnalyticsConfig();

  // GetAnalytics.io reset
  if (analytics) {
    analytics.reset();
  }

  // Sentry reset
  if (config.sentry.enabled) {
    clearSentryUser();
  }

  // Posthog reset
  if (config.posthog.enabled) {
    resetPosthogUser();
  }
}

/**
 * Track error across analytics providers
 */
export function trackError(error: Error, context?: Record<string, any>) {
  const config = getAnalyticsConfig();

  // Sentry error tracking
  if (config.sentry.enabled) {
    captureException(error, context);
  }

  // Track as event in other analytics
  trackEvent('error', {
    error: error.message,
    stack: error.stack,
    ...context,
  });
}

// Re-export utilities
export { getAnalyticsConfig, getSubdomainContext };
export { captureException, captureMessage, setSentryUser, clearSentryUser };
export { trackPosthogEvent, identifyPosthogUser, resetPosthogUser };
```

### Step 7: Create Analytics Provider (`components/providers/AnalyticsProvider.tsx`)

```typescript
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initializeAnalytics, trackPageView } from '@/lib/analytics';

/**
 * Analytics Provider Component
 * Initializes analytics on mount and tracks page views on navigation
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize analytics on mount
  useEffect(() => {
    initializeAnalytics();
  }, []);

  // Track page views on navigation
  useEffect(() => {
    if (pathname) {
      const url = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
      trackPageView(url);
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
```

### Step 8: Create Analytics Hook (`hooks/useAnalytics.ts`)

```typescript
'use client';

import { useCallback } from 'react';
import { trackEvent, identifyUser, resetUser, trackError } from '@/lib/analytics';

/**
 * Custom hook for using analytics in React components
 */
export function useAnalytics() {
  const track = useCallback((event: string, properties?: Record<string, any>) => {
    trackEvent(event, properties);
  }, []);

  const identify = useCallback((userId: string, traits?: Record<string, any>) => {
    identifyUser(userId, traits);
  }, []);

  const reset = useCallback(() => {
    resetUser();
  }, []);

  const error = useCallback((error: Error, context?: Record<string, any>) => {
    trackError(error, context);
  }, []);

  return {
    track,
    identify,
    reset,
    error,
  };
}
```

### Step 9: Update Root Layout (`app/layout.tsx`)

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import FaviconProvider from '@/components/FaviconProvider'
import QueryProvider from '@/components/QueryProvider'
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider'

// ... existing code ...

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <FaviconProvider />
        <AnalyticsProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryProvider>
        </AnalyticsProvider>
      </body>
    </html>
  )
}
```

### Step 10: TypeScript Types (`lib/analytics/types.ts`)

```typescript
/**
 * Analytics Types
 */

export interface TrackEventProperties {
  [key: string]: any;
}

export interface UserTraits {
  email?: string;
  username?: string;
  name?: string;
  plan?: string;
  [key: string]: any;
}

export interface PageProperties {
  url?: string;
  path?: string;
  title?: string;
  referrer?: string;
  [key: string]: any;
}

export interface AnalyticsClient {
  track: (event: string, properties?: TrackEventProperties) => void;
  page: (properties?: PageProperties) => void;
  identify: (userId: string, traits?: UserTraits) => void;
  reset: () => void;
}

export type Subdomain = 'www' | 'dashboard' | 'backend' | 'api' | 'server';
```

---

## Server-Side Error Tracking (Sentry)

### Step 11: Create Server-Side Sentry Configuration (`lib/analytics/sentry-server.ts`)

```typescript
import * as Sentry from '@sentry/nextjs';
import { getAnalyticsConfig } from './config';

let isInitialized = false;

/**
 * Initialize Sentry for server-side error tracking
 * Tracks errors in API routes, server actions, and middleware
 */
export function initializeServerSentry() {
  if (isInitialized) return;
  
  const config = getAnalyticsConfig();
  
  if (!config.sentry.enabled) {
    console.log('[Sentry Server] Disabled - skipping initialization');
    return;
  }

  if (!config.sentry.dsn) {
    console.warn('[Sentry Server] Missing DSN - skipping initialization');
    return;
  }

  try {
    Sentry.init({
      dsn: config.sentry.dsn,
      environment: config.sentry.environment,
      
      // Server-side tracing
      tracesSampleRate: config.sentry.tracesSampleRate,
      
      // Disable replay for server-side (not applicable)
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      
      // Server-specific options
      integrations: [
        // HTTP integration for tracing API requests
        new Sentry.Integrations.Http({ tracing: true }),
      ],
      
      // Filter sensitive data
      beforeSend(event, hint) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        
        return event;
      },
      
      // Set user context from subdomain
      initialScope: {
        tags: {
          subdomain: config.subdomain,
          runtime: 'server',
        },
      },
      
      debug: config.debug,
    });

    isInitialized = true;
    
    if (config.debug) {
      console.log('[Sentry Server] Initialized successfully', {
        environment: config.sentry.environment,
        subdomain: config.subdomain,
      });
    }
  } catch (error) {
    console.error('[Sentry Server] Initialization error:', error);
  }
}

/**
 * Track server-side errors manually
 */
export function trackServerError(error: Error, context?: Record<string, any>) {
  if (!isInitialized) {
    console.error('[Sentry Server] Not initialized - error not tracked:', error);
    return;
  }

  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Set user context for server-side tracking
 */
export function setServerUser(userId: string, data?: Record<string, any>) {
  if (!isInitialized) return;
  
  Sentry.setUser({
    id: userId,
    ...data,
  });
}

/**
 * Clear server user context
 */
export function clearServerUser() {
  if (!isInitialized) return;
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging server errors
 */
export function addServerBreadcrumb(message: string, data?: Record<string, any>) {
  if (!isInitialized) return;
  
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}
```

### Step 12: Create Error Handler Middleware (`lib/analytics/error-handler.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { trackServerError } from './sentry-server';

/**
 * Error handler wrapper for API routes
 * Catches errors and sends them to Sentry
 */
export function withErrorHandler<T = any>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest): Promise<NextResponse<T>> => {
    try {
      return await handler(req);
    } catch (error) {
      // Track error in Sentry
      trackServerError(
        error instanceof Error ? error : new Error(String(error)),
        {
          url: req.url,
          method: req.method,
          headers: Object.fromEntries(req.headers.entries()),
        }
      );

      // Return error response
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      ) as NextResponse<T>;
    }
  };
}

/**
 * Error handler for Server Actions
 */
export async function handleServerAction<T>(
  action: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    trackServerError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );
    throw error;
  }
}
```

### Step 13: Initialize Server Sentry in Instrumentation (`instrumentation.ts`)

Create or update `instrumentation.ts` in the root directory:

```typescript
/**
 * Next.js Instrumentation
 * Runs once when the server starts
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize server-side Sentry
    const { initializeServerSentry } = await import('./lib/analytics/sentry-server');
    initializeServerSentry();
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Initialize edge runtime Sentry if needed
    const { initializeServerSentry } = await import('./lib/analytics/sentry-server');
    initializeServerSentry();
  }
}
```

### Step 14: Enable Instrumentation in Next.js Config

Update `next.config.js` to enable instrumentation:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config ...
  
  // Enable instrumentation hook
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
```

### Step 15: Update API Routes to Use Error Handler

Example API route with error tracking:

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/analytics/error-handler';

async function handler(req: NextRequest) {
  // Your API logic here
  const data = await someOperation();
  
  return NextResponse.json({ data });
}

// Export with error handler wrapper
export const GET = withErrorHandler(handler);
export const POST = withErrorHandler(handler);
```

### Step 16: Add Server Error Tracking to Existing Error Service

Update `lib/services/error.service.ts` to also send errors to Sentry:

```typescript
import { trackServerError } from '@/lib/analytics/sentry-server';

export class ErrorService {
  async logError(error: Error, context?: ErrorContext): Promise<void> {
    // Existing database logging
    await this.saveToDatabase(error, context);
    
    // Also send to Sentry for server-side tracking
    trackServerError(error, {
      ...context,
      errorType: error.name,
      stack: error.stack,
    });
  }
}
```

### Step 17: Add Error Boundary for Server Components

Create `components/ServerErrorBoundary.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { trackError } from '@/lib/analytics';

export default function ServerErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Track the error in Sentry (client-side tracking for server errors)
    trackError(error, {
      errorDigest: error.digest,
      errorType: 'server-component',
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-white rounded-md"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

Then use it in your app:

```typescript
// app/error.tsx
export { default } from '@/components/ServerErrorBoundary';
```

---

## Subdomain Configuration

### How Subdomains Work

The analytics system automatically detects which subdomain the user is on and includes it in all tracking events:

- **www** → Main website (indexnow.studio)
- **dashboard** → User dashboard (dashboard.indexnow.studio)
- **backend** → Admin panel (backend.indexnow.studio)
- **api** → API subdomain (api.indexnow.studio)

### Subdomain-Specific Tracking

All events include a `subdomain` property automatically:

```typescript
// Example event tracked from dashboard
{
  event: 'button_clicked',
  properties: {
    button: 'create_job',
    subdomain: 'dashboard'  // Automatically added
  }
}
```

### Cross-Subdomain User Tracking

When a user is identified on one subdomain, they remain identified across all subdomains (same root domain).

---

## Testing Strategy

### 1. Development Testing

Set `NEXT_PUBLIC_ANALYTICS_DEBUG=true` in `.env.local` to enable debug mode:

```bash
NEXT_PUBLIC_ANALYTICS_DEBUG=true
```

This will log all analytics events to the browser console for verification.

### 2. Test Checklist

- [ ] Analytics initialization works on all subdomains
- [ ] Page views are tracked on navigation
- [ ] Custom events are tracked correctly
- [ ] User identification works across subdomains
- [ ] Analytics are disabled when env vars are not set
- [ ] Sentry captures errors correctly
- [ ] Posthog tracks custom events
- [ ] GA4 receives pageviews
- [ ] GTM dataLayer is populated
- [ ] Customer.io tracks user events

### 3. Testing Commands

```typescript
// Open browser console and test:

// Track custom event
import { trackEvent } from '@/lib/analytics';
trackEvent('test_event', { foo: 'bar' });

// Track page view
import { trackPageView } from '@/lib/analytics';
trackPageView('/test-page');

// Identify user
import { identifyUser } from '@/lib/analytics';
identifyUser('user-123', { email: 'test@example.com' });

// Track error
import { trackError } from '@/lib/analytics';
trackError(new Error('Test error'), { context: 'testing' });
```

### 4. Verify in Analytics Dashboards

After testing, verify events appear in:
- Google Analytics 4 → Real-time reports
- Google Tag Manager → Preview mode
- Sentry → Issues dashboard
- Posthog → Live events
- Customer.io → Activity logs

---

## Best Practices

### 1. Event Naming Conventions

Use consistent, descriptive event names:

```typescript
// Good
trackEvent('job_created', { jobType: 'indexing', urls: 10 });
trackEvent('payment_completed', { amount: 50, currency: 'USD' });
trackEvent('settings_updated', { section: 'profile' });

// Bad
trackEvent('click', { button: 'submit' });
trackEvent('update', { data: 'stuff' });
trackEvent('event1', { prop1: 'value' });
```

### 2. User Privacy

- Always respect user consent for analytics tracking
- Implement cookie consent banners if required by GDPR/CCPA
- Avoid tracking PII (personally identifiable information) unless necessary
- Use Sentry's `beforeSend` to scrub sensitive data

### 3. Performance

- Analytics are loaded asynchronously and don't block page rendering
- Use `trackEvent` sparingly on high-frequency events
- Consider debouncing or throttling rapid events

### 4. Error Handling

Always wrap analytics calls in try-catch to prevent errors from breaking the app:

```typescript
try {
  trackEvent('user_action', { action: 'click' });
} catch (error) {
  // Silently fail - analytics should never break the app
}
```

### 5. Environment-Based Configuration

- **Development:** Set `NEXT_PUBLIC_ANALYTICS_DEBUG=true`
- **Staging:** Use separate analytics properties for testing
- **Production:** Use production analytics properties with sampling rates

---

## Troubleshooting

### Issue: Analytics not tracking events

**Solution:**
1. Check environment variables are set correctly
2. Enable debug mode: `NEXT_PUBLIC_ANALYTICS_DEBUG=true`
3. Check browser console for errors
4. Verify analytics are initialized: Check browser console for initialization logs

### Issue: Events not appearing in Google Analytics

**Solution:**
1. Verify `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is correct
2. Check GA4 real-time reports (events take time to process)
3. Ensure ad blockers are disabled during testing
4. Verify GTM container is published if using GTM

### Issue: Sentry not capturing errors

**Solution:**
1. Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Check Sentry project settings and DSN
3. Ensure error is thrown in client-side code (not server-side)
4. Check Sentry rate limits and quotas

### Issue: Posthog not tracking events

**Solution:**
1. Verify `NEXT_PUBLIC_POSTHOG_KEY` is correct
2. Check Posthog project API key
3. Ensure `NEXT_PUBLIC_POSTHOG_HOST` is correct (default: https://app.posthog.com)
4. Check browser console for Posthog initialization errors

### Issue: Analytics work on one subdomain but not others

**Solution:**
1. Verify all subdomains serve the same application code
2. Check middleware doesn't block analytics scripts
3. Ensure environment variables are available across all subdomains
4. Check CORS settings for cross-subdomain tracking

---

## Implementation Timeline

### Phase 1: Core Setup (Day 1)
- Install dependencies
- Create configuration files
- Set up environment variables
- Create analytics clients

### Phase 2: Integration (Day 2)
- Create provider and hooks
- Integrate into root layout
- Test on all subdomains
- Verify basic tracking

### Phase 3: Testing & Refinement (Day 3)
- Comprehensive testing on all subdomains
- Verify events in analytics dashboards
- Fix any issues
- Document implementation

### Phase 4: Production Deployment (Day 4)
- Set production environment variables
- Deploy to production
- Monitor analytics data
- Create team documentation

---

## Additional Resources

- **GetAnalytics.io Documentation:** https://getanalytics.io/
- **Google Analytics 4:** https://developers.google.com/analytics/devguides/collection/ga4
- **Google Tag Manager:** https://developers.google.com/tag-platform/tag-manager
- **Sentry Documentation:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Posthog Documentation:** https://posthog.com/docs
- **Customer.io Documentation:** https://customer.io/docs/

---

## Summary

This implementation plan provides a comprehensive, production-ready analytics integration for IndexNow Studio using GetAnalytics.io with support for GA4, GTM, Sentry, Posthog, and Customer.io.

**Key Features:**
✅ Environment-based activation
✅ Works across all subdomains
✅ Well-refactored, modular code
✅ TypeScript support
✅ Production-ready implementation
✅ Easy to maintain and extend

**Next Steps:**
1. Review this plan with your team
2. Set up analytics accounts and obtain API keys
3. Follow implementation steps sequentially
4. Test thoroughly on all subdomains
5. Deploy to production

Good luck with your analytics integration! 🚀

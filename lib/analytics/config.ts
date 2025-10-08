/**
 * Analytics Configuration
 * Environment-based configuration for all analytics providers
 * Only enables analytics when environment variables are populated
 */

import type { AnalyticsConfig, Subdomain } from './types';

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
export function getSubdomainContext(): Subdomain {
  if (typeof window === 'undefined') return 'server';
  
  const hostname = window.location.hostname;
  
  if (hostname.includes('dashboard')) return 'dashboard';
  if (hostname.includes('backend')) return 'backend';
  if (hostname.includes('api')) return 'api';
  
  return 'www';
}

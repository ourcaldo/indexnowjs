/**
 * Sentry Client
 * Error tracking and performance monitoring integration
 */

import * as Sentry from '@sentry/nextjs';
import { getAnalyticsConfig, getSubdomainContext } from './config';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only initializes when SENTRY_DSN is configured
 */
export function initializeSentry() {
  if (typeof window === 'undefined') return;

  const config = getAnalyticsConfig();

  if (!config.sentry.enabled || !config.sentry.dsn) {
    return;
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

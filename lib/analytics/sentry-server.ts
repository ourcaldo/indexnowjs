/**
 * Sentry Server-Side Configuration
 * Tracks errors in API routes, server actions, and middleware
 */

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
    return;
  }

  if (!config.sentry.dsn) {
    return;
  }

  try {
    Sentry.init({
      dsn: config.sentry.dsn,
      environment: config.sentry.environment,
      
      tracesSampleRate: config.sentry.traceSampleRate,
      
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      
      integrations: [],
      
      beforeSend(event) {
        if (event.contexts) {
          event.contexts.runtime = {
            name: 'server',
          };
        }
        return event;
      },
    });

    isInitialized = true;
  } catch (error) {
    // Silent fail - analytics should never break the app
  }
}

/**
 * Track server-side error
 */
export function trackServerError(error: Error, context?: Record<string, any>) {
  const config = getAnalyticsConfig();
  
  if (!config.sentry.enabled) return;

  try {
    Sentry.captureException(error, {
      extra: {
        ...context,
        runtime: 'server',
      },
    });
  } catch (err) {
    // Silent fail
  }
}

/**
 * Track server-side message
 */
export function trackServerMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  const config = getAnalyticsConfig();
  
  if (!config.sentry.enabled) return;

  try {
    Sentry.captureMessage(message, {
      level,
      extra: {
        ...context,
        runtime: 'server',
      },
    });
  } catch (err) {
    // Silent fail
  }
}

/**
 * Set server-side user context
 */
export function setServerSentryUser(user: { id: string; email?: string; username?: string }) {
  const config = getAnalyticsConfig();
  
  if (!config.sentry.enabled) return;

  try {
    Sentry.setUser(user);
  } catch (err) {
    // Silent fail
  }
}

/**
 * Clear server-side user context
 */
export function clearServerSentryUser() {
  const config = getAnalyticsConfig();
  
  if (!config.sentry.enabled) return;

  try {
    Sentry.setUser(null);
  } catch (err) {
    // Silent fail
  }
}

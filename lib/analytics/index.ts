/**
 * Analytics Integration
 * Main export for all analytics functionality
 */

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

  if (analytics) {
    analytics.page({
      url: path || window.location.pathname,
      subdomain: getSubdomainContext(),
    });
  }

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

  if (analytics) {
    analytics.track(event, enrichedProperties);
  }

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

  if (analytics) {
    analytics.identify(userId, traits);
  }

  if (config.sentry.enabled) {
    setSentryUser({
      id: userId,
      email: traits?.email,
      username: traits?.username,
    });
  }

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

  if (analytics) {
    analytics.reset();
  }

  if (config.sentry.enabled) {
    clearSentryUser();
  }

  if (config.posthog.enabled) {
    resetPosthogUser();
  }
}

/**
 * Track error across analytics providers
 */
export function trackError(error: Error, context?: Record<string, any>) {
  const config = getAnalyticsConfig();

  if (config.sentry.enabled) {
    captureException(error, context);
  }

  trackEvent('error', {
    error: error.message,
    stack: error.stack,
    ...context,
  });
}

export { getAnalyticsConfig, getSubdomainContext };
export { captureException, captureMessage, setSentryUser, clearSentryUser };
export { trackPosthogEvent, identifyPosthogUser, resetPosthogUser };

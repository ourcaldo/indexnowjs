/**
 * Posthog Client
 * Product analytics and feature flags integration
 */

import posthog from 'posthog-js';
import { getAnalyticsConfig, getSubdomainContext } from './config';

/**
 * Initialize Posthog for product analytics
 * Only initializes when POSTHOG_KEY is configured
 */
export function initializePosthog() {
  if (typeof window === 'undefined') return;

  const config = getAnalyticsConfig();

  if (!config.posthog.enabled || !config.posthog.apiKey) {
    return;
  }

  posthog.init(config.posthog.apiKey, {
    api_host: config.posthog.apiHost,
    loaded: (ph: typeof posthog) => {
      if (config.debug) {
        ph.debug();
      }
    },
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
  });

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

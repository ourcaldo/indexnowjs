/**
 * GetAnalytics.io Client
 * Initializes GetAnalytics.io with environment-based plugins
 */

import Analytics from 'analytics';
import googleAnalytics from '@analytics/google-analytics';
import googleTagManager from '@analytics/google-tag-manager';
import customerio from '@analytics/customerio';
import { getAnalyticsConfig } from './config';

/**
 * Initialize GetAnalytics.io client with environment-based plugins
 * Plugins are only added when their environment variables are configured
 */
export function createAnalyticsClient() {
  const config = getAnalyticsConfig();
  const plugins: any[] = [];

  if (config.ga4.enabled && config.ga4.measurementId) {
    plugins.push(
      googleAnalytics({
        measurementIds: [config.ga4.measurementId],
      })
    );
  }

  if (config.gtm.enabled && config.gtm.containerId) {
    plugins.push(
      googleTagManager({
        containerId: config.gtm.containerId,
      })
    );
  }

  if (config.customerio.enabled && config.customerio.siteId) {
    plugins.push(
      customerio({
        siteId: config.customerio.siteId,
      })
    );
  }

  const analytics = Analytics({
    app: 'indexnow-studio',
    debug: config.debug,
    plugins,
  });

  return analytics;
}

let analyticsClient: ReturnType<typeof createAnalyticsClient> | null = null;

/**
 * Get or create analytics client instance (singleton)
 */
export function getAnalyticsClient() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!analyticsClient) {
    analyticsClient = createAnalyticsClient();
  }

  return analyticsClient;
}

/**
 * Analytics Types
 * TypeScript definitions for the analytics system
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

export interface AnalyticsConfig {
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
  debug: boolean;
}

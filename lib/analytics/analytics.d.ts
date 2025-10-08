/**
 * Type declarations for analytics plugins without official types
 */

declare module '@analytics/google-analytics' {
  interface GoogleAnalyticsConfig {
    measurementIds: string[];
    [key: string]: any;
  }
  export default function googleAnalytics(config: GoogleAnalyticsConfig): any;
}

declare module '@analytics/google-tag-manager' {
  interface GoogleTagManagerConfig {
    containerId: string;
    [key: string]: any;
  }
  export default function googleTagManager(config: GoogleTagManagerConfig): any;
}

declare module '@analytics/customerio' {
  interface CustomerioConfig {
    siteId: string;
    [key: string]: any;
  }
  export default function customerio(config: CustomerioConfig): any;
}

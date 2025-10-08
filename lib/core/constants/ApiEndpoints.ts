/**
 * API Endpoints for IndexNow Studio
 * Centralized API endpoint definitions
 */

// Base API paths - normalize URL to avoid double slashes
const normalizeApiBaseUrl = (url: string): string => {
  return url.replace(/\/+$/, '') // Remove trailing slashes
}
const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL || '/api')
export const API_BASE = {
  V1: `${API_BASE_URL}/v1`,
  SYSTEM: `${API_BASE_URL}/system`,
  WEBSOCKET: `${API_BASE_URL}/websocket`,
  PUBLIC: `${API_BASE_URL}/v1/public`,
} as const;

// Authentication endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: `${API_BASE.V1}/auth/login`,
  LOGOUT: `${API_BASE.V1}/auth/logout`,
  REGISTER: `${API_BASE.V1}/auth/register`,
  SESSION: `${API_BASE.V1}/auth/session`,
  TEST_LOGIN: `${API_BASE.V1}/auth/test-login`,
  DETECT_LOCATION: `${API_BASE.V1}/auth/detect-location`,
  RESEND_VERIFICATION: `${API_BASE.V1}/auth/resend-verification`,
  CHANGE_PASSWORD: `${API_BASE.V1}/auth/user/change-password`,
  AVATAR: `${API_BASE.V1}/auth/user/avatar`,
  PROFILE: `${API_BASE.V1}/auth/user/profile`,
  PROFILE_COMPLETE: `${API_BASE.V1}/auth/user/profile/complete`,
  SETTINGS: `${API_BASE.V1}/auth/user/settings`,
  QUOTA: `${API_BASE.V1}/auth/user/quota`,
  QUOTA_HISTORY: (days: number) => `${API_BASE.V1}/auth/user/quota/history?days=${days}`,
  QUOTA_ALERTS: `${API_BASE.V1}/auth/user/quota/alerts`,
  QUOTA_ALERT_ACKNOWLEDGE: (alertId: string) => `${API_BASE.V1}/auth/user/quota/alerts/${alertId}/acknowledge`,
  QUOTA_INCREASE_REQUEST: `${API_BASE.V1}/auth/user/quota/increase-request`,
  TRIAL_ELIGIBILITY: `${API_BASE.V1}/auth/user/trial-eligibility`,
  TRIAL_STATUS: `${API_BASE.V1}/auth/user/trial-status`,
} as const;

// Admin endpoints
export const ADMIN_ENDPOINTS = {
  DASHBOARD: `${API_BASE.V1}/admin/dashboard`,
  VERIFY_ROLE: `${API_BASE.V1}/admin/verify-role`,
  DEBUG_AUTH: `${API_BASE.V1}/admin/debug-auth`,
  
  // User management
  USERS: `${API_BASE.V1}/admin/users`,
  USER_BY_ID: (id: string) => `${API_BASE.V1}/admin/users/${id}`,
  USER_ROLE: (id: string) => `${API_BASE.V1}/admin/users/${id}/role`,
  SUSPEND_USER: (id: string) => `${API_BASE.V1}/admin/users/${id}/suspend`,
  RESET_USER_PASSWORD: (id: string) => `${API_BASE.V1}/admin/users/${id}/reset-password`,
  RESET_USER_QUOTA: (id: string) => `${API_BASE.V1}/admin/users/${id}/reset-quota`,
  EXTEND_SUBSCRIPTION: (id: string) => `${API_BASE.V1}/admin/users/${id}/extend-subscription`,
  CHANGE_PACKAGE: (id: string) => `${API_BASE.V1}/admin/users/${id}/change-package`,
  USER_SECURITY: (id: string) => `${API_BASE.V1}/admin/users/${id}/security`,
  USER_SERVICE_ACCOUNTS: (id: string) => `${API_BASE.V1}/admin/users/${id}/service-accounts`,
  USER_QUOTA_USAGE: (id: string) => `${API_BASE.V1}/admin/users/${id}/quota-usage`,
  USER_API_STATS: (id: string) => `${API_BASE.V1}/admin/users/${id}/api-stats`,

  // Order management
  ORDERS: `${API_BASE.V1}/admin/orders`,
  ORDER_BY_ID: (id: string) => `${API_BASE.V1}/admin/orders/${id}`,
  ORDER_STATUS: (id: string) => `${API_BASE.V1}/admin/orders/${id}/status`,

  // Package management
  PACKAGES: `${API_BASE.V1}/admin/packages`,

  // Activity logs
  ACTIVITY: `${API_BASE.V1}/admin/activity`,
  ACTIVITY_BY_ID: (id: string) => `${API_BASE.V1}/admin/activity/${id}`,

  // Error management
  ERROR_STATS: `${API_BASE.V1}/admin/errors/stats`,
  CRITICAL_ERRORS: `${API_BASE.V1}/admin/errors/critical`,

  // System quota
  QUOTA_STATUS: `${API_BASE.V1}/admin/quota/status`,
  QUOTA_HEALTH: `${API_BASE.V1}/admin/quota/health`,
  QUOTA_REPORT: `${API_BASE.V1}/admin/quota/report`,

  // CMS
  CMS_POSTS: `${API_BASE.V1}/admin/cms/posts`,
  CMS_POSTS_VALIDATE_SLUG: `${API_BASE.V1}/admin/cms/posts/validate-slug`,
  CMS_PAGES: `${API_BASE.V1}/admin/cms/pages`,
  CMS_PAGES_VALIDATE_SLUG: `${API_BASE.V1}/admin/cms/pages/validate-slug`,
  CMS_CATEGORIES: `${API_BASE.V1}/admin/cms/categories`,
  CMS_UPLOAD: `${API_BASE.V1}/admin/cms/upload`,
  
  // Rank Tracker Admin
  RANK_TRACKER_TRIGGER_MANUAL_CHECK: `${API_BASE.V1}/admin/rank-tracker/trigger-manual-check`,

  // Settings
  SITE_SETTINGS: `${API_BASE.V1}/admin/settings/site`,
  TEST_EMAIL: `${API_BASE.V1}/admin/settings/site/test-email`,
  PAYMENT_GATEWAYS: `${API_BASE.V1}/admin/settings/payment-gateways`,
  SMTP_SETTINGS: `${API_BASE.V1}/admin/settings/smtp`,
  API_KEYS: `${API_BASE.V1}/admin/settings/api-keys`,
} as const;

// Indexing endpoints
export const INDEXING_ENDPOINTS = {
  JOBS: `${API_BASE.V1}/indexing/jobs`,
  JOB_BY_ID: (id: string) => `${API_BASE.V1}/indexing/jobs/${id}`,
  JOB_CANCEL: (id: string) => `${API_BASE.V1}/indexing/jobs/${id}/cancel`,
  JOB_RETRY: (id: string) => `${API_BASE.V1}/indexing/jobs/${id}/retry`,
  JOB_STATS: `${API_BASE.V1}/indexing/jobs/stats`,
  JOB_PROCESS: (id: string) => `${API_BASE.V1}/indexing/jobs/${id}/process`,
  JOB_SUBMISSIONS: (id: string) => `${API_BASE.V1}/indexing/jobs/${id}/submissions`,
  STOP_ALL_JOBS: `${API_BASE.V1}/indexing/jobs/stop-all`,
  TRIGGER_PROCESSING: `${API_BASE.V1}/indexing/jobs/trigger-processing`,
  
  // Service accounts
  SERVICE_ACCOUNTS: `${API_BASE.V1}/indexing/service-accounts`,
  SERVICE_ACCOUNT_BY_ID: (id: string) => `${API_BASE.V1}/indexing/service-accounts/${id}`,
  
  // Sitemap parsing
  PARSE_SITEMAP: `${API_BASE.V1}/indexing/parse-sitemap`,
} as const;

// Google service account endpoints
export const GOOGLE_ENDPOINTS = {
  SERVICE_ACCOUNTS: `${API_BASE.V1}/google/service-accounts`,
  SERVICE_ACCOUNT_BY_ID: (id: string) => `${API_BASE.V1}/google/service-accounts/${id}`,
  SERVICE_ACCOUNT_TOGGLE: (id: string) => `${API_BASE.V1}/google/service-accounts/${id}/toggle`,
  SERVICE_ACCOUNT_TEST: (id: string) => `${API_BASE.V1}/google/service-accounts/${id}/test`,
  SERVICE_ACCOUNT_RESET_QUOTA: (id: string) => `${API_BASE.V1}/google/service-accounts/${id}/reset-quota`,
  SERVICE_ACCOUNT_QUOTA_LIMITS: (id: string) => `${API_BASE.V1}/google/service-accounts/${id}/quota-limits`,
  SERVICE_ACCOUNT_USAGE: `${API_BASE.V1}/google/service-accounts/usage`,
  SERVICE_ACCOUNT_STATS: `${API_BASE.V1}/google/service-accounts/stats`,
} as const;

// Rank tracking endpoints
export const RANK_TRACKING_ENDPOINTS = {
  KEYWORDS: `${API_BASE.V1}/rank-tracking/keywords`,
  KEYWORD_BY_ID: (id: string) => `${API_BASE.V1}/rank-tracking/keywords/${id}`,
  KEYWORD_HISTORY: (id: string) => `${API_BASE.V1}/rank-tracking/keywords/${id}/history`,
  KEYWORD_USAGE: `${API_BASE.V1}/rank-tracking/keyword-usage`,
  KEYWORDS_BULK: `${API_BASE.V1}/rank-tracking/keywords/bulk`,
  BULK_DELETE_KEYWORDS: `${API_BASE.V1}/rank-tracking/keywords/bulk-delete`,
  ADD_KEYWORD_TAG: `${API_BASE.V1}/rank-tracking/keywords/add-tag`,
  CHECK_RANK: `${API_BASE.V1}/rank-tracking/check-rank`,
  RANKINGS_CHECK: `${API_BASE.V1}/rank-tracking/rankings/check`,
  RANK_HISTORY: `${API_BASE.V1}/rank-tracking/rank-history`,
  STATS: `${API_BASE.V1}/rank-tracking/stats`,
  COMPETITORS: `${API_BASE.V1}/rank-tracking/competitors`,
  EXPORT: `${API_BASE.V1}/rank-tracking/export`,
  DOMAINS: `${API_BASE.V1}/rank-tracking/domains`,
  COUNTRIES: `${API_BASE.V1}/rank-tracking/countries`,
} as const;

// Billing endpoints
export const BILLING_ENDPOINTS = {
  OVERVIEW: `${API_BASE.V1}/billing/overview`,
  HISTORY: `${API_BASE.V1}/billing/history`,
  PACKAGES: `${API_BASE.V1}/billing/packages`,
  PACKAGE_BY_ID: (id: string) => `${API_BASE.V1}/billing/packages/${id}`,
  PAYMENT: `${API_BASE.V1}/billing/payment`,
  PAYMENT_GATEWAYS: `${API_BASE.V1}/billing/payment-gateways`,
  UPLOAD_PROOF: `${API_BASE.V1}/billing/upload-proof`,
  CANCEL_TRIAL: `${API_BASE.V1}/billing/cancel-trial`,
  
  // Transactions
  TRANSACTIONS: `${API_BASE.V1}/billing/transactions`,
  TRANSACTION_BY_ID: (id: string) => `${API_BASE.V1}/billing/transactions/${id}`,
  
  // Payment channels
  MIDTRANS_SNAP: `${API_BASE.V1}/billing/channels/midtrans-snap`,
  MIDTRANS_RECURRING: `${API_BASE.V1}/billing/channels/midtrans-recurring`,
  BANK_TRANSFER: `${API_BASE.V1}/billing/channels/bank-transfer`,
  
  // Midtrans specific
  MIDTRANS_CREATE_PAYMENT: `${API_BASE.V1}/billing/midtrans/create-payment`,
  MIDTRANS_3DS_CALLBACK: `${API_BASE.V1}/billing/midtrans-3ds-callback`,
  MIDTRANS_CONFIG: `${API_BASE.V1}/billing/midtrans-config`,
  MIDTRANS_PROCESS_RECURRING: `${API_BASE.V1}/billing/midtrans/process-recurring`,
} as const;

// Payment endpoints
export const PAYMENT_ENDPOINTS = {
  SNAP: `${API_BASE.V1}/payments/channels/snap`,
  MIDTRANS_WEBHOOK: `${API_BASE.V1}/payments/midtrans/webhook`,
} as const;

// Notification endpoints
export const NOTIFICATION_ENDPOINTS = {
  SERVICE_ACCOUNT_QUOTA: `${API_BASE.V1}/notifications/service-account-quota`,
  DISMISS: (id: string) => `${API_BASE.V1}/notifications/dismiss/${id}`,
} as const;

// Dashboard endpoints
export const DASHBOARD_ENDPOINTS = {
  MAIN: `${API_BASE.V1}/dashboard`,
} as const;

// Blog endpoints
export const BLOG_ENDPOINTS = {
  POSTS: `${API_BASE.V1}/blog/posts`,
  POSTS_WITH_PARAMS: (params: string) => `${API_BASE.V1}/blog/posts?${params}`,
  POST_BY_SLUG: (slug: string) => `${API_BASE.V1}/blog/posts/${slug}`,
  POSTS_BY_CATEGORY: (category: string, limit?: number) => `${API_BASE.V1}/blog/posts?category=${category}${limit ? `&limit=${limit}` : ''}`,
  POSTS_BY_TAG: (tag: string, limit?: number) => `${API_BASE.V1}/blog/posts?tag=${tag}${limit ? `&limit=${limit}` : ''}`,
  CATEGORIES: `${API_BASE.V1}/blog/categories`,
} as const;

// Public endpoints
export const PUBLIC_ENDPOINTS = {
  PACKAGES: `${API_BASE.PUBLIC}/packages`,
  SITE_SETTINGS: `${API_BASE.PUBLIC}/site-settings`,
  SETTINGS: `${API_BASE.V1}/public/settings`,
  CONTACT: `${API_BASE.V1}/public/contact`,
} as const;

// System endpoints
export const SYSTEM_ENDPOINTS = {
  HEALTH: `${API_BASE.V1}/system/health`,
  STATUS: `${API_BASE.V1}/system/status`,
  WORKER_STATUS: `${API_BASE.SYSTEM}/worker-status`,
  RESTART_WORKER: `${API_BASE.SYSTEM}/restart-worker`,
  LEGACY_STATUS: `${API_BASE.SYSTEM}/status`,
} as const;

// Error logging endpoints
export const ERROR_ENDPOINTS = {
  LOG: `${API_BASE.V1}/errors/log`,
} as const;

// WebSocket endpoints
export const WEBSOCKET_ENDPOINTS = {
  MAIN: `${API_BASE.WEBSOCKET}`,
  SOCKETIO: `/api/socketio`,
  SOCKET_INIT: `/api/socket`,
} as const;

// External API endpoints
export const EXTERNAL_ENDPOINTS = {
  GOOGLE_INDEXING: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
  GOOGLE_TOKEN: 'https://oauth2.googleapis.com/token',
  SCRAPINGDOG_API: 'https://api.scrapingdog.com/google',
  EXCHANGE_RATE_API: 'https://api.exchangerate-api.com/v4/latest/USD',
} as const;

// Integration endpoints
export const INTEGRATION_ENDPOINTS = {
  // SeRanking integration
  SERANKING_KEYWORD_DATA: `${API_BASE.V1}/integrations/seranking/keyword-data`,
  SERANKING_KEYWORD_DATA_BULK: `${API_BASE.V1}/integrations/seranking/keyword-data/bulk`,
  SERANKING_QUOTA_STATUS: `${API_BASE.V1}/integrations/seranking/quota/status`,
  SERANKING_QUOTA_HISTORY: `${API_BASE.V1}/integrations/seranking/quota/history`,
  SERANKING_HEALTH: `${API_BASE.V1}/integrations/seranking/health`,
  SERANKING_HEALTH_METRICS: `${API_BASE.V1}/integrations/seranking/health/metrics`,
} as const;

// Legacy API endpoints (for compatibility)
export const LEGACY_ENDPOINTS = {
  MIDTRANS_WEBHOOK: '/api/midtrans/webhook',
} as const;

// Helper function to build endpoint URLs with query parameters
export const buildEndpoint = (
  endpoint: string,
  params?: Record<string, string | number | boolean>
): string => {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });

  return `${endpoint}?${searchParams.toString()}`;
};

// Helper function to validate endpoint
export const isValidEndpoint = (endpoint: string): boolean => {
  const staticEndpoints: string[] = [
    ...Object.values(AUTH_ENDPOINTS).filter(ep => typeof ep === 'string'),
    ...Object.values(INDEXING_ENDPOINTS).filter(ep => typeof ep === 'string'),
    ...Object.values(RANK_TRACKING_ENDPOINTS).filter(ep => typeof ep === 'string'),
    ...Object.values(BILLING_ENDPOINTS).filter(ep => typeof ep === 'string'),
    ...Object.values(PAYMENT_ENDPOINTS).filter(ep => typeof ep === 'string'),
    ...Object.values(NOTIFICATION_ENDPOINTS).filter(ep => typeof ep === 'string'),
    ...Object.values(BLOG_ENDPOINTS).filter(ep => typeof ep === 'string'),
    ...Object.values(PUBLIC_ENDPOINTS).filter(ep => typeof ep === 'string'),
    ...Object.values(SYSTEM_ENDPOINTS).filter(ep => typeof ep === 'string'),
    ...Object.values(WEBSOCKET_ENDPOINTS).filter(ep => typeof ep === 'string'),
    ...Object.values(INTEGRATION_ENDPOINTS).filter(ep => typeof ep === 'string'),
  ];

  // Check static endpoints
  if (staticEndpoints.includes(endpoint)) {
    return true;
  }

  // Check dynamic admin endpoints
  const adminPatterns = [
    /^\/api\/v1\/admin\/users\/[a-f0-9-]+$/,
    /^\/api\/v1\/admin\/users\/[a-f0-9-]+\/(suspend|reset-password|reset-quota|extend-subscription|change-package|security|service-accounts|quota-usage)$/,
    /^\/api\/v1\/admin\/orders\/[a-f0-9-]+$/,
    /^\/api\/v1\/admin\/orders\/[a-f0-9-]+\/status$/,
    /^\/api\/v1\/admin\/activity\/[a-f0-9-]+$/,
  ];

  return adminPatterns.some(pattern => pattern.test(endpoint));
};
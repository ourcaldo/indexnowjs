/**
 * Application Constants for IndexNow Studio
 * Centralized application-wide constants
 */

// Application metadata
export const APP_METADATA = {
  NAME: 'IndexNow Studio',
  DESCRIPTION: 'Professional URL indexing automation platform',
  VERSION: '1.0.0',
  AUTHOR: 'IndexNow Studio Team',
  COPYRIGHT: '© 2025 IndexNow Studio. All rights reserved.',
} as const;

// User roles and permissions
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ROLE_PERMISSIONS = {
  [USER_ROLES.USER]: [
    'read:profile',
    'update:profile',
    'create:indexing_job',
    'read:indexing_job',
    'update:indexing_job',
    'delete:indexing_job',
    'create:service_account',
    'read:service_account',
    'update:service_account',
    'delete:service_account',
    'read:rank_tracking',
    'create:rank_tracking',
    'update:rank_tracking',
    'delete:rank_tracking',
    'read:billing',
    'create:payment',
  ],
  [USER_ROLES.ADMIN]: [
    'read:all_users',
    'update:user',
    'suspend:user',
    'read:all_jobs',
    'manage:system_settings',
    'read:analytics',
    'manage:packages',
    'read:system_health',
  ],
  [USER_ROLES.SUPER_ADMIN]: [
    'delete:user',
    'manage:admin_users',
    'manage:system_config',
    'access:debug_tools',
    'manage:payment_gateways',
    'read:system_logs',
    'manage:database',
  ],
} as const;

// Job status constants
export const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  SCHEDULED: 'scheduled',
} as const;

export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];

// Schedule types
export const SCHEDULE_TYPES = {
  ONE_TIME: 'one-time',
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
} as const;

export type ScheduleType = typeof SCHEDULE_TYPES[keyof typeof SCHEDULE_TYPES];

// Job types
export const JOB_TYPES = {
  SITEMAP: 'sitemap',
  URL_LIST: 'url-list',
  SINGLE_URL: 'single-url',
  BULK_UPLOAD: 'bulk-upload',
} as const;

export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];

// Google API constants
export const GOOGLE_API = {
  SCOPES: [
    'https://www.googleapis.com/auth/indexing',
  ],
  ENDPOINTS: {
    INDEXING: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
    TOKEN: 'https://oauth2.googleapis.com/token',
  },
  QUOTA_LIMITS: {
    DAILY_DEFAULT: 200,
    MINUTE_DEFAULT: 60,
  },
} as const;

// Rank tracking constants
export const RANK_TRACKING = {
  COUNTRIES: {
    US: 'United States',
    GB: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    ID: 'Indonesia',
    SG: 'Singapore',
    MY: 'Malaysia',
    TH: 'Thailand',
    PH: 'Philippines',
    VN: 'Vietnam',
  },
  DEVICES: {
    DESKTOP: 'desktop',
    MOBILE: 'mobile',
    TABLET: 'tablet',
  },
  SEARCH_ENGINES: {
    GOOGLE: 'google',
    BING: 'bing',
    YAHOO: 'yahoo',
  },
  MAX_POSITION: 100,
  DEFAULT_CHECK_FREQUENCY: '0 2 * * *', // Daily at 2 AM UTC
} as const;

// Pagination constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 5,
} as const;

// File upload constants
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: {
    SERVICE_ACCOUNT: ['.json'],
    SITEMAP: ['.xml'],
    URL_LIST: ['.txt', '.csv'],
    IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  MAX_URLS_PER_FILE: 10000,
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Email templates
export const EMAIL_TEMPLATES = {
  JOB_COMPLETION: 'job-completion',
  JOB_FAILURE: 'job-failure',
  QUOTA_ALERT: 'quota-alert',
  DAILY_REPORT: 'daily-report',
  PAYMENT_RECEIVED: 'payment-received',
  LOGIN_NOTIFICATION: 'login-notification',
  PACKAGE_ACTIVATED: 'package-activated',
  ORDER_EXPIRED: 'order-expired',
  BILLING_CONFIRMATION: 'billing-confirmation',
} as const;

export type EmailTemplate = typeof EMAIL_TEMPLATES[keyof typeof EMAIL_TEMPLATES];

// Cache keys
export const CACHE_KEYS = {
  USER_PROFILE: 'user:profile',
  USER_SETTINGS: 'user:settings',
  USER_QUOTA: 'user:quota',
  SERVICE_ACCOUNTS: 'user:service_accounts',
  JOBS: 'user:jobs',
  PACKAGES: 'packages',
  SITE_SETTINGS: 'site:settings',
  RANK_TRACKING: 'rank_tracking',
  PAYMENT_GATEWAYS: 'payment:gateways',
} as const;

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 3600, // 1 hour
  LONG: 86400, // 24 hours
  VERY_LONG: 604800, // 7 days
} as const;

// Rate limiting
export const RATE_LIMITS = {
  API_REQUESTS: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
  LOGIN_ATTEMPTS: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_ATTEMPTS: 5,
  },
  PASSWORD_RESET: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_ATTEMPTS: 3,
  },
  PAYMENT_REQUESTS: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5,
  },
} as const;

// Default settings
export const DEFAULT_SETTINGS = {
  USER: {
    TIMEOUT_DURATION: 30000,
    RETRY_ATTEMPTS: 3,
    EMAIL_JOB_COMPLETION: true,
    EMAIL_JOB_FAILURE: true,
    EMAIL_QUOTA_ALERTS: true,
    EMAIL_DAILY_REPORT: true,
    DEFAULT_SCHEDULE: SCHEDULE_TYPES.ONE_TIME,
  },
  SYSTEM: {
    SITE_NAME: 'IndexNow Studio',
    SITE_DESCRIPTION: 'Professional URL indexing automation platform',
    SMTP_PORT: 465,
    SMTP_SECURE: true,
    SMTP_ENABLED: false,
    MAINTENANCE_MODE: false,
    REGISTRATION_ENABLED: true,
  },
} as const;

// Regular expressions
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  CRON: /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
  DOMAIN: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/,
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Time constants (in milliseconds)
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;
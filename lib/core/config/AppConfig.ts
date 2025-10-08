/**
 * Application Configuration for IndexNow Studio
 * Centralized configuration management
 */

export interface AppConfigType {
  app: {
    name: string;
    version: string;
    environment: 'development';
    baseUrl: string;
    port: number;
  };
  api: {
    timeout: number;
    retryAttempts: number;
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
  };
  features: {
    enableRegistration: boolean;
    enableTrials: boolean;
    enableRankTracking: boolean;
    enableEmailNotifications: boolean;
    maintenanceMode: boolean;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    encryptionKey: string;
  };
  monitoring: {
    enableErrorTracking: boolean;
    enablePerformanceTracking: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

// Environment variable parsing with defaults
const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value || defaultValue || '';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  return value ? value.toLowerCase() === 'true' : defaultValue;
};

// Application configuration
export const AppConfig: AppConfigType = {
  app: {
    name: getEnv('NEXT_PUBLIC_APP_NAME', 'IndexNow Studio'),
    version: getEnv('NEXT_PUBLIC_APP_VERSION', '1.0.0'),
    environment: 'development',
    baseUrl: getEnv('NEXT_PUBLIC_BASE_URL', 'http://0.0.0.0:8081'),
    port: getEnvNumber('PORT', 8081),
  },
  api: {
    timeout: getEnvNumber('API_TIMEOUT', 30000),
    retryAttempts: getEnvNumber('API_RETRY_ATTEMPTS', 3),
    rateLimit: {
      windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
      maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    },
  },
  features: {
    enableRegistration: getEnvBoolean('ENABLE_REGISTRATION', true),
    enableTrials: getEnvBoolean('ENABLE_TRIALS', true),
    enableRankTracking: getEnvBoolean('ENABLE_RANK_TRACKING', true),
    enableEmailNotifications: getEnvBoolean('ENABLE_EMAIL_NOTIFICATIONS', true),
    maintenanceMode: getEnvBoolean('MAINTENANCE_MODE', false),
  },
  security: {
    sessionTimeout: getEnvNumber('SESSION_TIMEOUT', 86400000), // 24 hours
    maxLoginAttempts: getEnvNumber('MAX_LOGIN_ATTEMPTS', 5),
    lockoutDuration: getEnvNumber('LOCKOUT_DURATION', 900000), // 15 minutes
    encryptionKey: getEnv('ENCRYPTION_KEY'),
  },
  monitoring: {
    enableErrorTracking: getEnvBoolean('ENABLE_ERROR_TRACKING', true),
    enablePerformanceTracking: getEnvBoolean('ENABLE_PERFORMANCE_TRACKING', false),
    logLevel: (getEnv('LOG_LEVEL', 'info') as any) || 'info',
  },
};

// Configuration validation
export const validateConfig = (): void => {
  const required = [
    'ENCRYPTION_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Environment is always development - no validation needed

  // Validate log level
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(AppConfig.monitoring.logLevel)) {
    throw new Error(`Invalid log level: ${AppConfig.monitoring.logLevel}`);
  }
};

// Helper functions
export const isProduction = (): boolean => false;
export const isDevelopment = (): boolean => true;
export const isStaging = (): boolean => false;
export const isMaintenanceMode = (): boolean => AppConfig.features.maintenanceMode;
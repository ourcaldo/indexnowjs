/**
 * Database Configuration for IndexNow Studio
 * Supabase database configuration and connection settings
 */

export interface DatabaseConfigType {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
    jwtSecret: string;
  };
  connection: {
    maxConnections: number;
    connectionTimeout: number;
    idleTimeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  performance: {
    enableQueryLogging: boolean;
    slowQueryThreshold: number;
    enableConnectionPooling: boolean;
  };
  security: {
    enableRLS: boolean;
    enableAuditLogging: boolean;
    sensitiveFields: string[];
  };
}

// Environment variable helpers
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

// Database configuration
export const DatabaseConfig: DatabaseConfigType = {
  supabase: {
    url: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    jwtSecret: getEnv('SUPABASE_JWT_SECRET'),
  },
  connection: {
    maxConnections: getEnvNumber('DB_MAX_CONNECTIONS', 20),
    connectionTimeout: getEnvNumber('DB_CONNECTION_TIMEOUT', 30000),
    idleTimeout: getEnvNumber('DB_IDLE_TIMEOUT', 600000), // 10 minutes
    retryAttempts: getEnvNumber('DB_RETRY_ATTEMPTS', 3),
    retryDelay: getEnvNumber('DB_RETRY_DELAY', 1000),
  },
  performance: {
    enableQueryLogging: getEnvBoolean('DB_ENABLE_QUERY_LOGGING', false),
    slowQueryThreshold: getEnvNumber('DB_SLOW_QUERY_THRESHOLD', 5000), // 5 seconds
    enableConnectionPooling: getEnvBoolean('DB_ENABLE_CONNECTION_POOLING', true),
  },
  security: {
    enableRLS: getEnvBoolean('DB_ENABLE_RLS', true),
    enableAuditLogging: getEnvBoolean('DB_ENABLE_AUDIT_LOGGING', true),
    sensitiveFields: [
      'password',
      'encrypted_credentials',
      'encrypted_access_token',
      'smtp_pass',
      'apikey',
      'jwt_secret',
      'encryption_key',
    ],
  },
};

// Database table prefix configuration
export const TABLE_PREFIXES = {
  ANALYTICS: 'indb_analytics_',
  AUTH: 'indb_auth_',
  CMS: 'indb_cms_',
  GOOGLE: 'indb_google_',
  INDEXING: 'indb_indexing_',
  PACKAGE: 'indb_package_',
  PAYMENT: 'indb_payment_',
  RANK_TRACKING: 'indb_rank_tracking_',
  SECURITY: 'indb_security_',
  SITE: 'indb_site_',
  SYSTEM: 'indb_system_',
} as const;

// Helper function to get full table name
export const getTableName = (prefix: keyof typeof TABLE_PREFIXES, tableName: string): string => {
  return `${TABLE_PREFIXES[prefix]}${tableName}`;
};

// Database validation
export const validateDatabaseConfig = (): void => {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required database environment variables: ${missing.join(', ')}`);
  }

  // Validate URL format
  try {
    new URL(DatabaseConfig.supabase.url);
  } catch (error) {
    throw new Error('Invalid Supabase URL format');
  }

  // Validate connection settings
  if (DatabaseConfig.connection.maxConnections < 1) {
    throw new Error('Max connections must be at least 1');
  }

  if (DatabaseConfig.connection.connectionTimeout < 1000) {
    throw new Error('Connection timeout must be at least 1000ms');
  }
};

// Connection health check helper
export const isDatabaseHealthy = async (): Promise<boolean> => {
  try {
    // This would be implemented with actual database health check
    // For now, just check if configuration is valid
    validateDatabaseConfig();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};
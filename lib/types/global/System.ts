/**
 * Global system-level type definitions for IndexNow Studio
 */

// System configuration and environment
export interface SystemConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  email: EmailConfig;
  storage: StorageConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  ssl: boolean;
  poolSize: number;
  timeout: number;
  retryAttempts: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  database: number;
  password?: string;
  ttl: number;
  maxConnections: number;
}

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses';
  host?: string;
  port?: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
  replyTo?: string;
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'gcs';
  bucket?: string;
  region?: string;
  endpoint?: string;
  maxFileSize: number;
  allowedTypes: string[];
}

export interface MonitoringConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  metricsInterval: number;
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  errorRate: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiry: string;
  refreshTokenExpiry: string;
  bcryptRounds: number;
  corsOrigins: string[];
  rateLimiting: RateLimitConfig;
  encryption: EncryptionConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
}

// System metrics and monitoring
export interface SystemMetrics {
  timestamp: Date;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  database: DatabaseMetrics;
  application: ApplicationMetrics;
}

export interface CPUMetrics {
  usage: number; // percentage
  cores: number;
  loadAverage: number[];
}

export interface MemoryMetrics {
  total: number; // bytes
  used: number; // bytes
  free: number; // bytes
  usage: number; // percentage
}

export interface DiskMetrics {
  total: number; // bytes
  used: number; // bytes
  free: number; // bytes
  usage: number; // percentage
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
}

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
  };
  queries: {
    total: number;
    slow: number;
    failed: number;
    averageTime: number;
  };
  size: number; // bytes
}

export interface ApplicationMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  jobs: {
    active: number;
    completed: number;
    failed: number;
    queued: number;
  };
  users: {
    active: number;
    online: number;
    registered: number;
  };
}

// System jobs and background tasks
export interface SystemJob {
  id: string;
  name: string;
  type: 'cron' | 'queue' | 'immediate';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  payload?: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
}

export interface JobQueue {
  name: string;
  size: number;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

// System backup and maintenance
export interface BackupJob {
  id: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'running' | 'completed' | 'failed';
  size?: number; // bytes
  location: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  affectedServices: string[];
  notificationSent: boolean;
  createdAt: Date;
}

// System integrations
export interface ExternalService {
  name: string;
  type: 'api' | 'webhook' | 'database' | 'storage';
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  lastCheck: Date;
  responseTime?: number;
  credentials?: Record<string, any>;
  configuration?: Record<string, any>;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  headers?: Record<string, string>;
  retryAttempts: number;
  timeout: number;
  createdAt: Date;
  lastTriggered?: Date;
}

// System logs and audit
export interface SystemLog {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
  source: string;
  userId?: string;
  requestId?: string;
  correlationId?: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  userRole?: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, any>;
  timestamp: Date;
  metadata?: Record<string, any>;
}
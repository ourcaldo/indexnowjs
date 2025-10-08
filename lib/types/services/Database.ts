/**
 * Database service-related type definitions for IndexNow Studio
 */

// Database core types - moved from core
export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  isConnected: boolean;
  lastPing: Date;
}

export interface QueryOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTtl?: number;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  fields?: any[];
  meta?: Record<string, any>;
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  constraints: any[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  default?: any;
  primaryKey: boolean;
  unique: boolean;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
}

// Database service configuration
export interface DatabaseServiceConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolSize: number;
  connectionTimeout: number;
  queryTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    logQueries: boolean;
    logErrors: boolean;
    slowQueryThreshold: number;
  };
  migrations: {
    enabled: boolean;
    directory: string;
    tableName: string;
  };
}

// Connection management
export interface ConnectionManager {
  getConnection: () => Promise<DatabaseConnection>;
  releaseConnection: (connection: DatabaseConnection) => Promise<void>;
  closeAllConnections: () => Promise<void>;
  getPoolStatus: () => Promise<PoolStatus>;
  healthCheck: () => Promise<HealthCheckResult>;
}

export interface PoolStatus {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  maxConnections: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: Date;
  details: {
    connectionPool: PoolStatus;
    lastError?: DatabaseError;
    uptime: number;
  };
}

// Query execution
export interface QueryExecutor {
  execute: <T = any>(query: string, params?: any[]) => Promise<QueryResult<T>>;
  executeTransaction: <T = any>(queries: TransactionQuery[]) => Promise<T[]>;
  executeBatch: <T = any>(query: string, paramsList: any[][]) => Promise<QueryResult<T>[]>;
  stream: <T = any>(query: string, params?: any[]) => AsyncIterable<T>;
}

export interface TransactionQuery {
  query: string;
  params?: any[];
}

// ORM and query builder
export interface QueryBuilder<T = any> {
  select: (columns?: string[]) => QueryBuilder<T>;
  from: (table: string) => QueryBuilder<T>;
  where: (condition: string, value?: any) => QueryBuilder<T>;
  whereIn: (column: string, values: any[]) => QueryBuilder<T>;
  whereBetween: (column: string, min: any, max: any) => QueryBuilder<T>;
  join: (table: string, condition: string) => QueryBuilder<T>;
  leftJoin: (table: string, condition: string) => QueryBuilder<T>;
  rightJoin: (table: string, condition: string) => QueryBuilder<T>;
  orderBy: (column: string, direction?: 'ASC' | 'DESC') => QueryBuilder<T>;
  groupBy: (columns: string[]) => QueryBuilder<T>;
  having: (condition: string, value?: any) => QueryBuilder<T>;
  limit: (count: number) => QueryBuilder<T>;
  offset: (count: number) => QueryBuilder<T>;
  insert: (data: Partial<T>) => QueryBuilder<T>;
  update: (data: Partial<T>) => QueryBuilder<T>;
  delete: () => QueryBuilder<T>;
  toSQL: () => { query: string; params: any[] };
  execute: () => Promise<QueryResult<T>>;
  first: () => Promise<T | null>;
  get: () => Promise<T[]>;
  count: () => Promise<number>;
}

// Repository pattern
export interface Repository<T = any> {
  find: (id: string) => Promise<T | null>;
  findBy: (criteria: Partial<T>) => Promise<T[]>;
  findOne: (criteria: Partial<T>) => Promise<T | null>;
  create: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<boolean>;
  exists: (id: string) => Promise<boolean>;
  count: (criteria?: Partial<T>) => Promise<number>;
  paginate: (options: PaginationOptions) => Promise<PaginatedResult<T>>;
  transaction: <R>(callback: (repo: Repository<T>) => Promise<R>) => Promise<R>;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  where?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Migration system
export interface MigrationManager {
  runMigrations: () => Promise<MigrationResult[]>;
  rollbackMigration: (version: string) => Promise<void>;
  rollbackToVersion: (version: string) => Promise<void>;
  getMigrationStatus: () => Promise<MigrationStatus[]>;
  createMigration: (name: string) => Promise<string>;
}

export interface Migration {
  version: string;
  name: string;
  up: (db: DatabaseConnection) => Promise<void>;
  down: (db: DatabaseConnection) => Promise<void>;
}

export interface MigrationResult {
  version: string;
  name: string;
  status: 'success' | 'failed' | 'skipped';
  executionTime: number;
  error?: DatabaseError;
}

export interface MigrationStatus {
  version: string;
  name: string;
  appliedAt?: Date;
  isApplied: boolean;
}

// Caching layer
export interface DatabaseCache {
  get: <T = any>(key: string) => Promise<T | null>;
  set: (key: string, value: any, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  flush: () => Promise<void>;
  keys: (pattern?: string) => Promise<string[]>;
  ttl: (key: string) => Promise<number>;
  exists: (key: string) => Promise<boolean>;
}

export interface CacheStrategy {
  generateKey: (table: string, query: string, params?: any[]) => string;
  shouldCache: (query: string) => boolean;
  getTTL: (table: string) => number;
  invalidatePattern: (pattern: string) => Promise<void>;
}

// Backup and restore
export interface BackupManager {
  createBackup: (options: BackupOptions) => Promise<BackupResult>;
  restoreBackup: (backupId: string, options?: RestoreOptions) => Promise<RestoreResult>;
  listBackups: () => Promise<BackupInfo[]>;
  deleteBackup: (backupId: string) => Promise<void>;
  scheduleBackup: (schedule: BackupSchedule) => Promise<void>;
  getBackupStatus: (backupId: string) => Promise<BackupStatus>;
}

export interface BackupOptions {
  type: 'full' | 'incremental' | 'differential';
  tables?: string[];
  excludeTables?: string[];
  compression: boolean;
  encryption: boolean;
  destination: 'local' | 's3' | 'gcs';
  retentionDays: number;
}

export interface BackupResult {
  id: string;
  type: 'full' | 'incremental' | 'differential';
  size: number;
  location: string;
  checksum: string;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  status: 'completed' | 'failed' | 'partial';
  error?: DatabaseError;
}

export interface RestoreOptions {
  tables?: string[];
  excludeTables?: string[];
  overwriteExisting: boolean;
  verifyChecksum: boolean;
}

export interface RestoreResult {
  backupId: string;
  tablesRestored: string[];
  recordsRestored: number;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  status: 'completed' | 'failed' | 'partial';
  errors: DatabaseError[];
}

export interface BackupInfo {
  id: string;
  type: 'full' | 'incremental' | 'differential';
  size: number;
  location: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'available' | 'expired' | 'corrupted';
}

export interface BackupSchedule {
  name: string;
  cronExpression: string;
  type: 'full' | 'incremental' | 'differential';
  options: BackupOptions;
  isActive: boolean;
  nextRun: Date;
}

export interface BackupStatus {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentTable?: string;
  startedAt?: Date;
  estimatedCompletion?: Date;
  error?: DatabaseError;
}

// Performance monitoring
export interface PerformanceMonitor {
  trackQuery: (query: string, executionTime: number, rowCount?: number) => Promise<void>;
  getSlowQueries: (threshold?: number, limit?: number) => Promise<SlowQuery[]>;
  getQueryStats: (period: { start: Date; end: Date }) => Promise<QueryStats>;
  getTableStats: () => Promise<TableStats[]>;
  analyzePerformance: () => Promise<PerformanceReport>;
  optimizeTables: (tables?: string[]) => Promise<OptimizationResult[]>;
}

export interface SlowQuery {
  query: string;
  executionTime: number;
  executionCount: number;
  averageTime: number;
  maxTime: number;
  lastExecuted: Date;
  suggestions: string[];
}

export interface QueryStats {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: number;
  failedQueries: number;
  cacheHitRate: number;
  queryTypes: {
    select: number;
    insert: number;
    update: number;
    delete: number;
  };
  hourlyBreakdown: Array<{
    hour: Date;
    count: number;
    averageTime: number;
  }>;
}

export interface TableStats {
  tableName: string;
  rowCount: number;
  size: number;
  indexSize: number;
  lastAnalyzed: Date;
  fragmentationLevel: number;
  suggestedIndexes: string[];
}

export interface PerformanceReport {
  period: { start: Date; end: Date };
  overview: {
    totalQueries: number;
    averageResponseTime: number;
    slowQueryCount: number;
    errorRate: number;
  };
  recommendations: Recommendation[];
  trends: {
    queryVolume: Array<{ date: Date; count: number }>;
    responseTime: Array<{ date: Date; time: number }>;
    errorRate: Array<{ date: Date; rate: number }>;
  };
  topTables: Array<{
    name: string;
    queryCount: number;
    averageTime: number;
    size: number;
  }>;
}

export interface Recommendation {
  type: 'index' | 'query' | 'schema' | 'configuration';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  implementation: string;
  estimatedBenefit: string;
}

export interface OptimizationResult {
  tableName: string;
  operation: 'analyze' | 'optimize' | 'rebuild';
  status: 'completed' | 'failed' | 'skipped';
  before: {
    size: number;
    fragmentationLevel: number;
  };
  after: {
    size: number;
    fragmentationLevel: number;
  };
  timeSaved: number;
  error?: DatabaseError;
}

// Error handling
export interface DatabaseError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  query?: string;
  params?: any[];
  stack?: string;
  timestamp: Date;
  retryable: boolean;
  category: 'connection' | 'syntax' | 'constraint' | 'permission' | 'timeout' | 'unknown';
}

export interface DatabaseErrorHandler {
  handleError: (error: DatabaseError) => Promise<void>;
  shouldRetry: (error: DatabaseError, retryCount: number) => boolean;
  getRetryDelay: (retryCount: number) => number;
  logError: (error: DatabaseError) => Promise<void>;
  notifyAdmins: (error: DatabaseError) => Promise<void>;
}

// Database factory
export interface DatabaseServiceFactory {
  createConnection: (config: DatabaseServiceConfig) => Promise<DatabaseConnection>;
  createQueryExecutor: (connection: DatabaseConnection) => QueryExecutor;
  createQueryBuilder: <T = any>(table: string) => QueryBuilder<T>;
  createRepository: <T = any>(table: string, schema?: TableSchema) => Repository<T>;
  createMigrationManager: () => MigrationManager;
  createBackupManager: () => BackupManager;
  createPerformanceMonitor: () => PerformanceMonitor;
  createCache: (config: CacheConfig) => DatabaseCache;
}

export interface CacheConfig {
  provider: 'redis' | 'memory' | 'file';
  host?: string;
  port?: number;
  password?: string;
  database?: number;
  ttl: number;
  maxSize: number;
  compression: boolean;
}

// Table schemas for IndexNow Studio
export interface UserProfileTable {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  country?: string;
  role: string;
  is_active: boolean;
  is_suspended: boolean;
  is_trial_active: boolean;
  trial_ends_at?: Date;
  subscription_status: string;
  subscription_ends_at?: Date;
  package_id?: string;
  package_name?: string;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  last_login_ip?: string;
  suspension_reason?: string;
  suspended_at?: Date;
}

export interface IndexingJobTable {
  id: string;
  user_id: string;
  name: string;
  type: string;
  status: string;
  schedule_type: string;
  cron_expression?: string;
  source_data: any;
  total_urls: number;
  processed_urls: number;
  successful_urls: number;
  failed_urls: number;
  service_account_id?: string;
  tags: string[];
  priority: number;
  created_at: Date;
  updated_at: Date;
  scheduled_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  metadata: any;
}

export interface ServiceAccountTable {
  id: string;
  user_id: string;
  name: string;
  email: string;
  project_id: string;
  credentials: string; // encrypted
  daily_quota_limit: number;
  minute_quota_limit: number;
  daily_quota_used: number;
  minute_quota_used: number;
  quota_reset_at: Date;
  is_active: boolean;
  last_used_at?: Date;
  created_at: Date;
  updated_at: Date;
  description?: string;
}

export interface TransactionTable {
  id: string;
  user_id: string;
  order_id: string;
  package_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  gateway_transaction_id?: string;
  gateway_response: any;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  paid_at?: Date;
  failed_at?: Date;
  refunded_at?: Date;
  metadata: any;
}
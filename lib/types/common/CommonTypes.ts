/**
 * Common type definitions used across IndexNow Studio
 */

// Basic utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// ID types
export type ID = string;
export type UUID = string;
export type Timestamp = string; // ISO 8601 timestamp

// Status types
export type Status = 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Visibility = 'public' | 'private' | 'restricted';

// Common entity interfaces
export interface BaseEntity {
  id: ID;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditableEntity extends BaseEntity {
  createdBy?: ID;
  updatedBy?: ID;
  version?: number;
}

export interface SoftDeletableEntity extends BaseEntity {
  deletedAt?: Date;
  deletedBy?: ID;
  isDeleted: boolean;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// Sorting types
export interface SortParam {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SortOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Filter types
export interface FilterParam {
  field: string;
  operator: FilterOperator;
  value: any;
  condition?: 'AND' | 'OR';
}

export type FilterOperator = 
  | 'eq'      // equals
  | 'ne'      // not equals
  | 'gt'      // greater than
  | 'gte'     // greater than or equal
  | 'lt'      // less than
  | 'lte'     // less than or equal
  | 'in'      // in array
  | 'nin'     // not in array
  | 'like'    // string contains
  | 'ilike'   // case insensitive string contains
  | 'regex'   // regular expression match
  | 'exists'  // field exists
  | 'null'    // field is null
  | 'between' // between two values
  | 'range';  // date range

// Search types
export interface SearchParams {
  query?: string;
  filters?: FilterParam[];
  sort?: SortParam[];
  pagination?: PaginationParams;
}

export interface SearchResult<T> extends PaginatedResult<T> {
  query: string;
  searchTime: number;
  suggestions?: string[];
}

// Date and time types
export interface DateRange {
  from: Date;
  to: Date;
}

export interface TimeRange {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface Period {
  type: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  value: number;
}

// Location types
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  coordinates?: Coordinates;
}

export interface Location {
  name: string;
  address: Address;
  timezone?: string;
}

// File types
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  path?: string;
  url?: string;
  checksum?: string;
}

export interface FileUpload {
  file: File;
  destination?: string;
  metadata?: Record<string, any>;
}

export interface FileDownload {
  filename: string;
  contentType: string;
  size: number;
  stream: ReadableStream;
}

// Media types
export interface ImageInfo extends FileInfo {
  width: number;
  height: number;
  format: string;
  quality?: number;
}

export interface VideoInfo extends FileInfo {
  duration: number;
  resolution: {
    width: number;
    height: number;
  };
  bitrate?: number;
  codec?: string;
}

export interface AudioInfo extends FileInfo {
  duration: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
}

// Notification types
export interface Notification {
  id: ID;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  userId?: ID;
  isRead: boolean;
  priority: Priority;
  expiresAt?: Date;
  createdAt: Date;
}

export type NotificationType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'reminder'
  | 'system'
  | 'marketing';

// Tag types
export interface Tag {
  id: ID;
  name: string;
  color?: string;
  description?: string;
  category?: string;
  usage: number;
  createdAt: Date;
}

export interface TaggedEntity {
  tags: Tag[];
}

// Comment types
export interface Comment {
  id: ID;
  content: string;
  authorId: ID;
  authorName: string;
  parentId?: ID;
  replies?: Comment[];
  likes: number;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentableEntity {
  comments: Comment[];
  commentCount: number;
}

// Metrics types
export interface Metric {
  name: string;
  value: number;
  unit?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MetricGroup {
  name: string;
  metrics: Metric[];
  period: Period;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

// Settings types
export interface Setting {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  description?: string;
  category?: string;
  isRequired: boolean;
  isSecret: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface SettingsGroup {
  name: string;
  description?: string;
  settings: Setting[];
}

// Configuration types
export interface Config {
  environment: 'development' | 'staging' | 'production';
  version: string;
  features: Record<string, boolean>;
  settings: Record<string, any>;
  secrets: Record<string, string>;
}

// Health check types
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheck[];
  timestamp: Date;
  uptime: number;
  version: string;
}

export interface HealthCheck {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// Webhook types
export interface Webhook {
  id: ID;
  url: string;
  events: string[];
  headers?: Record<string, string>;
  secret?: string;
  isActive: boolean;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: ID;
  webhookId: ID;
  event: string;
  payload: Record<string, any>;
  status: 'pending' | 'delivered' | 'failed' | 'cancelled';
  attempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  };
  createdAt: Date;
}

// Task/Job queue types
export interface Task {
  id: ID;
  type: string;
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: Priority;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  timeout?: number;
  retryBackoff?: 'fixed' | 'exponential';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// Cache types
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  tags?: string[];
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
}

export interface CacheStats {
  totalKeys: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  evictions: number;
}

// Utility types for better type inference
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type NonNullable<T> = Exclude<T, null | undefined>;
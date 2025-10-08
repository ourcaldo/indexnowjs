/**
 * Database-related type definitions for IndexNow Studio
 */

// Connection types
export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool?: {
    min: number;
    max: number;
    idle: number;
  };
}

// Query types
export interface QueryOptions {
  select?: string | string[];
  where?: Record<string, any>;
  orderBy?: {
    column: string;
    direction: 'asc' | 'desc';
  }[];
  limit?: number;
  offset?: number;
  join?: {
    table: string;
    on: string;
    type?: 'inner' | 'left' | 'right' | 'full';
  }[];
}

export interface QueryResult<T = any> {
  data: T[];
  count?: number;
  error?: Error;
}

// Transaction types
export interface Transaction {
  id: string;
  queries: string[];
  rollback: () => Promise<void>;
  commit: () => Promise<void>;
}

// Schema types
export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
  triggers?: TriggerDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: {
    table: string;
    column: string;
  };
  constraints?: string[];
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface ConstraintDefinition {
  name: string;
  type: 'primary' | 'foreign' | 'unique' | 'check';
  columns: string[];
  references?: {
    table: string;
    columns: string[];
  };
  checkCondition?: string;
}

export interface TriggerDefinition {
  name: string;
  event: 'insert' | 'update' | 'delete';
  timing: 'before' | 'after';
  function: string;
}
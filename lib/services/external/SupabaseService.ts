/**
 * Supabase Service for IndexNow Studio
 * Centralized database service layer for Supabase operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseConfig, TABLE_PREFIXES, getTableName } from '@/lib/core/config/DatabaseConfig';

export interface DatabaseConnection {
  client: SupabaseClient;
  isConnected: boolean;
  lastHealthCheck: Date;
}

export interface QueryOptions {
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export interface QueryResult<T = any> {
  data: T[] | null;
  error: Error | null;
  count?: number;
}

export interface InsertResult<T = any> {
  data: T | null;
  error: Error | null;
}

export interface UpdateResult<T = any> {
  data: T[] | null;
  error: Error | null;
  count?: number;
}

export interface DeleteResult {
  error: Error | null;
  count?: number;
}

export class SupabaseService {
  private client: SupabaseClient;
  private isConnected: boolean = false;
  private lastHealthCheck: Date = new Date();

  constructor() {
    this.client = createClient(
      DatabaseConfig.supabase.url,
      DatabaseConfig.supabase.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-application-name': 'IndexNow Studio',
          },
        },
      }
    );
  }

  /**
   * Initialize database connection and perform health check
   */
  async initialize(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('indb_site_settings')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Database initialization failed:', error);
        this.isConnected = false;
        return false;
      }

      this.isConnected = true;
      this.lastHealthCheck = new Date();
      return true;
    } catch (error) {
      console.error('Database connection error:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get database client instance
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Check database connection health
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const { error } = await this.client
        .from('indb_site_settings')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          isHealthy: false,
          responseTime,
          error: error.message,
        };
      }

      this.isConnected = true;
      this.lastHealthCheck = new Date();

      return {
        isHealthy: true,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.isConnected = false;

      return {
        isHealthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generic query method with options
   */
  async query<T = any>(
    tableName: string,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    try {
      let query = this.client.from(tableName);

      // Select specific columns or all
      if (options.select) {
        query = query.select(options.select, { count: 'exact' });
      } else {
        query = query.select('*', { count: 'exact' });
      }

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value !== null && value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      return {
        data,
        error: error ? new Error(error.message) : null,
        count: count || undefined,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Query failed'),
      };
    }
  }

  /**
   * Insert data into table
   */
  async insert<T = any>(
    tableName: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<InsertResult<T>> {
    try {
      const { data: insertedData, error } = await this.client
        .from(tableName)
        .insert(data)
        .select()
        .single();

      return {
        data: insertedData,
        error: error ? new Error(error.message) : null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Insert failed'),
      };
    }
  }

  /**
   * Update data in table
   */
  async update<T = any>(
    tableName: string,
    data: Partial<T>,
    filters: Record<string, any>
  ): Promise<UpdateResult<T>> {
    try {
      let query = this.client
        .from(tableName)
        .update(data)
        .select('*', { count: 'exact' });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      });

      const { data: updatedData, error, count } = await query;

      return {
        data: updatedData,
        error: error ? new Error(error.message) : null,
        count: count || undefined,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Update failed'),
      };
    }
  }

  /**
   * Delete data from table
   */
  async delete(
    tableName: string,
    filters: Record<string, any>
  ): Promise<DeleteResult> {
    try {
      let query = this.client
        .from(tableName)
        .delete({ count: 'exact' });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      });

      const { error, count } = await query;

      return {
        error: error ? new Error(error.message) : null,
        count: count || undefined,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Delete failed'),
      };
    }
  }

  /**
   * Execute raw SQL query (use with caution)
   */
  async executeRawQuery<T = any>(
    query: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    try {
      const { data, error } = await this.client.rpc('execute_sql', {
        query_text: query,
        query_params: params || [],
      });

      return {
        data,
        error: error ? new Error(error.message) : null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Raw query failed'),
      };
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): DatabaseConnection {
    return {
      client: this.client,
      isConnected: this.isConnected,
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  /**
   * Helper method to get full table name with prefix
   */
  getTableName(prefix: keyof typeof TABLE_PREFIXES, tableName: string): string {
    return getTableName(prefix, tableName);
  }

  /**
   * Start a database transaction
   */
  async withTransaction<T>(
    callback: (client: SupabaseClient) => Promise<T>
  ): Promise<{ data: T | null; error: Error | null }> {
    try {
      // Supabase doesn't have explicit transaction support in the client library
      // This is a placeholder for transaction-like behavior
      const result = await callback(this.client);
      return { data: result, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Transaction failed'),
      };
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    // Supabase client doesn't need explicit closing
    this.isConnected = false;
  }
}

// Singleton instance
let supabaseService: SupabaseService | null = null;

export const getSupabaseService = (): SupabaseService => {
  if (!supabaseService) {
    supabaseService = new SupabaseService();
  }
  return supabaseService;
};

export default SupabaseService;
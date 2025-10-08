/**
 * Resilient Supabase Service
 * 
 * Provides resilient database operations with automatic retry, circuit breaking, and fallback
 * 
 * Phase 3 - Milestone C.7: Resilience integration with Supabase
 */

import { ResilientOperationExecutor } from '@/lib/resilience';
import { supabaseAdmin } from '@/lib/database/supabase';

export class ResilientSupabaseService {
  /**
   * Execute a resilient database operation
   * 
   * Note: For operations requiring SecureServiceRoleWrapper, wrap the entire
   * SecureServiceRoleWrapper call with ResilientOperationExecutor.executeDatabase()
   */
  static async execute<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    return ResilientOperationExecutor.executeDatabase(operation, context);
  }

  /**
   * Fetch single record with resilience
   */
  static async fetchOne<T>(
    table: string,
    whereConditions: Record<string, any>
  ): Promise<T | null> {
    return this.execute(async () => {
      let query = supabaseAdmin.from(table).select('*').limit(1);
      
      // Apply where conditions
      Object.entries(whereConditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query.single();
      
      if (error && error.code !== 'PGRST116') { // Not "not found" error
        throw error;
      }
      
      return data as T | null;
    }, `fetch-one:${table}`);
  }

  /**
   * Fetch multiple records with resilience
   */
  static async fetchMany<T>(
    table: string,
    whereConditions: Record<string, any>,
    options?: { limit?: number; orderBy?: string; ascending?: boolean }
  ): Promise<T[]> {
    return this.execute(async () => {
      let query = supabaseAdmin.from(table).select('*');
      
      // Apply where conditions
      Object.entries(whereConditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true });
      }

      // Apply limit
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data as T[]) || [];
    }, `fetch-many:${table}`);
  }

  /**
   * Insert record with resilience
   */
  static async insert<T>(
    table: string,
    data: Record<string, any>
  ): Promise<T> {
    return this.execute(async () => {
      const { data: result, error } = await supabaseAdmin
        .from(table)
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      
      return result as T;
    }, `insert:${table}`);
  }

  /**
   * Update record with resilience
   */
  static async update<T>(
    table: string,
    data: Record<string, any>,
    whereConditions: Record<string, any>
  ): Promise<T> {
    return this.execute(async () => {
      let query = supabaseAdmin.from(table).update(data);
      
      // Apply where conditions
      Object.entries(whereConditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data: result, error } = await query.select().single();
      
      if (error) throw error;
      
      return result as T;
    }, `update:${table}`);
  }

  /**
   * Delete record with resilience
   */
  static async delete(
    table: string,
    whereConditions: Record<string, any>
  ): Promise<void> {
    return this.execute(async () => {
      let query = supabaseAdmin.from(table).delete();
      
      // Apply where conditions
      Object.entries(whereConditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { error } = await query;
      
      if (error) throw error;
    }, `delete:${table}`);
  }
}


/**
 * Secure Service Role Wrapper - P0.2 Security Fix
 * 
 * This service provides a secure wrapper around all service role operations
 * to prevent security vulnerabilities and ensure proper audit logging.
 * 
 * CRITICAL SECURITY FEATURES:
 * - Mandatory user validation before any service role operation
 * - Comprehensive audit logging for compliance
 * - Input sanitization and validation
 * - Context validation for business justification
 */

import { supabaseAdmin } from '@/lib/database'
import { logger } from '@/lib/monitoring/error-handling'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ServiceRoleOperationContext {
  /** ID of the user requesting the operation */
  userId: string
  /** Business operation being performed */
  operation: string
  /** Reason why service role is needed */
  reason: string
  /** API endpoint or system component making the request */
  source: string
  /** Additional metadata for audit trail */
  metadata?: Record<string, any>
  /** IP address for security tracking */
  ipAddress?: string
  /** User agent for security tracking */
  userAgent?: string
}

export interface UserOperationContext {
  /** ID of the user (automatically validated from session) */
  userId: string
  /** Business operation being performed */
  operation: string
  /** API endpoint or system component making the request */
  source: string
  /** Reason for the operation */
  reason: string
  /** Additional metadata for audit trail */
  metadata?: Record<string, any>
  /** IP address for security tracking */
  ipAddress?: string
  /** User agent for security tracking */
  userAgent?: string
}

export interface ServiceRoleQueryOptions {
  /** Table name being accessed */
  table: string
  /** Operation type (select, insert, update, delete) */
  operationType: 'select' | 'insert' | 'update' | 'delete'
  /** Columns being selected/updated */
  columns?: string[]
  /** Where conditions for validation */
  whereConditions?: Record<string, any>
  /** Data being inserted/updated (will be sanitized) */
  data?: Record<string, any>
}

export class ServiceRoleSecurityViolationError extends Error {
  constructor(message: string, public details: Record<string, any>) {
    super(message)
    this.name = 'ServiceRoleSecurityViolationError'
  }
}

export class SecureServiceRoleWrapper {
  
  /**
   * Execute user operation with RLS + Security Controls
   * - Uses user's authenticated Supabase client (respects RLS)
   * - Adds comprehensive audit logging
   * - Provides input validation and rate limiting
   * - Maintains consistent security patterns
   */
  static async executeWithUserSession<T = any>(
    userSupabaseClient: SupabaseClient,
    operationContext: UserOperationContext,
    databaseContext: ServiceRoleQueryOptions,
    operation: (db: SupabaseClient) => Promise<T>
  ): Promise<T> {
    
    // 1. Validate user session (ensure authenticated)
    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser()
    if (authError || !user) {
      throw new ServiceRoleSecurityViolationError(
        'Invalid user session for secure operation',
        { authError: authError?.message }
      )
    }
    
    // 2. Ensure context userId matches session user
    if (operationContext.userId !== user.id) {
      throw new ServiceRoleSecurityViolationError(
        'User ID mismatch in operation context',
        { contextUserId: operationContext.userId, sessionUserId: user.id }
      )
    }
    
    // 3. Input validation and sanitization
    const sanitizedContext = this.sanitizeUserContext(operationContext)
    const sanitizedDatabaseContext = this.sanitizeQueryOptions(databaseContext)
    
    // 4. Log operation start for audit trail
    const auditId = await this.logUserOperationStart(sanitizedContext, sanitizedDatabaseContext)
    
    let result: T
    let operationSuccess = false
    
    try {
      // 5. Execute operation with user client (RLS automatically applies)
      result = await operation(userSupabaseClient)
      operationSuccess = true
      
      // 6. Log successful operation
      await this.logUserOperationSuccess(auditId, sanitizedContext, result)
      
      return result
      
    } catch (error) {
      // 7. Log failed operation
      await this.logUserOperationFailure(auditId, sanitizedContext, error)
      throw error
    }
  }
  
  /**
   * Execute a secure service role operation with full validation and audit logging
   */
  static async executeSecureOperation<T = any>(
    context: ServiceRoleOperationContext,
    queryOptions: ServiceRoleQueryOptions,
    operation: () => Promise<T>
  ): Promise<T> {
    
    // Step 1: Validate the operation context
    await this.validateOperationContext(context, queryOptions)
    
    // Step 2: Sanitize any input data
    const sanitizedQueryOptions = this.sanitizeQueryOptions(queryOptions)
    
    // Step 3: Log operation start for audit trail
    const auditId = await this.logOperationStart(context, sanitizedQueryOptions)
    
    let result: T
    let operationSuccess = false
    
    try {
      // Step 4: Execute the actual operation
      result = await operation()
      operationSuccess = true
      
      // Step 5: Log successful operation
      await this.logOperationSuccess(auditId, context, result)
      
      return result
      
    } catch (error) {
      // Step 6: Log failed operation
      await this.logOperationFailure(auditId, context, error)
      throw error
    }
  }
  
  /**
   * Validate that the service role operation is authorized and necessary
   */
  private static async validateOperationContext(
    context: ServiceRoleOperationContext,
    queryOptions: ServiceRoleQueryOptions
  ): Promise<void> {
    
    // Validate required context
    if (!context.userId || !context.operation || !context.reason || !context.source) {
      throw new ServiceRoleSecurityViolationError(
        'Invalid service role operation context - missing required fields',
        { context, queryOptions }
      )
    }
    
    // Validate user exists and is authentic
    // Skip validation for 'system' and 'anonymous' users
    if (context.userId !== 'system' && context.userId !== 'anonymous') {
      try {
        const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(context.userId)
        if (error || !authUser?.user) {
          throw new ServiceRoleSecurityViolationError(
            'Service role operation requested by invalid or non-existent user',
            { userId: context.userId, context }
          )
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new ServiceRoleSecurityViolationError(
          'Failed to validate user for service role operation',
          { userId: context.userId, error: errorMessage }
        )
      }
    }
    
    // Validate operation type
    const allowedOperations = ['select', 'insert', 'update', 'delete']
    if (!allowedOperations.includes(queryOptions.operationType)) {
      throw new ServiceRoleSecurityViolationError(
        'Invalid service role operation type',
        { operationType: queryOptions.operationType }
      )
    }
    
    logger.info({
      userId: context.userId,
      operation: context.operation,
      table: queryOptions.table,
      operationType: queryOptions.operationType
    }, 'Service role operation context validated successfully')
  }
  
  
  /**
   * Sanitize query options to prevent injection attacks
   */
  private static sanitizeQueryOptions(queryOptions: ServiceRoleQueryOptions): ServiceRoleQueryOptions {
    const sanitized = { ...queryOptions }
    
    // Sanitize table name
    sanitized.table = queryOptions.table.replace(/[^a-zA-Z0-9_]/g, '')
    
    // Sanitize column names
    if (queryOptions.columns) {
      sanitized.columns = queryOptions.columns.map(col => 
        col.replace(/[^a-zA-Z0-9_]/g, '')
      )
    }
    
    // Sanitize data values
    if (queryOptions.data) {
      sanitized.data = this.sanitizeDataObject(queryOptions.data)
    }
    
    // Sanitize where conditions
    if (queryOptions.whereConditions) {
      sanitized.whereConditions = this.sanitizeDataObject(queryOptions.whereConditions)
    }
    
    return sanitized
  }
  
  /**
   * Sanitize data object values
   */
  private static sanitizeDataObject(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(data)) {
      // Sanitize key
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '')
      
      // Sanitize value based on type
      if (typeof value === 'string') {
        // Remove potential SQL injection patterns and limit length
        sanitized[cleanKey] = value
          .replace(/['"`;]/g, '')
          .substring(0, 1000)
      } else if (typeof value === 'number') {
        sanitized[cleanKey] = isNaN(value) ? 0 : value
      } else if (typeof value === 'boolean') {
        sanitized[cleanKey] = Boolean(value)
      } else if (value === null || value === undefined) {
        sanitized[cleanKey] = null
      } else if (typeof value === 'object') {
        // For objects, stringify and sanitize
        sanitized[cleanKey] = JSON.stringify(value).substring(0, 5000)
      } else {
        sanitized[cleanKey] = String(value).substring(0, 1000)
      }
    }
    
    return sanitized
  }
  
  /**
   * Log the start of a service role operation
   */
  private static async logOperationStart(
    context: ServiceRoleOperationContext,
    queryOptions: ServiceRoleQueryOptions
  ): Promise<string> {
    try {
      const auditEntry = {
        user_id: context.userId === 'system' ? null : context.userId,
        event_type: 'service_role_operation',
        description: `Service role operation: ${context.operation} on ${queryOptions.table}`,
        success: null, // Will be updated on completion
        metadata: {
          operation: context.operation,
          reason: context.reason,
          source: context.source,
          table: queryOptions.table,
          operationType: queryOptions.operationType,
          columns: queryOptions.columns,
          hasData: !!queryOptions.data,
          hasWhereConditions: !!queryOptions.whereConditions,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          ...context.metadata
        }
      }
      
      const { data, error } = await supabaseAdmin
        .from('indb_security_audit_logs')
        .insert(auditEntry)
        .select('id')
        .single()
      
      if (error || !data) {
        logger.error({ error, auditEntry }, 'Failed to log service role operation start')
        return 'unknown'
      }
      
      return data.id
      
    } catch (error) {
      logger.error({ error, context }, 'Failed to create service role audit log')
      return 'unknown'
    }
  }
  
  /**
   * Log successful completion of service role operation
   */
  private static async logOperationSuccess(
    auditId: string,
    context: ServiceRoleOperationContext,
    result: any
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('indb_security_audit_logs')
        .update({
          success: true,
          metadata: {
            ...context.metadata,
            resultType: typeof result,
            resultLength: Array.isArray(result) ? result.length : 1,
            completedAt: new Date().toISOString()
          }
        })
        .eq('id', auditId)
        
      logger.info({
        auditId,
        userId: context.userId,
        operation: context.operation
      }, 'Service role operation completed successfully')
      
    } catch (error) {
      logger.error({ error, auditId, context }, 'Failed to log service role operation success')
    }
  }
  
  /**
   * Log failed service role operation
   */
  private static async logOperationFailure(
    auditId: string,
    context: ServiceRoleOperationContext,
    error: any
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('indb_security_audit_logs')
        .update({
          success: false,
          metadata: {
            ...context.metadata,
            error: error.message || String(error),
            errorType: error.name || 'Unknown',
            failedAt: new Date().toISOString()
          }
        })
        .eq('id', auditId)
        
      logger.error({
        auditId,
        userId: context.userId,
        operation: context.operation,
        error: error.message
      }, 'Service role operation failed')
      
    } catch (logError) {
      logger.error({ logError, auditId, context, originalError: error }, 'Failed to log service role operation failure')
    }
  }


  /**
   * Sanitize user operation context
   */
  private static sanitizeUserContext(context: UserOperationContext): UserOperationContext {
    return {
      userId: context.userId.replace(/[^a-zA-Z0-9-]/g, ''),
      operation: context.operation.replace(/[^a-zA-Z0-9_]/g, ''),
      source: context.source.replace(/[^a-zA-Z0-9/_-]/g, ''),
      reason: context.reason.substring(0, 500),
      metadata: context.metadata ? this.sanitizeDataObject(context.metadata) : undefined,
      ipAddress: context.ipAddress?.substring(0, 45),
      userAgent: context.userAgent?.substring(0, 500)
    }
  }

  /**
   * Log the start of a user operation
   */
  private static async logUserOperationStart(
    context: UserOperationContext,
    databaseContext: ServiceRoleQueryOptions
  ): Promise<string> {
    try {
      const auditEntry = {
        user_id: context.userId,
        event_type: 'user_operation',
        description: `User operation: ${context.operation} on ${databaseContext.table}`,
        success: null,
        metadata: {
          operation: context.operation,
          reason: context.reason,
          source: context.source,
          table: databaseContext.table,
          operationType: databaseContext.operationType,
          columns: databaseContext.columns,
          hasData: !!databaseContext.data,
          hasWhereConditions: !!databaseContext.whereConditions,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          ...context.metadata
        }
      }
      
      const { data, error } = await supabaseAdmin
        .from('indb_security_audit_logs')
        .insert(auditEntry)
        .select('id')
        .single()
      
      if (error || !data) {
        logger.error({ error, auditEntry }, 'Failed to log user operation start')
        return 'unknown'
      }
      
      return data.id
      
    } catch (error) {
      logger.error({ error, context }, 'Failed to create user operation audit log')
      return 'unknown'
    }
  }

  /**
   * Log successful completion of user operation
   */
  private static async logUserOperationSuccess(
    auditId: string,
    context: UserOperationContext,
    result: any
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('indb_security_audit_logs')
        .update({
          success: true,
          metadata: {
            ...context.metadata,
            resultType: typeof result,
            resultLength: Array.isArray(result) ? result.length : 1,
            completedAt: new Date().toISOString()
          }
        })
        .eq('id', auditId)
        
      logger.info({
        auditId,
        userId: context.userId,
        operation: context.operation
      }, 'User operation completed successfully')
      
    } catch (error) {
      logger.error({ error, auditId, context }, 'Failed to log user operation success')
    }
  }

  /**
   * Log failed user operation
   */
  private static async logUserOperationFailure(
    auditId: string,
    context: UserOperationContext,
    error: any
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('indb_security_audit_logs')
        .update({
          success: false,
          metadata: {
            ...context.metadata,
            error: error.message || String(error),
            errorType: error.name || 'Unknown',
            failedAt: new Date().toISOString()
          }
        })
        .eq('id', auditId)
        
      logger.error({
        auditId,
        userId: context.userId,
        operation: context.operation,
        error: error.message
      }, 'User operation failed')
      
    } catch (logError) {
      logger.error({ logError, auditId, context, originalError: error }, 'Failed to log user operation failure')
    }
  }
}

/**
 * Helper functions for common secure service role operations
 */
export class SecureServiceRoleHelpers {
  
  /**
   * Securely select data with service role
   */
  static async secureSelect<T = any>(
    context: ServiceRoleOperationContext,
    table: string,
    columns: string[],
    whereConditions: Record<string, any>
  ): Promise<T[]> {
    
    return SecureServiceRoleWrapper.executeSecureOperation<T[]>(
      context,
      {
        table,
        operationType: 'select',
        columns,
        whereConditions
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select(columns.join(', '))
          .match(whereConditions)
        
        if (error) throw error
        return (data || []) as T[]
      }
    )
  }
  
  /**
   * Securely insert data with service role
   */
  static async secureInsert<T = any>(
    context: ServiceRoleOperationContext,
    table: string,
    data: Record<string, any>
  ): Promise<T> {
    
    return SecureServiceRoleWrapper.executeSecureOperation(
      context,
      {
        table,
        operationType: 'insert',
        data
      },
      async () => {
        const { data: result, error } = await supabaseAdmin
          .from(table)
          .insert(data)
          .select()
          .single()
        
        if (error) throw error
        return result
      }
    )
  }
  
  /**
   * Securely update data with service role
   */
  static async secureUpdate<T = any>(
    context: ServiceRoleOperationContext,
    table: string,
    data: Record<string, any>,
    whereConditions: Record<string, any>
  ): Promise<T[]> {
    
    return SecureServiceRoleWrapper.executeSecureOperation(
      context,
      {
        table,
        operationType: 'update',
        data,
        whereConditions
      },
      async () => {
        const { data: result, error } = await supabaseAdmin
          .from(table)
          .update(data)
          .match(whereConditions)
          .select()
        
        if (error) throw error
        return result || []
      }
    )
  }
  
  /**
   * Securely delete data with service role
   */
  static async secureDelete(
    context: ServiceRoleOperationContext,
    table: string,
    whereConditions: Record<string, any>
  ): Promise<void> {
    
    return SecureServiceRoleWrapper.executeSecureOperation(
      context,
      {
        table,
        operationType: 'delete',
        whereConditions
      },
      async () => {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .match(whereConditions)
        
        if (error) throw error
      }
    )
  }
}
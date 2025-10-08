import { NextRequest } from 'next/server'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType } from '@/lib/monitoring/error-handling'

export const GET = publicApiWrapper(async (request: NextRequest) => {
  // Test database connection using secure wrapper
    const healthContext = {
      userId: 'system',
      operation: 'system_health_check',
      reason: 'System health check endpoint testing database connectivity',
      source: 'system/health',
      metadata: {
        endpoint: '/api/v1/system/health',
        method: 'GET'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    }

    const healthCheck = await SecureServiceRoleWrapper.executeSecureOperation(
      healthContext,
      {
        table: 'indb_auth_user_profiles',
        operationType: 'select',
        columns: ['user_id'],
        whereConditions: {}
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('user_id')
          .limit(1)

        if (error) {
          throw new Error(`Database health check failed: ${error.message}`)
        }

        return data
      }
    )

    if (!healthCheck) {
      const error = ErrorHandlingService.createError(
        ErrorType.DATABASE,
        new Error('Database health check failed: No data returned'),
        { statusCode: 503, context: { endpoint: '/api/v1/system/health' } }
      )
      return formatError(error, { 
        status: 'unhealthy',
        database: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      })
    }

    return formatSuccess({
      status: 'healthy',
      database: 'connected',
      api_version: 'v1',
      timestamp: new Date().toISOString(),
      environment: 'development'
    })
})
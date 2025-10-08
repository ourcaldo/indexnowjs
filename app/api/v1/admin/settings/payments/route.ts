import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { logger } from '@/lib/monitoring/error-handling'
import { supabaseAdmin } from '@/lib/database'

export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Log admin payment gateway access
  if (adminUser?.id) {
    try {
      await ActivityLogger.logAdminSettingsActivity(
        adminUser.id,
        ActivityEventTypes.PAYMENT_GATEWAY_VIEW,
        'Accessed payment gateway settings',
        request,
        {
          section: 'payment_gateways',
          action: 'view_gateways',
          adminEmail: adminUser.email
        }
      )
    } catch (logError) {
      logger.error({
        error: logError instanceof Error ? logError.message : 'Unknown error',
        userId: adminUser.id,
        endpoint: '/api/v1/admin/settings/payments',
        method: 'GET'
      }, 'Failed to log payment gateway access activity')
    }
  }

  // Fetch payment gateways using secure admin operation
  const result = await withDatabaseOperation(
    async () => {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser?.id || 'unknown',
          operation: 'get_payment_gateways',
          source: 'admin/settings/payments',
          reason: 'Admin fetching payment gateway settings',
          metadata: {
            endpoint: '/api/v1/admin/settings/payments',
            method: 'GET'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        },
        { table: 'indb_payment_gateways', operationType: 'select' },
        async () => {
          const { data: gatewaysData, error } = await supabaseAdmin
            .from('indb_payment_gateways')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) {
            throw new Error('Failed to fetch payment gateways')
          }
          
          return gatewaysData || []
        }
      )
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/settings/payments' }
  )

  if (!result.success) {
    return result
  }

  return formatSuccess({ gateways: result.data || [] }, undefined, 200)
})

export const POST = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const body = await request.json()

  // Create payment gateway using secure admin operation
  const result = await withDatabaseOperation(
    async () => {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser?.id || 'unknown',
          operation: 'create_payment_gateway',
          source: 'admin/settings/payments',
          reason: 'Admin creating new payment gateway',
          metadata: {
            gatewayName: body.name,
            gatewaySlug: body.slug,
            isDefault: body.is_default || false,
            endpoint: '/api/v1/admin/settings/payments',
            method: 'POST'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        },
        { table: 'indb_payment_gateways', operationType: 'insert' },
        async () => {
          // If setting as default, remove default from other gateways first
          if (body.is_default) {
            await supabaseAdmin
              .from('indb_payment_gateways')
              .update({ is_default: false })
              .neq('id', 'placeholder')
          }

          const { data: gatewayData, error } = await supabaseAdmin
            .from('indb_payment_gateways')
            .insert({
              name: body.name,
              slug: body.slug,
              description: body.description,
              is_active: body.is_active || false,
              is_default: body.is_default || false,
              configuration: body.configuration || {},
              api_credentials: body.api_credentials || {}
            })
            .select()
            .single()

          if (error) {
            throw new Error('Failed to create payment gateway')
          }
          
          return gatewayData
        }
      )
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/settings/payments' }
  )

  if (!result.success) {
    return result
  }

  const gateway = result.data

  // Log payment gateway creation
  if (adminUser?.id && gateway) {
    try {
      await ActivityLogger.logAdminSettingsActivity(
        adminUser.id,
        ActivityEventTypes.PAYMENT_GATEWAY_CREATE,
        `Created new payment gateway: ${gateway.name}`,
        request,
        {
          section: 'payment_gateways',
          action: 'create_gateway',
          adminEmail: adminUser.email,
          gatewayName: gateway.name,
          gatewaySlug: gateway.slug,
          isDefault: gateway.is_default
        }
      )
    } catch (logError) {
      logger.error({
        error: logError instanceof Error ? logError.message : 'Unknown error',
        userId: adminUser.id,
        endpoint: '/api/v1/admin/settings/payments',
        method: 'POST'
      }, 'Failed to log payment gateway creation activity')
    }
  }

  return formatSuccess({ gateway }, undefined, 201)
})

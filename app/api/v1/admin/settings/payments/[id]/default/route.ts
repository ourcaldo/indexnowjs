import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'

export const PATCH = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Extract ID from URL path - it's the second-to-last segment (before 'default')
  const pathParts = request.url.split('/').filter(Boolean)
  const id = pathParts[pathParts.length - 2]

  // Reset all gateways' default status using secure wrapper
  const resetDefaultContext = {
    userId: adminUser.id,
    operation: 'admin_reset_all_payment_gateway_defaults',
    reason: 'Admin setting new default payment gateway - resetting all others first',
    source: 'admin/settings/payments/[id]/default',
    metadata: {
      newDefaultGatewayId: id,
      endpoint: '/api/v1/admin/settings/payments/[id]/default'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: request.headers.get('user-agent')
  }

  await SecureServiceRoleWrapper.executeSecureOperation(
    resetDefaultContext,
    {
      table: 'indb_payment_gateways',
      operationType: 'update',
      columns: ['is_default'],
      whereConditions: { 'id_neq': 'placeholder' },
      data: { is_default: false }
    },
    async () => {
      const { error } = await supabaseAdmin
        .from('indb_payment_gateways')
        .update({ is_default: false })
        .neq('id', 'placeholder')

      if (error) {
        throw new Error(`Failed to reset default gateways: ${error.message}`)
      }

      return { success: true }
    }
  )

  // Set this gateway as default using secure wrapper
  const setDefaultContext = {
    userId: adminUser.id,
    operation: 'admin_set_payment_gateway_as_default',
    reason: 'Admin setting specific payment gateway as the default',
    source: 'admin/settings/payments/[id]/default',
    metadata: {
      defaultGatewayId: id,
      endpoint: '/api/v1/admin/settings/payments/[id]/default'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: request.headers.get('user-agent')
  }

  const result = await withDatabaseOperation(
    async () => {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        setDefaultContext,
        {
          table: 'indb_payment_gateways',
          operationType: 'update',
          columns: ['is_default', 'updated_at'],
          whereConditions: { id },
          data: { 
            is_default: true,
            updated_at: new Date().toISOString()
          }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_payment_gateways')
            .update({ 
              is_default: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

          if (error) {
            throw new Error(`Failed to set default payment gateway: ${error.message}`)
          }

          return data
        }
      )
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/settings/payments/[id]/default' }
  )

  if (!result.success) {
    return result
  }

  return formatSuccess({ gateway: result.data }, undefined, 200)
})

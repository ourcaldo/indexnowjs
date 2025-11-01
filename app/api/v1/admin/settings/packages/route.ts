import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database'

export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Get payment packages using secure admin operation
  const result = await withDatabaseOperation(
    async () => {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser.id,
          operation: 'get_payment_packages',
          source: 'admin/settings/packages',
          reason: 'Admin fetching payment packages list',
          metadata: {
            endpoint: '/api/v1/admin/settings/packages',
            method: 'GET'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        },
        { table: 'indb_payment_packages', operationType: 'select' },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_payment_packages')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) {
            throw new Error(`Failed to fetch packages: ${error.message}`)
          }
          return data || []
        }
      )
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/settings/packages' }
  )

  if (!result.success) {
    return result
  }

  return formatSuccess({ packages: result.data }, undefined, 200)
})

export const POST = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const body = await request.json()

  // Create payment package using secure admin operation
  const result = await withDatabaseOperation(
    async () => {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: adminUser.id,
          operation: 'create_payment_package',
          source: 'admin/settings/packages',
          reason: 'Admin creating new payment package',
          metadata: {
            packageName: body.name,
            slug: body.slug,
            endpoint: '/api/v1/admin/settings/packages',
            method: 'POST'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        },
        { table: 'indb_payment_packages', operationType: 'insert' },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_payment_packages')
            .insert({
              name: body.name,
              slug: body.slug,
              description: body.description,
              currency: 'USD',
              billing_period: body.billing_period || 'monthly',
              features: body.features || [],
              quota_limits: body.quota_limits || {},
              is_active: body.is_active || false,
              sort_order: body.sort_order || 0,
              pricing_tiers: body.pricing_tiers || []
            })
            .select()
            .single()

          if (error) {
            throw new Error(`Failed to create package: ${error.message}`)
          }
          return data
        }
      )
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/settings/packages' }
  )

  if (!result.success) {
    return result
  }

  return formatSuccess({ package: result.data }, undefined, 201)
})

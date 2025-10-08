import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'

export const PATCH = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Extract ID from URL path
  const id = request.url.split('/').filter(Boolean).pop() || ''
  const body = await request.json()

  // Update package using secure wrapper
  const updateContext = {
    userId: adminUser.id,
    operation: 'admin_update_package',
    reason: 'Admin updating package configuration and settings',
    source: 'admin/settings/packages/[id]',
    metadata: {
      packageId: id,
      updateData: {
        name: body.name,
        slug: body.slug,
        isActive: body.is_active,
        isPopular: body.is_popular
      },
      endpoint: '/api/v1/admin/settings/packages/[id]'
    }
  }

  const updateData = {
    name: body.name,
    slug: body.slug,
    description: body.description,
    currency: body.currency,
    billing_period: body.billing_period,
    features: body.features || [],
    quota_limits: body.quota_limits || {},
    is_active: body.is_active,
    is_popular: body.is_popular,
    sort_order: body.sort_order,
    pricing_tiers: body.pricing_tiers || [],
    updated_at: new Date().toISOString()
  }

  const result = await withDatabaseOperation(
    async () => {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        updateContext,
        {
          table: 'indb_payment_packages',
          operationType: 'update',
          columns: Object.keys(updateData),
          whereConditions: { id },
          data: updateData
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_payment_packages')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

          if (error) {
            throw new Error(`Failed to update package: ${error.message}`)
          }

          return data
        }
      )
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/settings/packages/[id]' }
  )

  if (!result.success) {
    return result
  }

  return formatSuccess({ package: result.data }, undefined, 200)
})

export const DELETE = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Extract ID from URL path
  const id = request.url.split('/').filter(Boolean).pop() || ''

  // Delete package using secure wrapper
  const deleteContext = {
    userId: adminUser.id,
    operation: 'admin_delete_package',
    reason: 'Admin deleting package configuration',
    source: 'admin/settings/packages/[id]',
    metadata: {
      packageId: id,
      endpoint: '/api/v1/admin/settings/packages/[id]'
    }
  }

  const result = await withDatabaseOperation(
    async () => {
      return await SecureServiceRoleWrapper.executeSecureOperation(
        deleteContext,
        {
          table: 'indb_payment_packages',
          operationType: 'delete',
          whereConditions: { id }
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_payment_packages')
            .delete()
            .eq('id', id)

          if (error) {
            throw new Error(`Failed to delete package: ${error.message}`)
          }

          return { success: true }
        }
      )
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/settings/packages/[id]' }
  )

  if (!result.success) {
    return result
  }

  return formatSuccess({ success: true }, undefined, 200)
})

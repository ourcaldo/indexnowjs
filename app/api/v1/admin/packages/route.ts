import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'

export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const response = await withDatabaseOperation(
    async () => {
      // Get all active packages using secure wrapper
      const packagesContext = {
        userId: adminUser.id,
        operation: 'admin_get_active_packages',
        reason: 'Super admin fetching all active packages for management',
        source: 'admin/packages',
        metadata: {
          endpoint: '/api/v1/admin/packages',
          filterActive: true
        }
      }

      const packages = await SecureServiceRoleWrapper.executeSecureOperation(
        packagesContext,
        {
          table: 'indb_payment_packages',
          operationType: 'select',
          columns: ['*'],
          whereConditions: { is_active: true }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_payment_packages')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

          if (error) {
            throw new Error(`Failed to fetch packages: ${error.message}`)
          }

          return data || []
        }
      )

      return { packages: packages || [] }
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/packages' }
  )

  if (!response.success) {
    return response
  }

  return formatSuccess({ packages: response.data.packages || [] })
})
import { NextRequest } from 'next/server'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { supabaseAdmin } from '@/lib/database'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

export const GET = publicApiWrapper(async (request: NextRequest) => {
  // Fetch all active packages for public display using secure wrapper
  const publicPackagesContext = {
    userId: 'system',
    operation: 'public_get_packages',
    reason: 'Public API fetching active packages for website display',
    source: 'public/packages',
    metadata: {
      endpoint: '/api/v1/public/packages',
      method: 'GET'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: request.headers.get('user-agent') || undefined
  }

  const packages = await SecureServiceRoleWrapper.executeSecureOperation(
    publicPackagesContext,
    {
      table: 'indb_payment_packages',
      operationType: 'select',
      columns: [
        'id', 'name', 'slug', 'description', 'currency', 'billing_period',
        'features', 'quota_limits', 'pricing_tiers', 'is_active', 
        'sort_order', 'free_trial_enabled'
      ],
      whereConditions: { is_active: true }
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_payment_packages')
        .select(`
          id,
          name,
          slug,
          description,
          currency,
          billing_period,
          features,
          quota_limits,
          pricing_tiers,
          is_active,
          sort_order,
          free_trial_enabled
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch packages: ${error.message}`)
      }

      return data
    }
  )

  // Format packages for public consumption (remove sensitive data if any)
  const publicPackages = packages?.map(pkg => ({
    ...pkg,
    // Ensure pricing tiers are properly formatted
    pricing_tiers: pkg.pricing_tiers || {},
    // Ensure quota limits are available
    quota_limits: pkg.quota_limits || {}
  })) || []

  return formatSuccess({
    packages: publicPackages,
    count: publicPackages.length
  })
})

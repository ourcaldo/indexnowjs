import { NextRequest } from 'next/server'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const packages = await SecureServiceRoleWrapper.executeWithUserSession(
    auth.supabase,
    {
      userId: auth.userId,
      operation: 'get_active_billing_packages',
      source: 'billing/packages',
      reason: 'User fetching available billing packages for subscription selection',
      metadata: { endpoint: '/api/v1/billing/packages', packageFilter: 'active_only' },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    },
    { table: 'indb_payment_packages', operationType: 'select' },
    async (db) => {
      const { data, error } = await db
        .from('indb_payment_packages')
        .select('*')
        .eq('is_active', true)

      if (error) throw error
      return data || []
    }
  )

  if (!packages || packages.length === 0) {
    const error = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      'No packages found',
      {
        severity: ErrorSeverity.LOW,
        userId: auth.userId,
        endpoint: '/api/v1/billing/packages',
        statusCode: 404
      }
    )
    return formatError(error)
  }

  packages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  const userProfile = await SecureServiceRoleWrapper.executeWithUserSession(
    auth.supabase,
    {
      userId: auth.userId,
      operation: 'get_user_billing_profile',
      source: 'billing/packages',
      reason: 'User fetching their billing profile information for package display',
      metadata: { endpoint: '/api/v1/billing/packages', profileFields: 'package_id, expires_at, country' },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    },
    { table: 'indb_auth_user_profiles', operationType: 'select' },
    async (db) => {
      const { data, error } = await db
        .from('indb_auth_user_profiles')
        .select('package_id, expires_at, country')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    }
  ).catch(() => null)
  
  const transformedPackages = packages.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    slug: pkg.slug,
    description: pkg.description,
    price: 0,
    currency: 'USD',
    billing_period: pkg.billing_period,
    features: pkg.features || [],
    quota_limits: pkg.quota_limits || {},
    is_popular: pkg.is_popular || false,
    is_current: userProfile ? pkg.id === userProfile.package_id : false,
    pricing_tiers: pkg.pricing_tiers || {},
    user_country: userProfile?.country,
    free_trial_enabled: pkg.free_trial_enabled || false
  })) || []

  return formatSuccess({
    packages: transformedPackages,
    current_package_id: userProfile?.package_id,
    expires_at: userProfile?.expires_at,
    currency: 'USD',
    user_country: userProfile?.country
  })
})

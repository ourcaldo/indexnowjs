import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import { logger } from '@/lib/monitoring/error-handling'

export const GET = authenticatedApiWrapper(async (request, auth) => {
  try {
    const profile = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_user_profile',
        source: 'auth/user/profile',
        reason: 'User fetching their own profile with package information',
        metadata: { includePackageInfo: true, endpoint: '/api/v1/auth/user/profile' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'indb_auth_user_profiles', operationType: 'select' },
      async (db) => {
        const { data, error } = await db
          .from('indb_auth_user_profiles')
          .select(`
            *,
            package:indb_payment_packages(id, name, slug, description, currency, billing_period, features, quota_limits, is_active, pricing_tiers)
          `)
          .single()
        if (error) throw error
        return data
      }
    )

    if (!profile) {
      const notFoundError = await ErrorHandlingService.createError(
        ErrorType.NOT_FOUND,
        'Access denied',
        { severity: ErrorSeverity.MEDIUM, userId: auth.userId, statusCode: 404 }
      )
      return formatError(notFoundError)
    }

    const { data: { user: authUser } } = await auth.supabase.auth.getUser()

    const [serviceAccountsResult, activeJobsResult] = await Promise.all([
      SecureServiceRoleWrapper.executeWithUserSession(
        auth.supabase,
        {
          userId: auth.userId,
          operation: 'get_user_service_accounts_count',
          source: 'auth/user/profile',
          reason: 'User fetching their own service account statistics',
          metadata: { statsType: 'service_accounts', endpoint: '/api/v1/auth/user/profile' },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_google_service_accounts', operationType: 'select' },
        async (db) => {
          const { count, error } = await db
            .from('indb_google_service_accounts')
            .select('id', { count: 'exact' })
            .eq('is_active', true)
          if (error) throw error
          return { count }
        }
      ),
      SecureServiceRoleWrapper.executeWithUserSession(
        auth.supabase,
        {
          userId: auth.userId,
          operation: 'get_user_active_jobs_count',
          source: 'auth/user/profile',
          reason: 'User fetching their own active job statistics',
          metadata: { statsType: 'active_jobs', endpoint: '/api/v1/auth/user/profile' },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_indexing_jobs', operationType: 'select' },
        async (db) => {
          const { count, error } = await db
            .from('indb_indexing_jobs')
            .select('id', { count: 'exact' })
            .in('status', ['running', 'pending'])
          if (error) throw error
          return { count }
        }
      )
    ])

    let transformedPackage = profile.package
    
    if (profile.package) {
      const packageData = profile.package
      
      let pricingTiers = packageData.pricing_tiers
      if (typeof pricingTiers === 'string') {
        try {
          pricingTiers = JSON.parse(pricingTiers)
        } catch (e) {
          pricingTiers = null
        }
      }
      
      if (pricingTiers && typeof pricingTiers === 'object') {
        const billingPeriod = packageData.billing_period || 'monthly'
        const tierData = pricingTiers[billingPeriod]
        
        if (tierData) {
          const finalPrice = tierData.promo_price || tierData.regular_price
          
          transformedPackage = {
            ...packageData,
            currency: 'USD',
            price: finalPrice,
            billing_period: billingPeriod,
            pricing_tiers: pricingTiers
          }
        } else {
          transformedPackage = { ...packageData, price: 0, currency: 'USD' }
        }
      }
    }

    const userProfile = {
      ...profile,
      package: transformedPackage,
      email: authUser?.email || null,
      email_confirmed_at: authUser?.email_confirmed_at || null,
      last_sign_in_at: authUser?.last_sign_in_at || null,
      service_account_count: serviceAccountsResult.count || 0,
      active_jobs_count: activeJobsResult.count || 0,
    }

    return formatSuccess({ profile: userProfile })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/auth/user/profile', method: 'GET', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

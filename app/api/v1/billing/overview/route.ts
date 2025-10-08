import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserCurrency } from '@/lib/utils/currency-utils'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

export const GET = authenticatedApiWrapper(async (request: NextRequest, user) => {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // No-op for GET requests
        },
      },
    }
  )

  let userProfile = null
  try {
    userProfile = await SecureServiceRoleWrapper.executeWithUserSession(
      supabase,
      {
        userId: user.id,
        operation: 'get_billing_user_profile',
        source: 'billing/overview',
        reason: 'User fetching their billing profile with package information',
        metadata: { endpoint: '/api/v1/billing/overview' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_auth_user_profiles', operationType: 'select' },
      async (db) => {
        const { data, error } = await db
          .from('indb_auth_user_profiles')
          .select(`
            *,
            package:indb_payment_packages(*)
          `)
          .single()
        
        if (error) throw error
        return data
      }
    )
  } catch (error) {
    throw new Error('Failed to fetch user profile')
  }

  let currentSubscription = null
  let subscriptionError = null
  try {
    currentSubscription = await SecureServiceRoleWrapper.executeWithUserSession(
      supabase,
      {
        userId: user.id,
        operation: 'get_active_subscription',
        source: 'billing/overview',
        reason: 'User fetching their active billing subscription for overview',
        metadata: { endpoint: '/api/v1/billing/overview' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_payment_subscriptions', operationType: 'select' },
      async (db) => {
        const { data, error } = await db
          .from('indb_payment_subscriptions')
          .select(`
            *,
            package:indb_payment_packages(*),
            gateway:indb_payment_gateways(*)
          `)
          .eq('subscription_status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (error) throw error
        return data
      }
    )
  } catch (error) {
    subscriptionError = error
  }

  let billingStats = null
  let statsError = null
  try {
    billingStats = await SecureServiceRoleWrapper.executeWithUserSession(
      supabase,
      {
        userId: user.id,
        operation: 'get_billing_statistics',
        source: 'billing/overview',
        reason: 'User fetching their billing statistics for overview',
        metadata: { endpoint: '/api/v1/billing/overview' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'user_billing_summary', operationType: 'select' },
      async (db) => {
        const { data, error } = await db
          .from('user_billing_summary')
          .select('*')
          .single()
        
        if (error) throw error
        return data
      }
    )
  } catch (error) {
    statsError = error
  }

  let recentTransactions = null
  let transactionsError = null
  try {
    recentTransactions = await SecureServiceRoleWrapper.executeWithUserSession(
      supabase,
      {
        userId: user.id,
        operation: 'get_recent_transactions',
        source: 'billing/overview',
        reason: 'User fetching their recent billing transactions for overview',
        metadata: { endpoint: '/api/v1/billing/overview' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_payment_transactions', operationType: 'select' },
      async (db) => {
        const { data, error } = await db
          .from('indb_payment_transactions')
          .select(`
            *,
            package:indb_payment_packages(name),
            gateway:indb_payment_gateways(name)
          `)
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (error) throw error
        return data || []
      }
    )
  } catch (error) {
    transactionsError = error
    recentTransactions = []
  }

  let daysRemaining = null
  if (userProfile.expires_at) {
    const expiryDate = new Date(userProfile.expires_at)
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  let subscriptionData = null
  
  if (currentSubscription) {
    subscriptionData = {
      package_name: currentSubscription.package?.name || 'Unknown',
      package_slug: currentSubscription.package?.slug || '',
      subscription_status: currentSubscription.subscription_status,
      expires_at: currentSubscription.expires_at,
      subscribed_at: currentSubscription.started_at,
      amount_paid: parseFloat(currentSubscription.amount_paid || '0'),
      billing_period: currentSubscription.billing_period
    }
  } else if (userProfile.package_id && userProfile.package) {
    const userCurrency = getUserCurrency(userProfile.country)
    const billingPeriod = userProfile.package.billing_period || 'monthly'
    
    let calculatedAmount = 0
    if (userProfile.package.pricing_tiers?.[billingPeriod]?.[userCurrency]) {
      const currencyTier = userProfile.package.pricing_tiers[billingPeriod][userCurrency]
      calculatedAmount = currencyTier.promo_price || currencyTier.regular_price || 0
    } else {
      calculatedAmount = userProfile.package.price || 0
    }

    subscriptionData = {
      package_name: userProfile.package.name || 'Unknown',
      package_slug: userProfile.package.slug || '',
      subscription_status: userProfile.expires_at && new Date(userProfile.expires_at) > new Date() ? 'active' : 'expired',
      expires_at: userProfile.expires_at,
      subscribed_at: userProfile.subscribed_at,
      amount_paid: calculatedAmount,
      billing_period: billingPeriod
    }
  }

  const responseData = {
    currentSubscription: subscriptionData,
    billingStats: {
      total_payments: billingStats?.total_payments || 0,
      total_spent: parseFloat(billingStats?.total_spent || '0'),
      next_billing_date: userProfile.expires_at,
      days_remaining: daysRemaining
    },
    recentTransactions: (recentTransactions || []).map(transaction => ({
      id: transaction.id,
      transaction_type: transaction.transaction_type,
      amount: parseFloat(transaction.amount || '0'),
      currency: transaction.currency,
      transaction_status: transaction.transaction_status,
      created_at: transaction.created_at,
      package_name: transaction.package?.name || 'Unknown',
      payment_method: transaction.payment_method || 'Unknown'
    }))
  }

  return formatSuccess(responseData)
})

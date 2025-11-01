import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType } from '@/lib/monitoring/error-handling'

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  try {
    // Use authenticated supabase client from auth wrapper
    const supabase = auth.supabase
    const userId = auth.userId

    // Execute all queries in parallel using user session security wrapper
    const dashboardQueryResult = await SecureServiceRoleWrapper.executeWithUserSession(
      supabase,
      {
        userId: userId,
        operation: 'get_dashboard_data',
        source: 'dashboard',
        reason: 'User fetching their complete dashboard data',
        metadata: {
          endpoint: '/api/v1/dashboard',
          queryType: 'parallel_dashboard_queries'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'multiple_tables', operationType: 'select' },
      async (db) => {
        return await Promise.all([
          db.from('indb_auth_user_profiles')
            .select(`
              *,
              package:indb_payment_packages(
                id,
                name,
                slug,
                description,
                currency,
                billing_period,
                features,
                quota_limits,
                is_active,
                pricing_tiers
              )
            `)
            .single(),

          db.from('indb_keyword_usage')
            .select('keywords_used, keywords_limit, period_start, period_end')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),

          db.from('user_quota_summary')
            .select('*')
            .single(),

          db.from('indb_auth_user_settings')
            .select('*')
            .single(),

          db.from('indb_auth_user_profiles')
            .select('has_used_trial, trial_used_at, package_id, subscribed_at, expires_at')
            .single(),

          db.from('indb_payment_packages')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),

          db.from('indb_keyword_domains')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),

          db.from('indb_notifications_dashboard')
            .select('*')
            .eq('type', 'quota_warning')
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(10),

          db.from('indb_keyword_keywords')
            .select(`
              id,
              keyword,
              device_type,
              domain:indb_keyword_domains(
                id,
                domain_name,
                display_name
              ),
              country:indb_keyword_countries(
                name,
                iso2_code
              ),
              recent_ranking:indb_keyword_rankings(
                position,
                check_date
              )
            `)
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(50)
        ])
      }
    )

    const [
      userProfileResult,
      keywordUsageResult,
      quotaDataResult,
      userSettingsResult,
      trialEligibilityResult,
      packagesResult,
      domainsResult,
      serviceAccountQuotaResult,
      recentKeywordsResult
    ] = dashboardQueryResult

    // Get user data for email info
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const authUserResult = { data: authUser, error: null }

    const [serviceAccountsResult, activeJobsResult] = await SecureServiceRoleWrapper.executeWithUserSession(
      supabase,
      {
        userId: userId,
        operation: 'get_dashboard_statistics',
        source: 'dashboard',
        reason: 'User fetching their service account and job statistics for dashboard',
        metadata: {
          endpoint: '/api/v1/dashboard',
          statsType: 'service_accounts_and_jobs'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'multiple_tables', operationType: 'select' },
      async (db) => {
        return await Promise.all([
          db.from('indb_google_service_accounts')
            .select('id', { count: 'exact' })
            .eq('is_active', true),
          db.from('indb_indexing_jobs')
            .select('id', { count: 'exact' })
            .in('status', ['running', 'pending'])
        ])
      }
    )

    let profile = null
    if (!userProfileResult.error && userProfileResult.data) {
      let transformedPackage = userProfileResult.data.package
      
      if (userProfileResult.data.package) {
        const packageData = userProfileResult.data.package
        
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
            transformedPackage = {
              ...packageData,
              price: 0
            }
          }
        }
      }

      profile = {
        ...userProfileResult.data,
        package: transformedPackage,
        email: authUserResult.data?.email || null,
        email_confirmed_at: authUserResult.data?.email_confirmed_at || null,
        last_sign_in_at: authUserResult.data?.last_sign_in_at || null,
        service_account_count: serviceAccountsResult.count || 0,
        active_jobs_count: activeJobsResult.count || 0,
      }
    }

    let keywordUsage = null
    if (keywordUsageResult.error && keywordUsageResult.error.code === 'PGRST116') {
      const keywordsLimit = (profile?.package as any)?.quota_limits?.keywords_limit || 0
      keywordUsage = {
        keywords_used: 0,
        keywords_limit: keywordsLimit,
        is_unlimited: keywordsLimit === -1,
        remaining_quota: keywordsLimit === -1 ? -1 : keywordsLimit,
        period_start: null,
        period_end: null
      }
    } else if (!keywordUsageResult.error && keywordUsageResult.data) {
      const keywordsUsed = keywordUsageResult.data.keywords_used || 0
      const keywordsLimit = (profile?.package as any)?.quota_limits?.keywords_limit || 0
      const isUnlimited = keywordsLimit === -1
      const remainingQuota = isUnlimited ? -1 : Math.max(0, keywordsLimit - keywordsUsed)

      keywordUsage = {
        keywords_used: keywordsUsed,
        keywords_limit: keywordsLimit,
        is_unlimited: isUnlimited,
        remaining_quota: remainingQuota,
        period_start: keywordUsageResult.data.period_start,
        period_end: keywordUsageResult.data.period_end
      }
    }

    let quota = null
    if (!quotaDataResult.error && quotaDataResult.data) {
      const dailyQuotaUsed = quotaDataResult.data.total_quota_used || 0
      const dailyQuotaLimit = quotaDataResult.data.daily_quota_limit || 50
      const isUnlimited = quotaDataResult.data.is_unlimited === true
      const remainingQuota = isUnlimited ? -1 : Math.max(0, dailyQuotaLimit - dailyQuotaUsed)
      const quotaExhausted = !isUnlimited && dailyQuotaUsed >= dailyQuotaLimit

      quota = {
        daily_quota_used: dailyQuotaUsed,
        daily_quota_limit: dailyQuotaLimit,
        is_unlimited: isUnlimited,
        quota_exhausted: quotaExhausted,
        daily_limit_reached: quotaExhausted,
        package_name: quotaDataResult.data.package_name || 'Free',
        remaining_quota: remainingQuota,
        total_quota_used: dailyQuotaUsed,
        total_quota_limit: quotaDataResult.data.total_quota_limit || 0,
        service_account_count: quotaDataResult.data.service_account_count || 0
      }
    }

    let settings = null
    if (userSettingsResult.error && userSettingsResult.error.code === 'PGRST116') {
      settings = await SecureServiceRoleWrapper.executeWithUserSession(
        supabase,
        {
          userId: userId,
          operation: 'create_default_user_settings',
          source: 'dashboard',
          reason: 'Creating default user settings for new user',
          metadata: {
            endpoint: '/api/v1/dashboard',
            settingsCreation: 'default_settings'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
          userAgent: request.headers.get('user-agent')
        },
        { table: 'indb_auth_user_settings', operationType: 'insert' },
        async (db) => {
          const { data } = await db
            .from('indb_auth_user_settings')
            .insert({
              user_id: userId,
              timeout_duration: 30000,
              retry_attempts: 3,
              email_job_completion: true,
              email_job_failure: true,
              email_quota_alerts: true,
              default_schedule: 'one-time',
              email_daily_report: true,
            })
            .select()
            .single()
          return data
        }
      )
    } else if (!userSettingsResult.error) {
      settings = userSettingsResult.data
    }

    let trialEligibility = null
    if (!trialEligibilityResult.error && trialEligibilityResult.data) {
      const trialData = trialEligibilityResult.data
      if (trialData.has_used_trial) {
        trialEligibility = {
          eligible: false,
          reason: 'already_used',
          trial_used_at: trialData.trial_used_at,
          message: `Free trial already used on ${new Date(trialData.trial_used_at).toLocaleDateString()}`
        }
      } else {
        const trialPackages = await SecureServiceRoleWrapper.executeWithUserSession(
          supabase,
          {
            userId: userId,
            operation: 'get_trial_packages',
            source: 'dashboard',
            reason: 'User checking available trial packages',
            metadata: {
              endpoint: '/api/v1/dashboard',
              packageQuery: 'trial_packages'
            },
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
            userAgent: request.headers.get('user-agent')
          },
          { table: 'indb_payment_packages', operationType: 'select' },
          async (db) => {
            const { data } = await db
              .from('indb_payment_packages')
              .select('*')
              .in('slug', ['premium', 'pro'])
              .eq('is_active', true)
              .order('sort_order')
            return data
          }
        )

        trialEligibility = {
          eligible: true,
          available_packages: trialPackages || [],
          message: 'You are eligible for a 3-day free trial'
        }
      }
    }

    let billingPackages = null
    if (!packagesResult.error && packagesResult.data) {
      const userCountry = profile?.country
      
      billingPackages = {
        packages: packagesResult.data.map(pkg => ({
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
          is_current: pkg.id === profile?.package_id,
          pricing_tiers: pkg.pricing_tiers || {},
          user_currency: 'USD',
          user_country: userCountry
        })),
        current_package_id: profile?.package_id,
        expires_at: profile?.expires_at,
        user_currency: 'USD',
        user_country: userCountry
      }
    }

    let recentKeywords: any[] = []
    if (!recentKeywordsResult.error && recentKeywordsResult.data) {
      recentKeywords = recentKeywordsResult.data
    }

    const dashboardData = {
      user: {
        profile: profile,
        quota: quota,
        settings: settings,
        trial: trialEligibility
      },
      billing: billingPackages,
      indexing: {
        serviceAccounts: serviceAccountsResult.count || 0
      },
      rankTracking: {
        usage: keywordUsage,
        domains: domainsResult.data || [],
        recentKeywords: recentKeywords
      },
      notifications: serviceAccountQuotaResult.data || []
    }

    return formatSuccess(dashboardData)

  } catch (error) {
    if (error && typeof error === 'object' && 'type' in error) {
      return formatError(error as any)
    }
    
    const structuredError = ErrorHandlingService.createError(
      ErrorType.INTERNAL,
      error as Error,
      { statusCode: 500, context: { endpoint: '/api/v1/dashboard' } }
    )
    return formatError(structuredError)
  }
})

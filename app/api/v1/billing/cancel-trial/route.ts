import { NextRequest } from 'next/server'
import { PaymentServiceFactory } from '@/lib/services/payments'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getBaseDomain(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_BASE_URL!).hostname
  } catch (e) {
    return ''
  }
}

export const POST = authenticatedApiWrapper(async (request: NextRequest, user) => {
  const cookieStore = await cookies()
  const baseDomain = getBaseDomain()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = {
                ...options,
                ...(baseDomain && { domain: `.${baseDomain}` })
              }
              cookieStore.set(name, value, cookieOptions)
            })
          } catch {}
        },
      },
    }
  )

  const userProfile = await SecureServiceRoleWrapper.executeWithUserSession(
    supabase,
    {
      userId: user.id,
      operation: 'get_trial_status',
      source: 'billing/cancel-trial',
      reason: 'Checking user trial status before cancellation',
      metadata: { endpoint: 'POST /billing/cancel-trial' }
    },
    { table: 'indb_auth_user_profiles', operationType: 'select' },
    async (db) => {
      const { data, error } = await db
        .from('indb_auth_user_profiles')
        .select('trial_status, trial_ends_at, auto_billing_enabled, package_id')
        .eq('user_id', user.id)
        .single()
      
      if (error) {
        throw new Error('Unable to fetch trial information')
      }
      return data
    }
  )

  if (userProfile.trial_status !== 'active') {
    throw new Error('No active trial found')
  }

  let subscription = null
  try {
    subscription = await SecureServiceRoleWrapper.executeWithUserSession(
      supabase,
      {
        userId: user.id,
        operation: 'get_active_subscription',
        source: 'billing/cancel-trial',
        reason: 'Getting user active subscription for cancellation',
        metadata: { trial_status: userProfile.trial_status }
      },
      { table: 'indb_payment_midtrans', operationType: 'select' },
      async (db) => {
        const { data, error } = await db
          .from('indb_payment_midtrans')
          .select('midtrans_subscription_id, subscription_status')
          .eq('user_id', user.id)
          .eq('subscription_status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        if (error && error.code !== 'PGRST116') {
          throw error
        }
        return data
      }
    )
  } catch (error: any) {
    if (error.code !== 'PGRST116') {
      logger.error({ error: error.message }, 'Error fetching subscription')
      throw new Error('Unable to fetch subscription information')
    }
  }

  if (subscription?.midtrans_subscription_id) {
    try {
      const gateway = await SecureServiceRoleWrapper.executeWithUserSession(
        supabase,
        {
          userId: user.id,
          operation: 'get_midtrans_gateway_config',
          source: 'billing/cancel-trial',
          reason: 'Getting payment gateway config for subscription cancellation',
          metadata: { subscription_id: subscription.midtrans_subscription_id }
        },
        { table: 'indb_payment_gateways', operationType: 'select' },
        async (db) => {
          const { data, error } = await db
            .from('indb_payment_gateways')
            .select('api_credentials, configuration')
            .eq('slug', 'midtrans')
            .eq('is_active', true)
            .single()
          
          if (error) throw error
          return data
        }
      )

      if (gateway) {
        const midtransService = PaymentServiceFactory.createMidtransService('recurring', {
          server_key: gateway.api_credentials.server_key,
          client_key: gateway.api_credentials.client_key,
          environment: gateway.configuration.environment,
          merchant_id: gateway.api_credentials.merchant_id
        })

        await midtransService.cancelSubscription(subscription.midtrans_subscription_id)
        logger.info({ data: [subscription.midtrans_subscription_id] }, '✅ [Trial Cancellation] Midtrans subscription cancelled:')

        await SecureServiceRoleWrapper.executeWithUserSession(
          supabase,
          {
            userId: user.id,
            operation: 'update_subscription_status',
            source: 'billing/cancel-trial',
            reason: 'Updating subscription status to cancelled after Midtrans cancellation',
            metadata: { 
              subscription_id: subscription.midtrans_subscription_id,
              new_status: 'cancelled'
            }
          },
          { table: 'indb_payment_midtrans', operationType: 'update' },
          async (db) => {
            const { error } = await db
              .from('indb_payment_midtrans')
              .update({ subscription_status: 'cancelled' })
              .eq('midtrans_subscription_id', subscription.midtrans_subscription_id)
            
            if (error) throw error
          }
        )
      }
    } catch (midtransError) {
      logger.error({ error: midtransError instanceof Error ? midtransError.message : String(midtransError) }, 'Error cancelling Midtrans subscription:')
    }
  }

  await SecureServiceRoleWrapper.executeWithUserSession(
    supabase,
    {
      userId: user.id,
      operation: 'cancel_trial',
      source: 'billing/cancel-trial',
      reason: 'Cancelling user trial and resetting subscription state',
      metadata: { 
        previous_trial_status: userProfile.trial_status,
        subscription_cancelled: !!subscription?.midtrans_subscription_id
      }
    },
    { table: 'indb_auth_user_profiles', operationType: 'update' },
    async (db) => {
      const { error } = await db
        .from('indb_auth_user_profiles')
        .update({
          trial_status: 'cancelled',
          auto_billing_enabled: false,
          package_id: null,
          subscribed_at: null,
          expires_at: null
        })
        .eq('user_id', user.id)
      
      if (error) {
        throw new Error('Failed to cancel trial')
      }
    }
  )

  logger.info({ data: [user.id] }, '✅ [Trial Cancellation] User trial cancelled successfully for user:')

  return formatSuccess({
    success: true,
    message: 'Trial cancelled successfully'
  })
})

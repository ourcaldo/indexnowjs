import { NextRequest } from 'next/server'
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

  await SecureServiceRoleWrapper.executeWithUserSession(
    supabase,
    {
      userId: user.id,
      operation: 'cancel_trial',
      source: 'billing/cancel-trial',
      reason: 'Cancelling user trial and resetting subscription state',
      metadata: { 
        previous_trial_status: userProfile.trial_status
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

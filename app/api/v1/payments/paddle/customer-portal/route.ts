/**
 * Paddle Customer Portal API
 * Provides customer portal URL for authenticated users to manage their subscription
 */

import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess } from '@/lib/core/api-response-middleware'
import { PaddleCustomerService } from '@/lib/services/payments/paddle'
import { supabaseAdmin } from '@/lib/database'

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const { data: subscription, error } = await supabaseAdmin
    .from('indb_payment_subscriptions')
    .select('paddle_customer_id')
    .eq('user_id', auth.userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch subscription: ${error.message}`)
  }

  if (!subscription) {
    throw new Error('No active subscription found')
  }

  const portalUrl = await PaddleCustomerService.getCustomerPortalUrl(
    subscription.paddle_customer_id
  )

  return formatSuccess({
    portal_url: portalUrl,
  })
})

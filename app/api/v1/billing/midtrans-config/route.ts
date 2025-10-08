import { NextRequest } from 'next/server'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

export const GET = authenticatedApiWrapper(async (request: NextRequest, user) => {
  const midtransGateway = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: user.id,
      operation: 'get_midtrans_gateway_config',
      source: 'billing/midtrans-config',
      reason: 'User requesting Midtrans payment gateway configuration for checkout',
      metadata: {
        endpoint: '/api/v1/billing/midtrans-config',
        gatewaySlug: 'midtrans',
        userEmail: user.email
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    },
    { table: 'indb_payment_gateways', operationType: 'select' },
    async () => {
      const { createClient } = require('@supabase/supabase-js')
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data, error } = await supabaseAdmin
        .from('indb_payment_gateways')
        .select('configuration, api_credentials')
        .eq('slug', 'midtrans')
        .eq('is_active', true)
        .single()
        
      if (error) {
        throw new Error(`Failed to fetch Midtrans gateway config: ${error.message}`)
      }
      
      return data
    }
  )

  if (!midtransGateway) {
    throw new Error('Midtrans payment gateway not configured')
  }

  const { client_key } = midtransGateway.api_credentials
  const { environment } = midtransGateway.configuration

  if (!client_key) {
    throw new Error('Midtrans client key not configured')
  }

  return formatSuccess({
    success: true,
    data: {
      client_key,
      environment
    }
  })
})

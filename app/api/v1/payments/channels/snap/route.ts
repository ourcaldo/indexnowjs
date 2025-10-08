import { NextRequest } from 'next/server'
import { PaymentServiceFactory } from '@/lib/services/payments'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import type { AuthenticatedRequest } from '@/lib/core/api-middleware'

// POST /api/v1/payments/channels/snap - Process Midtrans Snap payment
export const POST = authenticatedApiWrapper(async (request: NextRequest, auth: AuthenticatedRequest) => {
  const body = await request.json()
  const { package_id, billing_period, token_id, customer_info } = body

  // Validate required fields
  if (!package_id || !billing_period || !token_id || !customer_info) {
    const error = await ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      'Missing required fields: package_id, billing_period, token_id, and customer_info are required',
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 400,
        userId: auth.userId,
        userMessageKey: 'missing_required'
      }
    )
    return formatError(error)
  }

  // Create user's authenticated Supabase client
  const cookieStore = await cookies()
  const userSupabaseClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        }
      }
    }
  )

  // Get package details and Midtrans config using SecureWrapper
  const paymentData = await SecureServiceRoleWrapper.executeWithUserSession(
    userSupabaseClient,
    {
      userId: auth.userId,
      operation: 'get_payment_package_and_config',
      source: 'payments/channels/snap',
      reason: 'User creating Snap payment for selected package',
      metadata: {
        packageId: package_id,
        billingPeriod: billing_period,
        endpoint: '/api/v1/payments/channels/snap',
        method: 'POST'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
      userAgent: request.headers.get('user-agent')
    },
    { table: 'indb_payment_packages', operationType: 'select' },
    async (db) => {
      // Get package details
      const { data: packageData, error: packageError } = await db
        .from('indb_payment_packages')
        .select('*')
        .eq('id', package_id)
        .eq('is_active', true)
        .single()

      if (packageError || !packageData) {
        throw new Error('Invalid package')
      }

      // Get Midtrans configuration (admin table - using supabaseAdmin)
      const { data: midtransConfig, error: configError } = await supabaseAdmin
        .from('indb_payment_gateway_configs')
        .select('*')
        .eq('gateway_name', 'midtrans')
        .eq('is_active', true)
        .single()

      if (configError || !midtransConfig) {
        throw new Error('Payment gateway not configured')
      }

      return { packageData, midtransConfig }
    }
  )

  const { packageData, midtransConfig } = paymentData

  // Create Midtrans service via factory
  const midtransService = PaymentServiceFactory.createMidtransService('snap', midtransConfig)

  // Generate unique order ID
  const orderId = `SNAP_${auth.userId}_${Date.now()}`

  // Calculate amount based on billing period
  const amount = billing_period === 'yearly' 
    ? packageData.price * 12 * 0.8  // 20% discount for yearly
    : packageData.price

  // Create transaction record using SecureWrapper
  const transaction = await SecureServiceRoleWrapper.executeWithUserSession(
    userSupabaseClient,
    {
      userId: auth.userId,
      operation: 'create_payment_transaction',
      source: 'payments/channels/snap',
      reason: 'User creating payment transaction for Snap payment',
      metadata: {
        orderId,
        packageId: package_id,
        amount,
        billingPeriod: billing_period,
        endpoint: '/api/v1/payments/channels/snap',
        method: 'POST'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
      userAgent: request.headers.get('user-agent')
    },
    { table: 'indb_payment_transactions', operationType: 'insert' },
    async (db) => {
      const { data: transaction, error: transactionError } = await db
        .from('indb_payment_transactions')
        .insert({
          user_id: auth.userId,
          order_id: orderId,
          package_id: package_id,
          amount_usd: amount,
          currency: packageData.currency,
          billing_period,
          payment_method: 'midtrans_snap',
          gateway_name: 'midtrans',
          status: 'pending',
          payment_status: 'pending',
          customer_info,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (transactionError || !transaction) {
        throw new Error('Failed to create transaction')
      }

      return transaction
    }
  )

  // Process payment with Midtrans
  try {
    const chargeResult = await midtransService.processPayment({
      order_id: orderId,
      amount_usd: amount,
      currency: packageData.currency,
      customer_details: {
        first_name: customer_info.first_name,
        last_name: customer_info.last_name,
        email: customer_info.email,
        phone: customer_info.phone || ''
      },
      item_details: {
        name: `${packageData.name} - ${billing_period}`,
        description: packageData.description
      },
      metadata: {
        token_id: token_id,
        billing_period: billing_period,
        package_id: package_id
      }
    })

    // Update transaction with Midtrans response using SecureWrapper
    await SecureServiceRoleWrapper.executeWithUserSession(
      userSupabaseClient,
      {
        userId: auth.userId,
        operation: 'update_payment_transaction_success',
        source: 'payments/channels/snap',
        reason: 'Updating transaction with successful Midtrans response',
        metadata: {
          transactionId: transaction.id,
          midtransTransactionId: chargeResult.transaction_id,
          status: chargeResult.transaction_status
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_payment_transactions', operationType: 'update' },
      async (db) => {
        await db
          .from('indb_payment_transactions')
          .update({
            transaction_id: chargeResult.transaction_id,
            midtrans_response: chargeResult,
            status: chargeResult.transaction_status === 'capture' ? 'completed' : 'pending',
            payment_status: chargeResult.transaction_status === 'capture' ? 'paid' : 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id)
        
        return true
      }
    )

    return formatSuccess({
      transaction: {
        id: transaction.id,
        order_id: orderId,
        status: chargeResult.transaction_status,
        redirect_url: chargeResult.redirect_url,
        requires_redirect: !!chargeResult.redirect_url
      }
    })

  } catch (midtransError: any) {
    // Update transaction as failed using SecureWrapper
    await SecureServiceRoleWrapper.executeWithUserSession(
      userSupabaseClient,
      {
        userId: auth.userId,
        operation: 'update_payment_transaction_failed',
        source: 'payments/channels/snap',
        reason: 'Updating transaction with failed Midtrans response',
        metadata: {
          transactionId: transaction.id,
          errorMessage: midtransError.message
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_payment_transactions', operationType: 'update' },
      async (db) => {
        await db
          .from('indb_payment_transactions')
          .update({
            status: 'failed',
            payment_status: 'failed',
            error_message: midtransError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id)

        return true
      }
    )

    const error = await ErrorHandlingService.createError(
      ErrorType.EXTERNAL_API,
      'Payment processing failed',
      {
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        userId: auth.userId,
        userMessageKey: 'default',
        metadata: { error_message: midtransError.message }
      }
    )
    return formatError(error)
  }
})

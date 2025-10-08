import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import crypto from 'crypto'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

// POST /api/v1/payments/midtrans/webhook - Handle Midtrans webhook notifications
export const POST = publicApiWrapper(async (request: NextRequest) => {
  const body = await request.text()
  const notification = JSON.parse(body)
  
  // CRITICAL: Verify signature first (preserve existing signature verification)
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) {
    const error = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      'Missing MIDTRANS_SERVER_KEY configuration',
      {
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        userMessageKey: 'default'
      }
    )
    return formatError(error)
  }

  const signatureKey = notification.signature_key
  const orderId = notification.order_id
  const statusCode = notification.status_code
  const grossAmount = notification.gross_amount
  
  const expectedSignature = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest('hex')

  // CRITICAL: Reject invalid signatures
  if (signatureKey !== expectedSignature) {
    const error = await ErrorHandlingService.createError(
      ErrorType.AUTHENTICATION,
      'Invalid webhook signature',
      {
        severity: ErrorSeverity.HIGH,
        statusCode: 401,
        userMessageKey: 'default',
        metadata: {
          orderId,
          providedSignature: signatureKey?.substring(0, 10) + '...',
          expectedSignature: expectedSignature?.substring(0, 10) + '...'
        }
      }
    )
    return formatError(error)
  }

  // Find the transaction in our database using secure operation
  const transaction = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: 'system',
      operation: 'webhook_find_transaction',
      source: 'payments/midtrans/webhook',
      reason: 'Webhook finding transaction for payment processing',
      metadata: {
        orderId,
        endpoint: '/api/v1/payments/midtrans/webhook',
        signatureVerified: true
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent') || undefined
    },
    { table: 'indb_payment_transactions', operationType: 'select' },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_payment_transactions')
        .select('*')
        .eq('order_id', orderId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    }
  )

  if (!transaction) {
    const error = await ErrorHandlingService.createError(
      ErrorType.NOT_FOUND,
      `Transaction not found for order: ${orderId}`,
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 404,
        userMessageKey: 'not_found',
        metadata: { orderId }
      }
    )
    return formatError(error)
  }

  // Process different transaction statuses
  let newStatus = transaction.status
  let newPaymentStatus = transaction.payment_status

  switch (notification.transaction_status) {
    case 'capture':
      if (notification.fraud_status === 'accept') {
        newStatus = 'completed'
        newPaymentStatus = 'paid'
      }
      break
    case 'settlement':
      newStatus = 'completed'
      newPaymentStatus = 'paid'
      break
    case 'pending':
      newStatus = 'pending'
      newPaymentStatus = 'pending'
      break
    case 'deny':
    case 'cancel':
    case 'expire':
      newStatus = 'failed'
      newPaymentStatus = 'failed'
      break
    case 'failure':
      newStatus = 'failed'
      newPaymentStatus = 'failed'
      break
  }

  // Extract payment details for VA numbers and payment codes
  const paymentDetails: any = {}
  
  if (notification.payment_type === 'bank_transfer' && notification.va_numbers) {
    paymentDetails.va_numbers = notification.va_numbers
    paymentDetails.payment_method = 'bank_transfer'
  }
  
  if (notification.payment_type === 'cstore') {
    paymentDetails.payment_code = notification.payment_code
    paymentDetails.store = notification.store
    paymentDetails.payment_method = 'convenience_store'
  }
  
  if (notification.expiry_time) {
    paymentDetails.expires_at = notification.expiry_time
  }

  // Update transaction in database using secure operation
  await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: 'system',
      operation: 'webhook_update_transaction',
      source: 'payments/midtrans/webhook',
      reason: `Webhook updating transaction status to ${newStatus}`,
      metadata: {
        transactionId: transaction.id,
        orderId,
        oldStatus: transaction.status,
        newStatus,
        paymentStatus: newPaymentStatus,
        midtransStatus: notification.transaction_status,
        endpoint: '/api/v1/payments/midtrans/webhook'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent') || undefined
    },
    { 
      table: 'indb_payment_transactions', 
      operationType: 'update',
      data: {
        status: newStatus,
        payment_status: newPaymentStatus,
        midtrans_response: notification,
        payment_details: paymentDetails,
        updated_at: new Date().toISOString()
      }
    },
    async () => {
      const { error } = await supabaseAdmin
        .from('indb_payment_transactions')
        .update({
          status: newStatus,
          payment_status: newPaymentStatus,
          midtrans_response: notification,
          payment_details: paymentDetails,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id)

      if (error) throw new Error(`Failed to update transaction: ${error.message}`)
      return true
    }
  )

  // If payment is successful, activate user's package
  if (newStatus === 'completed' && newPaymentStatus === 'paid') {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'webhook_activate_user_package',
          source: 'payments/midtrans/webhook',
          reason: 'Webhook activating user package after successful payment',
          metadata: {
            transactionId: transaction.id,
            userId: transaction.user_id,
            packageId: transaction.package_id,
            billingPeriod: transaction.billing_period,
            orderId,
            endpoint: '/api/v1/payments/midtrans/webhook'
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
          userAgent: request.headers.get('user-agent') || undefined
        },
        { 
          table: 'indb_auth_user_profiles', 
          operationType: 'update',
          data: {
            package_id: transaction.package_id,
            subscribed_at: new Date().toISOString(),
            expires_at: transaction.billing_period === 'monthly' 
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .update({
              package_id: transaction.package_id,
              subscribed_at: new Date().toISOString(),
              expires_at: transaction.billing_period === 'monthly' 
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', transaction.user_id)

          if (error) throw new Error(`Failed to update user profile: ${error.message}`)
          return true
        }
      )
    } catch (profileUpdateError) {
      // Log error but don't fail the webhook - transaction is already updated
    }
  }

  return formatSuccess({
    message: 'Webhook processed successfully',
    order_id: orderId,
    status: newStatus
  })
})

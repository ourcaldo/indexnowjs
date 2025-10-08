import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { AutoCancelJob } from '@/lib/payment-services/auto-cancel-job'
import { emailService } from '@/lib/email/emailService'
import crypto from 'crypto'
import { logger } from '@/lib/monitoring/error-handling'

const midtransClient = require('midtrans-client')

export async function POST(request: NextRequest) {
  try {
    logger.info({ message: '🔔 [Unified Webhook] Received Midtrans notification' }, 'Info')
    
    // Check content type to determine parsing method
    const contentType = request.headers.get('content-type') || ''
    logger.info({ data: [contentType] }, '📋 [Unified Webhook] Content-Type:')
    
    let body: any = {}
    
    if (contentType.includes('application/json')) {
      // Parse JSON data - handle empty body gracefully
      try {
        const text = await request.text()
        if (text.trim() === '') {
          logger.info({ message: '⚠️ [Unified Webhook] Empty JSON body received' }, 'Info')
          body = {}
        } else {
          body = JSON.parse(text)
          logger.info({ message: '📦 [Unified Webhook] Parsed as JSON' }, 'Info')
        }
      } catch (parseError) {
        logger.error({ error: parseError instanceof Error ? parseError.message : String(parseError) }, '💥 [Unified Webhook] JSON parsing failed:')
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form-encoded data
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries())
      logger.info({ message: '📝 [Unified Webhook] Parsed as form data' }, 'Info')
    } else {
      // Try to parse as text and then JSON
      const text = await request.text()
      logger.info({ data: [text.substring(0, 200)] }, '📄 [Unified Webhook] Raw text data:')
      
      try {
        body = JSON.parse(text)
        logger.info({ message: '🔄 [Unified Webhook] Parsed text as JSON' }, 'Info')
      } catch (e) {
        // If it's not JSON, try to parse as query parameters
        const params = new URLSearchParams(text)
        body = Object.fromEntries(params.entries())
        logger.info({ message: '🔗 [Unified Webhook] Parsed as URL parameters' }, 'Info')
      }
    }
    
    // Detect notification type and extract order_id accordingly
    let orderId: string
    let notificationType: string
    let isSubscriptionEvent = false

    if (body.subscription && body.event_name) {
      // Subscription notification
      isSubscriptionEvent = true
      notificationType = body.event_name
      orderId = body.subscription.metadata?.order_id
      logger.info({ data: [{
        event_name: body.event_name, subscription_id: body.subscription.id, extracted_order_id: orderId, subscription_status: body.subscription.status
      }] }, '🔄 [Unified Webhook] Subscription notification detected:')
    } else {
      // Payment/transaction notification
      notificationType = body.transaction_status || 'unknown'
      orderId = body.order_id
      logger.info({ data: [{
        order_id: orderId, transaction_status: body.transaction_status, fraud_status: body.fraud_status, payment_type: body.payment_type
      }] }, '📊 [Unified Webhook] Payment notification detected:')
    }

    logger.info({ data: [{
      type: isSubscriptionEvent ? 'subscription' : 'payment', 
      event: notificationType, 
      order_id: orderId, 
      raw_body_keys: Object.keys(body)
    }] }, '🔍 [Unified Webhook] Processed notification:')

    if (!orderId) {
      logger.error({ error: 'No order_id found in notification' }, '❌ [Unified Webhook] Error occurred')
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Find transaction to determine payment method using secure operation
    let transaction = null
    
    const transactionContext = {
      userId: 'system',
      operation: 'webhook_find_transaction',
      source: 'midtrans/webhook',
      reason: 'Webhook finding transaction for payment processing',
      metadata: {
        orderId,
        notificationType,
        isSubscriptionEvent,
        endpoint: '/api/midtrans/webhook'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent') || undefined
    }
    
    // First try id (order_id is now the database ID)
    const refTransaction = await SecureServiceRoleWrapper.executeSecureOperation(
      transactionContext,
      { table: 'indb_payment_transactions', operationType: 'select' },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_transactions')
          .select('*')
          .eq('id', orderId)
          .single()
        
        if (error && error.code !== 'PGRST116') throw error
        return data
      }
    )
      
    if (refTransaction) {
      transaction = refTransaction
    } else {
      // Try searching in metadata as backup
      const metadataTransaction = await SecureServiceRoleWrapper.executeSecureOperation(
        { ...transactionContext, operation: 'webhook_find_transaction_by_metadata' },
        { table: 'indb_payment_transactions', operationType: 'select' },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_payment_transactions')
            .select('*')
            .contains('metadata', { midtrans_order_id: orderId })
            .single()
          
          if (error && error.code !== 'PGRST116') throw error
          return data
        }
      )
        
      if (metadataTransaction) {
        transaction = metadataTransaction
      } else {
        // Try gateway_transaction_id as last resort
        const gatewayTransaction = await SecureServiceRoleWrapper.executeSecureOperation(
          { ...transactionContext, operation: 'webhook_find_transaction_by_gateway_id' },
          { table: 'indb_payment_transactions', operationType: 'select' },
          async () => {
            const { data, error } = await supabaseAdmin
              .from('indb_payment_transactions')
              .select('*')
              .ilike('gateway_transaction_id', `%${orderId}%`)
              .single()
            
            if (error && error.code !== 'PGRST116') throw error
            return data
          }
        )
          
        if (gatewayTransaction) {
          transaction = gatewayTransaction
        } else {
          // For subscription renewals, check if this is a recurring payment without existing transaction
          if (isSubscriptionEvent || body.subscription_id) {
            logger.info({ data: ['checking if this is a subscription renewal'] }, '🔄 [Unified Webhook] No transaction found')
            return await handleSubscriptionRenewal(body, orderId, supabaseAdmin)
          }
          
          logger.error({ error: `Transaction not found for order_id: ${orderId}` }, '❌ [Unified Webhook] Error occurred')
          return NextResponse.json({ error: 'Invalid request' }, { status: 404 })
        }
      }
    }

    logger.info({ data: [{ transaction_id: transaction.id, payment_method: transaction.payment_method }] }, '✅ [Unified Webhook] Found transaction:')

    // Handle subscription events separately
    if (isSubscriptionEvent) {
      logger.info({ message: '🔄 [Unified Webhook] Processing subscription event' }, 'Info')
      return await handleSubscriptionEvent(body, transaction, supabaseAdmin, notificationType)
    }

    // Determine if this is Recurring or Snap payment
    const isRecurringPayment = transaction.payment_method === 'midtrans' || 
                               transaction.payment_method === 'credit_card' ||
                               (transaction.metadata as any)?.payment_gateway_type === 'midtrans'
    const isSnapPayment = transaction.payment_method === 'midtrans_snap' || 
                          (transaction.metadata as any)?.payment_gateway_type === 'midtrans_snap'

    logger.info({ data: [{
      isRecurringPayment, isSnapPayment, gateway_type: transaction.gateway_type
    }] }, '🔍 [Unified Webhook] Payment type detection:')

    // Handle verification based on payment type
    if (isRecurringPayment) {
      logger.info({ message: '🔄 [Unified Webhook] Processing as Recurring payment' }, 'Info')
      return await handleRecurringPayment(body, transaction, supabaseAdmin)
    } else if (isSnapPayment) {
      logger.info({ message: '📱 [Unified Webhook] Processing as Snap payment' }, 'Info')
      return await handleSnapPayment(body, transaction, supabaseAdmin)
    } else {
      // Default to Snap if unclear
      logger.info({ data: ['defaulting to Snap processing'] }, '❓ [Unified Webhook] Payment type unclear')
      return await handleSnapPayment(body, transaction, supabaseAdmin)
    }

  } catch (error: any) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, '💥 [Unified Webhook] Error:')
    logger.error({ data: [{
      message: error.message, 
      stack: error.stack?.substring(0, 500)
    }] }, '💥 [Unified Webhook] Error details:')
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 })
  }
}

// Also handle GET requests for verification
export async function GET(request: NextRequest) {
  logger.info({ message: '👀 [Unified Webhook] Received GET request (likely verification)' }, 'Info')
  const url = new URL(request.url)
  const params = Object.fromEntries(url.searchParams.entries())
  
  logger.info({ data: [{
    order_id: params.order_id, transaction_status: params.transaction_status, fraud_status: params.fraud_status, payment_type: params.payment_type, all_params: params
  }] }, '📊 [Unified Webhook] GET parameters:')
  
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint active' })
}

async function handleRecurringPayment(body: any, transaction: any, supabaseAdmin: any) {
  try {
    logger.info({ message: '🔐 [Recurring] Verifying signature...' }, 'Info')
    
    // Get Midtrans recurring gateway configuration using secure operation
    const gatewayData = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'webhook_get_recurring_gateway_config',
        source: 'midtrans/webhook/recurring',
        reason: 'Webhook retrieving Midtrans recurring gateway configuration',
        metadata: {
          gatewaySlug: 'midtrans',
          transactionId: transaction.id
        }
      },
      { table: 'indb_payment_gateways', operationType: 'select' },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_gateways')
          .select('*')
          .eq('slug', 'midtrans')
          .eq('is_active', true)
          .single()

        if (error) throw new Error(`Gateway not found: ${error.message}`)
        return data
      }
    )

    if (!gatewayData) {
      logger.error({ error: 'Gateway not found' }, '❌ [Recurring] Error occurred')
      return NextResponse.json({ error: 'Gateway not configured' }, { status: 404 })
    }

    // Verify Midtrans signature
    const serverKey = gatewayData.api_credentials.server_key
    const { order_id, status_code, gross_amount, signature_key } = body
    
    const signatureString = order_id + status_code + gross_amount + serverKey
    const computedSignature = crypto.createHash('sha512').update(signatureString).digest('hex')
    
    if (signature_key !== computedSignature) {
      logger.error({ error: 'Invalid signature' }, '❌ [Recurring] Error occurred')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    logger.info({ message: '✅ [Recurring] Signature verified' }, 'Info')
    return await processTransaction(body, transaction, supabaseAdmin, 'recurring')

  } catch (error: any) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, '💥 [Recurring] Error:')
    return NextResponse.json({ error: 'Recurring processing failed' }, { status: 500 })
  }
}

async function handleSnapPayment(body: any, transaction: any, supabaseAdmin: any) {
  try {
    logger.info({ message: '🔐 [Snap] Verifying notification...' }, 'Info')
    
    // Get Midtrans Snap configuration using secure operation
    const snapGateway = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'webhook_get_snap_gateway_config',
        source: 'midtrans/webhook/snap',
        reason: 'Webhook retrieving Midtrans Snap gateway configuration',
        metadata: {
          gatewaySlug: 'midtrans_snap',
          transactionId: transaction.id
        }
      },
      { table: 'indb_payment_gateways', operationType: 'select' },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_gateways')
          .select('*')
          .eq('slug', 'midtrans_snap')
          .eq('is_active', true)
          .single()

        if (error) throw new Error(`Gateway not found: ${error.message}`)
        return data
      }
    )

    if (!snapGateway) {
      logger.info({ message: '❌ [Snap] Gateway configuration not found' }, 'Info')
      return NextResponse.json({ status: 'error', message: 'Gateway not configured' }, { status: 500 })
    }

    const { server_key } = snapGateway.api_credentials
    const { environment } = snapGateway.configuration

    // Initialize Midtrans client for notification verification
    const snap = new midtransClient.Snap({
      isProduction: environment === 'production',
      serverKey: server_key
    })

    // Verify notification authenticity
    const notificationJson = snap.transaction.notification(body)
    const statusResponse = await notificationJson

    logger.info({ message: '✅ [Snap] Notification verified' }, 'Info')
    return await processTransaction(statusResponse, transaction, supabaseAdmin, 'snap')

  } catch (error: any) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, '💥 [Snap] Error:')
    return NextResponse.json({ error: 'Snap processing failed' }, { status: 500 })
  }
}

async function processTransaction(body: any, transaction: any, supabaseAdmin: any, paymentType: string) {
  try {
    logger.info({ message: `🚀 [${paymentType.toUpperCase()}] Processing transaction: ${transaction.id}` }, 'Info')
    logger.info({ data: [{ transaction_status: body.transaction_status, fraud_status: body.fraud_status }] }, '📊 Status:')
    
    // Update transaction status based on Midtrans status
    let newStatus = 'pending'
    let processedAt = null

    switch (body.transaction_status) {
      case 'capture':
        if (body.fraud_status === 'accept') {
          newStatus = 'completed'
          processedAt = new Date().toISOString()
        } else if (body.fraud_status === 'challenge') {
          newStatus = 'review'
        } else {
          newStatus = 'failed'
        }
        break
      case 'settlement':
        newStatus = 'completed'
        processedAt = new Date().toISOString()
        break
      case 'deny':
      case 'cancel':
      case 'failure':
        newStatus = 'failed'
        // Send order expired email for failed payments
        await sendOrderExpiredEmail(body, transaction, supabaseAdmin, paymentType, body.transaction_status)
        break
      case 'expire':
        // Handle expire status with auto-cancel service
        logger.info({ message: `⏰ [${paymentType.toUpperCase()}] Transaction expired, processing with auto-cancel service` }, 'Info')
        newStatus = 'expired'
        await AutoCancelJob.handleMidtransExpireNotification(transaction, body)
        // Send order expired email
        await sendOrderExpiredEmail(body, transaction, supabaseAdmin, paymentType, 'expired')
        return NextResponse.json({ status: 'OK', message: 'Transaction expired and processed' })
      case 'pending':
        newStatus = 'pending'
        break
    }

    logger.info({ message: `🔄 [${paymentType.toUpperCase()}] Updating status: '${transaction.transaction_status}' → '${newStatus}'` }, 'Info')
    
    // Update transaction using secure operation
    await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'webhook_update_transaction_status',
        source: `midtrans/webhook/${paymentType}`,
        reason: `Webhook updating transaction status to ${newStatus}`,
        metadata: {
          transactionId: transaction.id,
          oldStatus: transaction.transaction_status,
          newStatus,
          paymentType,
          midtransStatus: body.transaction_status
        }
      },
      { table: 'indb_payment_transactions', operationType: 'update' },
      async () => {
        const { error } = await supabaseAdmin
          .from('indb_payment_transactions')
          .update({
            transaction_status: newStatus,
            processed_at: processedAt,
            verified_at: newStatus === 'completed' ? new Date().toISOString() : null,
            gateway_response: {
              ...transaction.gateway_response,
              webhook_data: body,
              updated_at: new Date().toISOString(),
              payment_type: paymentType
            }
          })
          .eq('id', transaction.id)

        if (error) throw new Error(`Failed to update transaction: ${error.message}`)
        return true
      }
    )
    
    logger.info({ message: `✅ [${paymentType.toUpperCase()}] Transaction updated successfully` }, 'Info')

    // Send order confirmation email with payment details for pending transactions
    // This handles bank_transfer and cstore payments that need payment instructions
    if (newStatus === 'pending' && (body.payment_type === 'bank_transfer' || body.payment_type === 'cstore')) {
      logger.info({ message: `📧 [${paymentType.toUpperCase()}] Sending order confirmation with payment details for ${body.payment_type}` }, 'Info')
      await sendOrderConfirmationWithDetails(body, transaction, supabaseAdmin, paymentType)
    }

    // If payment is completed, send payment received email and activate subscription
    if (newStatus === 'completed') {
      // Send payment received email using secure operations
      try {
        const userData = await SecureServiceRoleWrapper.executeSecureOperation(
          {
            userId: 'system',
            operation: 'webhook_get_user_profile_for_email',
            source: `midtrans/webhook/${paymentType}`,
            reason: 'Webhook retrieving user profile for payment confirmation email',
            metadata: {
              transactionId: transaction.id,
              userId: transaction.user_id
            }
          },
          { table: 'indb_auth_user_profiles', operationType: 'select' },
          async () => {
            const { data, error } = await supabaseAdmin
              .from('indb_auth_user_profiles')
              .select('full_name, email')
              .eq('user_id', transaction.user_id)
              .single()
            if (error) throw error
            return data
          }
        )

        const packageData = await SecureServiceRoleWrapper.executeSecureOperation(
          {
            userId: 'system',
            operation: 'webhook_get_package_for_email',
            source: `midtrans/webhook/${paymentType}`,
            reason: 'Webhook retrieving package details for payment confirmation email',
            metadata: {
              transactionId: transaction.id,
              packageId: transaction.package_id
            }
          },
          { table: 'indb_payment_packages', operationType: 'select' },
          async () => {
            const { data, error } = await supabaseAdmin
              .from('indb_payment_packages')
              .select('name')
              .eq('id', transaction.package_id)
              .single()
            if (error) throw error
            return data
          }
        )

        if (userData && packageData) {
          // Get original currency from transaction metadata or use transaction currency
          const originalCurrency = transaction.currency || (transaction.metadata as any)?.original_currency || 'USD'
          const displayAmount = originalCurrency === 'USD' 
            ? `$${Number(transaction.amount).toFixed(2)}`
            : `${originalCurrency} ${Number(transaction.amount).toLocaleString('id-ID')}`

          await emailService.sendPaymentReceived(userData.email, {
            customerName: userData.full_name || 'Customer',
            orderId: transaction.id,
            packageName: packageData.name,
            billingPeriod: transaction.billing_period || 'monthly',
            amount: displayAmount,
            paymentDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          })
        }
      } catch (emailError) {
        logger.error({ error: emailError instanceof Error ? emailError.message : String(emailError) }, `⚠️ [${paymentType.toUpperCase()}] Failed to send payment received email:`)
      }

      await activateSubscription(body, transaction, supabaseAdmin, paymentType)
    }

    return NextResponse.json({ status: 'OK' })

  } catch (error: any) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, `💥 [${paymentType.toUpperCase()}] Processing error:`)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

async function sendOrderConfirmationWithDetails(body: any, transaction: any, supabaseAdmin: any, paymentType: string) {
  try {
    // Get user data using secure wrapper
    const userData = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system_webhook',
        operation: 'midtrans_webhook_get_user_data',
        reason: 'Midtrans webhook fetching user data for order confirmation email',
        source: 'midtrans/webhook',
        metadata: {
          transactionId: transaction.id,
          userId: transaction.user_id,
          paymentType: paymentType,
          endpoint: '/api/midtrans/webhook'
        }
      },
      {
        table: 'indb_auth_user_profiles',
        operationType: 'select',
        columns: ['full_name', 'email'],
        whereConditions: { user_id: transaction.user_id }
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('full_name, email')
          .eq('user_id', transaction.user_id)
          .single()

        if (error) {
          throw new Error(`Failed to fetch user data: ${error.message}`)
        }

        return data
      }
    )

    // Get package data using secure wrapper
    const packageData = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system_webhook',
        operation: 'midtrans_webhook_get_package_data',
        reason: 'Midtrans webhook fetching package data for order confirmation email',
        source: 'midtrans/webhook',
        metadata: {
          transactionId: transaction.id,
          packageId: transaction.package_id,
          paymentType: paymentType,
          endpoint: '/api/midtrans/webhook'
        }
      },
      {
        table: 'indb_payment_packages',
        operationType: 'select',
        columns: ['name'],
        whereConditions: { id: transaction.package_id }
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_packages')
          .select('name')
          .eq('id', transaction.package_id)
          .single()

        if (error) {
          throw new Error(`Failed to fetch package data: ${error.message}`)
        }

        return data
      }
    )

    if (userData && packageData) {
      // Get original currency and converted amount for proper display
      const originalCurrency = transaction.currency || (transaction.metadata as any)?.original_currency || 'USD'
      const convertedAmount = (transaction.metadata as any)?.converted_amount
      const convertedCurrency = (transaction.metadata as any)?.converted_currency || 'IDR'
      
      // Use converted amount if available (for Midtrans which uses IDR), otherwise use original
      const displayAmount = convertedAmount 
        ? `${convertedCurrency} ${Number(convertedAmount).toLocaleString('id-ID')}`
        : originalCurrency === 'USD' 
          ? `$${Number(transaction.amount).toFixed(2)}`
          : `${originalCurrency} ${Number(transaction.amount).toLocaleString('id-ID')}`

      const emailData: any = {
        customerName: userData.full_name || 'Customer',
        orderId: transaction.id,
        packageName: packageData.name,
        billingPeriod: transaction.billing_period || 'monthly',
        amount: displayAmount,
        paymentMethod: 'Midtrans',
        orderDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }

      // Add payment details based on payment type
      if (body.payment_type === 'bank_transfer' && body.va_numbers && body.va_numbers.length > 0) {
        const vaInfo = body.va_numbers[0]
        emailData.vaNumber = vaInfo.va_number
        emailData.vaBank = vaInfo.bank.toUpperCase()
        emailData.paymentMethod = `Midtrans Virtual Account (${vaInfo.bank.toUpperCase()})`
      } else if (body.payment_type === 'cstore' && body.payment_code) {
        emailData.storeCode = body.payment_code
        emailData.storeName = body.store ? body.store.charAt(0).toUpperCase() + body.store.slice(1) : 'Convenience Store'
        emailData.paymentMethod = `Midtrans ${emailData.storeName}`
      }

      // Add expiry time if available
      if (body.expiry_time) {
        emailData.expiryTime = new Date(body.expiry_time).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }

      await emailService.sendBillingConfirmation(userData.email, emailData)
      logger.info({ message: `✅ [${paymentType.toUpperCase()}] Order confirmation email sent with payment details` }, 'Info')
    }
  } catch (emailError) {
    logger.error({ error: emailError instanceof Error ? emailError.message : String(emailError) }, `⚠️ [${paymentType.toUpperCase()}] Failed to send order confirmation email:`)
  }
}

async function activateSubscription(body: any, transaction: any, supabaseAdmin: any, paymentType: string) {
  try {
    logger.info({ message: `🎉 [${paymentType.toUpperCase()}] Activating subscription for user: ${transaction.user_id}` }, 'Info')
    
    // Get package details using secure operation
    const packageData = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'webhook_get_package_for_activation',
        source: `midtrans/webhook/${paymentType}`,
        reason: 'Webhook retrieving package details for subscription activation',
        metadata: {
          transactionId: transaction.id,
          packageId: transaction.package_id
        }
      },
      { table: 'indb_payment_packages', operationType: 'select' },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_packages')
          .select('*')
          .eq('id', transaction.package_id)
          .single()

        if (error) throw new Error(`Package not found: ${error.message}`)
        return data
      }
    )

    if (!packageData) {
      logger.error({ error: 'Package not found' }, `❌ [${paymentType.toUpperCase()}] Error occurred`)
      return
    }

    const billingPeriod = transaction.billing_period || 
                          (transaction.metadata as any)?.billing_period || 
                          'monthly'
    
    logger.info({ message: `📅 [${paymentType.toUpperCase()}] Billing period: ${billingPeriod}` }, 'Info')
    
    const now = new Date()
    let expiresAt = new Date(now)
    let nextBillingDate = new Date(now)

    switch (billingPeriod) {
      case 'weekly':
        expiresAt.setDate(now.getDate() + 7)
        nextBillingDate.setDate(now.getDate() + 7)
        break
      case 'monthly':
        expiresAt.setMonth(now.getMonth() + 1)
        nextBillingDate.setMonth(now.getMonth() + 1)
        break
      case 'quarterly':
        expiresAt.setMonth(now.getMonth() + 3)
        nextBillingDate.setMonth(now.getMonth() + 3)
        break
      case 'annually':
        expiresAt.setFullYear(now.getFullYear() + 1)
        nextBillingDate.setFullYear(now.getFullYear() + 1)
        break
    }

    // Update user profile with new package using secure operation
    await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'webhook_activate_user_subscription',
        source: `midtrans/webhook/${paymentType}`,
        reason: 'Webhook activating user subscription after successful payment',
        metadata: {
          transactionId: transaction.id,
          userId: transaction.user_id,
          packageId: transaction.package_id,
          billingPeriod,
          expiresAt: expiresAt.toISOString()
        }
      },
      { table: 'indb_auth_user_profiles', operationType: 'update' },
      async () => {
        const { error } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .update({
            package_id: transaction.package_id,
            subscribed_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('user_id', transaction.user_id)

        if (error) throw new Error(`Failed to update user profile: ${error.message}`)
        return true
      }
    )

    logger.info({ message: `✅ [${paymentType.toUpperCase()}] Subscription activated successfully` }, 'Info')
    logger.info({ message: `📦 Package: ${packageData.name} (${billingPeriod})` }, 'Info')
    logger.info({ message: `⏰ Valid until: ${expiresAt.toISOString()}` }, 'Info')
    
    // Send package activated email
    try {
      const userData = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'webhook_get_user_for_activation_email',
          source: `midtrans/webhook/${paymentType}`,
          reason: 'Webhook retrieving user details for package activation email',
          metadata: {
            transactionId: transaction.id,
            userId: transaction.user_id
          }
        },
        { table: 'indb_auth_user_profiles', operationType: 'select' },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select('full_name, email')
            .eq('user_id', transaction.user_id)
            .single()
          if (error) throw error
          return data
        }
      )

      if (userData) {
        await emailService.sendPackageActivated(userData.email, {
          customerName: userData.full_name || 'Customer',
          packageName: packageData.name,
          billingPeriod: billingPeriod,
          expiresAt: expiresAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          activationDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          dashboardUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://indexnow.studio'
        })
      }
    } catch (emailError) {
      logger.error({ error: emailError instanceof Error ? emailError.message : String(emailError) }, `⚠️ [${paymentType.toUpperCase()}] Failed to send package activated email:`)
    }

    // Create subscription record based on payment type
    try {
      if (paymentType === 'recurring') {
      // Store Midtrans transaction record for recurring
      const midtransTransactionData = {
        transaction_id: body.transaction_id,
        order_id: body.order_id,
        user_id: transaction.user_id,
        package_id: transaction.package_id,
        amount: parseFloat(body.gross_amount),
        currency: body.currency || 'IDR',
        transaction_status: body.transaction_status,
        payment_type: body.payment_type,
        fraud_status: body.fraud_status,
        bank: body.va_numbers?.[0]?.bank || body.bank,
        va_number: body.va_numbers?.[0]?.va_number,
        card_type: body.card_type,
        masked_card: body.masked_card,
        billing_period: billingPeriod,
        settlement_time: body.settlement_time ? new Date(body.settlement_time) : null,
        metadata: {
          webhook_data: body,
          original_metadata: transaction.metadata
        }
      }

      // Store Midtrans transaction record using secure wrapper
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system_webhook',
          operation: 'midtrans_webhook_store_transaction',
          reason: 'Midtrans webhook storing recurring transaction record',
          source: 'midtrans/webhook',
          metadata: {
            transactionId: body.transaction_id,
            orderId: body.order_id,
            userId: transaction.user_id,
            paymentType: 'recurring',
            endpoint: '/api/midtrans/webhook'
          }
        },
        {
          table: 'indb_payment_midtrans_transactions',
          operationType: 'insert',
          data: midtransTransactionData
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_payment_midtrans_transactions')
            .insert(midtransTransactionData)

          if (error) {
            throw new Error(`Failed to store transaction record: ${error.message}`)
          }

          return { success: true }
        }
      )

      // Create recurring subscription record
      const subscriptionId = `SUB-${body.order_id}-${Date.now()}`
      const subscriptionData = {
        subscription_id: subscriptionId,
        user_id: transaction.user_id,
        package_id: transaction.package_id,
        status: 'active',
        billing_period: billingPeriod,
        amount: parseFloat(body.gross_amount),
        currency: body.currency || 'IDR',
        started_at: now,
        next_billing_date: nextBillingDate,
        expires_at: expiresAt,
        card_token: body.saved_token_id,
        customer_details: {
          first_name: (transaction.metadata as any)?.customer_info?.first_name,
          last_name: (transaction.metadata as any)?.customer_info?.last_name,
          email: (transaction.metadata as any)?.customer_info?.email,
          phone: (transaction.metadata as any)?.customer_info?.phone
        },
        metadata: {
          auto_renewal: true,
          subscription_type: 'recurring',
          midtrans_data: body
        }
      }

      // Create recurring subscription record using secure wrapper
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system_webhook',
          operation: 'midtrans_webhook_create_recurring_subscription',
          reason: 'Midtrans webhook creating recurring subscription record',
          source: 'midtrans/webhook',
          metadata: {
            subscriptionId: subscriptionId,
            userId: transaction.user_id,
            packageId: transaction.package_id,
            billingPeriod: billingPeriod,
            endpoint: '/api/midtrans/webhook'
          }
        },
        {
          table: 'indb_payment_midtrans_subscriptions',
          operationType: 'insert',
          data: subscriptionData
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_payment_midtrans_subscriptions')
            .insert(subscriptionData)

          if (error) {
            throw new Error(`Failed to create recurring subscription: ${error.message}`)
          }

          return { success: true }
        }
      )

      logger.info({ message: `✅ [${paymentType.toUpperCase()}] Recurring subscription created: ${subscriptionId}` }, 'Info')
    } else {
      // Create Snap subscription record using secure wrapper
      const snapSubscriptionData = {
        id: `snap-sub-${body.order_id}`,
        user_id: transaction.user_id,
        package_id: transaction.package_id,
        billing_period: billingPeriod,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_method: 'midtrans_snap',
        subscription_status: 'active',
        started_at: now.toISOString(),
        next_billing_date: expiresAt.toISOString(),
        gateway_subscription_id: body.order_id
      }

      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system_webhook',
          operation: 'midtrans_webhook_create_snap_subscription',
          reason: 'Midtrans webhook creating Snap subscription record',
          source: 'midtrans/webhook',
          metadata: {
            subscriptionId: `snap-sub-${body.order_id}`,
            userId: transaction.user_id,
            packageId: transaction.package_id,
            billingPeriod: billingPeriod,
            paymentType: 'snap',
            endpoint: '/api/midtrans/webhook'
          }
        },
        {
          table: 'indb_payment_subscriptions',
          operationType: 'insert',
          data: snapSubscriptionData
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_payment_subscriptions')
            .insert(snapSubscriptionData)

          if (error) {
            throw new Error(`Failed to create Snap subscription: ${error.message}`)
          }

          return { success: true }
        }
      )

        logger.info({ message: `✅ [${paymentType.toUpperCase()}] Snap subscription created` }, 'Info')
      }
    } catch (error: any) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, `💥 [${paymentType.toUpperCase()}] Subscription activation error:`)
    }
  } catch (error: any) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, `💥 [${paymentType.toUpperCase()}] Activation error:`)
  }
}

async function handleSubscriptionEvent(body: any, transaction: any, supabaseAdmin: any, eventType: string) {
  try {
    logger.info({ message: `🔔 [Subscription] Processing event: ${eventType}` }, 'Info')
    logger.info({ message: `📋 [Subscription] Subscription ID: ${body.subscription.id}` }, 'Info')
    logger.info({ message: `👤 [Subscription] User ID: ${body.subscription.metadata?.user_id}` }, 'Info')
    logger.info({ message: `📦 [Subscription] Package ID: ${body.subscription.metadata?.package_id}` }, 'Info')
    logger.info({ message: `💰 [Subscription] Amount: ${body.subscription.amount} ${body.subscription.currency}` }, 'Info')
    logger.info({ message: `📅 [Subscription] Status: ${body.subscription.status}` }, 'Info')

    // Update or log subscription status based on event type
    const subscriptionData = {
      subscription_id: body.subscription.id,
      event_type: eventType,
      subscription_status: body.subscription.status,
      amount: parseFloat(body.subscription.amount),
      currency: body.subscription.currency,
      user_id: body.subscription.metadata?.user_id,
      package_id: body.subscription.metadata?.package_id,
      next_execution: body.subscription.schedule?.next_execution_at,
      metadata: {
        midtrans_subscription: body.subscription,
        original_transaction_id: transaction.id,
        processed_at: new Date().toISOString()
      }
    }

    // Log subscription event to activity log
    if (body.subscription.metadata?.user_id) {
      try {
        // Use relative URL for server-side API calls
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'
        const activityResponse = await fetch(`${baseUrl}/api/v1/admin/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: body.subscription.metadata.user_id,
            event_type: 'subscription_updated',
            action: `Subscription ${eventType} - ID: ${body.subscription.id}`,
            metadata: {
              subscription_id: body.subscription.id,
              event_type: eventType,
              subscription_status: body.subscription.status,
              amount: body.subscription.amount,
              currency: body.subscription.currency
            }
          })
        })

        if (activityResponse.ok) {
          logger.info({ message: '✅ [Subscription] Activity logged successfully' }, 'Info')
        } else {
          logger.error({ error: String(activityResponse.status) }, '⚠️ [Subscription] Activity logging failed with status:')
        }
      } catch (activityError) {
        logger.error({ error: activityError instanceof Error ? activityError.message : String(activityError) }, '⚠️ [Subscription] Failed to log activity:')
      }
    }

    // Handle different subscription events
    switch (eventType) {
      case 'subscription.create':
        logger.info({ message: '🎉 [Subscription] New subscription created' }, 'Info')
        break
      case 'subscription.active':
        logger.info({ message: '✅ [Subscription] Subscription activated' }, 'Info')
        break
      case 'subscription.update':
        logger.info({ message: '📝 [Subscription] Subscription updated' }, 'Info')
        break
      case 'subscription.disable':
        logger.info({ message: '⏸️ [Subscription] Subscription disabled' }, 'Info')
        break
      case 'subscription.enable':
        logger.info({ message: '▶️ [Subscription] Subscription enabled' }, 'Info')
        break
      default:
        logger.info({ message: `ℹ️ [Subscription] Event processed: ${eventType}` }, 'Info')
    }

    logger.info({ message: '✅ [Subscription] Event processed successfully' }, 'Info')
    return NextResponse.json({ 
      status: 'OK', 
      message: `Subscription event ${eventType} processed successfully`,
      subscription_id: body.subscription.id
    })

  } catch (error: any) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, '💥 [Subscription] Event processing error:')
    return NextResponse.json({ 
      status: 'error', 
      message: 'Subscription event processing failed',
      error: error.message
    }, { status: 500 })
  }
}

async function sendOrderExpiredEmail(body: any, transaction: any, supabaseAdmin: any, paymentType: string, status: string) {
  try {
    logger.info({ message: `📧 [${paymentType.toUpperCase()}] Sending order expired email for status: ${status}` }, 'Info')
    
    // Get user data using secure wrapper
    const userData = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system_webhook',
        operation: 'midtrans_webhook_get_user_for_expired_email',
        reason: 'Midtrans webhook fetching user data for order expired email',
        source: 'midtrans/webhook',
        metadata: {
          transactionId: transaction.id,
          userId: transaction.user_id,
          paymentType: paymentType,
          status: status,
          endpoint: '/api/midtrans/webhook'
        }
      },
      {
        table: 'indb_auth_user_profiles',
        operationType: 'select',
        columns: ['full_name', 'email'],
        whereConditions: { user_id: transaction.user_id }
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('full_name, email')
          .eq('user_id', transaction.user_id)
          .single()

        if (error) {
          throw new Error(`Failed to fetch user data: ${error.message}`)
        }

        return data
      }
    )

    // Get package data using secure wrapper
    const packageData = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system_webhook',
        operation: 'midtrans_webhook_get_package_for_expired_email',
        reason: 'Midtrans webhook fetching package data for order expired email',
        source: 'midtrans/webhook',
        metadata: {
          transactionId: transaction.id,
          packageId: transaction.package_id,
          paymentType: paymentType,
          status: status,
          endpoint: '/api/midtrans/webhook'
        }
      },
      {
        table: 'indb_payment_packages',
        operationType: 'select',
        columns: ['name'],
        whereConditions: { id: transaction.package_id }
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_packages')
          .select('name')
          .eq('id', transaction.package_id)
          .single()

        if (error) {
          throw new Error(`Failed to fetch package data: ${error.message}`)
        }

        return data
      }
    )

    if (userData && packageData) {
      // Get original currency and amount for proper display
      const originalCurrency = transaction.currency || (transaction.metadata as any)?.original_currency || 'USD'
      const displayAmount = originalCurrency === 'USD' 
        ? `$${Number(transaction.amount).toFixed(2)}`
        : `${originalCurrency} ${Number(transaction.amount).toLocaleString('id-ID')}`

      await emailService.sendOrderExpired(userData.email, {
        customerName: userData.full_name || 'Customer',
        orderId: transaction.id,
        packageName: packageData.name,
        billingPeriod: transaction.billing_period || 'monthly',
        amount: displayAmount,
        status: status === 'expired' ? 'Expired' : 'Failed',
        expiredDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        subscribeUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://indexnow.studio'
      })
      logger.info({ message: `✅ [${paymentType.toUpperCase()}] Order expired email sent successfully` }, 'Info')
    }
  } catch (emailError) {
    logger.error({ error: emailError instanceof Error ? emailError.message : String(emailError) }, `⚠️ [${paymentType.toUpperCase()}] Failed to send order expired email:`)
  }
}

/**
 * Handle subscription renewals that don't have matching transaction records
 * This occurs when Midtrans processes automatic recurring payments
 */
async function handleSubscriptionRenewal(body: any, orderId: string, supabaseAdmin: any) {
  try {
    logger.info({ data: [orderId] }, '🔄 [Subscription Renewal] Processing automatic renewal for order_id:')
    logger.info({ data: [Object.keys(body)] }, '🔍 [Subscription Renewal] Webhook body keys:')
    
    // Look for user based on subscription metadata or webhook body
    let userId = body.metadata?.user_id
    let userEmail = body.metadata?.user_email || body.metadata?.email
    let packageId = body.metadata?.package_id
    let billingPeriod = body.metadata?.billing_period || 'monthly'
    let originalOrderId = body.metadata?.order_id
    
    // Also check customer_details from webhook body
    if (!userEmail && body.customer_details?.email) {
      userEmail = body.customer_details.email
    }
    
    logger.info({ data: [{
      userId, userEmail, packageId, billingPeriod, originalOrderId
    }] }, '🔍 [Subscription Renewal] Extracted metadata:')
    logger.info({ data: [Object.keys(body.metadata || {})] }, '🔍 [Subscription Renewal] Available metadata keys:')
    logger.info({ data: [body.customer_details] }, '🔍 [Subscription Renewal] Customer details:')
    
    // If no user metadata found, try to find by subscription ID
    if (!userId && body.subscription_id) {
      logger.info({ data: [body.subscription_id] }, '🔍 [Subscription Renewal] Searching by subscription_id:')
      
      const { data: existingSubscription } = await supabaseAdmin
        .from('indb_payment_midtrans')
        .select('user_id, package_id, billing_period, customer_details')
        .eq('subscription_id', body.subscription_id)
        .single()
        
      if (existingSubscription) {
        userId = existingSubscription.user_id
        packageId = existingSubscription.package_id
        billingPeriod = existingSubscription.billing_period
        userEmail = existingSubscription.customer_details?.email
        logger.info({ data: [{ userId, packageId }] }, '✅ [Subscription Renewal] Found existing subscription data:')
      }
    }
    
    // If still no userId, try to find user by email
    if (!userId && userEmail) {
      logger.info({ data: [userEmail] }, '🔍 [Subscription Renewal] Searching user by email:')
      
      const { data: userByEmail } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('user_id, package_id')
        .eq('email', userEmail)
        .single()
        
      if (userByEmail) {
        userId = userByEmail.user_id
        if (!packageId) packageId = userByEmail.package_id
        logger.info({ data: [userId] }, '✅ [Subscription Renewal] Found user by email:')
      }
    }
    
    if (!userId) {
      logger.error({ error: '❌ [Subscription Renewal] Cannot process: no user identification found' }, 'Error occurred')
      logger.error({ data: [{ 
        metadata: body.metadata, customer_details: body.customer_details, subscription_id: body.subscription_id 
      }] }, '❌ [Subscription Renewal] Available data:')
      return NextResponse.json({ error: 'User identification required for renewal' }, { status: 400 })
    }
    
    // Get package data
    const { data: packageData } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('id', packageId)
      .single()
      
    if (!packageData) {
      logger.error({ error: String(packageId) }, '❌ [Subscription Renewal] Package not found:')
      return NextResponse.json({ error: 'Processing failed' }, { status: 400 })
    }
    
    // Get Midtrans gateway ID
    const { data: gatewayData } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('id')
      .eq('slug', 'midtrans')
      .eq('is_active', true)
      .single()
      
    if (!gatewayData) {
      logger.error({ error: '❌ [Subscription Renewal] Midtrans gateway not found or inactive' }, 'Error occurred')
      return NextResponse.json({ error: 'Payment gateway not available' }, { status: 400 })
    }
    
    // Use unified order ID template (same as regular orders)
    const renewalOrderId = `ORDER-${Date.now()}-${userId.substring(0, 8)}`
    
    logger.info({ data: [renewalOrderId] }, '🆔 [Subscription Renewal] Generated unified order_id:')
    
    // Create transaction record for the renewal
    const renewalTransaction = {
      user_id: userId,
      package_id: packageId,
      gateway_id: gatewayData.id, // Required field from indb_payment_gateways
      transaction_type: 'purchase', // Required field
      transaction_status: 'completed',
      amount: parseFloat(body.gross_amount || '0'),
      currency: body.currency || 'IDR',
      payment_method: 'midtrans_recurring',
      // payment_reference: renewalOrderId, // Removed - using database ID instead
      gateway_transaction_id: body.transaction_id,
      billing_period: billingPeriod,
      processed_at: new Date().toISOString(),
      metadata: {
        renewal_type: 'automatic_recurring',
        original_order_id: originalOrderId,
        midtrans_webhook_order_id: orderId, // The order_id from Midtrans webhook
        midtrans_webhook_data: body,
        subscription_id: body.subscription_id
      }
    }
    
    logger.info({ data: [{
      user_id: renewalTransaction.user_id, package_id: renewalTransaction.package_id, amount: renewalTransaction.amount, currency: renewalTransaction.currency, payment_method: renewalTransaction.payment_method, // payment_reference: renewalTransaction.payment_reference // Removed - using database ID instead
    }] }, '💾 [Subscription Renewal] Transaction data to insert:')
    
    const { data: newTransaction, error: transactionError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .insert(renewalTransaction)
      .select()
      .single()
      
    if (transactionError) {
      logger.error({ error: transactionError instanceof Error ? transactionError.message : String(transactionError) }, '💥 [Subscription Renewal] Transaction creation failed:')
      return NextResponse.json({ error: 'Failed to create transaction record' }, { status: 500 })
    }
      
    logger.info({ data: [newTransaction.id] }, '✅ [Subscription Renewal] Created transaction record:')
    
    // Update user subscription expiration
    const currentDate = new Date()
    const nextBillingDate = billingPeriod === 'yearly' ? 
      new Date(currentDate.getTime() + 365 * 24 * 60 * 60 * 1000) :
      new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        package_id: packageId,
        subscribed_at: currentDate.toISOString(),
        expires_at: nextBillingDate.toISOString(),
        updated_at: currentDate.toISOString()
      })
      .eq('user_id', userId)
      
    logger.info({ data: [nextBillingDate.toISOString()] }, '✅ [Subscription Renewal] Updated user package expiration to:')
    
    // Create Midtrans payment record
    await supabaseAdmin
      .from('indb_payment_midtrans')
      .insert({
        transaction_id: newTransaction.id,
        user_id: userId,
        package_id: packageId,
        gateway_transaction_id: body.transaction_id,
        subscription_id: body.subscription_id,
        amount: parseFloat(body.gross_amount || '0'),
        currency: body.currency || 'IDR',
        payment_status: 'completed',
        subscription_status: 'active',
        billing_period: billingPeriod,
        card_type: body.card_type,
        masked_card: body.masked_card,
        bank: body.bank,
        metadata: {
          renewal_payment: true,
          webhook_data: body
        }
      })
    
    // Send renewal confirmation email if user email available
    if (userEmail) {
      try {
        const { data: userProfile } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('full_name')
          .eq('user_id', userId)
          .single()
          
        await emailService.sendBillingConfirmation(userEmail, {
          customerName: userProfile?.full_name || 'Customer',
          orderId: renewalOrderId,
          packageName: packageData.name,
          billingPeriod: billingPeriod,
          amount: body.currency === 'USD' ? `$${parseFloat(body.gross_amount).toFixed(2)}` : `IDR ${Number(body.gross_amount).toLocaleString('id-ID')}`,
          paymentMethod: 'Midtrans (Auto-renewal)',
          orderDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        })
        
        logger.info({ data: [userEmail] }, '✅ [Subscription Renewal] Sent renewal confirmation email to:')
      } catch (emailError) {
        logger.error({ error: emailError instanceof Error ? emailError.message : String(emailError) }, '⚠️ [Subscription Renewal] Failed to send email:')
      }
    }
    
    logger.info({ message: '🎉 [Subscription Renewal] Successfully processed automatic renewal' }, 'Info')
    return NextResponse.json({ 
      status: 'Renewal processed successfully',
      renewal_order_id: renewalOrderId,
      original_webhook_order_id: orderId,
      user_id: userId,
      package_name: packageData.name
    })
    
  } catch (error: any) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, '💥 [Subscription Renewal] Processing error:')
    return NextResponse.json({ error: 'Renewal processing failed' }, { status: 500 })
  }
}
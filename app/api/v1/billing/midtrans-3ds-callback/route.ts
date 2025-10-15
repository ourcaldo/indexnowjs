import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { PaymentServiceFactory } from '@/lib/services/payments'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import type { AuthenticatedRequest } from '@/lib/core/api-middleware'

export const POST = authenticatedApiWrapper(async (request: NextRequest, auth: AuthenticatedRequest) => {
  const { transaction_id, order_id } = await request.json()
  
  // CRITICAL FIX: Check if this transaction has already been processed to prevent double requests
  const supabaseCheck = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const existingProcessed = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: 'system',
      operation: '3ds_callback_check_existing_transaction',
      source: 'billing/midtrans-3ds-callback',
      reason: '3DS callback checking for duplicate transaction processing',
      metadata: {
        transactionId: transaction_id,
        orderId: order_id
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent') || undefined
    },
    { table: 'indb_payment_transactions', operationType: 'select' },
    async () => {
      const { data, error } = await supabaseCheck
        .from('indb_payment_transactions')
        .select('id, transaction_status, metadata')
        .eq('gateway_transaction_id', transaction_id)
        .eq('transaction_status', 'completed')
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    }
  )
  
  if (existingProcessed) {
    return formatSuccess({
      message: 'Transaction already processed successfully',
      transaction_id: existingProcessed.id,
      already_processed: true
    })
  }

  if (!transaction_id || !order_id) {
    const error = await ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      'Missing transaction_id or order_id',
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 400,
        userId: auth.userId,
        userMessageKey: 'missing_required'
      }
    )
    return formatError(error)
  }

  // Initialize Supabase client (using same pattern as working endpoint)
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get Midtrans configuration using secure operation
  const midtransGateway = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: 'system',
      operation: '3ds_callback_get_gateway_config',
      source: 'billing/midtrans-3ds-callback',
      reason: '3DS callback retrieving Midtrans gateway configuration',
      metadata: {
        gatewaySlug: 'midtrans',
        transactionId: transaction_id,
        orderId: order_id
      }
    },
    { table: 'indb_payment_gateways', operationType: 'select' },
    async () => {
      const { data, error } = await supabase
        .from('indb_payment_gateways')
        .select('id, configuration, api_credentials')
        .eq('slug', 'midtrans')
        .eq('is_active', true)
        .single()

      if (error || !data) {
        throw new Error('Midtrans payment gateway not configured')
      }
      return data
    }
  )

  if (!midtransGateway) {
    const error = await ErrorHandlingService.createError(
      ErrorType.EXTERNAL_API,
      'Midtrans payment gateway not configured',
      {
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        userId: auth.userId,
        userMessageKey: 'default'
      }
    )
    return formatError(error)
  }

  const { server_key, client_key, merchant_id } = midtransGateway.api_credentials
  const { environment } = midtransGateway.configuration

  // Initialize Midtrans service - use recurring service type
  const midtransService = PaymentServiceFactory.createMidtransService('recurring', {
    server_key,
    client_key,
    environment,
    merchant_id
  }) as import('@/lib/services/payments/midtrans/MidtransRecurringService').MidtransRecurringService

  // Get transaction status to check 3DS result
  const transactionStatus = await midtransService.getTransactionStatus(transaction_id)

  // Check if transaction was successful after 3DS
  if (transactionStatus.transaction_status === 'capture' || transactionStatus.transaction_status === 'settlement') {
    // CRITICAL FIX: Use saved_token_id from the transaction status (after 3DS), NOT the original temporary token_id
    const savedTokenId = transactionStatus.saved_token_id
    
    if (!savedTokenId) {
      const error = await ErrorHandlingService.createError(
        ErrorType.BUSINESS_LOGIC,
        'No saved_token_id found in transaction status - card tokenization may have failed',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 500,
          userId: auth.userId,
          userMessageKey: 'default'
        }
      )
      return formatError(error)
    }
    
    // Get the original transaction record for metadata and amount using secure operation
    const existingTransaction = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: '3ds_callback_get_original_transaction',
        source: 'billing/midtrans-3ds-callback',
        reason: '3DS callback retrieving original transaction for metadata and amount',
        metadata: {
          gatewayTransactionId: transaction_id,
          orderId: order_id
        }
      },
      { table: 'indb_payment_transactions', operationType: 'select' },
      async () => {
        const { data, error } = await supabase
          .from('indb_payment_transactions')
          .select('id, metadata, amount, package_id')
          .eq('gateway_transaction_id', transaction_id)
          .maybeSingle()
        
        if (error && error.code !== 'PGRST116') throw error
        return data
      }
    )

    // Get customer info from the same transaction record  
    let originalCustomerInfo = null
    if (existingTransaction && existingTransaction.metadata?.customer_info) {
      originalCustomerInfo = existingTransaction.metadata.customer_info
    }
    
    // Get transaction details from Midtrans
    const transactionDetails = await midtransService.getTransactionStatus(transaction_id)
    
    // Try to find customer info in different places in the Midtrans response
    const midtransFirstName = transactionDetails.customer_details?.first_name || 
                             transactionDetails.customer_detail?.first_name ||
                             transactionDetails.billing_address?.first_name
    
    // Get transaction amount and package from the original transaction record
    let transactionAmountUSD = existingTransaction?.amount || 0
    let matchedPackage = null
    let billing_period = 'monthly' // Default billing period
    
    // If we have a package_id in the original transaction, use that directly
    if (existingTransaction?.package_id) {
      const packageFromTransaction = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: '3ds_callback_get_package_from_transaction',
          source: 'billing/midtrans-3ds-callback',
          reason: '3DS callback retrieving package details from transaction record',
          metadata: {
            packageId: existingTransaction.package_id,
            transactionId: existingTransaction.id
          }
        },
        { table: 'indb_payment_packages', operationType: 'select' },
        async () => {
          const { data, error } = await supabase
            .from('indb_payment_packages')
            .select('*')
            .eq('id', existingTransaction.package_id)
            .single()
          
          if (error) throw error
          return data
        }
      )
      
      if (packageFromTransaction) {
        matchedPackage = packageFromTransaction
        // Get billing period from metadata if available
        billing_period = existingTransaction.metadata?.billing_period || 'monthly'
      }
    }
    
    // Fallback: fetch and match packages by amount if no package_id
    if (!matchedPackage) {
      const allPackages = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: '3ds_callback_get_all_active_packages',
          source: 'billing/midtrans-3ds-callback',
          reason: '3DS callback retrieving all active packages for amount matching',
          metadata: {
            transactionAmountUSD,
            transactionId: transaction_id
          }
        },
        { table: 'indb_payment_packages', operationType: 'select' },
        async () => {
          const { data, error } = await supabase
            .from('indb_payment_packages')
            .select('*')
            .eq('is_active', true)
          
          if (error) throw new Error(`Failed to fetch packages: ${error.message}`)
          return data || []
        }
      )
      
      if (!allPackages || allPackages.length === 0) {
        const error = await ErrorHandlingService.createError(
          ErrorType.DATABASE,
          'Failed to fetch packages for amount matching',
          {
            severity: ErrorSeverity.HIGH,
            statusCode: 500,
            userId: auth.userId,
            userMessageKey: 'query_failed'
          }
        )
        return formatError(error)
      }
      
      // Find matching package by price
      for (const pkg of allPackages) {
        const pricing = pkg.pricing_tiers || {}
        const monthlyUSD = pricing.monthly?.USD
        const yearlyUSD = pricing.yearly?.USD
        
        // Check monthly pricing
        if (monthlyUSD && (monthlyUSD.regular_price === transactionAmountUSD || monthlyUSD.promo_price === transactionAmountUSD)) {
          matchedPackage = pkg
          billing_period = 'monthly'
          break
        }
        
        // Check annual pricing
        if (yearlyUSD && (yearlyUSD.regular_price === transactionAmountUSD || yearlyUSD.promo_price === transactionAmountUSD)) {
          matchedPackage = pkg
          billing_period = 'annual'
          break
        }
        
        // Fallback: check base price
        if (pkg.price === transactionAmountUSD) {
          matchedPackage = pkg
          billing_period = pkg.billing_period || 'monthly'
          break
        }
      }
      
      if (!matchedPackage && allPackages.length > 0) {
        matchedPackage = allPackages[0] // Fallback to first package
      }
    }
    
    if (!matchedPackage) {
      const error = await ErrorHandlingService.createError(
        ErrorType.BUSINESS_LOGIC,
        'No package found for subscription creation',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 500,
          userId: auth.userId,
          userMessageKey: 'default'
        }
      )
      return formatError(error)
    }
    
    // CRITICAL FIX: Check if transaction is trial and get real package price for subscription
    const isTrialTransaction = existingTransaction?.metadata?.is_trial || false;
    
    // For trials, we need to use the REAL package price, not the $1 charge amount
    let realPackageAmount = transactionAmountUSD;
    let realPackageForMatching = matchedPackage; // Default to matched package
    
    if (isTrialTransaction) {
      // Get the real package details from metadata
      const packageDetails = existingTransaction?.metadata?.package_details;
      if (packageDetails) {
        realPackageAmount = packageDetails.price;
        
        // Re-match package using the real package ID if available - use the existing matchedPackage if IDs match
        if (packageDetails.id && matchedPackage.id === packageDetails.id) {
          realPackageForMatching = matchedPackage;
        }
      }
    } else {
      // For non-trial transactions, use the matched package price for subscription
      // This ensures we use the correct package price, not potentially incorrect transaction amount
      if (matchedPackage.price) {
        realPackageAmount = matchedPackage.price;
      } else if (matchedPackage.pricing_tiers) {
        // Try to get price from pricing tiers
        const pricing = matchedPackage.pricing_tiers;
        if (billing_period === 'monthly' && pricing.monthly?.USD) {
          realPackageAmount = pricing.monthly.USD.regular_price || pricing.monthly.USD.promo_price;
        } else if (billing_period === 'yearly' && pricing.yearly?.USD) {
          realPackageAmount = pricing.yearly.USD.regular_price || pricing.yearly.USD.promo_price;
        }
      }
    }
    
    // Determine currency for subscription - get from original transaction metadata if available
    const originalCurrency = existingTransaction?.metadata?.package_details?.currency || 
                            existingTransaction?.currency || 
                            'USD'; // Default to USD if not specified
    
    // Create subscription using saved_token_id from transaction status (NOT the original temporary token)
    const subscription = await midtransService.createSubscriptionWithAmount(realPackageAmount, {
      name: isTrialTransaction ? 
        `${realPackageForMatching.name.toUpperCase()}_TRIAL_AUTO_BILLING` : 
        `${realPackageForMatching.name}_${billing_period}`.toUpperCase(),
      token: savedTokenId, // Use the permanent saved_token_id, not the temporary token
      currency: originalCurrency, // Pass currency to determine if conversion is needed
      schedule: {
        interval: 1,
        interval_unit: billing_period === 'monthly' ? 'month' : 'month',
        max_interval: billing_period === 'monthly' ? 12 : 1,
        start_time: isTrialTransaction ? 
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : // 3 days for trial
          new Date(Date.now() + (billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
      },
      customer_details: {
        first_name: originalCustomerInfo?.first_name || midtransFirstName || transactionDetails.customer_details?.first_name || 'Customer',
        last_name: originalCustomerInfo?.last_name || transactionDetails.customer_details?.last_name || transactionDetails.billing_address?.last_name || '',
        email: originalCustomerInfo?.email || transactionDetails.customer_details?.email || transactionDetails.billing_address?.email || auth.user.email || '',
        phone: originalCustomerInfo?.phone || transactionDetails.customer_details?.phone || transactionDetails.billing_address?.phone || '',
      },
      metadata: {
        user_id: auth.userId,
        user_email: auth.user.email,
        package_id: realPackageForMatching.id,
        package_name: realPackageForMatching.name,
        billing_period: billing_period,
        order_id: order_id,
        original_transaction_id: transaction_id,
        trial_type: isTrialTransaction ? 'free_trial_auto_billing' : null,
        original_trial_start: isTrialTransaction ? new Date().toISOString() : null,
        subscription_type: 'recurring_payment',
        currency: originalCurrency
      },
    })
    
    // Update existing pending transaction or create new one
    let transactionData, transactionError;
    
    if (existingTransaction) {
      // Update existing pending transaction
      const { data: updatedTransaction, error: updateError } = await supabase
        .from('indb_payment_transactions')
        .update({
          package_id: realPackageForMatching.id, // Use the correct package ID
          transaction_status: 'completed',
          gateway_response: transactionDetails,
          processed_at: new Date().toISOString(),
          metadata: {
            ...existingTransaction.metadata,
            subscription_id: subscription.id,
            masked_card: transactionDetails.masked_card,
            subscription_status: subscription.status,
            next_execution_at: subscription.schedule?.next_execution_at,
            processing_method: '3ds_callback',
            order_id: order_id,
            final_package_id: realPackageForMatching.id,
            final_package_name: realPackageForMatching.name
          },
        })
        .eq('id', existingTransaction.id)
        .select()
        .single()
      
      transactionData = updatedTransaction
      transactionError = updateError
    } else {
      // Create new transaction record (fallback)
      const { data: newTransaction, error: newError } = await supabase
        .from('indb_payment_transactions')
        .insert({
          user_id: auth.userId,
          package_id: realPackageForMatching.id,
          gateway_id: midtransGateway.id,
          transaction_type: 'subscription',
          transaction_status: 'completed',
          amount: transactionAmountUSD,
          currency: 'USD',
          payment_method: 'credit_card',
          gateway_transaction_id: transaction_id,
          billing_period: billing_period,
          gateway_response: transactionDetails,
          metadata: {
            subscription_id: subscription.id,
            saved_token_id: savedTokenId,
            masked_card: transactionDetails.masked_card,
            subscription_status: subscription.status,
            next_execution_at: subscription.schedule?.next_execution_at,
            processing_method: '3ds_callback',
            customer_info: {
              first_name: originalCustomerInfo?.first_name || midtransFirstName || transactionDetails.customer_details?.first_name || 'Customer',
              last_name: originalCustomerInfo?.last_name || transactionDetails.customer_details?.last_name || transactionDetails.billing_address?.last_name || '',
              email: originalCustomerInfo?.email || transactionDetails.customer_details?.email || transactionDetails.billing_address?.email || auth.user.email || '',
              phone: originalCustomerInfo?.phone || transactionDetails.customer_details?.phone || transactionDetails.billing_address?.phone || '',
            },
            order_id: order_id
          },
        })
        .select()
        .single()
      
      transactionData = newTransaction
      transactionError = newError
    }

    if (transactionError) {
      const error = await ErrorHandlingService.createError(
        ErrorType.DATABASE,
        `Failed to save transaction record: ${transactionError.message}`,
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 500,
          userId: auth.userId,
          userMessageKey: 'query_failed'
        }
      )
      return formatError(error)
    }

    // Create Midtrans-specific data record linked to main transaction
    const { data: midtransData, error: midtransError } = await supabase
      .from('indb_payment_midtrans')
      .insert({
        transaction_id: transactionData.id, // Link to main transaction record
        user_id: auth.userId,
        midtrans_subscription_id: subscription.id,
        saved_token_id: savedTokenId,
        masked_card: transactionDetails.masked_card || 'Unknown',
        card_type: transactionDetails.card_type || 'credit',
        bank: transactionDetails.bank || 'Unknown',
        token_expired_at: transactionDetails.saved_token_id_expired_at ? new Date(transactionDetails.saved_token_id_expired_at).toISOString() : null,
        subscription_status: 'active',
        next_billing_date: subscription.schedule?.next_execution_at ? new Date(subscription.schedule.next_execution_at).toISOString() : null,
        metadata: {
          midtrans_transaction_id: transaction_id,
          order_id: order_id,
          subscription_name: subscription.name,
          schedule: subscription.schedule,
          processing_method: '3ds_callback'
        }
      })
      .select()
      .single()

    if (midtransError) {
      // Don't fail the whole transaction, just log the warning
    }

    // Update user package with trial-specific logic
    let userUpdateData;
    if (isTrialTransaction) {
      const now = new Date();
      const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      
      userUpdateData = {
        package_id: realPackageForMatching.id,
        subscribed_at: now.toISOString(),
        expires_at: trialEndDate.toISOString(), // Trial expires in 3 days
        trial_started_at: now.toISOString(),
        trial_status: 'active',
        auto_billing_enabled: true,
        has_used_trial: true, // Mark trial as used
        trial_used_at: now.toISOString()
      };
    } else {
      userUpdateData = {
        package_id: realPackageForMatching.id,
        subscribed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    
    const { data: updatedProfile, error: userUpdateError } = await supabase
      .from('indb_auth_user_profiles')
      .update(userUpdateData)
      .eq('user_id', auth.userId)
      .select('user_id, package_id, trial_status, expires_at')
      .single()

    if (userUpdateError) {
      const error = await ErrorHandlingService.createError(
        ErrorType.DATABASE,
        `User profile update failed: ${userUpdateError.message}`,
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 500,
          userId: auth.userId,
          userMessageKey: 'query_failed'
        }
      )
      return formatError(error)
    }

    return formatSuccess({
      message: 'Recurring payment setup successfully completed via 3DS',
      transaction_id: transactionData.id,
      midtrans_subscription_id: subscription.id,
      order_id: order_id,
      amount: transactionAmountUSD,
      currency: 'USD',
      billing_period: billing_period,
      next_billing_date: subscription.schedule?.next_execution_at,
      masked_card: transactionDetails.masked_card,
      redirect_url: `/dashboard/settings/plans-billing/orders/${transactionData.id}`,
    })

  } else if (transactionStatus.transaction_status === 'pending') {
    return formatSuccess({
      message: 'Transaction is still pending. Please wait for notification.',
      transaction_status: 'pending'
    })

  } else {
    const error = await ErrorHandlingService.createError(
      ErrorType.BUSINESS_LOGIC,
      `3DS authentication failed: ${transactionStatus.status_message}`,
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 400,
        userId: auth.userId,
        userMessageKey: 'default',
        metadata: { transaction_status: transactionStatus.transaction_status }
      }
    )
    return formatError(error)
  }
})

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { PaymentServiceFactory } from '@/lib/services/payments'
import { convertUsdToIdr } from '@/lib/utils/currency-converter'
import { SecureServiceRoleHelpers, SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

export const POST = authenticatedApiWrapper(async (request: NextRequest, user) => {
  const body = await request.json()
  const { package_id, billing_period, customer_info } = body

  if (!package_id || !billing_period || !customer_info) {
    throw new Error('Missing required fields')
  }

  let packageData = null
  try {
    const packageContext = {
      userId: user.id,
      operation: 'get_payment_package_details',
      reason: 'User creating Midtrans payment for selected package',
      source: 'billing/midtrans/create-payment',
      metadata: {
        packageId: package_id,
        billingPeriod: billing_period,
        endpoint: '/api/v1/billing/midtrans/create-payment'
      }
    }

    const packages = await SecureServiceRoleHelpers.secureSelect(
      packageContext,
      'indb_payment_packages',
      ['*'],
      { id: package_id }
    )
    
    if (!packages || packages.length === 0) {
      throw new Error('Package not found')
    }
    
    packageData = packages[0]
  } catch (error) {
    throw new Error('Package not found')
  }

  let gatewayData = null
  try {
    const gatewayContext = {
      userId: user.id,
      operation: 'get_midtrans_gateway_config',
      reason: 'User payment creation requiring gateway configuration',
      source: 'billing/midtrans/create-payment',
      metadata: {
        endpoint: '/api/v1/billing/midtrans/create-payment',
        gateway: 'midtrans'
      }
    }

    const gateways = await SecureServiceRoleHelpers.secureSelect(
      gatewayContext,
      'indb_payment_gateways',
      ['*'],
      { slug: 'midtrans', is_active: true }
    )

    if (!gateways || gateways.length === 0) {
      throw new Error('Midtrans gateway not configured or inactive')
    }
    
    gatewayData = gateways[0]
  } catch (error) {
    throw new Error('Midtrans gateway not configured or inactive')
  }

  const pricingTiers = packageData.pricing_tiers || {}
  let usdAmount = packageData.price

  if (pricingTiers[billing_period]?.USD) {
    const usdTier = pricingTiers[billing_period].USD
    usdAmount = usdTier.promo_price || usdTier.regular_price
  }

  const idrAmount = await convertUsdToIdr(usdAmount)

  let transaction = null
  try {
    const transactionContext = {
      userId: user.id,
      operation: 'create_midtrans_payment_transaction',
      reason: 'User creating Midtrans payment transaction',
      source: 'billing/midtrans/create-payment',
      metadata: {
        packageId: package_id,
        billingPeriod: billing_period,
        usdAmount,
        idrAmount,
        endpoint: '/api/v1/billing/midtrans/create-payment'
      }
    }

    const transactions = await SecureServiceRoleHelpers.secureInsert(
      transactionContext,
      'indb_payment_transactions',
      {
        user_id: user.id,
        package_id: package_id,
        gateway_id: gatewayData.id,
        transaction_type: 'subscription',
        transaction_status: 'pending',
        amount: usdAmount,
        currency: 'USD',
        payment_method: 'credit_card',
        billing_period: billing_period,
        metadata: {
          billing_period: billing_period,
          usd_amount: usdAmount,
          idr_amount: idrAmount,
          customer_info: customer_info
        }
      }
    )

    if (!transactions || transactions.length === 0) {
      throw new Error('Failed to create transaction record')
    }
    
    transaction = transactions[0]
  } catch (error) {
    throw new Error('Failed to create transaction record')
  }

  const transactionId = transaction.id

  const midtransService = PaymentServiceFactory.createMidtransService('snap', gatewayData)

  const snapPayload = {
    transaction_details: {
      order_id: transactionId,
      gross_amount: idrAmount
    },
    credit_card: {
      secure: true,
      save_card: true
    },
    customer_details: {
      first_name: customer_info.first_name,
      last_name: customer_info.last_name,
      email: customer_info.email,
      phone: customer_info.phone,
      billing_address: {
        first_name: customer_info.first_name,
        last_name: customer_info.last_name,
        email: customer_info.email,
        phone: customer_info.phone,
        address: customer_info.address,
        city: customer_info.city,
        postal_code: customer_info.zip_code,
        country_code: customer_info.country === 'Indonesia' ? 'IDN' : 'USA'
      }
    },
    item_details: [{
      id: packageData.id,
      price: idrAmount,
      quantity: 1,
      name: `${packageData.name} - ${billing_period}`,
      category: 'Subscription'
    }],
    callbacks: {
      finish: `https://${request.headers.get('host')}/dashboard/settings/plans-billing/order/${transactionId}`,
      error: `https://${request.headers.get('host')}/dashboard/settings/plans-billing?payment=failed&order_id=${transactionId}`,
      pending: `https://${request.headers.get('host')}/dashboard/settings/plans-billing?payment=pending&order_id=${transactionId}`
    },
    metadata: {
      user_id: user.id,
      package_id: package_id,
      billing_period: billing_period,
      usd_amount: usdAmount,
      subscription_type: 'recurring',
      auto_renewal: true,
      idr_amount: idrAmount
    }
  }

  const snapBaseUrl = gatewayData.configuration?.environment === 'production' 
    ? 'https://app.midtrans.com' 
    : 'https://app.sandbox.midtrans.com'

  const snapResponse = await fetch(`${snapBaseUrl}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(gatewayData.api_credentials.server_key + ':').toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(snapPayload)
  })

  if (!snapResponse.ok) {
    const errorData = await snapResponse.json().catch(() => ({}))
    logger.error({ error: errorData instanceof Error ? errorData.message : String(errorData) }, 'Midtrans Snap error:')
    throw new Error('Failed to create payment')
  }

  const snapData = await snapResponse.json()

  try {
    const updateContext = {
      userId: user.id,
      operation: 'update_midtrans_transaction_with_snap_token',
      reason: 'Updating transaction with Midtrans Snap token and response',
      source: 'billing/midtrans/create-payment',
      metadata: {
        transactionId,
        snapToken: snapData.token,
        endpoint: '/api/v1/billing/midtrans/create-payment'
      }
    }

    await SecureServiceRoleHelpers.secureUpdate(
      updateContext,
      'indb_payment_transactions',
      {
        gateway_transaction_id: snapData.token,
        gateway_response: {
          snap_token: snapData.token,
          snap_redirect_url: snapData.redirect_url,
          idr_amount: idrAmount,
          order_id: transactionId
        },
        metadata: {
          snap_token: snapData.token,
          billing_period: billing_period,
          usd_amount: usdAmount,
          idr_amount: idrAmount,
          customer_info: customer_info
        }
      },
      { id: transactionId }
    )
  } catch (updateError) {
    logger.error({ error: updateError instanceof Error ? updateError.message : String(updateError) }, 'Transaction update error:')
    throw new Error('Failed to update transaction record')
  }

  return formatSuccess({
    success: true,
    data: {
      transaction_id: transactionId,
      order_id: transactionId,
      snap_token: snapData.token,
      snap_redirect_url: snapData.redirect_url,
      amount: {
        usd: usdAmount,
        idr: idrAmount
      }
    }
  }, undefined, 201)
})

import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { createClient } from '@supabase/supabase-js'
import { ActivityLogger } from '@/lib/monitoring'
import { SecureServiceRoleHelpers, SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const GET = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params
  const orderId = resolvedParams.id

    // Fetch order with all related data using secure wrapper
    const orderContext = {
      userId: adminUser.id,
      operation: 'admin_get_order_details',
      reason: 'Admin fetching individual order details for management',
      source: 'admin/orders/[id]',
      metadata: {
        orderId,
        endpoint: '/api/v1/admin/orders/[id]'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    const order = await SecureServiceRoleWrapper.executeSecureOperation(
      orderContext,
      {
        table: 'indb_payment_transactions',
        operationType: 'select',
        columns: ['*', 'package', 'gateway'],
        whereConditions: { id: orderId }
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_transactions')
          .select(`
            *,
            package:indb_payment_packages(
              id,
              name,
              slug,
              description,
              pricing_tiers,
              currency,
              billing_period,
              features,
              quota_limits
            ),
            gateway:indb_payment_gateways(
              id,
              name,
              slug,
              description,
              configuration
            )
          `)
          .eq('id', orderId)
          .single()

        if (error || !data) {
          throw new Error(error?.message || 'Order not found')
        }

        return data
      }
    )

  if (!order) {
    logger.error({
      userId: adminUser.id,
      endpoint: '/api/v1/admin/orders/[id]',
      method: 'GET',
      orderId
    }, 'Admin order lookup - Order not found')
    return formatSuccess({ error: 'Order not found' }, undefined, 404)
  }

    // Get user profile data using secure wrapper
    let userProfile = null
    let authUser = null
    let verifierProfile = null

    try {
      const profileContext = {
        userId: 'system',
        operation: 'admin_get_order_user_profile_detailed',
        reason: 'Admin fetching detailed user profile for specific order',
        source: 'admin/orders/[id]',
        metadata: {
          orderId: orderId,
          targetUserId: order.user_id,
          endpoint: '/api/v1/admin/orders/[id]'
        }
      }

      const profiles = await SecureServiceRoleHelpers.secureSelect(
        profileContext,
        'indb_auth_user_profiles',
        ['full_name', 'role', 'phone_number', 'created_at', 'package_id', 'subscribed_at', 'expires_at', 'daily_quota_used'],
        { user_id: order.user_id }
      )

      userProfile = profiles.length > 0 ? profiles[0] : null
    } catch (error) {
      logger.error({
        userId: adminUser.id,
        endpoint: '/api/v1/admin/orders/[id]',
        method: 'GET',
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, `Error fetching user profile for order ${orderId}`)
    }

    // Get user's email from Supabase Auth using secure wrapper
    try {
      const authContext = {
        userId: 'system',
        operation: 'admin_get_order_user_auth_detailed',
        reason: 'Admin fetching user auth data for specific order',
        source: 'admin/orders/[id]',
        metadata: {
          orderId: orderId,
          targetUserId: order.user_id,
          endpoint: '/api/v1/admin/orders/[id]'
        }
      }

      authUser = await SecureServiceRoleWrapper.executeSecureOperation(
        authContext,
        {
          table: 'auth.users',
          operationType: 'select',
          columns: ['id', 'email'],
          whereConditions: { id: order.user_id }
        },
        async () => {
          const { data, error } = await supabaseAdmin.auth.admin.getUserById(order.user_id)
          if (error || !data?.user) throw error
          return data
        }
      )
    } catch (error) {
      logger.error({
        userId: adminUser.id,
        endpoint: '/api/v1/admin/orders/[id]',
        method: 'GET',
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, `Error fetching auth data for order ${orderId}`)
    }
    
    // Get verifier profile if exists using secure wrapper
    if (order.verified_by) {
      try {
        const verifierContext = {
          userId: 'system',
          operation: 'admin_get_order_verifier_profile_detailed',
          reason: 'Admin fetching verifier profile for specific order',
          source: 'admin/orders/[id]',
          metadata: {
            orderId: orderId,
            verifierId: order.verified_by,
            endpoint: '/api/v1/admin/orders/[id]'
          }
        }

        const verifiers = await SecureServiceRoleHelpers.secureSelect(
          verifierContext,
          'indb_auth_user_profiles',
          ['user_id', 'full_name', 'role'],
          { user_id: order.verified_by }
        )

        verifierProfile = verifiers.length > 0 ? verifiers[0] : null
      } catch (error) {
        logger.error({
          userId: adminUser.id,
          endpoint: '/api/v1/admin/orders/[id]',
          method: 'GET',
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, `Error fetching verifier profile for order ${orderId}`)
      }
    }
    
    // Attach user and verifier data to order
    const orderWithEmail = {
      ...order,
      user: {
        user_id: order.user_id,
        full_name: userProfile?.full_name || 'Unknown User',
        email: authUser?.user?.email || 'N/A',
        role: userProfile?.role || 'user',
        phone_number: userProfile?.phone_number,
        created_at: userProfile?.created_at || order.created_at,
        package_id: userProfile?.package_id,
        subscribed_at: userProfile?.subscribed_at,
        expires_at: userProfile?.expires_at,
        daily_quota_used: userProfile?.daily_quota_used
      },
      verifier: verifierProfile
    }

    // Get activity history for this order using secure wrapper
    let activityHistory = []
    try {
      const activityContext = {
        userId: adminUser.id,
        operation: 'admin_get_order_activity_history',
        reason: 'Admin fetching security activity history for order details',
        source: 'admin/orders/[id]',
        metadata: {
          orderId,
          endpoint: '/api/v1/admin/orders/[id]'
        }
      }

      activityHistory = await SecureServiceRoleWrapper.executeSecureOperation(
        activityContext,
        {
          table: 'indb_security_activity_logs',
          operationType: 'select',
          columns: ['*', 'user'],
          whereConditions: { target_id: orderId }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_security_activity_logs')
            .select(`
              id,
              event_type,
              action_description,
              created_at,
              user_id,
              metadata,
              user:indb_auth_user_profiles(
                full_name,
                role
              )
            `)
            .or(`target_id.eq.${orderId},metadata->>transaction_id.eq.${orderId}`)
            .order('created_at', { ascending: false })
            .limit(20)

          if (error) {
            throw new Error(`Failed to fetch activity history: ${error.message}`)
          }

          return data || []
        }
      )
    } catch (error) {
      logger.error({
        userId: adminUser.id,
        endpoint: '/api/v1/admin/orders/[id]',
        method: 'GET',
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Error fetching order activity history')
    }

    // Get transaction history from the dedicated history table using secure wrapper
    let transactionHistory = []
    try {
      const transactionContext = {
        userId: adminUser.id,
        operation: 'admin_get_order_transaction_history',
        reason: 'Admin fetching transaction history for order details',
        source: 'admin/orders/[id]',
        metadata: {
          orderId,
          endpoint: '/api/v1/admin/orders/[id]'
        }
      }

      transactionHistory = await SecureServiceRoleWrapper.executeSecureOperation(
        transactionContext,
        {
          table: 'indb_payment_transactions_history',
          operationType: 'select',
          columns: ['*', 'user'],
          whereConditions: { transaction_id: orderId }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_payment_transactions_history')
            .select(`
              id,
              transaction_id,
              old_status,
              new_status,
              action_type,
              action_description,
              changed_by,
              changed_by_type,
              notes,
              metadata,
              created_at,
              user:indb_auth_user_profiles!changed_by(
                full_name,
                role
              )
            `)
            .eq('transaction_id', orderId)
            .order('created_at', { ascending: false })

          if (error) {
            throw new Error(`Failed to fetch transaction history: ${error.message}`)
          }

          return data || []
        }
      )
    } catch (error) {
      logger.error({
        userId: adminUser.id,
        endpoint: '/api/v1/admin/orders/[id]',
        method: 'GET',
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Error fetching transaction history')
    }

    // Log admin activity
    try {
      await ActivityLogger.logAdminAction(
        adminUser.id,
        'order_detail_view',
        orderId,
        `Viewed order details for ${order.id}`,
        request,
        {
          orderDetailView: true,
          orderId,
          orderStatus: order.transaction_status,
          orderAmount: order.amount,
          customerId: order.user_id
        }
      )
    } catch (logError) {
      logger.error({
        userId: adminUser.id,
        endpoint: '/api/v1/admin/orders/[id]',
        method: 'GET',
        orderId,
        error: logError instanceof Error ? logError.message : 'Unknown error'
      }, 'Failed to log admin activity')
    }

  return formatSuccess({
    order: orderWithEmail,
    activity_history: activityHistory || [],
    transaction_history: transactionHistory || []
  })
})
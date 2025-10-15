import { NextRequest } from 'next/server'
import { adminApiWrapper, withDatabaseOperation } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import { createClient } from '@supabase/supabase-js'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { SecureServiceRoleHelpers, SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { logger } from '@/lib/monitoring/error-handling'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const GET = adminApiWrapper(async (request: NextRequest, adminUser) => {
  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '25', 10)
  const status = searchParams.get('status') || undefined
  const customer = searchParams.get('customer') || undefined
  const packageId = searchParams.get('package_id') || undefined
  const dateFrom = searchParams.get('date_from') || undefined
  const dateTo = searchParams.get('date_to') || undefined
  const amountMin = searchParams.get('amount_min') || undefined
  const amountMax = searchParams.get('amount_max') || undefined
    
    // Log admin order management access
    try {
      await ActivityLogger.logAdminDashboardActivity(
        adminUser.id,
        ActivityEventTypes.ORDER_MANAGEMENT,
        'Accessed order management interface',
        request,
        {
          section: 'order_management',
          action: 'view_orders',
          adminUser: adminUser.email
        }
      )
    } catch (logError) {
      logger.error({
        userId: adminUser.id,
        endpoint: '/api/v1/admin/orders',
        method: 'GET',
        error: logError instanceof Error ? logError.message : 'Unknown error'
      }, 'Failed to log admin order activity')
    }

    const offset = (page - 1) * limit

    // Get orders using secure wrapper for admin operations
    const ordersContext = {
      userId: adminUser.id,
      operation: 'admin_get_orders_list',
      reason: 'Admin fetching orders list with filters and pagination',
      source: 'admin/orders',
      metadata: {
        filters: { status, customer, packageId, dateFrom, dateTo, amountMin, amountMax },
        pagination: { page, limit },
        endpoint: '/api/v1/admin/orders'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    const ordersResult = await SecureServiceRoleWrapper.executeSecureOperation(
      ordersContext,
      {
        table: 'indb_payment_transactions',
        operationType: 'select',
        columns: ['*', 'package', 'gateway'],
        whereConditions: {
          ...(status && { transaction_status: status }),
          ...(packageId && { package_id: packageId }),
          ...(dateFrom && { created_at_gte: dateFrom }),
          ...(dateTo && { created_at_lte: dateTo }),
          ...(amountMin && { amount_gte: parseFloat(amountMin) }),
          ...(amountMax && { amount_lte: parseFloat(amountMax) })
        }
      },
      async () => {
        // Build base query
        let query = supabaseAdmin
          .from('indb_payment_transactions')
          .select(`
            id,
            user_id,
            package_id,
            gateway_id,
            transaction_type,
            transaction_status,
            amount,
            currency,
            payment_method,
            payment_proof_url,
            gateway_transaction_id,
            verified_by,
            verified_at,
            processed_at,
            notes,
            metadata,
            created_at,
            updated_at,
            package:indb_payment_packages(
              id,
              name,
              slug,
              description,
              pricing_tiers,
              currency,
              billing_period,
              features
            ),
            gateway:indb_payment_gateways(
              id,
              name,
              slug
            )
          `, { count: 'exact' })

        // Apply filters
        if (status) {
          query = query.eq('transaction_status', status)
        }

        // Note: Customer filtering will be handled during enrichment phase to avoid join issues

        if (packageId) {
          query = query.eq('package_id', packageId)
        }

        if (dateFrom) {
          query = query.gte('created_at', dateFrom)
        }

        if (dateTo) {
          query = query.lte('created_at', dateTo)
        }

        if (amountMin) {
          query = query.gte('amount', parseFloat(amountMin))
        }

        if (amountMax) {
          query = query.lte('amount', parseFloat(amountMax))
        }

        // Execute query with pagination
        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error
        return { orders: data, count }
      }
    )

    const { orders, count } = ordersResult

    if (!orders) {
      logger.error({
        userId: adminUser.id,
        endpoint: '/api/v1/admin/orders',
        method: 'GET'
      }, 'Error fetching orders: No data returned')
      
      const error = await ErrorHandlingService.createError(
        ErrorType.DATABASE,
        'Failed to fetch orders',
        {
          severity: ErrorSeverity.HIGH,
          userId: adminUser.id,
          statusCode: 500,
          userMessageKey: 'default'
        }
      )
      return formatError(error)
    }

    // Fetch user profiles and auth data for each order using secure wrapper
    const enrichedOrders = []
    if (orders && orders.length > 0) {
      for (const order of orders) {
        let userProfile = null
        let authUser = null
        let verifierProfile = null

        // Get user profile from database using secure wrapper
        try {
          const profileContext = {
            userId: 'system',
            operation: 'admin_get_order_user_profile',
            reason: 'Admin fetching user profile for order display',
            source: 'admin/orders',
            metadata: {
              orderId: order.id,
              targetUserId: order.user_id,
              endpoint: '/api/v1/admin/orders'
            }
          }

          const profiles = await SecureServiceRoleHelpers.secureSelect(
            profileContext,
            'indb_auth_user_profiles',
            ['full_name', 'role', 'created_at'],
            { user_id: order.user_id }
          )

          userProfile = profiles.length > 0 ? profiles[0] : null
        } catch (error) {
          logger.error({
            userId: adminUser.id,
            endpoint: '/api/v1/admin/orders',
            method: 'GET',
            orderId: order.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, `Error fetching user profile for order ${order.id}`)
        }

        // Get user email from Supabase Auth using secure wrapper
        try {
          const authContext = {
            userId: 'system',
            operation: 'admin_get_order_user_auth',
            reason: 'Admin fetching user auth data for order display',
            source: 'admin/orders',
            metadata: {
              orderId: order.id,
              targetUserId: order.user_id,
              endpoint: '/api/v1/admin/orders'
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
            endpoint: '/api/v1/admin/orders',
            method: 'GET',
            orderId: order.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, `Error fetching auth data for order ${order.id}`)
        }

        // Get verifier profile if exists using secure wrapper
        if (order.verified_by) {
          try {
            const verifierContext = {
              userId: 'system',
              operation: 'admin_get_order_verifier_profile',
              reason: 'Admin fetching verifier profile for order display',
              source: 'admin/orders',
              metadata: {
                orderId: order.id,
                verifierId: order.verified_by,
                endpoint: '/api/v1/admin/orders'
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
              endpoint: '/api/v1/admin/orders',
              method: 'GET',
              orderId: order.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, `Error fetching verifier profile for order ${order.id}`)
          }
        }

        const enrichedOrder = {
          ...order,
          user: {
            user_id: order.user_id,
            full_name: userProfile?.full_name || 'Unknown User',
            role: userProfile?.role || 'user',
            email: authUser?.user?.email || 'N/A',
            created_at: userProfile?.created_at || order.created_at
          },
          verifier: verifierProfile
        };

        // Apply customer filtering during enrichment phase
        if (customer) {
          const customerLower = customer.toLowerCase();
          const fullName = enrichedOrder.user.full_name.toLowerCase();
          const email = enrichedOrder.user.email.toLowerCase();
          
          if (fullName.includes(customerLower) || email.includes(customerLower)) {
            enrichedOrders.push(enrichedOrder);
          }
        } else {
          enrichedOrders.push(enrichedOrder);
        }
      }
    }

    // Get summary statistics using secure wrapper
    const summaryContext = {
      userId: adminUser.id,
      operation: 'admin_get_orders_summary',
      reason: 'Admin fetching order statistics for dashboard display',
      source: 'admin/orders',
      metadata: {
        endpoint: '/api/v1/admin/orders',
        statsType: 'transaction_summary'
      }
    }

    const summaryData = await SecureServiceRoleWrapper.executeSecureOperation(
      summaryContext,
      {
        table: 'indb_payment_transactions',
        operationType: 'select',
        columns: ['transaction_status', 'amount', 'currency', 'created_at']
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_transactions')
          .select('transaction_status, amount, currency, created_at')

        if (error) {
          throw new Error(`Failed to fetch summary statistics: ${error.message}`)
        }

        return data
      }
    )

    // Calculate summary statistics
    const summary = {
      total_orders: summaryData?.length || 0,
      pending_orders: summaryData?.filter(t => t.transaction_status === 'pending').length || 0,
      proof_uploaded_orders: summaryData?.filter(t => t.transaction_status === 'proof_uploaded').length || 0,
      completed_orders: summaryData?.filter(t => t.transaction_status === 'completed').length || 0,
      failed_orders: summaryData?.filter(t => t.transaction_status === 'failed').length || 0,
      total_revenue: summaryData?.filter(t => t.transaction_status === 'completed').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0,
      recent_activity: summaryData?.filter(t => {
        const createdAt = new Date(t.created_at)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return createdAt >= sevenDaysAgo
      }).length || 0
    }

    // Log admin activity
    try {
      await ActivityLogger.logAdminAction(
        adminUser.id,
        'orders_list_view',
        undefined,
        `Viewed orders list (${enrichedOrders?.length || 0} orders)`,
        request,
        {
          ordersView: true,
          totalOrders: enrichedOrders?.length || 0,
          filters: {
            status,
            customer,
            packageId,
            dateFrom,
            dateTo,
            amountMin,
            amountMax
          }
        }
      )
    } catch (logError) {
      logger.error({
        userId: adminUser.id,
        endpoint: '/api/v1/admin/orders',
        method: 'GET',
        error: logError instanceof Error ? logError.message : 'Unknown error'
      }, 'Failed to log admin activity')
    }

  return formatSuccess({
    orders: enrichedOrders,
    summary,
    pagination: {
      current_page: page,
      total_pages: Math.ceil((count || 0) / limit),
      total_items: count || 0,
      items_per_page: limit,
      has_next: offset + limit < (count || 0),
      has_prev: page > 1
    }
  })
})
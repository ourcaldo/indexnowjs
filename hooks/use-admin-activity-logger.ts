'use client'

import { useEffect, useRef, useState } from 'react'
import { authService, AuthUser } from '@/lib/auth'
import { supabase } from '@/lib/database'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface AdminActivityMetadata {
  section?: string
  action?: string
  adminEmail?: string
  [key: string]: any
}

export function useAdminActivityLogger() {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error getting current user:', error)
      }
    }
    getCurrentUser()
  }, [])

  const logAdminActivity = async (
    eventType: string,
    description: string,
    metadata?: AdminActivityMetadata
  ) => {
    try {
      if (!user?.id) {
        console.warn('Cannot log admin activity: No authenticated user')
        return
      }

      const response = await fetch(ADMIN_ENDPOINTS.ACTIVITY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then((s: any) => s.data.session?.access_token)}`
        },
        credentials: 'include',
        body: JSON.stringify({
          eventType,
          description,
          metadata: {
            adminAction: true,
            adminEmail: user.email,
            ...metadata
          }
        })
      })

      if (!response.ok) {
        console.error('Failed to log admin activity:', response.status)
      }
    } catch (error) {
      console.error('Error logging admin activity:', error)
    }
  }

  return { logAdminActivity }
}

export function useAdminPageViewLogger(
  pageSection: string,
  pageName: string,
  metadata?: AdminActivityMetadata
) {
  const { logAdminActivity } = useAdminActivityLogger()
  const hasLogged = useRef(false)

  useEffect(() => {
    if (!hasLogged.current) {
      logAdminActivity(
        'admin_page_view',
        `Accessed admin ${pageName} page`,
        {
          section: pageSection,
          action: 'page_view',
          pageName,
          ...metadata
        }
      )
      hasLogged.current = true
    }
  }, [logAdminActivity, pageSection, pageName, metadata])

  return { logAdminActivity }
}

// Specialized hooks for different admin sections
export function useAdminDashboardLogger() {
  const { logAdminActivity } = useAdminActivityLogger()

  const logDashboardView = () => logAdminActivity(
    'admin_dashboard_view',
    'Viewed admin dashboard statistics',
    { section: 'dashboard', action: 'view_stats' }
  )

  const logStatsRefresh = () => logAdminActivity(
    'admin_stats_view',
    'Refreshed dashboard statistics',
    { section: 'dashboard', action: 'refresh_stats' }
  )

  return { logDashboardView, logStatsRefresh, logAdminActivity }
}

export function useAdminOrderLogger() {
  const { logAdminActivity } = useAdminActivityLogger()

  const logOrderView = (orderId: string, orderDetails?: any) => logAdminActivity(
    'admin_order_view',
    `Viewed order details: ${orderId}`,
    { 
      section: 'orders', 
      action: 'view_order',
      orderId,
      orderAmount: orderDetails?.amount,
      orderStatus: orderDetails?.status
    }
  )

  const logOrderStatusUpdate = (orderId: string, oldStatus: string, newStatus: string) => logAdminActivity(
    'order_status_update',
    `Updated order ${orderId} status from ${oldStatus} to ${newStatus}`,
    { 
      section: 'orders', 
      action: 'update_status',
      orderId,
      oldStatus,
      newStatus
    }
  )

  const logOrderApproval = (orderId: string, amount: number) => logAdminActivity(
    'order_approve',
    `Approved order ${orderId} for amount ${amount}`,
    { 
      section: 'orders', 
      action: 'approve_order',
      orderId,
      approvedAmount: amount
    }
  )

  const logOrderRejection = (orderId: string, reason?: string) => logAdminActivity(
    'order_reject',
    `Rejected order ${orderId}${reason ? `: ${reason}` : ''}`,
    { 
      section: 'orders', 
      action: 'reject_order',
      orderId,
      rejectionReason: reason
    }
  )

  return { 
    logOrderView, 
    logOrderStatusUpdate, 
    logOrderApproval, 
    logOrderRejection,
    logAdminActivity 
  }
}

export function useAdminSettingsLogger() {
  const { logAdminActivity } = useAdminActivityLogger()

  const logSettingsView = (settingsType: string) => logAdminActivity(
    `${settingsType}_settings_view`,
    `Accessed ${settingsType} settings`,
    { section: 'settings', action: 'view_settings', settingsType }
  )

  const logSettingsUpdate = (settingsType: string, updatedFields: string[]) => logAdminActivity(
    `${settingsType}_settings_update`,
    `Updated ${settingsType} settings: ${updatedFields.join(', ')}`,
    { 
      section: 'settings', 
      action: 'update_settings', 
      settingsType,
      updatedFields: updatedFields.join(', ')
    }
  )

  const logPackageCreate = (packageName: string, price: number) => logAdminActivity(
    'package_create',
    `Created new package: ${packageName} ($${price})`,
    { 
      section: 'packages', 
      action: 'create_package',
      packageName,
      packagePrice: price
    }
  )

  const logPackageUpdate = (packageId: string, packageName: string) => logAdminActivity(
    'package_update',
    `Updated package: ${packageName}`,
    { 
      section: 'packages', 
      action: 'update_package',
      packageId,
      packageName
    }
  )

  const logGatewayCreate = (gatewayName: string) => logAdminActivity(
    'payment_gateway_create',
    `Created payment gateway: ${gatewayName}`,
    { 
      section: 'payment_gateways', 
      action: 'create_gateway',
      gatewayName
    }
  )

  return { 
    logSettingsView, 
    logSettingsUpdate, 
    logPackageCreate, 
    logPackageUpdate, 
    logGatewayCreate,
    logAdminActivity 
  }
}

export function useAdminUserLogger() {
  const { logAdminActivity } = useAdminActivityLogger()

  const logUserView = (targetUserId: string, targetUserEmail: string) => logAdminActivity(
    'user_management',
    `Viewed user profile: ${targetUserEmail}`,
    { 
      section: 'user_management', 
      action: 'view_user',
      targetUserId,
      targetUserEmail
    }
  )

  const logUserRoleChange = (targetUserId: string, targetUserEmail: string, oldRole: string, newRole: string) => logAdminActivity(
    'user_role_change',
    `Changed user ${targetUserEmail} role from ${oldRole} to ${newRole}`,
    { 
      section: 'user_management', 
      action: 'change_role',
      targetUserId,
      targetUserEmail,
      oldRole,
      newRole
    }
  )

  const logUserSuspension = (targetUserId: string, targetUserEmail: string) => logAdminActivity(
    'user_suspend',
    `Suspended user: ${targetUserEmail}`,
    { 
      section: 'user_management', 
      action: 'suspend_user',
      targetUserId,
      targetUserEmail
    }
  )

  const logUserQuotaReset = (targetUserId: string, targetUserEmail: string) => logAdminActivity(
    'user_quota_reset',
    `Reset quota for user: ${targetUserEmail}`,
    { 
      section: 'user_management', 
      action: 'reset_quota',
      targetUserId,
      targetUserEmail
    }
  )

  return { 
    logUserView, 
    logUserRoleChange, 
    logUserSuspension, 
    logUserQuotaReset,
    logAdminActivity 
  }
}
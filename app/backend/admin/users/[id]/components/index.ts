// Exported components for User Detail page
export { UserProfileCard } from './UserProfileCard'
export { UserActionsPanel } from './UserActionsPanel'
export { PackageSubscriptionCard } from './PackageSubscriptionCard'
export { UserActivityCard } from './UserActivityCard'
export { UserSecurityCard } from './UserSecurityCard'
export { PackageChangeModal } from './PackageChangeModal'
export { SystemIntegration } from './SystemIntegration'

// Type definitions
export interface UserProfile {
  id: string
  user_id: string
  full_name: string | null
  role: string
  email_notifications: boolean
  created_at: string
  updated_at: string
  phone_number: string | null
  package_id?: string
  subscribed_at?: string
  subscription_ends_at?: string
  daily_quota_used?: number
  daily_quota_limit?: number
  daily_quota_reset_date?: string
  package?: {
    id: string
    name: string
    slug: string
    description: string
    price: number
    currency: string
    billing_period: string
    features: string[]
  }
  email?: string
  email_confirmed_at?: string
  last_sign_in_at?: string
}

export interface UserActions {
  suspend: boolean
  resetPassword: boolean
  editData: boolean
  resetQuota: boolean
  changePackage: boolean
  extendSubscription: boolean
}

export interface ActivityLog {
  id: string
  event_type: string
  event_description: string
  ip_address?: string
  user_agent?: string
  metadata?: any
  created_at: string
}

export interface SecurityData {
  ipAddresses: Array<{
    ip: string
    lastUsed: string
    usageCount: number
  }>
  locations: string[]
  loginAttempts: {
    total: number
    successful: number
    failed: number
    recent: Array<{
      success: boolean
      timestamp: string
      ip_address?: string
      device_info?: any
    }>
  }
  activity: {
    lastActivity: string | null
    firstSeen: string | null
    totalActivities: number
  }
  securityScore: number
  riskLevel: 'low' | 'medium' | 'high'
}
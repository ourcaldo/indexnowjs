/**
 * User-related type definitions for IndexNow Studio
 */

// Basic types
export type UserRole = 'user' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | 'past_due';

// Core user interfaces
export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  country?: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  avatar?: string;
  timezone?: string;
  language?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  country?: string;
  role: UserRole;
  isActive: boolean;
  isSuspended: boolean;
  isTrialActive: boolean;
  trialEndsAt?: Date;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndsAt?: Date;
  packageId?: string;
  packageName?: string;
  quotaUsage: UserQuotaUsage;
  quotaLimits: UserQuotaLimits;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  suspensionReason?: string;
  suspendedAt?: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  timeoutDuration: number;
  retryAttempts: number;
  emailJobCompletion: boolean;
  emailJobFailure: boolean;
  emailQuotaAlerts: boolean;
  emailDailyReport: boolean;
  defaultSchedule: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  security: SecuritySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSettings {
  email: {
    jobCompletion: boolean;
    jobFailure: boolean;
    quotaAlerts: boolean;
    dailyReport: boolean;
    weeklyReport: boolean;
    marketingEmails: boolean;
    securityAlerts: boolean;
  };
  browser: {
    enabled: boolean;
    jobUpdates: boolean;
    systemAlerts: boolean;
  };
  sms: {
    enabled: boolean;
    criticalAlerts: boolean;
    phoneNumber?: string;
  };
}

export interface PrivacySettings {
  showProfile: boolean;
  showActivity: boolean;
  allowAnalytics: boolean;
  allowMarketing: boolean;
  dataRetention: 'minimal' | 'standard' | 'extended';
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'app' | 'sms' | 'email';
  sessionTimeout: number;
  allowedIpRanges?: string[];
  apiKeyExpiry: number;
  passwordChangeRequired: boolean;
  lastPasswordChange?: Date;
}

// Quota types
export interface UserQuotaUsage {
  dailyUrls: number;
  keywords: number;
  serviceAccounts: number;
  rankChecks: number;
  apiCalls: number;
  storage: number; // in bytes
}

export interface UserQuotaLimits {
  dailyUrls: number;
  keywords: number;
  serviceAccounts: number;
  rankChecks: number;
  apiCalls: number;
  storage: number; // in bytes
  concurrentJobs: number;
  historicalData: number; // in days
}

export interface UserQuota {
  dailyUrls: QuotaMetric;
  keywords: QuotaMetric;
  serviceAccounts: QuotaMetric;
  rankChecks: QuotaMetric;
  apiCalls: QuotaMetric;
  storage: QuotaMetric;
}

export interface QuotaMetric {
  used: number;
  limit: number;
  percentage: number;
  remaining: number;
  resetDate?: Date;
}

// Subscription and billing
export interface UserSubscription {
  id: string;
  userId: string;
  packageId: string;
  packageName: string;
  status: SubscriptionStatus;
  billingPeriod: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  price: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  trialDays?: number;
  trialUsed: boolean;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrialEligibility {
  isEligible: boolean;
  reason?: string;
  trialDays: number;
  hasUsedTrial: boolean;
  trialEndDate?: Date;
}

// Authentication
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  scope?: string[];
}

export interface Session {
  id: string;
  userId: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
    region: string;
  };
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
  expiresAt: Date;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  timestamp: Date;
  location?: {
    country: string;
    city: string;
  };
}

// Request/Response types
export interface CreateUserRequest {
  email: string;
  fullName: string;
  password: string;
  phoneNumber?: string;
  country?: string;
  role?: UserRole;
  packageId?: string;
  inviteCode?: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  phoneNumber?: string;
  country?: string;
  timezone?: string;
  language?: string;
  avatar?: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  country?: string;
  role?: UserRole;
  isActive?: boolean;
  isSuspended?: boolean;
  packageId?: string;
  quotaLimits?: Partial<UserQuotaLimits>;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
  redirectUrl?: string;
}

export interface UpdateSettingsRequest {
  timeoutDuration?: number;
  retryAttempts?: number;
  defaultSchedule?: string;
  theme?: 'light' | 'dark' | 'auto';
  notifications?: Partial<NotificationSettings>;
  privacy?: Partial<PrivacySettings>;
  security?: Partial<SecuritySettings>;
}

// Admin types
export interface UserManagementAction {
  userId: string;
  action: 'suspend' | 'activate' | 'reset_password' | 'reset_quota' | 'extend_subscription' | 'change_package' | 'delete';
  reason: string;
  additionalData?: Record<string, any>;
  performedBy: string;
  performedAt: Date;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  trialUsers: number;
  subscribedUsers: number;
  suspendedUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  churnRate: number;
  growthRate: number;
}

// API keys and access
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  permissions: string[];
  rateLimit: {
    requests: number;
    window: number; // in seconds
  };
  isActive: boolean;
  lastUsed?: Date;
  usageCount: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  rateLimit?: {
    requests: number;
    window: number;
  };
  expiresAt?: Date;
}

// Verification and security
export interface EmailVerification {
  id: string;
  userId: string;
  email: string;
  token: string;
  isUsed: boolean;
  expiresAt: Date;
  createdAt: Date;
  verifiedAt?: Date;
}

export interface PhoneVerification {
  id: string;
  userId: string;
  phoneNumber: string;
  code: string;
  isUsed: boolean;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
  verifiedAt?: Date;
}

export interface TwoFactorAuth {
  id: string;
  userId: string;
  method: 'app' | 'sms' | 'email';
  secret?: string;
  backupCodes: string[];
  isEnabled: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Team and collaboration (for future use)
export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  plan: string;
  memberCount: number;
  maxMembers: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
  joinedAt: Date;
  invitedBy?: string;
  isActive: boolean;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: string;
  token: string;
  invitedBy: string;
  isAccepted: boolean;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
}
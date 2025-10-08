/**
 * Global user-related type definitions for IndexNow Studio
 */

// Core user types - defining them here as the authoritative source
export type UserRole = 'user' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned';
export type SubscriptionStatus = 'active' | 'inactive' | 'expired' | 'trial' | 'cancelled';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  country?: string;
  role: UserRole;
  is_active: boolean;
  subscription_status: SubscriptionStatus;
  package_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserSettings {
  id: string;
  user_id: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  security: SecuritySettings;
  preferences: Record<string, any>;
  updated_at: Date;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  jobCompletions: boolean;
  quotaAlerts: boolean;
  systemUpdates: boolean;
}

export interface PrivacySettings {
  shareUsageData: boolean;
  allowAnalytics: boolean;
  showInDirectory: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordChangeRequired: boolean;
  allowedIpAddresses?: string[];
}

export interface UserQuota {
  indexingRequests: number;
  rankTrackingChecks: number;
  apiCalls: number;
}

export interface UserQuotaUsage {
  indexing_requests: number;
  rank_tracking_checks: number;
  api_calls: number;
}

export interface UserQuotaLimits {
  indexing_requests: number;
  rank_tracking_checks: number;
  api_calls: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  package_id: string;
  status: SubscriptionStatus;
  start_date: Date;
  end_date: Date;
  auto_renewal: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TrialEligibility {
  isEligible: boolean;
  hasUsedTrial: boolean;
  trialLength: number;
  restrictions?: string[];
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  permissions: string[];
  is_active: boolean;
  last_used?: Date;
  expires_at?: Date;
  created_at: Date;
}

export interface EmailVerification {
  id: string;
  user_id: string;
  email: string;
  token: string;
  verified: boolean;
  expires_at: Date;
  created_at: Date;
}

export interface TwoFactorAuth {
  id: string;
  user_id: string;
  secret: string;
  enabled: boolean;
  backup_codes: string[];
  last_used?: Date;
  created_at: Date;
}

export interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: Date;
}

// Additional types not in business layer
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  ipAddress: string;
  userAgent: string;
  location?: GeoLocation;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  compactMode: boolean;
  autoRefresh: boolean;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: string;
  token: string;
  invitedBy: string;
  isAccepted: boolean;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
}

// Global user context for application state
export interface UserContext {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  subscription: UserSubscription | null;
  quota: UserQuotaUsage;
  limits: UserQuotaLimits;
  trial: TrialEligibility | null;
}

// Authentication state
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  lastActivity: Date | null;
}

// Session management
export interface SessionInfo {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  location?: GeoLocation;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface GeoLocation {
  country: string;
  region?: string;
  city?: string;
  timezone?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// User onboarding and tutorial
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component?: string;
  isCompleted: boolean;
  isOptional: boolean;
  order: number;
}

export interface OnboardingState {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  steps: OnboardingStep[];
  canSkip: boolean;
}

// User activity and audit
export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// User feedback and support
export interface UserFeedback {
  id: string;
  userId: string;
  type: 'bug' | 'feature' | 'general' | 'compliment' | 'complaint';
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  attachments?: FileAttachment[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface FileAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

// User collaboration
export interface TeamMember {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  permissions: string[];
  joinedAt: Date;
  lastActivity?: Date;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: TeamMember[];
  settings: TeamSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamSettings {
  allowMemberInvites: boolean;
  requireOwnerApproval: boolean;
  defaultRole: UserRole;
  maxMembers: number;
}
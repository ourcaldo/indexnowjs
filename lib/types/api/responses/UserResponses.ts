/**
 * User-related API response types for IndexNow Studio
 */

import type { ApiResponse, PaginatedResponse } from '../../common/ResponseTypes';
import type { 
  UserProfile, UserSettings, UserQuotaUsage, UserQuotaLimits, 
  ApiKey, UserSession, UserActivity 
} from '../../global/User';

// Authentication responses
export interface LoginResponse {
  user: UserProfile;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  twoFactorRequired?: boolean;
  session: UserSession;
}

export interface RegisterResponse {
  user: UserProfile;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  verificationEmailSent: boolean;
  trial: {
    isActive: boolean;
    endsAt: Date;
    daysRemaining: number;
  };
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresAt: Date;
  user: UserProfile;
}

export interface LogoutResponse {
  message: string;
  sessionsClosed: number;
}

// User profile responses
export interface GetUserProfileResponse extends ApiResponse<UserProfile> {}

export interface UpdateUserProfileResponse extends ApiResponse<UserProfile> {}

export interface GetUserSettingsResponse extends ApiResponse<UserSettings> {}

export interface UpdateUserSettingsResponse extends ApiResponse<UserSettings> {}

export interface ChangePasswordResponse extends ApiResponse<{
  message: string;
  passwordChangedAt: Date;
  sessionsClosed: number;
}> {}

// Email verification responses
export interface SendVerificationEmailResponse extends ApiResponse<{
  emailSent: boolean;
  email: string;
  expiresAt: Date;
}> {}

export interface VerifyEmailResponse extends ApiResponse<{
  verified: boolean;
  verifiedAt: Date;
  user: UserProfile;
}> {}

// Two-factor authentication responses
export interface Enable2FAResponse extends ApiResponse<{
  secret: string;
  qrCode: string;
  backupCodes: string[];
  setupKey: string;
}> {}

export interface Confirm2FAResponse extends ApiResponse<{
  enabled: boolean;
  enabledAt: Date;
  backupCodes: string[];
}> {}

export interface Disable2FAResponse extends ApiResponse<{
  disabled: boolean;
  disabledAt: Date;
}> {}

export interface Verify2FAResponse extends ApiResponse<{
  verified: boolean;
  token?: string;
  expiresAt?: Date;
}> {}

// Quota and usage responses
export interface GetUserQuotaResponse extends ApiResponse<{
  usage: UserQuotaUsage;
  limits: UserQuotaLimits;
  resetDate: Date;
  percentageUsed: Record<string, number>;
}> {}

export interface GetUserQuotaHistoryResponse extends PaginatedResponse<{
  date: Date;
  usage: UserQuotaUsage;
  limits: UserQuotaLimits;
}> {}

// API key management responses
export interface CreateApiKeyResponse extends ApiResponse<{
  apiKey: ApiKey;
  token: string; // The actual API key value (only returned once)
}> {}

export interface GetApiKeysResponse extends PaginatedResponse<ApiKey> {}

export interface UpdateApiKeyResponse extends ApiResponse<ApiKey> {}

export interface RevokeApiKeyResponse extends ApiResponse<{
  revoked: boolean;
  revokedAt: Date;
  keyId: string;
}> {}

// User activity and sessions
export interface GetUserActivityResponse extends PaginatedResponse<UserActivity> {}

export interface GetUserSessionsResponse extends PaginatedResponse<UserSession> {}

export interface TerminateSessionResponse extends ApiResponse<{
  terminated: boolean;
  sessionId: string;
  terminatedAt: Date;
}> {}

// Trial and subscription responses
export interface GetTrialStatusResponse extends ApiResponse<{
  isTrialActive: boolean;
  trialStartedAt?: Date;
  trialEndsAt?: Date;
  daysRemaining?: number;
  isEligible: boolean;
  hasUsedTrial: boolean;
}> {}

export interface StartTrialResponse extends ApiResponse<{
  trialStarted: boolean;
  trialStartedAt: Date;
  trialEndsAt: Date;
  daysRemaining: number;
  package: {
    id: string;
    name: string;
    features: string[];
  };
}> {}

export interface GetUserSubscriptionResponse extends ApiResponse<{
  isActive: boolean;
  packageId?: string;
  packageName?: string;
  status: string;
  startedAt?: Date;
  endsAt?: Date;
  autoRenew: boolean;
  paymentMethod?: string;
  nextBillingDate?: Date;
}> {}

// User invitation responses
export interface InviteUserResponse extends ApiResponse<{
  invitationSent: boolean;
  invitationId: string;
  email: string;
  expiresAt: Date;
}> {}

export interface AcceptInvitationResponse extends ApiResponse<{
  accepted: boolean;
  user: UserProfile;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
}> {}

export interface GetInvitationsResponse extends PaginatedResponse<{
  id: string;
  email: string;
  role: string;
  token: string;
  invitedBy: string;
  isAccepted: boolean;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
}> {}

// Account management responses
export interface DeleteAccountResponse extends ApiResponse<{
  deleted: boolean;
  deletedAt: Date;
  dataRetentionPeriod: number; // days
  finalDeletionDate: Date;
}> {}

export interface SuspendAccountResponse extends ApiResponse<{
  suspended: boolean;
  suspendedAt: Date;
  reason: string;
  unsuspendAt?: Date;
}> {}

export interface ReactivateAccountResponse extends ApiResponse<{
  reactivated: boolean;
  reactivatedAt: Date;
  user: UserProfile;
}> {}

// Data export responses
export interface ExportUserDataResponse extends ApiResponse<{
  exportId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  format: 'json' | 'csv' | 'pdf';
  estimatedCompletionTime?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  fileSize?: number;
}> {}

export interface GetDataExportsResponse extends PaginatedResponse<{
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'expired';
  format: 'json' | 'csv' | 'pdf';
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  fileSize?: number;
  error?: string;
}> {}

// User analytics responses
export interface GetUserAnalyticsResponse extends ApiResponse<{
  overview: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalUrls: number;
    successfulUrls: number;
    quotaUsage: UserQuotaUsage;
  };
  trends: {
    jobsCreated: Array<{ date: Date; count: number }>;
    urlsSubmitted: Array<{ date: Date; count: number }>;
    quotaUsage: Array<{ date: Date; usage: UserQuotaUsage }>;
  };
  topDomains: Array<{
    domain: string;
    jobCount: number;
    urlCount: number;
    successRate: number;
  }>;
  recentActivity: UserActivity[];
}> {}

// Admin user management responses
export interface GetUsersResponse extends PaginatedResponse<UserProfile> {}

export interface GetUserDetailsResponse extends ApiResponse<{
  profile: UserProfile;
  settings: UserSettings;
  quota: {
    usage: UserQuotaUsage;
    limits: UserQuotaLimits;
  };
  statistics: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalUrls: number;
    successfulUrls: number;
    accountAge: number; // days
    lastActivity: Date;
  };
  subscription: {
    isActive: boolean;
    packageId?: string;
    packageName?: string;
    status: string;
    startedAt?: Date;
    endsAt?: Date;
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: Date;
    activeSessions: number;
    recentIps: string[];
  };
}> {}

export interface UpdateUserRoleResponse extends ApiResponse<{
  updated: boolean;
  user: UserProfile;
  previousRole: string;
  newRole: string;
  updatedAt: Date;
}> {}

// Error responses
export interface UserErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: {
    field?: string;
    validation?: string[];
    suggestion?: string;
  };
  timestamp: string;
}

// Type aliases for common responses
export type UserApiResponse<T = any> = ApiResponse<T>;
export type UserPaginatedResponse<T = any> = PaginatedResponse<T>;
export type UserResponse<T> = ApiResponse<T> | UserErrorResponse;
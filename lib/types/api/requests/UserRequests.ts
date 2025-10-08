/**
 * User-related API request types for IndexNow Studio
 */

import { z } from 'zod';

// Base user request types
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  country?: string;
  role?: string;
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  phoneNumber?: string;
  country?: string;
  timezone?: string;
  language?: string;
  avatar?: string;
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

export interface ConfirmPasswordResetRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// Authentication requests
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  country?: string;
  agreeToTerms: boolean;
  subscribeToNewsletter?: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  everywhere?: boolean;
}

// Email verification
export interface SendVerificationEmailRequest {
  email?: string; // If not provided, use current user's email
}

export interface VerifyEmailRequest {
  token: string;
  email: string;
}

// Two-factor authentication
export interface Enable2FARequest {
  password: string;
}

export interface Confirm2FARequest {
  secret: string;
  code: string;
}

export interface Disable2FARequest {
  password: string;
  code: string;
}

export interface Verify2FARequest {
  code: string;
}

// User settings and preferences
export interface UpdateUserSettingsRequest {
  timeoutDuration?: number;
  retryAttempts?: number;
  emailJobCompletion?: boolean;
  emailJobFailure?: boolean;
  emailQuotaAlerts?: boolean;
  emailDailyReport?: boolean;
  defaultSchedule?: string;
  theme?: 'light' | 'dark' | 'auto';
  notifications?: {
    email?: {
      jobCompletion?: boolean;
      jobFailure?: boolean;
      quotaAlerts?: boolean;
      dailyReport?: boolean;
      weeklyReport?: boolean;
      marketingEmails?: boolean;
      securityAlerts?: boolean;
    };
    browser?: {
      enabled?: boolean;
      jobUpdates?: boolean;
      systemAlerts?: boolean;
    };
    sms?: {
      enabled?: boolean;
      criticalAlerts?: boolean;
      phoneNumber?: string;
    };
  };
  privacy?: {
    showProfile?: boolean;
    showActivity?: boolean;
    allowAnalytics?: boolean;
    allowMarketing?: boolean;
  };
  security?: {
    sessionTimeout?: number;
    requirePasswordChange?: boolean;
    allowedIps?: string[];
  };
}

// API key management
export interface CreateApiKeyRequest {
  name: string;
  description?: string;
  scopes: string[];
  expiresAt?: Date;
}

export interface UpdateApiKeyRequest {
  name?: string;
  description?: string;
  scopes?: string[];
  isActive?: boolean;
}

export interface RevokeApiKeyRequest {
  keyId: string;
}

// User invitation and team management
export interface InviteUserRequest {
  email: string;
  role: string;
  message?: string;
  expiresIn?: number; // hours
}

export interface AcceptInvitationRequest {
  token: string;
  password?: string; // If user doesn't exist yet
  name?: string; // If user doesn't exist yet
}

export interface UpdateUserRoleRequest {
  userId: string;
  role: string;
  reason?: string;
}

// Account management
export interface DeleteAccountRequest {
  password: string;
  reason?: string;
  feedback?: string;
}

export interface SuspendAccountRequest {
  userId: string;
  reason: string;
  duration?: number; // days
  notifyUser?: boolean;
}

export interface ReactivateAccountRequest {
  userId: string;
  reason?: string;
}

// Export user data
export interface ExportUserDataRequest {
  format: 'json' | 'csv' | 'pdf';
  includePersonalData?: boolean;
  includeActivityData?: boolean;
  includeJobData?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// Zod validation schemas
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  twoFactorCode: z.string().optional()
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password must be less than 100 characters'),
  phoneNumber: z.string().optional(),
  country: z.string().optional(),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
  subscribeToNewsletter: z.boolean().optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const updateUserSettingsSchema = z.object({
  timeoutDuration: z.number().min(30).max(300).optional(),
  retryAttempts: z.number().min(1).max(10).optional(),
  emailJobCompletion: z.boolean().optional(),
  emailJobFailure: z.boolean().optional(),
  emailQuotaAlerts: z.boolean().optional(),
  emailDailyReport: z.boolean().optional(),
  defaultSchedule: z.string().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional()
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  expiresAt: z.date().optional()
});

// Type inference from schemas
export type LoginRequestBody = z.infer<typeof loginSchema>;
export type RegisterRequestBody = z.infer<typeof registerSchema>;
export type ChangePasswordRequestBody = z.infer<typeof changePasswordSchema>;
export type UpdateUserSettingsRequestBody = z.infer<typeof updateUserSettingsSchema>;
export type CreateApiKeyRequestBody = z.infer<typeof createApiKeySchema>;
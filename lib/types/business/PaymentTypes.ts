/**
 * Payment-related type definitions for IndexNow Studio
 */

// Basic payment types
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export type PaymentMethod = 'paddle' | 'credit-card';
export type BillingPeriod = 'monthly' | 'annual';
export type Currency = 'USD';

// Package and pricing
export interface Package {
  id: string;
  name: string;
  description: string;
  features: string[];
  pricing: {
    monthly: number;
    annual?: number;
    currency: Currency;
  };
  quotas: {
    dailyUrls: number;
    keywords: number;
    serviceAccounts: number;
    rankChecks: number;
    apiCalls: number;
    storage: number; // in bytes
    concurrentJobs: number;
    historicalData: number; // in days
  };
  features_flags: {
    bulkOperations: boolean;
    advancedAnalytics: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    customReports: boolean;
    webhooks: boolean;
    sso: boolean;
  };
  trial: {
    enabled: boolean;
    days: number;
  };
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Customer information
export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  company?: {
    name: string;
    taxId?: string;
    industry?: string;
  };
}

// Order and transaction
export interface Order {
  id: string;
  userId: string;
  packageId: string;
  packageName: string;
  billingPeriod: BillingPeriod;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  discount?: {
    code: string;
    amount: number;
    type: 'percentage' | 'fixed';
  };
  tax?: {
    amount: number;
    rate: number;
    country: string;
  };
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerInfo: CustomerInfo;
  isTrialToSubscription: boolean;
  trialDays?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  cancelledAt?: Date;
  expiresAt: Date;
}

export interface Transaction {
  id: string;
  orderId: string;
  userId: string;
  externalId?: string; // Payment gateway transaction ID
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  gateway: string;
  gatewayResponse?: Record<string, any>;
  failureReason?: string;
  refundAmount?: number;
  refundReason?: string;
  processingFee?: number;
  netAmount?: number;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
}

// Payment requests
export interface CreatePaymentRequest {
  packageId: string;
  billingPeriod: BillingPeriod;
  paymentMethod: PaymentMethod;
  customerInfo: CustomerInfo;
  promoCode?: string;
  isTrialToSubscription?: boolean;
  currency?: Currency;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  orderId: string;
  paymentUrl?: string;
  token?: string;
  redirectUrl?: string;
  qrCode?: string;
  instructions?: string;
  expiresAt: Date;
  error?: string;
}

// Paddle-specific types will be added here when implementing Paddle integration

// Subscription management
export interface Subscription {
  id: string;
  userId: string;
  orderId: string;
  packageId: string;
  packageName: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'paused';
  billingPeriod: BillingPeriod;
  amount: number;
  currency: Currency;
  nextBillingDate: Date;
  lastBillingDate?: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  endedAt?: Date;
  autoRenew: boolean;
  paymentMethod: PaymentMethod;
  paymentToken?: string; // For recurring payments
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionChange {
  id: string;
  subscriptionId: string;
  fromPackageId: string;
  toPackageId: string;
  prorationAmount: number;
  effectiveDate: Date;
  reason: string;
  createdAt: Date;
}

// Billing and invoices
export interface Invoice {
  id: string;
  userId: string;
  subscriptionId?: string;
  orderId: string;
  number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  amount: number;
  currency: Currency;
  tax?: {
    amount: number;
    rate: number;
  };
  discount?: {
    amount: number;
    code: string;
  };
  subtotal: number;
  total: number;
  dueDate: Date;
  paidDate?: Date;
  items: InvoiceItem[];
  customerInfo: CustomerInfo;
  notes?: string;
  downloadUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  period?: {
    start: Date;
    end: Date;
  };
}

// Promo codes and discounts
export interface PromoCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'free_trial';
  value: number;
  currency?: Currency;
  minAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  userLimit?: number; // Per user usage limit
  packages?: string[]; // Applicable packages
  newUsersOnly: boolean;
  isActive: boolean;
  startsAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromoCodeUsage {
  id: string;
  promoCodeId: string;
  userId: string;
  orderId: string;
  discountAmount: number;
  usedAt: Date;
}

// Payment methods and gateways
export interface PaymentGateway {
  id: string;
  name: string;
  type: PaymentMethod;
  isActive: boolean;
  isSandbox: boolean;
  config: {
    serverKey?: string;
    clientKey?: string;
    webhookUrl?: string;
    apiKey?: string;
    secretKey?: string;
    merchantId?: string;
  };
  supportedCurrencies: Currency[];
  countries: string[];
  processingFee: {
    type: 'percentage' | 'fixed';
    value: number;
    currency?: Currency;
  };
  settlementTime: number; // in days
  features: {
    recurring: boolean;
    refunds: boolean;
    disputes: boolean;
    webhooks: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedPaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethod;
  token: string;
  maskedNumber?: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  last4?: string;
  isDefault: boolean;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Refunds and disputes
export interface Refund {
  id: string;
  transactionId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: Currency;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  refundMethod: PaymentMethod;
  externalRefundId?: string;
  processingFee?: number;
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export interface Dispute {
  id: string;
  transactionId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: Currency;
  reason: string;
  status: 'open' | 'under_review' | 'resolved' | 'lost';
  evidence?: {
    description: string;
    documents: string[];
    submittedAt: Date;
  };
  resolution?: {
    type: 'refund' | 'chargeback' | 'accept';
    amount?: number;
    reason: string;
    resolvedAt: Date;
  };
  disputedAt: Date;
  respondBy: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics and reporting
export interface PaymentAnalytics {
  period: {
    from: Date;
    to: Date;
  };
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    successfulPayments: number;
    failedPayments: number;
    refundAmount: number;
    successRate: number;
    averageOrderValue: number;
    newCustomers: number;
    recurringRevenue: number;
  };
  breakdown: {
    byMethod: Array<{
      method: PaymentMethod;
      count: number;
      amount: number;
      percentage: number;
    }>;
    byPackage: Array<{
      packageId: string;
      packageName: string;
      count: number;
      amount: number;
      percentage: number;
    }>;
    byCurrency: Array<{
      currency: Currency;
      count: number;
      amount: number;
      percentage: number;
    }>;
  };
}

// Webhook types
export interface PaymentWebhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  headers?: Record<string, string>;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  event: string;
  data: Record<string, any>;
  signature: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
  response?: {
    statusCode: number;
    body: string;
  };
  createdAt: Date;
}
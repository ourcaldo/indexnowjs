/**
 * Payment-related API response types for IndexNow Studio
 */

import type { ApiResponse, PaginatedResponse } from '../../common/ResponseTypes';
import type { Package, Order, Transaction, Subscription, Invoice, PromoCode, Refund, CustomerInfo, PaymentMethod } from '../../services/Payments';

// Payment processing responses
export interface CreatePaymentResponse extends ApiResponse<{
  order: Order;
  paymentUrl?: string;
  redirectUrl?: string;
  requiresRedirect: boolean;
  paymentToken?: string;
  qrCode?: string;
  expiresAt?: Date;
}> {}

export interface ProcessPaymentResponse extends ApiResponse<{
  success: boolean;
  transaction: Transaction;
  order: Order;
  subscription?: Subscription;
  nextAction?: {
    type: 'redirect' | '3ds_authentication' | 'complete';
    url?: string;
    data?: Record<string, any>;
  };
}> {}

export interface PaymentStatusResponse extends ApiResponse<{
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transaction?: Transaction;
  order: Order;
  failureReason?: string;
  lastUpdated: Date;
  timeline: PaymentTimeline[];
}> {}

export interface PaymentTimeline {
  status: string;
  timestamp: Date;
  description: string;
  metadata?: Record<string, any>;
}

// Subscription responses
export interface CreateSubscriptionResponse extends ApiResponse<{
  subscription: Subscription;
  transaction?: Transaction;
  trial?: {
    isActive: boolean;
    endsAt: Date;
    daysRemaining: number;
  };
  nextBillingDate: Date;
}> {}

export interface GetSubscriptionResponse extends ApiResponse<{
  subscription: Subscription;
  package: Package;
  usage: {
    current: Record<string, number>;
    limits: Record<string, number>;
    resetDate: Date;
  };
  billing: {
    nextBillingDate: Date;
    lastPayment?: Transaction;
    paymentMethod?: PaymentMethodDetails;
  };
}> {}

export interface PaymentMethodDetails {
  id: string;
  type: 'credit_card' | 'bank_account' | 'digital_wallet';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface UpdateSubscriptionResponse extends ApiResponse<{
  subscription: Subscription;
  changes: {
    packageChanged: boolean;
    billingPeriodChanged: boolean;
    proration?: {
      amount: number;
      currency: string;
      description: string;
    };
  };
  nextBillingDate: Date;
}> {}

export interface CancelSubscriptionResponse extends ApiResponse<{
  cancelled: boolean;
  cancelledAt: Date;
  refund?: {
    amount: number;
    currency: string;
    refundId: string;
    processedAt?: Date;
  };
  accessUntil: Date;
}> {}

// Package and pricing responses
export interface GetPackagesResponse extends ApiResponse<{
  packages: Package[];
  currentPackage?: {
    id: string;
    name: string;
    expiresAt?: Date;
    isActive: boolean;
  };
  recommendations?: {
    packageId: string;
    reason: string;
    savings?: number;
  }[];
}> {}

export interface GetPackageDetailsResponse extends ApiResponse<{
  package: Package;
  pricing: {
    monthly: number;
    quarterly?: number;
    biannual?: number;
    annual?: number;
    currency: string;
    savings?: Record<string, number>;
  };
  comparison: {
    features: string[];
    otherPackages: Array<{
      id: string;
      name: string;
      hasFeature: boolean;
    }>;
  };
}> {}

// Invoice responses
export interface CreateInvoiceResponse extends ApiResponse<{
  invoice: Invoice;
  downloadUrl: string;
  emailSent: boolean;
}> {}

export interface GetInvoicesResponse extends PaginatedResponse<Invoice> {}

export interface GetInvoiceDetailsResponse extends ApiResponse<{
  invoice: Invoice;
  order: Order;
  downloadUrl: string;
  paymentHistory: Transaction[];
}> {}

export interface SendInvoiceResponse extends ApiResponse<{
  sent: boolean;
  sentAt: Date;
  recipient: string;
  deliveryStatus?: 'delivered' | 'failed' | 'pending';
}> {}

// Refund responses
export interface CreateRefundResponse extends ApiResponse<{
  refund: Refund;
  processing: boolean;
  estimatedCompletionTime?: Date;
  refundMethod: string;
}> {}

export interface GetRefundsResponse extends PaginatedResponse<Refund> {}

export interface ProcessRefundResponse extends ApiResponse<{
  processed: boolean;
  refund: Refund;
  processedAt: Date;
  gatewayResponse?: Record<string, any>;
}> {}

// Promo code responses
export interface ValidatePromoCodeResponse extends ApiResponse<{
  valid: boolean;
  promoCode?: PromoCode;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
    description: string;
  };
  restrictions?: {
    minOrderAmount?: number;
    applicablePackages?: string[];
    maxUses?: number;
    usesRemaining?: number;
  };
  error?: string;
}> {}

export interface ApplyPromoCodeResponse extends ApiResponse<{
  applied: boolean;
  discount: {
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
    description: string;
  };
  newTotal: number;
  originalTotal: number;
  savings: number;
}> {}

export interface GetPromoCodesResponse extends PaginatedResponse<PromoCode> {}

// Billing history responses
export interface GetBillingHistoryResponse extends PaginatedResponse<Transaction> {}

export interface GetBillingStatisticsResponse extends ApiResponse<{
  summary: {
    totalPaid: number;
    totalRefunded: number;
    averageOrderValue: number;
    currency: string;
  };
  monthly: Array<{
    month: string;
    year: number;
    totalPaid: number;
    orderCount: number;
    averageValue: number;
  }>;
  byPaymentMethod: Array<{
    method: string;
    count: number;
    totalAmount: number;
    percentage: number;
  }>;
  recentTransactions: Transaction[];
}> {}

// Payment method responses
export interface AddPaymentMethodResponse extends ApiResponse<{
  paymentMethod: PaymentMethodDetails;
  isDefault: boolean;
  verificationRequired?: boolean;
}> {}

export interface GetPaymentMethodsResponse extends ApiResponse<{
  paymentMethods: PaymentMethodDetails[];
  defaultMethodId?: string;
}> {}

export interface UpdatePaymentMethodResponse extends ApiResponse<PaymentMethodDetails> {}

export interface RemovePaymentMethodResponse extends ApiResponse<{
  removed: boolean;
  removedAt: Date;
  paymentMethodId: string;
  newDefaultMethodId?: string;
}> {}

// Webhook responses
export interface CreateWebhookResponse extends ApiResponse<{
  webhook: {
    id: string;
    url: string;
    events: string[];
    isActive: boolean;
    secret: string;
    createdAt: Date;
  };
  testUrl: string;
}> {}

export interface GetWebhooksResponse extends PaginatedResponse<{
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  deliveryStats: {
    successful: number;
    failed: number;
    total: number;
    successRate: number;
  };
}> {}

export interface TestWebhookResponse extends ApiResponse<{
  tested: boolean;
  responseCode?: number;
  responseTime?: number;
  error?: string;
  testedAt: Date;
}> {}

// Analytics responses
export interface GetPaymentAnalyticsResponse extends ApiResponse<{
  overview: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    successRate: number;
    currency: string;
    period: string;
  };
  trends: {
    revenue: Array<{ date: Date; amount: number }>;
    orders: Array<{ date: Date; count: number }>;
    successRate: Array<{ date: Date; rate: number }>;
  };
  breakdown: {
    byPackage: Array<{
      packageId: string;
      packageName: string;
      revenue: number;
      orders: number;
      percentage: number;
    }>;
    byPaymentMethod: Array<{
      method: string;
      revenue: number;
      orders: number;
      percentage: number;
    }>;
    byCountry: Array<{
      country: string;
      revenue: number;
      orders: number;
      percentage: number;
    }>;
  };
}> {}

// Gateway-specific responses

// Error responses
export interface PaymentErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: {
    field?: string;
    gatewayError?: string;
    retryable?: boolean;
    suggestion?: string;
  };
  timestamp: string;
}

// Type aliases for common responses
export type PaymentApiResponse<T = any> = ApiResponse<T>;
export type PaymentPaginatedResponse<T = any> = PaginatedResponse<T>;
export type PaymentResponse<T> = ApiResponse<T> | PaymentErrorResponse;
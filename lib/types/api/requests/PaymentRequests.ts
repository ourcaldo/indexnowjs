/**
 * Payment-related API request types for IndexNow Studio
 */

import { z } from 'zod';
import type { CustomerInfo, InvoiceItem, InvoiceDiscount, InvoiceTax } from '../../services/Payments';

// Base payment request types
export interface CreatePaymentRequest {
  packageId: string;
  billingPeriod: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  paymentMethod: 'paddle' | 'credit-card';
  customerInfo: CustomerInfo;
  promoCode?: string;
  isTrialToSubscription?: boolean;
  returnUrl?: string;
  metadata?: Record<string, any>;
}

// CustomerInfo now imported from services layer

export interface ProcessPaymentRequest {
  orderId: string;
  paymentMethod: string;
  paymentData?: Record<string, any>;
  customerInfo?: Partial<CustomerInfo>;
}

export interface CreateSubscriptionRequest {
  packageId: string;
  billingPeriod: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  customerInfo: CustomerInfo;
  paymentMethod: string;
  tokenId?: string; // For credit card subscriptions
  startDate?: Date;
  trialDays?: number;
  promoCode?: string;
}

export interface UpdateSubscriptionRequest {
  subscriptionId: string;
  packageId?: string;
  billingPeriod?: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  isActive?: boolean;
  endDate?: Date;
  metadata?: Record<string, any>;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  reason: 'user_requested' | 'payment_failed' | 'fraud' | 'other';
  reasonDetails?: string;
  cancelAtPeriodEnd?: boolean;
  immediateCancel?: boolean;
}

// Refund requests
export interface CreateRefundRequest {
  transactionId: string;
  amount?: number; // If not provided, full refund
  reason: 'duplicate' | 'fraud' | 'requested_by_customer' | 'other';
  reasonDetails?: string;
  notifyCustomer?: boolean;
}

export interface ProcessRefundRequest {
  refundId: string;
  gatewayTransactionId?: string;
  metadata?: Record<string, any>;
}

// Promo code requests
export interface CreatePromoCodeRequest {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  description?: string;
  isActive: boolean;
  maxUses?: number;
  usesPerCustomer?: number;
  validFrom: Date;
  validUntil: Date;
  applicablePackages?: string[];
  minOrderAmount?: number;
  metadata?: Record<string, any>;
}

export interface UpdatePromoCodeRequest {
  promoCodeId: string;
  code?: string;
  type?: 'percentage' | 'fixed';
  value?: number;
  description?: string;
  isActive?: boolean;
  maxUses?: number;
  usesPerCustomer?: number;
  validFrom?: Date;
  validUntil?: Date;
  applicablePackages?: string[];
  minOrderAmount?: number;
}

export interface ValidatePromoCodeRequest {
  code: string;
  packageId: string;
  billingPeriod: string;
  userId?: string;
}

// Invoice requests
export interface CreateInvoiceRequest {
  orderId: string;
  customerId: string;
  items: InvoiceItem[];
  discounts?: InvoiceDiscount[];
  taxes?: InvoiceTax[];
  notes?: string;
  dueDate?: Date;
  sendToCustomer?: boolean;
}

// Invoice types now imported from services layer

export interface UpdateInvoiceRequest {
  invoiceId: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  dueDate?: Date;
}

export interface SendInvoiceRequest {
  invoiceId: string;
  email?: string;
  subject?: string;
  message?: string;
}

// Payment method requests
export interface AddPaymentMethodRequest {
  type: 'credit_card' | 'bank_account' | 'digital_wallet';
  tokenId: string;
  isDefault?: boolean;
  billingAddress?: CustomerInfo['address'];
  metadata?: Record<string, any>;
}

export interface UpdatePaymentMethodRequest {
  paymentMethodId: string;
  isDefault?: boolean;
  billingAddress?: CustomerInfo['address'];
  isActive?: boolean;
}

export interface RemovePaymentMethodRequest {
  paymentMethodId: string;
  replacementMethodId?: string; // If this was the default method
}

// Billing address requests
export interface UpdateBillingAddressRequest {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

// Webhook requests
export interface CreateWebhookRequest {
  url: string;
  events: string[];
  isActive?: boolean;
  secret?: string;
  headers?: Record<string, string>;
}

export interface UpdateWebhookRequest {
  webhookId: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
  secret?: string;
  headers?: Record<string, string>;
}

// Zod validation schemas
export const customerInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().optional(),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().min(1, 'Country is required')
  }),
  company: z.object({
    name: z.string(),
    taxId: z.string().optional(),
    industry: z.string().optional()
  }).optional()
});

export const createPaymentSchema = z.object({
  packageId: z.string().uuid('Invalid package ID'),
  billingPeriod: z.enum(['monthly', 'quarterly', 'biannual', 'annual']),
  paymentMethod: z.enum(['paddle', 'credit-card']),
  customerInfo: customerInfoSchema,
  promoCode: z.string().optional(),
  isTrialToSubscription: z.boolean().optional(),
  returnUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
});

export const createSubscriptionSchema = z.object({
  packageId: z.string().uuid('Invalid package ID'),
  billingPeriod: z.enum(['monthly', 'quarterly', 'biannual', 'annual']),
  customerInfo: customerInfoSchema,
  paymentMethod: z.string().min(1, 'Payment method is required'),
  tokenId: z.string().optional(),
  startDate: z.date().optional(),
  trialDays: z.number().min(0).max(365).optional(),
  promoCode: z.string().optional()
});

export const createRefundSchema = z.object({
  transactionId: z.string().uuid('Invalid transaction ID'),
  amount: z.number().positive().optional(),
  reason: z.enum(['duplicate', 'fraud', 'requested_by_customer', 'other']),
  reasonDetails: z.string().max(500, 'Reason details must be less than 500 characters').optional(),
  notifyCustomer: z.boolean().optional()
});

export const validatePromoCodeSchema = z.object({
  code: z.string().min(1, 'Promo code is required'),
  packageId: z.string().uuid('Invalid package ID'),
  billingPeriod: z.enum(['monthly', 'quarterly', 'biannual', 'annual']),
  userId: z.string().uuid().optional()
});

// Type inference from schemas
export type CreatePaymentRequestBody = z.infer<typeof createPaymentSchema>;
export type CustomerInfoRequestBody = z.infer<typeof customerInfoSchema>;
export type CreateSubscriptionRequestBody = z.infer<typeof createSubscriptionSchema>;
export type CreateRefundRequestBody = z.infer<typeof createRefundSchema>;
export type ValidatePromoCodeRequestBody = z.infer<typeof validatePromoCodeSchema>;
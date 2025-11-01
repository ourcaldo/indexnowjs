/**
 * Payment service-related type definitions for IndexNow Studio
 */

// Payment types - consolidated from business layer
export type PaymentMethod = 'paddle' | 'credit-card';
export type BillingPeriod = 'monthly' | 'quarterly' | 'biannual' | 'annual';
export type Currency = 'USD';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';

export interface Package {
  id: string;
  name: string;
  description: string;
  features: string[];
  pricing_tiers: Record<string, Record<string, number>>;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: string;
  user_id: string;
  package_id: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  billing_period: BillingPeriod;
  payment_method: PaymentMethod;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  order_id: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  gateway: string;
  gateway_transaction_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerInfo {
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code?: string;
    country: string;
  };
}

export interface Subscription {
  id: string;
  user_id: string;
  package_id: string;
  status: 'active' | 'inactive' | 'expired' | 'cancelled';
  start_date: Date;
  end_date: Date;
  billing_period: BillingPeriod;
  auto_renewal: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Invoice {
  id: string;
  subscription_id: string;
  amount: number;
  currency: Currency;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses?: number;
  used_count: number;
  valid_from: Date;
  valid_until: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Refund {
  id: string;
  transaction_id: string;
  amount: number;
  currency: Currency;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export interface PaymentGateway {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  configuration: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// Payment service configuration
export interface PaymentServiceConfig {
  environment: 'sandbox' | 'production';
  currency: Currency;
  timeout: number;
  retryAttempts: number;
  webhookSecret: string;
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    includeRequestBody: boolean;
    includeResponseBody: boolean;
  };
  security: {
    encryptionKey: string;
    algorithm: string;
    tokenExpiry: number;
  };
}

// Payment gateway interfaces
export interface PaymentGatewayInterface {
  name: string;
  version: string;
  supportedMethods: PaymentMethod[];
  supportedCurrencies: Currency[];
  capabilities: GatewayCapabilities;
  config: Record<string, any>;
}

export interface GatewayCapabilities {
  recurringPayments: boolean;
  refunds: boolean;
  partialRefunds: boolean;
  webhooks: boolean;
  tokenization: boolean;
  threeDSecure: boolean;
  disputes: boolean;
  reporting: boolean;
}

// Paddle-specific types will be added here when implementing Paddle integration

// Payment processor types
export interface PaymentProcessor {
  id: string;
  name: string;
  type: 'gateway' | 'processor' | 'wallet';
  supportedMethods: PaymentMethod[];
  supportedCurrencies: Currency[];
  fees: ProcessorFees;
  limits: ProcessorLimits;
  isActive: boolean;
  config: Record<string, any>;
}

export interface ProcessorFees {
  domestic: {
    percentage: number;
    fixed: number;
  };
  international: {
    percentage: number;
    fixed: number;
  };
  refund: {
    percentage: number;
    fixed: number;
  };
  chargeback: number;
  currency: Currency;
}

export interface ProcessorLimits {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  monthlyLimit: number;
  currency: Currency;
}

// Payment data types
export interface PaymentData {
  packageId: string;
  billingPeriod: BillingPeriod;
  customerInfo: CustomerInfo;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  isTrial: boolean;
  promoCode?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  redirectUrl?: string;
  data?: any;
  requiresRedirect: boolean;
  error?: PaymentError;
  transaction?: Transaction;
  order?: Order;
}

export interface PaymentError {
  code: string;
  message: string;
  type: 'validation' | 'gateway' | 'network' | 'security' | 'business';
  retryable: boolean;
  details?: Record<string, any>;
  timestamp: Date;
}

// Payment handler interfaces
export interface PaymentHandlerInterface {
  processPayment: (data: PaymentData) => Promise<PaymentResult>;
  verifyPayment: (transactionId: string) => Promise<PaymentResult>;
  refundPayment: (transactionId: string, amount?: number) => Promise<PaymentResult>;
  getPaymentStatus: (transactionId: string) => Promise<PaymentStatus>;
  handleWebhook: (payload: any, signature?: string) => Promise<WebhookResult>;
  getConfig: () => Record<string, any>;
  validateConfig: () => boolean;
}

export interface WebhookResult {
  processed: boolean;
  transactionId?: string;
  status?: PaymentStatus;
  order?: Order;
  error?: PaymentError;
  timestamp: Date;
}

// Payment factory types
export interface PaymentServiceFactory {
  createHandler: (method: PaymentMethod, config: Record<string, any>) => PaymentHandlerInterface;
  getSupportedMethods: () => PaymentMethod[];
  validateMethod: (method: PaymentMethod) => boolean;
  getMethodConfig: (method: PaymentMethod) => Record<string, any>;
}

// Payment analytics types
export interface PaymentAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  revenue: {
    total: number;
    currency: Currency;
    growth: number;
    recurring: number;
    oneTime: number;
  };
  transactions: {
    total: number;
    successful: number;
    failed: number;
    refunded: number;
    successRate: number;
  };
  averages: {
    orderValue: number;
    processingTime: number;
    refundTime: number;
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
    byCountry: Array<{
      country: string;
      count: number;
      amount: number;
      percentage: number;
    }>;
  };
  trends: {
    daily: Array<{ date: Date; amount: number; count: number }>;
    weekly: Array<{ week: Date; amount: number; count: number }>;
    monthly: Array<{ month: Date; amount: number; count: number }>;
  };
}

// Subscription management types
export interface SubscriptionManager {
  createSubscription: (data: CreateSubscriptionData) => Promise<Subscription>;
  updateSubscription: (id: string, updates: Partial<Subscription>) => Promise<Subscription>;
  cancelSubscription: (id: string, reason: string) => Promise<void>;
  pauseSubscription: (id: string) => Promise<void>;
  resumeSubscription: (id: string) => Promise<void>;
  getSubscription: (id: string) => Promise<Subscription>;
  getSubscriptions: (userId: string) => Promise<Subscription[]>;
  processRecurringPayment: (subscriptionId: string) => Promise<PaymentResult>;
}

export interface CreateSubscriptionData {
  userId: string;
  packageId: string;
  billingPeriod: BillingPeriod;
  paymentMethodId: string;
  startDate: Date;
  trialDays?: number;
  promoCode?: string;
  metadata?: Record<string, any>;
}

// Invoice management types
export interface InvoiceManager {
  createInvoice: (data: CreateInvoiceData) => Promise<Invoice>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<Invoice>;
  sendInvoice: (id: string, options: SendInvoiceOptions) => Promise<void>;
  markInvoiceAsPaid: (id: string, paymentData: PaymentData) => Promise<void>;
  getInvoice: (id: string) => Promise<Invoice>;
  getInvoices: (filters: InvoiceFilters) => Promise<Invoice[]>;
  generatePDF: (id: string) => Promise<Buffer>;
}

export interface CreateInvoiceData {
  orderId: string;
  customerId: string;
  items: InvoiceItem[];
  discounts?: InvoiceDiscount[];
  taxes?: InvoiceTax[];
  notes?: string;
  dueDate: Date;
  currency: Currency;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  metadata?: Record<string, any>;
}

export interface InvoiceDiscount {
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
}

export interface InvoiceTax {
  description: string;
  rate: number;
  amount: number;
  country?: string;
}

export interface SendInvoiceOptions {
  email?: string;
  subject?: string;
  message?: string;
  attachPDF?: boolean;
  sendReminder?: boolean;
}

export interface InvoiceFilters {
  userId?: string;
  status?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  currency?: Currency;
  page?: number;
  limit?: number;
}

// Security and fraud prevention
export interface FraudDetection {
  checkTransaction: (transaction: Transaction, customerInfo: CustomerInfo) => Promise<FraudScore>;
  updateRules: (rules: FraudRule[]) => Promise<void>;
  getRules: () => Promise<FraudRule[]>;
  blockCustomer: (customerId: string, reason: string) => Promise<void>;
  unblockCustomer: (customerId: string) => Promise<void>;
}

export interface FraudScore {
  score: number; // 0-100
  risk: 'low' | 'medium' | 'high';
  factors: FraudFactor[];
  recommendation: 'approve' | 'review' | 'decline';
  blocked: boolean;
}

export interface FraudFactor {
  type: string;
  description: string;
  weight: number;
  triggered: boolean;
}

export interface FraudRule {
  id: string;
  name: string;
  type: 'amount' | 'location' | 'velocity' | 'device' | 'email' | 'custom';
  condition: string;
  action: 'flag' | 'block' | 'review';
  weight: number;
  isActive: boolean;
}

// Compliance and reporting
export interface ComplianceReporting {
  generateTaxReport: (period: { start: Date; end: Date }) => Promise<TaxReport>;
  generateRevenueReport: (period: { start: Date; end: Date }) => Promise<RevenueReport>;
  getRefundReport: (period: { start: Date; end: Date }) => Promise<RefundReport>;
  exportTransactions: (filters: TransactionFilters, format: 'csv' | 'xlsx' | 'pdf') => Promise<Buffer>;
}

export interface TaxReport {
  period: { start: Date; end: Date };
  totalRevenue: number;
  taxableRevenue: number;
  taxCollected: number;
  currency: Currency;
  breakdown: Array<{
    country: string;
    revenue: number;
    taxRate: number;
    taxAmount: number;
  }>;
}

export interface RevenueReport {
  period: { start: Date; end: Date };
  totalRevenue: number;
  netRevenue: number;
  fees: number;
  refunds: number;
  currency: Currency;
  breakdown: {
    byMonth: Array<{ month: Date; revenue: number }>;
    byPackage: Array<{ packageId: string; revenue: number }>;
    byCountry: Array<{ country: string; revenue: number }>;
  };
}

export interface RefundReport {
  period: { start: Date; end: Date };
  totalRefunds: number;
  refundCount: number;
  refundRate: number;
  currency: Currency;
  reasons: Array<{
    reason: string;
    count: number;
    amount: number;
  }>;
}

export interface TransactionFilters {
  status?: PaymentStatus[];
  methods?: PaymentMethod[];
  dateRange?: { start: Date; end: Date };
  amountRange?: { min: number; max: number };
  userId?: string;
  orderId?: string;
  currency?: Currency;
  page?: number;
  limit?: number;
}
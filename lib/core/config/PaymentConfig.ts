/**
 * Payment Configuration for IndexNow Studio
 * Centralized payment gateway and billing configuration
 * Updated for Paddle payment gateway integration
 */

export interface PaymentConfigType {
  billing: {
    defaultCurrency: string;
    supportedCurrencies: string[];
    taxRate: number;
    trialPeriodDays: number;
    gracePeriodDays: number;
    autoRenewal: boolean;
  };
  webhooks: {
    enableWebhookValidation: boolean;
    webhookTimeout: number;
  };
  features: {
    enableTrials: boolean;
    enableRefunds: boolean;
    enablePartialPayments: boolean;
    enableSubscriptions: boolean;
    enableOneTimePayments: boolean;
  };
  limits: {
    maxPaymentAmount: number;
    minPaymentAmount: number;
    maxRefundAmount: number;
    paymentAttempts: number;
    webhookRetries: number;
  };
}

// Environment variable helpers
const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value || defaultValue || '';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  return value ? value.toLowerCase() === 'true' : defaultValue;
};

const getEnvArray = (key: string, defaultValue: string[]): string[] => {
  const value = process.env[key];
  return value ? value.split(',').map(item => item.trim()) : defaultValue;
};

// Payment configuration
export const PaymentConfig: PaymentConfigType = {
  billing: {
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD'],
    taxRate: getEnvNumber('TAX_RATE', 0),
    trialPeriodDays: getEnvNumber('TRIAL_PERIOD_DAYS', 3),
    gracePeriodDays: getEnvNumber('GRACE_PERIOD_DAYS', 7),
    autoRenewal: getEnvBoolean('AUTO_RENEWAL', true),
  },
  webhooks: {
    enableWebhookValidation: getEnvBoolean('ENABLE_WEBHOOK_VALIDATION', true),
    webhookTimeout: getEnvNumber('WEBHOOK_TIMEOUT', 30000),
  },
  features: {
    enableTrials: getEnvBoolean('ENABLE_TRIALS', true),
    enableRefunds: getEnvBoolean('ENABLE_REFUNDS', false),
    enablePartialPayments: getEnvBoolean('ENABLE_PARTIAL_PAYMENTS', false),
    enableSubscriptions: getEnvBoolean('ENABLE_SUBSCRIPTIONS', true),
    enableOneTimePayments: getEnvBoolean('ENABLE_ONE_TIME_PAYMENTS', true),
  },
  limits: {
    maxPaymentAmount: getEnvNumber('MAX_PAYMENT_AMOUNT', 10000), // $10,000 USD
    minPaymentAmount: getEnvNumber('MIN_PAYMENT_AMOUNT', 1), // $1 USD
    maxRefundAmount: getEnvNumber('MAX_REFUND_AMOUNT', 10000),
    paymentAttempts: getEnvNumber('MAX_PAYMENT_ATTEMPTS', 3),
    webhookRetries: getEnvNumber('WEBHOOK_RETRIES', 5),
  },
};

// Currency configuration (USD only)
export const CURRENCY_CONFIG = {
  USD: {
    symbol: '$',
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
} as const;

// Billing period configuration
export const BILLING_PERIODS = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  BIANNUAL: 'biannual',
  ANNUAL: 'annual',
} as const;

export type BillingPeriod = typeof BILLING_PERIODS[keyof typeof BILLING_PERIODS];

// Payment status configuration
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

// Helper functions
export const formatCurrency = (amount: number): string => {
  const config = CURRENCY_CONFIG.USD;
  
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  return `${config.symbol}${formatted}`;
};

export const getPaymentAttempts = (): number => PaymentConfig.limits.paymentAttempts;
export const getTrialPeriod = (): number => PaymentConfig.billing.trialPeriodDays;
export const getTaxRate = (): number => PaymentConfig.billing.taxRate;
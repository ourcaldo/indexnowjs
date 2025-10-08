/**
 * Payment Configuration for IndexNow Studio
 * Centralized payment gateway and billing configuration
 */

export interface PaymentConfigType {
  midtrans: {
    serverKey: string;
    clientKey: string;
    isProduction: boolean;
    apiUrl: string;
    snapUrl: string;
    enabledMethods: string[];
  };
  billing: {
    defaultCurrency: string;
    supportedCurrencies: string[];
    taxRate: number;
    trialPeriodDays: number;
    gracePeriodDays: number;
    autoRenewal: boolean;
  };
  webhooks: {
    midtransWebhookUrl: string;
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
  midtrans: {
    serverKey: getEnv('MIDTRANS_SERVER_KEY'),
    clientKey: getEnv('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY'),
    isProduction: getEnvBoolean('MIDTRANS_IS_PRODUCTION', false),
    apiUrl: getEnvBoolean('MIDTRANS_IS_PRODUCTION', false)
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com',
    snapUrl: getEnvBoolean('MIDTRANS_IS_PRODUCTION', false)
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js',
    enabledMethods: getEnvArray('MIDTRANS_ENABLED_METHODS', [
      'credit_card',
      'bank_transfer',
      'echannel',
      'gopay',
      'shopeepay',
    ]),
  },
  billing: {
    defaultCurrency: getEnv('DEFAULT_CURRENCY', 'IDR'),
    supportedCurrencies: getEnvArray('SUPPORTED_CURRENCIES', ['IDR', 'USD']),
    taxRate: getEnvNumber('TAX_RATE', 11), // 11% PPN for Indonesia
    trialPeriodDays: getEnvNumber('TRIAL_PERIOD_DAYS', 3),
    gracePeriodDays: getEnvNumber('GRACE_PERIOD_DAYS', 7),
    autoRenewal: getEnvBoolean('AUTO_RENEWAL', true),
  },
  webhooks: {
    midtransWebhookUrl: getEnv('MIDTRANS_WEBHOOK_URL', '/api/v1/payments/midtrans/webhook'),
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
    maxPaymentAmount: getEnvNumber('MAX_PAYMENT_AMOUNT', 50000000), // 50M IDR
    minPaymentAmount: getEnvNumber('MIN_PAYMENT_AMOUNT', 10000), // 10K IDR
    maxRefundAmount: getEnvNumber('MAX_REFUND_AMOUNT', 50000000),
    paymentAttempts: getEnvNumber('MAX_PAYMENT_ATTEMPTS', 3),
    webhookRetries: getEnvNumber('WEBHOOK_RETRIES', 5),
  },
};

// Payment method configuration
export const PAYMENT_METHODS = {
  SNAP: 'midtrans-snap',
  RECURRING: 'midtrans-recurring',
  BANK_TRANSFER: 'bank-transfer',
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

// Currency configuration
export const CURRENCY_CONFIG = {
  IDR: {
    symbol: 'Rp',
    decimals: 0,
    thousandsSeparator: '.',
    decimalSeparator: ',',
  },
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

// Configuration validation
export const validatePaymentConfig = (): void => {
  const required = [
    'MIDTRANS_SERVER_KEY',
    'NEXT_PUBLIC_MIDTRANS_CLIENT_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required payment environment variables: ${missing.join(', ')}`);
  }

  // Validate currency
  if (!PaymentConfig.billing.supportedCurrencies.includes(PaymentConfig.billing.defaultCurrency)) {
    throw new Error('Default currency must be in supported currencies list');
  }

  // Validate limits
  if (PaymentConfig.limits.minPaymentAmount >= PaymentConfig.limits.maxPaymentAmount) {
    throw new Error('Min payment amount must be less than max payment amount');
  }

  // Validate tax rate
  if (PaymentConfig.billing.taxRate < 0 || PaymentConfig.billing.taxRate > 100) {
    throw new Error('Tax rate must be between 0 and 100');
  }
};

// Helper functions
export const formatCurrency = (amount: number, currency: string = PaymentConfig.billing.defaultCurrency): string => {
  const config = CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG];
  if (!config) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  const formatted = amount.toLocaleString('id-ID', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  return `${config.symbol}${formatted}`;
};

export const isMidtransProduction = (): boolean => PaymentConfig.midtrans.isProduction;
export const getPaymentAttempts = (): number => PaymentConfig.limits.paymentAttempts;
export const getTrialPeriod = (): number => PaymentConfig.billing.trialPeriodDays;
export const getTaxRate = (): number => PaymentConfig.billing.taxRate;
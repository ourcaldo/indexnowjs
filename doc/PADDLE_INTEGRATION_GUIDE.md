# Paddle Payment Gateway Integration Guide

**Project:** IndexNow Studio  
**Date:** October 29, 2025  
**Status:** Planning & Design Phase  

---

## Table of Contents
1. [Overview](#overview)
2. [Current Architecture](#current-architecture)
3. [Why Paddle?](#why-paddle)
4. [Integration Strategy: Hybrid Approach](#integration-strategy-hybrid-approach)
5. [Data Model & Database Schema](#data-model--database-schema)
6. [Backend Architecture](#backend-architecture)
7. [Frontend Integration](#frontend-integration)
8. [Payment Flow (End-to-End)](#payment-flow-end-to-end)
9. [Admin Module Integration](#admin-module-integration)
10. [BullMQ Job Integration](#bullmq-job-integration)
11. [Security Best Practices](#security-best-practices)
12. [Migration from Midtrans](#migration-from-midtrans)
13. [Testing Strategy](#testing-strategy)
14. [Go-Live Checklist](#go-live-checklist)

---

## Overview

This document outlines the complete integration plan for **Paddle Subscription Management and Payment Gateway** into IndexNow Studio, a Next.js 15 SaaS application for SEO rank tracking.

**Integration Approach:** Hybrid model combining environment variables (for secrets) with database-driven configuration (for settings).

---

## Current Architecture

### Tech Stack
- **Frontend:** Next.js 15 (App Router), React 18, Tailwind CSS, Radix UI
- **Backend:** Next.js API Routes, Supabase (PostgreSQL + Auth)
- **Current Payment Gateway:** Midtrans (Indonesian payment gateway)
- **Background Jobs:** BullMQ with Redis
- **Analytics:** GA4, GTM, Sentry, PostHog, Customer.io

### Existing Payment Structure
- Database table: `indb_payment_gateways`
- Admin UI: `/backend/admin/settings/payments`
- API Endpoints: `/api/v1/admin/settings/payments/*`
- Payment methods: Midtrans Snap, Midtrans Recurring, Bank Transfer

---

## Why Paddle?

### Advantages Over Midtrans

| Feature | Midtrans | Paddle |
|---------|----------|--------|
| **Geographic Coverage** | Indonesia-focused | Global (200+ countries) |
| **Payment Methods** | Local (GoPay, OVO, Bank Transfer) | Cards, PayPal, Apple Pay, Google Pay |
| **Tax Handling** | Manual VAT/Tax calculation | Automatic (VAT, GST, sales tax) |
| **Merchant of Record** | You (compliance burden on you) | Paddle (they handle compliance) |
| **Subscription Management** | Custom build required | Built-in (pause, cancel, upgrade) |
| **Invoice Generation** | Manual | Automatic |
| **Fraud Detection** | Basic | Advanced ML-based |
| **Pricing** | Fixed fees | Revenue share model |

### Key Benefits
1. **Reduced Compliance Burden** - Paddle acts as Merchant of Record
2. **Global Scale** - Accept payments from anywhere
3. **Automatic Tax Management** - No need to calculate VAT/GST manually
4. **Built-in Subscription Features** - Pause, resume, upgrade, downgrade
5. **Better for SaaS** - Purpose-built for subscription businesses

---

## Integration Strategy: Hybrid Approach

### Recommended: Option A - Hybrid Model ⭐

**Philosophy:**
- **Secrets** → Environment Variables (never in database)
- **Configuration** → Database (admin-controlled settings)

### What Goes Where

#### Environment Variables (.env)
```bash
# Server-side secrets (NEVER commit to git)
PADDLE_API_KEY=pk_live_xxxxx
PADDLE_WEBHOOK_SECRET=whsec_xxxxx

# Client-side public token
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=ptk_live_xxxxx
NEXT_PUBLIC_PADDLE_ENV=production
```

#### Database (indb_payment_gateways table)
```json
{
  "id": "uuid",
  "name": "Paddle",
  "slug": "paddle",
  "is_active": true,
  "is_default": false,
  "description": "Global payment gateway for subscriptions",
  "configuration": {
    "environment": "production",
    "default_currency": "USD",
    "enabled_features": {
      "subscriptions": true,
      "one_time_payments": false,
      "customer_portal": true
    },
    "plan_mappings": {
      "pro_monthly": "pri_01hxxxx...",
      "pro_yearly": "pri_01hyyyy...",
      "enterprise": "pri_01hzzzz..."
    },
    "webhook_url": "https://yourdomain.com/api/v1/payments/paddle/webhook"
  },
  "api_credentials": {
    "note": "Secrets stored in environment variables",
    "api_key_env": "PADDLE_API_KEY",
    "webhook_secret_env": "PADDLE_WEBHOOK_SECRET",
    "client_token_env": "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"
  }
}
```

### Why Hybrid?
✅ **Security:** Secrets never touch database  
✅ **Flexibility:** Admin can change settings without redeployment  
✅ **Audit Trail:** Database tracks who changed what  
✅ **Consistency:** Follows existing architecture pattern  
✅ **Best Practices:** Aligns with OWASP security guidelines  

---

## Data Model & Database Schema

### New Tables to Add (Supabase)

#### 1. Subscriptions Table
```sql
CREATE TABLE indb_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paddle_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  paddle_customer_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'active', 'past_due', 'canceled', 'paused'
  plan_id VARCHAR(100) NOT NULL, -- Internal plan reference (pro_monthly, etc.)
  paddle_price_id VARCHAR(255) NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON indb_subscriptions(user_id);
CREATE INDEX idx_subscriptions_paddle_subscription_id ON indb_subscriptions(paddle_subscription_id);
CREATE INDEX idx_subscriptions_status ON indb_subscriptions(status);
```

#### 2. Transactions Table
```sql
CREATE TABLE indb_paddle_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES indb_subscriptions(id) ON DELETE SET NULL,
  paddle_transaction_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'completed', 'failed', 'pending', 'refunded'
  payment_method VARCHAR(100),
  receipt_url TEXT,
  invoice_number VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_paddle_transactions_user_id ON indb_paddle_transactions(user_id);
CREATE INDEX idx_paddle_transactions_subscription_id ON indb_paddle_transactions(subscription_id);
CREATE INDEX idx_paddle_transactions_status ON indb_paddle_transactions(status);
```

#### 3. Webhook Events Log
```sql
CREATE TABLE indb_paddle_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL, -- Paddle's event ID
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_paddle_webhooks_event_type ON indb_paddle_webhook_events(event_type);
CREATE INDEX idx_paddle_webhooks_processed ON indb_paddle_webhook_events(processed);
```

#### 4. Update User Profiles
```sql
-- Add subscription fields to existing profiles table
ALTER TABLE indb_profiles 
ADD COLUMN subscription_tier VARCHAR(50), -- 'free', 'pro', 'enterprise'
ADD COLUMN subscription_active BOOLEAN DEFAULT false,
ADD COLUMN subscription_id UUID REFERENCES indb_subscriptions(id);
```

---

## Backend Architecture

### API Routes Structure

```
app/api/v1/
├── payments/
│   └── paddle/
│       ├── webhooks/
│       │   └── route.ts              # POST - Paddle webhook handler
│       ├── create-checkout/
│       │   └── route.ts              # POST - Initialize checkout
│       ├── subscription/
│       │   ├── cancel/
│       │   │   └── route.ts          # POST - Cancel subscription
│       │   ├── pause/
│       │   │   └── route.ts          # POST - Pause subscription
│       │   ├── resume/
│       │   │   └── route.ts          # POST - Resume subscription
│       │   └── update/
│       │       └── route.ts          # PATCH - Update subscription
│       ├── customer-portal/
│       │   └── route.ts              # GET - Get portal URL
│       └── transactions/
│           └── route.ts              # GET - List transactions
```

### Service Layer Structure

```
lib/services/payments/paddle/
├── PaddleService.ts                  # Core Paddle SDK wrapper
├── PaddleWebhookHandler.ts           # Webhook signature verification & routing
├── PaddleCheckoutService.ts          # Checkout creation logic
├── PaddleSubscriptionService.ts      # Subscription management
├── PaddleCustomerService.ts          # Customer operations
└── index.ts                          # Exports
```

### Core Service Implementation

```typescript
// lib/services/payments/paddle/PaddleService.ts
import { Paddle } from '@paddle/paddle-node-sdk';
import { supabaseAdmin } from '@/lib/database';

export class PaddleService {
  private static instance: Paddle | null = null;

  static async getInstance(): Promise<Paddle> {
    // Get gateway configuration from database
    const { data: gateway } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'paddle')
      .eq('is_active', true)
      .single();

    if (!gateway) {
      throw new Error('Paddle gateway is not configured or inactive');
    }

    // Get secrets from environment
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      throw new Error('PADDLE_API_KEY not configured in environment');
    }

    // Initialize SDK with env secret + database config
    if (!this.instance) {
      this.instance = new Paddle(apiKey, {
        environment: gateway.configuration.environment as 'production' | 'sandbox',
      });
    }

    return this.instance;
  }

  static async getGatewayConfig() {
    const { data } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'paddle')
      .single();
    
    return data?.configuration || null;
  }
}
```

---

## Frontend Integration

### 1. Paddle Provider (Context)

```typescript
// lib/providers/PaddleProvider.tsx
'use client';

import { createContext, useEffect, useState, useContext } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

interface PaddleContextType {
  paddle: Paddle | null;
  isLoading: boolean;
}

const PaddleContext = createContext<PaddleContextType>({
  paddle: null,
  isLoading: true,
});

export function PaddleProvider({ children }: { children: React.ReactNode }) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initPaddle = async () => {
      try {
        // Check if gateway is active via API
        const response = await fetch('/api/v1/billing/payment-gateways');
        const { data } = await response.json();
        const paddleGateway = data?.gateways?.find((g: any) => g.slug === 'paddle' && g.is_active);

        if (!paddleGateway) {
          console.log('Paddle gateway not active');
          setIsLoading(false);
          return;
        }

        // Initialize with env vars
        const paddleInstance = await initializePaddle({
          environment: process.env.NEXT_PUBLIC_PADDLE_ENV as 'production' | 'sandbox',
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
        });

        if (paddleInstance) {
          setPaddle(paddleInstance);
        }
      } catch (error) {
        console.error('Failed to initialize Paddle:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initPaddle();
  }, []);

  return (
    <PaddleContext.Provider value={{ paddle, isLoading }}>
      {children}
    </PaddleContext.Provider>
  );
}

export const usePaddle = () => useContext(PaddleContext);
```

### 2. Pricing Page with Checkout

```typescript
// app/pricing/page.tsx
'use client';

import { usePaddle } from '@/lib/providers/PaddleProvider';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';

export default function PricingPage() {
  const { paddle, isLoading } = usePaddle();
  const { data: user } = useUser();

  const handleSubscribe = async (planId: string, priceId: string) => {
    if (!paddle || !user) return;

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: user.email },
      customData: {
        userId: user.id,
        planId: planId,
      },
      settings: {
        displayMode: 'overlay',
        successUrl: `${window.location.origin}/dashboard?subscription=success`,
        theme: 'light',
      },
    });
  };

  return (
    <div className="pricing-grid">
      <div className="plan-card">
        <h3>Pro Monthly</h3>
        <p>$29/month</p>
        <Button
          onClick={() => handleSubscribe('pro_monthly', 'pri_01hxxxx')}
          disabled={isLoading || !paddle}
          data-testid="button-subscribe-pro-monthly"
        >
          Subscribe Now
        </Button>
      </div>
      {/* More plans... */}
    </div>
  );
}
```

### 3. Customer Portal Link

```typescript
// components/dashboard/SubscriptionManagement.tsx
'use client';

import { Button } from '@/components/ui/button';

export function SubscriptionManagement() {
  const handleManageSubscription = async () => {
    const response = await fetch('/api/v1/payments/paddle/customer-portal');
    const { data } = await response.json();
    
    if (data?.portal_url) {
      window.open(data.portal_url, '_blank');
    }
  };

  return (
    <Button onClick={handleManageSubscription} data-testid="button-manage-subscription">
      Manage Subscription
    </Button>
  );
}
```

---

## Payment Flow (End-to-End)

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER SUBSCRIBES TO PRO PLAN                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: User clicks "Subscribe to Pro" button                   │
│ - Frontend calls paddle.Checkout.open()                         │
│ - Passes: priceId, user email, customData (userId, planId)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Paddle Checkout Overlay Opens                           │
│ - User enters payment details (handled by Paddle)                │
│ - Paddle handles: PCI compliance, fraud detection, tax calc     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Payment Succeeds                                         │
│ - Paddle processes payment                                       │
│ - Paddle sends webhook: subscription.created                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Your Webhook Handler Receives Event                     │
│ POST /api/v1/payments/paddle/webhooks                           │
│                                                                  │
│ 4a. Verify webhook signature (SECURITY CRITICAL)                │
│ 4b. Log event to indb_paddle_webhook_events                     │
│ 4c. Route to handler based on event_type                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Process subscription.created Event                      │
│                                                                  │
│ 5a. Insert record into indb_subscriptions:                      │
│     - paddle_subscription_id                                     │
│     - paddle_customer_id                                         │
│     - status: 'active'                                           │
│     - plan_id: 'pro_monthly'                                     │
│                                                                  │
│ 5b. Update indb_profiles:                                       │
│     - subscription_tier: 'pro'                                   │
│     - subscription_active: true                                  │
│                                                                  │
│ 5c. Queue BullMQ job: 'subscription-provisioned'                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: BullMQ Worker Processes Job                             │
│                                                                  │
│ 6a. Update user quotas (rank checks, domains, etc.)             │
│ 6b. Send welcome email via email queue                          │
│ 6c. Track analytics event (subscription_started)                │
│ 6d. Log admin activity (new subscription)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 7: User Gets Access                                         │
│ - Middleware checks subscription_active flag                     │
│ - Premium features unlocked                                      │
│ - Dashboard shows "Pro Plan" badge                              │
└─────────────────────────────────────────────────────────────────┘
```

### Webhook Events to Handle

```typescript
// Key Paddle webhook events

subscription.created       → Provision new subscription
subscription.updated       → Handle plan changes, pauses
subscription.canceled      → Revoke access (at period end)
subscription.past_due      → Alert user, attempt retry
subscription.paused        → Temporarily disable access
subscription.resumed       → Re-enable access

transaction.completed      → Log payment, send receipt
transaction.payment_failed → Alert user, retry payment
transaction.refunded       → Process refund, adjust quotas
```

---

## Admin Module Integration

### Admin Form Configuration

Update the existing payment gateway form at `/backend/admin/settings/payments/page.tsx`:

```typescript
{/* Paddle Configuration Section */}
{formData.slug === 'paddle' && (
  <>
    <div className="md:col-span-2">
      <h3 className="text-lg font-medium border-b pb-2">
        Paddle Subscription Gateway Configuration
      </h3>
      <p className="text-sm text-muted-foreground mt-2">
        Paddle handles global payments, tax compliance, and subscription management.
        API credentials must be configured in environment variables for security.
      </p>
    </div>

    {/* Environment Selection */}
    <div>
      <label className="block text-sm font-medium mb-2">Environment</label>
      <select
        value={formData.configuration?.environment || 'sandbox'}
        onChange={(e) => updateConfigurationField('environment', e.target.value)}
        className="w-full px-3 py-2 border rounded-lg"
      >
        <option value="sandbox">Sandbox (Testing)</option>
        <option value="production">Production (Live)</option>
      </select>
      <p className="text-xs text-muted-foreground mt-1">
        Use sandbox for testing. Switch to production when ready to accept real payments.
      </p>
    </div>

    {/* Default Currency */}
    <div>
      <label className="block text-sm font-medium mb-2">Default Currency</label>
      <select
        value={formData.configuration?.default_currency || 'USD'}
        onChange={(e) => updateConfigurationField('default_currency', e.target.value)}
        className="w-full px-3 py-2 border rounded-lg"
      >
        <option value="USD">USD - US Dollar</option>
        <option value="EUR">EUR - Euro</option>
        <option value="GBP">GBP - British Pound</option>
        <option value="IDR">IDR - Indonesian Rupiah</option>
      </select>
    </div>

    {/* Plan Mappings */}
    <div className="md:col-span-2">
      <h4 className="font-medium mb-3">Plan ID Mappings</h4>
      <p className="text-xs text-muted-foreground mb-3">
        Map your internal plan identifiers to Paddle Price IDs from your Paddle Dashboard
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Pro Monthly Plan
          </label>
          <input
            type="text"
            placeholder="pri_01hxxxx..."
            value={formData.configuration?.plan_mappings?.pro_monthly || ''}
            onChange={(e) => updateConfigurationField('plan_mappings', {
              ...formData.configuration?.plan_mappings,
              pro_monthly: e.target.value
            })}
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Pro Yearly Plan
          </label>
          <input
            type="text"
            placeholder="pri_01hyyyy..."
            value={formData.configuration?.plan_mappings?.pro_yearly || ''}
            onChange={(e) => updateConfigurationField('plan_mappings', {
              ...formData.configuration?.plan_mappings,
              pro_yearly: e.target.value
            })}
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Enterprise Plan
          </label>
          <input
            type="text"
            placeholder="pri_01hzzzz..."
            value={formData.configuration?.plan_mappings?.enterprise || ''}
            onChange={(e) => updateConfigurationField('plan_mappings', {
              ...formData.configuration?.plan_mappings,
              enterprise: e.target.value
            })}
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
          />
        </div>
      </div>
    </div>

    {/* Webhook URL (Read-only) */}
    <div className="md:col-span-2">
      <label className="block text-sm font-medium mb-2">Webhook URL</label>
      <input
        type="url"
        value={formData.configuration?.webhook_url || 'https://yourdomain.com/api/v1/payments/paddle/webhooks'}
        onChange={(e) => updateConfigurationField('webhook_url', e.target.value)}
        className="w-full px-3 py-2 border rounded-lg bg-muted/50 font-mono text-sm"
        readOnly
      />
      <p className="text-xs text-muted-foreground mt-1">
        Configure this URL in your Paddle Dashboard → Developer Tools → Webhooks
      </p>
    </div>

    {/* Environment Variables Notice */}
    <div className="md:col-span-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center">
        <span className="mr-2">🔐</span>
        Required Environment Variables
      </h4>
      <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
        For security, API credentials must be set in your environment configuration:
      </p>
      <div className="bg-blue-900 dark:bg-blue-950 rounded p-3 font-mono text-xs text-blue-100 space-y-1">
        <div>PADDLE_API_KEY=pk_live_xxxxx</div>
        <div>PADDLE_WEBHOOK_SECRET=whsec_xxxxx</div>
        <div>NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=ptk_live_xxxxx</div>
        <div>NEXT_PUBLIC_PADDLE_ENV=production</div>
      </div>
      <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
        Get these from Paddle Dashboard → Developer Tools → Authentication
      </p>
    </div>
  </>
)}
```

---

## BullMQ Job Integration

### New Queue: Subscription Events

```typescript
// lib/queues/subscription-queue.ts
import { Queue, Worker } from 'bullmq';
import { supabaseAdmin } from '@/lib/database';
import { emailQueue } from './email-queue';

export const subscriptionQueue = new Queue('subscription-events', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Worker to process subscription events
export const subscriptionWorker = new Worker(
  'subscription-events',
  async (job) => {
    const { type, data } = job.data;

    switch (type) {
      case 'subscription-created':
        await handleSubscriptionCreated(data);
        break;

      case 'subscription-canceled':
        await handleSubscriptionCanceled(data);
        break;

      case 'subscription-updated':
        await handleSubscriptionUpdated(data);
        break;

      case 'payment-failed':
        await handlePaymentFailed(data);
        break;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  }
);

async function handleSubscriptionCreated(data: any) {
  const { userId, subscriptionId, planId } = data;

  // Update user quotas based on plan
  const quotas = getQuotasForPlan(planId);
  await supabaseAdmin
    .from('indb_user_settings')
    .update({
      daily_quota_limit: quotas.dailyLimit,
      minute_quota_limit: quotas.minuteLimit,
    })
    .eq('user_id', userId);

  // Send welcome email
  await emailQueue.add('subscription-welcome', {
    userId,
    planId,
  });

  // Track analytics
  // await analytics.track(...)
}

function getQuotasForPlan(planId: string) {
  const quotaMap = {
    pro_monthly: { dailyLimit: 1000, minuteLimit: 100 },
    pro_yearly: { dailyLimit: 1000, minuteLimit: 100 },
    enterprise: { dailyLimit: 5000, minuteLimit: 500 },
  };
  return quotaMap[planId as keyof typeof quotaMap] || { dailyLimit: 200, minuteLimit: 60 };
}
```

### Integration with Webhook Handler

```typescript
// app/api/v1/payments/paddle/webhooks/route.ts
import { subscriptionQueue } from '@/lib/queues/subscription-queue';

export async function POST(req: NextRequest) {
  // ... signature verification ...
  
  const event = JSON.parse(rawBody);

  // Process in database first (sync)
  switch (event.event_type) {
    case 'subscription.created':
      const subscription = await createSubscriptionInDB(event.data);
      
      // Queue background job (async)
      await subscriptionQueue.add('subscription-created', {
        userId: event.data.custom_data.userId,
        subscriptionId: subscription.id,
        planId: event.data.custom_data.planId,
      });
      break;
  }

  return NextResponse.json({ received: true });
}
```

---

## Security Best Practices

### 1. Webhook Signature Verification

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

### 2. Environment Variable Security

```bash
# .env.local (NEVER commit)
PADDLE_API_KEY=pk_live_xxxxx
PADDLE_WEBHOOK_SECRET=whsec_xxxxx

# Add to .gitignore
.env.local
.env.*.local
```

### 3. Idempotency (Prevent Duplicate Processing)

```typescript
// Check if webhook event already processed
const { data: existing } = await supabaseAdmin
  .from('indb_paddle_webhook_events')
  .select('id')
  .eq('event_id', event.event_id)
  .single();

if (existing) {
  return NextResponse.json({ message: 'Event already processed' });
}
```

### 4. API Key Rotation Strategy

1. Generate new API key in Paddle Dashboard
2. Update `PADDLE_API_KEY` in environment
3. Deploy with zero downtime
4. Revoke old key after 24 hours

---

## Migration from Midtrans

### Strategy: Gradual Migration

#### Phase 1: Dual Gateway Setup (Recommended)
- Keep Midtrans active for existing subscribers
- Enable Paddle for new subscriptions
- Let existing subscriptions complete their billing cycle

#### Phase 2: Migration Window
- Notify existing subscribers 30 days before migration
- Offer incentives to migrate (extra month free, discount)
- Provide self-service migration option

#### Phase 3: Complete Migration
- Move remaining subscribers to Paddle
- Disable Midtrans gateway
- Archive Midtrans payment data

### Migration Checklist

```markdown
- [ ] Set up Paddle account (sandbox first)
- [ ] Configure webhook endpoints
- [ ] Test in sandbox environment
- [ ] Create plan mappings (Midtrans plans → Paddle prices)
- [ ] Add Paddle to admin payment gateways (inactive)
- [ ] Test end-to-end subscription flow
- [ ] Enable Paddle gateway (set as default for new users)
- [ ] Monitor for 2 weeks (dual gateway mode)
- [ ] Prepare migration communication
- [ ] Migrate existing subscribers in batches
- [ ] Deactivate Midtrans gateway
- [ ] Archive old payment data
```

---

## Testing Strategy

### 1. Sandbox Environment Setup

```bash
# Use sandbox credentials
PADDLE_API_KEY=pk_sandbox_xxxxx
PADDLE_WEBHOOK_SECRET=whsec_sandbox_xxxxx
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=ptk_sandbox_xxxxx
NEXT_PUBLIC_PADDLE_ENV=sandbox
```

### 2. Test Cases

**Subscription Creation:**
- ✅ New user subscribes to Pro Monthly
- ✅ Payment succeeds → Access granted immediately
- ✅ Payment fails → User shown error, no access granted
- ✅ User data synced correctly to database

**Subscription Management:**
- ✅ User cancels subscription → Access continues until period end
- ✅ User pauses subscription → Access disabled immediately
- ✅ User resumes subscription → Access restored
- ✅ User upgrades from Pro to Enterprise → Prorated charge

**Webhooks:**
- ✅ Webhook signature verification works
- ✅ Duplicate webhooks are ignored (idempotency)
- ✅ Failed webhooks are logged for retry

**Edge Cases:**
- ✅ User with expired card → Payment fails → Email sent
- ✅ Refund requested → Access revoked → Email sent
- ✅ Subscription expires → User downgraded to free tier

### 3. Test Cards (Paddle Sandbox)

```
Successful Payment:
Card: 4242 4242 4242 4242
CVV: 123
Expiry: Any future date

Failed Payment:
Card: 4000 0000 0000 0002
```

---

## Go-Live Checklist

### Pre-Launch (Sandbox Testing)
- [ ] Paddle sandbox account created
- [ ] All webhook events tested
- [ ] Frontend checkout flow tested
- [ ] Subscription management UI tested
- [ ] Email notifications working
- [ ] BullMQ jobs processing correctly
- [ ] Admin module configured
- [ ] Database tables created
- [ ] Security review completed

### Production Setup
- [ ] Paddle production account verified
- [ ] Business information submitted to Paddle
- [ ] Tax settings configured in Paddle
- [ ] Products and prices created in Paddle Dashboard
- [ ] Production API keys generated
- [ ] Environment variables updated (production)
- [ ] Webhook URL configured in Paddle Dashboard
- [ ] SSL certificate verified for webhook endpoint

### Post-Launch Monitoring
- [ ] Webhook delivery monitoring
- [ ] Payment success rate tracking
- [ ] Error logging and alerting (Sentry)
- [ ] Customer support ready for payment inquiries
- [ ] Analytics tracking subscription events
- [ ] Monthly revenue reconciliation process

---

## Key Resources

### Paddle Documentation
- **Official Docs:** https://developer.paddle.com/
- **Paddle.js Wrapper:** https://www.npmjs.com/package/@paddle/paddle-js
- **Node.js SDK:** https://www.npmjs.com/package/@paddle/paddle-node-sdk
- **Next.js Starter Kit:** https://github.com/PaddleHQ/paddle-nextjs-starter-kit
- **Webhook Events:** https://developer.paddle.com/webhooks/overview
- **Test Cards:** https://developer.paddle.com/concepts/payment-methods/test-cards

### Internal Project Files
- Database schema: `database-migrations/`
- Payment services: `lib/services/payments/`
- Admin UI: `app/backend/admin/settings/payments/`
- API routes: `app/api/v1/payments/`
- BullMQ queues: `lib/queues/`

---

## Support & Troubleshooting

### Common Issues

**Issue: Webhook not receiving events**
- Check webhook URL is publicly accessible (HTTPS required)
- Verify webhook signature verification logic
- Check Paddle Dashboard → Developer Tools → Webhook Logs

**Issue: Checkout overlay not opening**
- Verify `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is set
- Check browser console for JavaScript errors
- Ensure Paddle.js is initialized before checkout call

**Issue: Payment succeeds but access not granted**
- Check webhook event was received and processed
- Verify database subscription record created
- Check BullMQ job processed successfully
- Review application logs for errors

---

**Last Updated:** October 29, 2025  
**Version:** 1.0  
**Status:** Planning & Design Complete

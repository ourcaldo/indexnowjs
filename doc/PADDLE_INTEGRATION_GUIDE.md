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

## Pricing Migration: Multi-Currency to USD-Only

### Overview

As part of the Paddle integration, we are migrating from a **multi-currency pricing system** (USD + IDR with exchange rate conversion) to a **single-currency USD-only system**. Paddle handles currency localization and conversion automatically, eliminating the need for our custom currency conversion infrastructure.

This section provides an in-depth analysis of the current pricing system and a detailed migration plan.

---

### Current Pricing System Architecture

#### 1. Database Structure: `pricing_tiers` Column

The `indb_payment_packages` table stores pricing information in a JSONB column called `pricing_tiers` with the following nested structure:

```json
{
  "monthly": {
    "IDR": {
      "promo_price": 25000,
      "period_label": "Monthly",
      "regular_price": 50000
    },
    "USD": {
      "promo_price": 9.99,
      "period_label": "Monthly",
      "regular_price": 25
    }
  },
  "annual": {
    "IDR": {
      "promo_price": 150000,
      "period_label": "Annual",
      "regular_price": 180000
    },
    "USD": {
      "promo_price": 80,
      "period_label": "Annual",
      "regular_price": 149
    }
  }
}
```

**Key Characteristics:**
- **Nested Structure**: `pricing_tiers[billing_period][currency]`
- **Dual Currency Support**: IDR (Indonesian Rupiah) and USD (US Dollar)
- **Per-Period Pricing**: Each billing period (monthly, annual, quarterly, biannual) has separate pricing
- **Promotion Support**: Both `promo_price` and `regular_price` fields
- **Display Labels**: `period_label` for frontend display

**Sample Database Row:**
```sql
INSERT INTO "indb_payment_packages" (
  "id", "name", "slug", "description", 
  "currency", "billing_period", "pricing_tiers"
) VALUES (
  '0c68e88b-55b6-4783-9a84-96bf883e9986',
  'Basic',
  'basic',
  'Solo? Don''t worry, this will be best-fit for you',
  'IDR',
  'monthly',
  '{"annual": {"IDR": {...}, "USD": {...}}, "monthly": {"IDR": {...}, "USD": {...}}}'
);
```

---

#### 2. Currency Detection System

The application uses geo-based currency detection to determine which currency to display to users:

**Currency Detection Flow:**
```
User Accesses Pricing Page
         ↓
Is User Logged In?
    ├─ YES → Get country from user profile (indb_auth_user_profiles.country)
    └─ NO  → Detect country via IP geolocation (AUTH_ENDPOINTS.DETECT_LOCATION)
         ↓
Apply Currency Rules:
    - Indonesia → IDR
    - All Others → USD
         ↓
Display Pricing in Detected Currency
```

**Implementation Files:**

1. **`lib/utils/currency-utils.ts`** - Core currency utilities
```typescript
export function getUserCurrency(country: string | null | undefined): 'IDR' | 'USD' {
  if (!country) return 'USD'
  const normalizedCountry = country.toLowerCase().trim()
  const indonesiaVariants = ['indonesia', 'id', 'idn', 'republic of indonesia']
  return indonesiaVariants.includes(normalizedCountry) ? 'IDR' : 'USD'
}
```

2. **`hooks/business/usePricingData.ts`** - Frontend pricing hook (lines 72-121)
```typescript
const detectCurrencyAndLoadPackages = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let detectedCurrency: Currency = 'USD'
  
  if (user) {
    // Get country from user profile
    const { data: profile } = await supabase
      .from('indb_auth_user_profiles')
      .select('country')
      .eq('user_id', user.id)
      .single()
    
    if (profile?.country) {
      detectedCurrency = getUserCurrency(profile.country)
    }
  } else {
    // Use IP-based detection
    const locationResponse = await fetch(AUTH_ENDPOINTS.DETECT_LOCATION)
    if (locationResponse.ok) {
      const locationData = await locationResponse.json()
      if (locationData.country) {
        detectedCurrency = getUserCurrency(locationData.country)
      }
    }
  }
  
  setCurrency(detectedCurrency)
}
```

**Detection Sources:**
- **Logged-in users**: Profile country from `indb_auth_user_profiles.country`
- **Anonymous users**: IP geolocation via `/api/v1/auth/detect-location`
- **Fallback**: USD (default)

---

#### 3. Currency Conversion Infrastructure

The application has **three separate currency converter utilities** with overlapping functionality:

##### A. Simple Converter: `lib/utils/currency-converter.ts`
**Purpose**: USD → IDR conversion for Midtrans payments only

**Key Functions:**
```typescript
// Convert USD to IDR using live exchange rate API
async function convertUsdToIdr(usdAmount: number): Promise<number>

// Get current exchange rate from exchangerate-api.com
async function getCurrentExchangeRate(): Promise<number>

// Format IDR amounts
function formatIdrCurrency(idrAmount: number): string
```

**Features:**
- Uses `exchangerate-api.com` for live rates
- Fallback rate: **15,800 IDR per USD**
- Simple, no caching

**Usage Location:**
- `app/api/v1/billing/midtrans/create-payment/route.ts` (line 85)

##### B. Full Converter: `lib/services/payments/billing/CurrencyConverter.ts`
**Purpose**: Bidirectional currency conversion with caching

**Key Features:**
- **Bidirectional**: USD ↔ IDR
- **Caching**: 1-hour cache duration
- **Fallback Rates**:
  - USD → IDR: 15,800
  - IDR → USD: 0.0000633

**Key Methods:**
```typescript
class CurrencyConverter {
  static async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number>
  static async convertUsdToIdr(usdAmount: number): Promise<number>
  static async convertIdrToUsd(idrAmount: number): Promise<number>
  static formatAmount(amount: number, currency: string): string
  static clearCache(): void
}
```

**Cache Implementation:**
```typescript
private static cache: Map<string, { rate: number; timestamp: number }> = new Map()
private static readonly CACHE_DURATION = 60 * 60 * 1000 // 1 hour
```

##### C. Utility Converter: `lib/utils/currency-utils.ts`
**Purpose**: Currency utilities and formatting

**Key Functions:**
```typescript
// Format currency for display
function formatCurrency(amount: number, currency: 'IDR' | 'USD'): string

// Get currency symbol
function getCurrencySymbol(currency: 'IDR' | 'USD'): string

// Placeholder converter (currently does nothing)
function convertPrice(amount: number, fromCurrency: 'IDR' | 'USD', toCurrency: 'IDR' | 'USD'): number
```

**Note**: The `convertPrice()` function currently returns the original amount without conversion. It's a placeholder for potential future exchange rate support.

---

#### 4. Where Currency Conversion is Actually Used

Despite having three converter utilities, **currency conversion is only actively used in one place**:

**Single Usage Point: Midtrans Payment Creation**

**File**: `app/api/v1/billing/midtrans/create-payment/route.ts`  
**Lines**: 78-85

```typescript
// Extract USD price from pricing_tiers
const pricingTiers = packageData.pricing_tiers || {}
let usdAmount = packageData.price

if (pricingTiers[billing_period]?.USD) {
  const usdTier = pricingTiers[billing_period].USD
  usdAmount = usdTier.promo_price || usdTier.regular_price
}

// Convert USD to IDR for Midtrans
const idrAmount = await convertUsdToIdr(usdAmount)

// Create transaction record
const transactions = await SecureServiceRoleHelpers.secureInsert(
  transactionContext,
  'indb_payment_transactions',
  {
    // Store original USD amount
    amount: usdAmount,
    currency: 'USD',
    // Store converted IDR amount in metadata
    metadata: {
      usd_amount: usdAmount,
      idr_amount: idrAmount
    }
  }
)

// Send IDR amount to Midtrans (Midtrans only accepts IDR)
const snapPayload = {
  transaction_details: {
    order_id: transactionId,
    gross_amount: idrAmount  // ← IDR amount
  }
}
```

**Why Conversion is Needed for Midtrans:**
- Midtrans is an Indonesian payment gateway
- **Midtrans only accepts IDR currency**
- Even if user is international, we must convert USD → IDR for Midtrans processing
- The conversion rate is fetched live or uses fallback (15,800 IDR/USD)

**Important**: Currency conversion is **NOT used for display** - the frontend directly accesses the correct currency from `pricing_tiers[period][currency]` without any conversion.

---

#### 5. Frontend Pricing Display (No Conversion)

The frontend displays prices by **directly accessing** the correct currency from `pricing_tiers` - **no conversion occurs**.

##### A. Main Pricing Hook: `hooks/business/usePricingData.ts`

**Price Extraction Logic** (lines 165-195):
```typescript
const getPricing = (pkg: PackageData, period: BillingPeriod = selectedPeriod): PriceInfo => {
  // Access pricing_tiers nested structure
  const periodData = pkg.pricing_tiers[period]
  
  if (!periodData || !periodData[currency]) {
    return { price: 0, period: pkg.description || period }
  }
  
  // Extract price for detected currency (NO CONVERSION)
  const tierData = periodData[currency]  // ← Direct access to USD or IDR
  const price = tierData.promo_price || tierData.regular_price
  const originalPrice = (tierData.regular_price && tierData.regular_price > 0) 
    ? tierData.regular_price 
    : undefined
  
  return { price, originalPrice, period: tierData.period_label }
}
```

**Flow:**
1. Detect user's currency (USD or IDR)
2. Access `pricing_tiers[billing_period][detected_currency]`
3. Extract `promo_price` or `regular_price`
4. Return price directly - **no conversion**

##### B. Billing Period Selector: `components/checkout/BillingPeriodSelector.tsx`

**Price Display Logic** (lines 29-50):
```typescript
const formatPeriodOptions = (): BillingPeriodOption[] => {
  return availablePeriods.map(period => {
    // Direct access to currency-specific pricing
    const tierData = selectedPackage.pricing_tiers[period][userCurrency]
    
    return {
      period,
      period_label: tierData.period_label,
      regular_price: tierData.regular_price,
      promo_price: tierData.promo_price
    }
  })
}
```

**Display:**
```tsx
<span className="text-lg font-bold">
  {formatCurrency(finalPrice, userCurrency)}
</span>
```

**Key Insight**: Prices are **pre-stored** in both currencies in the database. The frontend simply picks the correct currency - no runtime conversion needed.

---

### Why Migration to USD-Only Makes Sense

#### Current System Limitations:

1. **Redundant Infrastructure**:
   - Three separate converter utilities with overlapping functionality
   - Conversion only used in one place (Midtrans payment creation)
   - 90% of conversion code is unused

2. **Manual Pricing Maintenance**:
   - Admins must manually set both USD and IDR prices for each package
   - No automated sync between currencies
   - Pricing tiers become outdated when exchange rates change

3. **Exchange Rate Dependency**:
   - Relies on third-party API (`exchangerate-api.com`)
   - Fallback rate (15,800) becomes stale over time
   - No automatic rate updates for stored pricing

4. **Midtrans-Specific Design**:
   - Entire conversion system built around Midtrans' IDR-only requirement
   - Not needed when migrating to Paddle (Paddle handles currency automatically)

#### Paddle Advantages:

1. **Automatic Currency Handling**:
   - Paddle displays prices in 100+ currencies automatically
   - Real-time exchange rates managed by Paddle
   - No manual conversion needed

2. **Simplified Pricing**:
   - Set prices once in USD (or any base currency)
   - Paddle converts to local currency at checkout
   - Automatic tax calculation in local currency

3. **Reduced Complexity**:
   - Remove all converter utilities
   - Simplify pricing_tiers structure
   - Less code to maintain

4. **Better User Experience**:
   - Users see prices in their local currency automatically
   - Paddle handles currency localization
   - Professional checkout experience

---

### Migration Plan: Removing IDR and Currency Conversion

#### Phase 1: Database Schema Changes

**Step 1.1: Simplify `pricing_tiers` Structure**

**Current Structure:**
```json
{
  "monthly": {
    "IDR": { "promo_price": 25000, "period_label": "Monthly", "regular_price": 50000 },
    "USD": { "promo_price": 9.99, "period_label": "Monthly", "regular_price": 25 }
  },
  "annual": {
    "IDR": { "promo_price": 150000, "period_label": "Annual", "regular_price": 180000 },
    "USD": { "promo_price": 80, "period_label": "Annual", "regular_price": 149 }
  }
}
```

**New Structure (USD-Only):**
```json
{
  "monthly": {
    "promo_price": 9.99,
    "period_label": "Monthly",
    "regular_price": 25,
    "paddle_price_id": "pri_01hxxxx"
  },
  "annual": {
    "promo_price": 80,
    "period_label": "Annual",
    "regular_price": 149,
    "paddle_price_id": "pri_01hyyyy"
  }
}
```

**Key Changes:**
- ❌ Remove currency nesting (`IDR` and `USD` keys)
- ✅ Keep only USD pricing at root level of each billing period
- ✅ Add `paddle_price_id` field to map to Paddle's price IDs
- ✅ Maintain `promo_price`, `regular_price`, and `period_label` fields

**SQL Migration Script:**
```sql
-- IMPORTANT: Run this SQL query manually in Supabase SQL Editor
-- This will transform pricing_tiers from multi-currency to USD-only

UPDATE indb_payment_packages
SET pricing_tiers = (
  SELECT jsonb_object_agg(
    period_key,
    CASE 
      -- Extract USD pricing and flatten structure
      WHEN jsonb_typeof(period_value) = 'object' AND period_value ? 'USD' 
      THEN period_value->'USD'
      -- If no USD key, keep as-is (shouldn't happen but safe fallback)
      ELSE period_value
    END
  )
  FROM jsonb_each(pricing_tiers) AS t(period_key, period_value)
)
WHERE jsonb_typeof(pricing_tiers) = 'object';

-- Verify the migration
SELECT 
  id, 
  name, 
  slug,
  pricing_tiers
FROM indb_payment_packages
LIMIT 5;
```

**What This SQL Does:**
1. Iterates through each billing period in `pricing_tiers` (monthly, annual, etc.)
2. Extracts the `USD` nested object
3. Flattens it to the root level of each period
4. Removes the `IDR` pricing entirely

**Before Migration:**
```json
{
  "monthly": {
    "IDR": {...},
    "USD": {"promo_price": 9.99, "regular_price": 25}
  }
}
```

**After Migration:**
```json
{
  "monthly": {
    "promo_price": 9.99,
    "regular_price": 25,
    "period_label": "Monthly"
  }
}
```

---

**Step 1.2: Add Paddle Price IDs to Packages**

After the structural migration, manually add Paddle price IDs to each package:

```sql
-- Add Paddle price IDs to Basic package
UPDATE indb_payment_packages
SET pricing_tiers = jsonb_set(
  jsonb_set(
    pricing_tiers,
    '{monthly, paddle_price_id}',
    '"pri_01basic_monthly"'
  ),
  '{annual, paddle_price_id}',
  '"pri_01basic_annual"'
)
WHERE slug = 'basic';

-- Repeat for other packages (Premium, Enterprise, etc.)
```

**Best Practice**: Get actual Paddle price IDs from Paddle Dashboard → Catalog → Prices before running this query.

---

#### Phase 2: Code Changes - Critical Path

##### 2.1 Frontend Pricing Hook: `hooks/business/usePricingData.ts`

**Current Code** (lines 8-19):
```typescript
export interface PricingTierData {
  IDR: {
    promo_price: number
    period_label: string
    regular_price: number
  }
  USD: {
    promo_price: number
    period_label: string
    regular_price: number
  }
}
```

**New Code (USD-Only):**
```typescript
export interface PricingTierData {
  promo_price: number
  regular_price: number
  period_label: string
  paddle_price_id: string  // ← New field for Paddle integration
}
```

**Current Code** (lines 165-195):
```typescript
const getPricing = (pkg: PackageData, period: BillingPeriod = selectedPeriod): PriceInfo => {
  const periodData = pkg.pricing_tiers[period]
  
  if (!periodData || !periodData[currency]) {  // ← Currency check
    return { price: 0, period: pkg.description || period }
  }
  
  const tierData = periodData[currency]  // ← Nested currency access
  const price = tierData.promo_price || tierData.regular_price
  
  return { price, originalPrice, period: tierData.period_label }
}
```

**New Code (USD-Only):**
```typescript
const getPricing = (pkg: PackageData, period: BillingPeriod = selectedPeriod): PriceInfo => {
  const periodData = pkg.pricing_tiers[period]
  
  // ❌ Remove currency nesting - pricing is now flat
  if (!periodData) {
    return { price: 0, period: pkg.description || period }
  }
  
  // ✅ Direct access to pricing (no currency key)
  const price = periodData.promo_price || periodData.regular_price
  const originalPrice = (periodData.regular_price && periodData.regular_price > 0 && periodData.regular_price !== periodData.promo_price) 
    ? periodData.regular_price 
    : undefined
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined
  
  return { 
    price,
    originalPrice,
    period: periodData.period_label,
    discount,
    paddlePriceId: periodData.paddle_price_id  // ← New field for Paddle integration
  }
}
```

**Changes:**
- ❌ Remove `periodData[currency]` nested access
- ✅ Access pricing fields directly from `periodData`
- ✅ Add `paddlePriceId` to return object
- ❌ Remove currency-based filtering
- ❌ Remove `currency` state from hook
- ❌ Remove `setCurrency` function

---

##### 2.2 Billing Period Selector: `components/checkout/BillingPeriodSelector.tsx`

**Current Props** (lines 16-21):
```typescript
interface BillingPeriodSelectorProps {
  selectedPackage: any
  userCurrency: 'USD' | 'IDR'  // ← Remove this
  selectedPeriod: string
  onPeriodChange: (period: string) => void
}
```

**New Props:**
```typescript
interface BillingPeriodSelectorProps {
  selectedPackage: any
  // ❌ Remove userCurrency prop
  selectedPeriod: string
  onPeriodChange: (period: string) => void
}
```

**Current Code** (lines 36-50):
```typescript
const availablePeriods = periodOrder.filter(period => 
  selectedPackage.pricing_tiers[period] && 
  selectedPackage.pricing_tiers[period][userCurrency]  // ← Currency filter
)

const formatPeriodOptions = (): BillingPeriodOption[] => {
  return availablePeriods.map(period => {
    const tierData = selectedPackage.pricing_tiers[period][userCurrency]  // ← Currency access
    return {
      period,
      period_label: tierData.period_label,
      regular_price: tierData.regular_price,
      promo_price: tierData.promo_price
    }
  })
}
```

**New Code (USD-Only):**
```typescript
// ❌ Remove currency-based filtering
const availablePeriods = periodOrder.filter(period => 
  selectedPackage.pricing_tiers[period]  // ← Simple existence check
)

const formatPeriodOptions = (): BillingPeriodOption[] => {
  return availablePeriods.map(period => {
    // ✅ Direct access to pricing (no currency nesting)
    const tierData = selectedPackage.pricing_tiers[period]
    
    return {
      period,
      period_label: tierData.period_label || period,
      regular_price: tierData.regular_price,
      promo_price: tierData.promo_price,
      paddle_price_id: tierData.paddle_price_id  // ← New field
    }
  })
}
```

**Changes:**
- ❌ Remove `userCurrency` prop from component
- ❌ Remove `[userCurrency]` nested access
- ✅ Access pricing directly from period
- ✅ Add `paddle_price_id` to period options

---

##### 2.3 API Route: `app/api/v1/billing/packages/route.ts`

**Current Code** (lines 75-105):
```typescript
// Determine user's currency based on country
const userCountry = userProfile?.country
const userCurrency = getUserCurrency(userCountry)  // ← Currency detection

const transformedPackages = packages.map(pkg => ({
  // ...
  currency: userCurrency,  // ← Currency field
  pricing_tiers: pkg.pricing_tiers || {},
  user_currency: userCurrency,  // ← Currency metadata
  user_country: userCountry
}))

return formatSuccess({
  packages: transformedPackages,
  user_currency: userCurrency,  // ← Currency in response
  user_country: userCountry
})
```

**New Code (USD-Only):**
```typescript
// ❌ Remove currency detection (no longer needed)

const transformedPackages = packages.map(pkg => ({
  id: pkg.id,
  name: pkg.name,
  slug: pkg.slug,
  description: pkg.description,
  billing_period: pkg.billing_period,
  features: pkg.features || [],
  quota_limits: pkg.quota_limits || {},
  is_popular: pkg.is_popular || false,
  is_current: userProfile ? pkg.id === userProfile.package_id : false,
  pricing_tiers: pkg.pricing_tiers || {},  // ✅ Now flat USD-only structure
  free_trial_enabled: pkg.free_trial_enabled || false,
  // ❌ Remove currency fields - Paddle handles this
  currency: 'USD',  // ← Static value for legacy compatibility
  user_country: userProfile?.country  // ← Keep country for analytics only
}))

return formatSuccess({
  packages: transformedPackages,
  current_package_id: userProfile?.package_id,
  expires_at: userProfile?.expires_at,
  currency: 'USD',  // ← Static USD
  user_country: userProfile?.country
  // ❌ Remove user_currency field
})
```

**Changes:**
- ❌ Remove `getUserCurrency()` call
- ✅ Set `currency: 'USD'` statically
- ❌ Remove `user_currency` from response
- ✅ Keep `user_country` for analytics purposes only

---

#### Phase 3: Remove Currency Conversion Utilities

**Files to Delete After Paddle Migration:**

1. ❌ `lib/utils/currency-converter.ts` (entire file - 96 lines)
2. ❌ `lib/services/payments/billing/CurrencyConverter.ts` (entire file - 175 lines)

**Files to Modify:**

3. **`lib/utils/currency-utils.ts`** - Simplify to remove conversion logic

**Current Code** (104 lines):
```typescript
export function getUserCurrency(country: string | null | undefined): 'IDR' | 'USD' {
  if (!country) return 'USD'
  const normalizedCountry = country.toLowerCase().trim()
  const indonesiaVariants = ['indonesia', 'id', 'idn', 'republic of indonesia']
  return indonesiaVariants.includes(normalizedCountry) ? 'IDR' : 'USD'
}

export function convertPrice(amount: number, fromCurrency: 'IDR' | 'USD', toCurrency: 'IDR' | 'USD'): number {
  if (fromCurrency === toCurrency) return amount
  return amount  // Placeholder - no actual conversion
}

// ... other currency-related functions
```

**New Code (Simplified - ~40 lines):**
```typescript
// ❌ Remove getUserCurrency() - no longer needed
// ❌ Remove convertPrice() - no longer needed
// ✅ Keep only formatting functions

export function formatCurrency(amount: number): string {
  // Always format as USD
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function getCurrencySymbol(): string {
  return '$'
}
```

**Changes:**
- ❌ Remove `getUserCurrency()` function (27 lines removed)
- ❌ Remove `convertPrice()` function (7 lines removed)
- ❌ Remove `CURRENCY_CONFIGS` object (18 lines removed)
- ❌ Remove `getCurrencyPricing()` function (19 lines removed)
- ❌ Remove IDR-specific logic
- ✅ Keep `formatCurrency()` simplified to USD-only
- ✅ Keep `getCurrencySymbol()` simplified

**Lines Saved**: ~64 lines removed from this file alone

---

#### Phase 4: Impact Analysis - All Affected Files

**Total Files to Modify: 15**

##### Critical Path (Must Change - 4 files):
1. ✅ `hooks/business/usePricingData.ts` - Core pricing logic (Update types, remove currency nesting)
2. ✅ `components/checkout/BillingPeriodSelector.tsx` - Billing period display (Remove userCurrency prop)
3. ✅ `app/api/v1/billing/packages/route.ts` - Package API (Remove currency detection)
4. ✅ `app/backend/admin/settings/packages/page.tsx` - Admin package management (Update form UI)

##### Supporting Files (Should Change - 8 files):
5. ✅ `components/checkout/OrderSummary.tsx` - Remove userCurrency prop, simplify pricing access
6. ✅ `app/dashboard/settings/plans-billing/components/PricingCards.tsx` - Update pricing display logic
7. ✅ `app/dashboard/settings/plans-billing/components/PackageComparison.tsx` - Simplify price comparison
8. ✅ `app/(public)/pricing/components/PricingPageContent.tsx` - Public pricing page updates
9. ✅ `app/dashboard/settings/plans-billing/plans/PlansTab.tsx` - Plans tab pricing display
10. ✅ `app/dashboard/settings/plans-billing/checkout/page.tsx` - Checkout page updates
11. ✅ `components/trial/TrialOptions.tsx` - Trial pricing display
12. ✅ `app/backend/admin/users/[id]/components/PackageSubscriptionCard.tsx` - User package display

##### Files to Delete (Post-Migration - 2 files):
13. ❌ `lib/utils/currency-converter.ts` - USD→IDR converter (DELETE ENTIRE FILE)
14. ❌ `lib/services/payments/billing/CurrencyConverter.ts` - Full converter with caching (DELETE ENTIRE FILE)

##### Files to Simplify (1 file):
15. ✅ `lib/utils/currency-utils.ts` - Remove conversion logic, keep formatting only

**Total Lines Removed**: ~400 lines of currency conversion code

---

### Success Criteria

Migration is successful when:

✅ All packages have USD-only `pricing_tiers` structure  
✅ `pricing_tiers[period]` directly contains pricing fields (no currency nesting)  
✅ All Paddle price IDs are populated  
✅ Frontend displays prices correctly without errors  
✅ No TypeScript compilation errors  
✅ Admin panel can create/edit packages with new structure  
✅ API responses conform to new schema  
✅ Currency conversion utilities removed  
✅ No IDR references remain in pricing code  

---

### Timeline Estimate

**Pre-Migration (1-2 hours):**
- ✅ Backup database (Supabase automatic backups)
- ✅ Document current pricing structure (this guide)
- ✅ Test SQL migration on staging environment

**Migration Execution (2-3 hours):**
- ✅ Run database migration SQL (Step 1.1)
- ✅ Add Paddle price IDs to packages (Step 1.2)
- ✅ Update code files (15 files total)
- ✅ Update TypeScript types (3 interfaces)

**Testing & Verification (2-3 hours):**
- ✅ Run TypeScript compiler: `npm run build`
- ✅ Manual testing of pricing pages
- ✅ Verify API responses
- ✅ Test admin package management
- ✅ Verify no runtime errors in browser console

**Total Estimated Time: 5-8 hours**

---

### Rollback Plan (If Needed)

If migration encounters critical issues:

**Step 1: Restore Database Schema**
```sql
-- Restore from Supabase automatic backup
-- Or manually restore multi-currency structure:

UPDATE indb_payment_packages
SET pricing_tiers = (
  SELECT jsonb_object_agg(
    period_key,
    jsonb_build_object(
      'USD', period_value,
      'IDR', jsonb_build_object(
        'promo_price', (period_value->>'promo_price')::numeric * 15800,
        'regular_price', (period_value->>'regular_price')::numeric * 15800,
        'period_label', period_value->>'period_label'
      )
    )
  )
  FROM jsonb_each(pricing_tiers) AS t(period_key, period_value)
)
WHERE jsonb_typeof(pricing_tiers) = 'object';
```

**Step 2: Revert Code Changes**
```bash
# Restore from git
git revert <migration_commit_hash>
git push origin main
```

**Step 3: Re-enable Currency Detection**
- Restore `getUserCurrency()` calls
- Re-enable `userCurrency` state in components
- Restore nested `pricing_tiers[period][currency]` access

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

**Last Updated:** October 30, 2025  
**Version:** 1.1  
**Status:** Planning & Design Complete - Pricing Migration Documentation Added

# Paddle Integration - Complete Implementation Plan

**Project:** IndexNow Studio  
**Date Created:** November 1, 2025  
**Status:** Phase 1 Complete - Ready for Implementation  
**Document Version:** 1.0

---

## Table of Contents
1. [Overview](#overview)
2. [Phase 1: Database Migration](#phase-1-database-migration-) (✅ COMPLETE)
3. [Phase 2: Update Paddle Price IDs](#phase-2-update-paddle-price-ids-) (🔄 PENDING)
4. [Phase 3: Environment Variables Setup](#phase-3-environment-variables-setup-) (🔄 PENDING)
5. [Phase 4: Install Paddle SDK](#phase-4-install-paddle-sdk-) (🔄 PENDING)
6. [Phase 5: Backend Service Layer](#phase-5-backend-service-layer-) (🔄 PENDING)
7. [Phase 6: Webhook Implementation](#phase-6-webhook-implementation-) (🔄 PENDING)
8. [Phase 7: Frontend Integration](#phase-7-frontend-integration-) (🔄 PENDING)
9. [Phase 8: Checkout Flow](#phase-8-checkout-flow-) (🔄 PENDING)
10. [Phase 9: Subscription Management](#phase-9-subscription-management-) (🔄 PENDING)
11. [Phase 10: Testing & Validation](#phase-10-testing--validation-) (🔄 PENDING)
12. [Phase 11: Production Deployment](#phase-11-production-deployment-) (🔄 PENDING)

---

## Overview

This document outlines the complete step-by-step implementation plan for integrating Paddle Payment Gateway into IndexNow Studio. The migration follows a **hybrid approach** where API secrets are stored in environment variables for security, while configuration settings are managed in the database for flexibility.

### Migration Strategy
- **✅ Complete:** Database restructuring (multi-currency → USD-only)
- **✅ Complete:** Old payment gateway cleanup (Midtrans, Bank Transfer removed)
- **🔄 Pending:** Paddle SDK integration and checkout implementation
- **🔄 Pending:** Webhook handlers for subscription lifecycle
- **🔄 Pending:** Frontend UI for Paddle checkout

### Key Principles
1. **Security First**: API keys NEVER stored in database
2. **Data Integrity**: Preserve historical transaction data
3. **Incremental Deployment**: Test thoroughly in sandbox before production
4. **Backward Compatibility**: Maintain existing order history display

---

## Phase 1: Database Migration ✅ (COMPLETE)

**Status:** ✅ COMPLETE  
**Date Completed:** November 1, 2025

### Objectives
- [x] Simplify pricing structure from multi-currency to USD-only
- [x] Add Paddle Price ID fields to all packages
- [x] Create Paddle infrastructure tables (subscriptions, transactions, webhooks)
- [x] Deactivate old payment gateways (Midtrans, Bank Transfer)
- [x] Add Paddle payment gateway to database
- [x] Update user profiles with subscription fields

---

### Step 1.1: Simplify Pricing Structure (Multi-Currency → USD-Only)

**Objective:** Transform `pricing_tiers` from nested multi-currency structure to flat USD-only structure

**SQL Query:**
```sql
-- Transform pricing_tiers from multi-currency to USD-only
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
```

**Before:**
```json
{
  "monthly": {
    "IDR": { "promo_price": 25000, "period_label": "Monthly", "regular_price": 50000 },
    "USD": { "promo_price": 9.99, "period_label": "Monthly", "regular_price": 25 }
  }
}
```

**After:**
```json
{
  "monthly": {
    "promo_price": 9.99,
    "period_label": "Monthly",
    "regular_price": 25
  }
}
```

**✅ Result:** All packages now have flat USD-only pricing structure

---

### Step 1.2: Add Paddle Price ID Fields

**Objective:** Add `paddle_price_id` field to each billing period for Paddle integration

**SQL Queries:**
```sql
-- Add paddle_price_id to Basic package
UPDATE indb_payment_packages
SET pricing_tiers = jsonb_set(
  jsonb_set(
    pricing_tiers,
    '{monthly, paddle_price_id}',
    '"REPLACE_WITH_PADDLE_MONTHLY_PRICE_ID"'
  ),
  '{annual, paddle_price_id}',
  '"REPLACE_WITH_PADDLE_ANNUAL_PRICE_ID"'
)
WHERE slug = 'basic';

-- Add paddle_price_id to Premium package
UPDATE indb_payment_packages
SET pricing_tiers = jsonb_set(
  jsonb_set(
    pricing_tiers,
    '{monthly, paddle_price_id}',
    '"REPLACE_WITH_PADDLE_MONTHLY_PRICE_ID"'
  ),
  '{annual, paddle_price_id}',
  '"REPLACE_WITH_PADDLE_ANNUAL_PRICE_ID"'
)
WHERE slug = 'premium';

-- Add paddle_price_id to Pro package
UPDATE indb_payment_packages
SET pricing_tiers = jsonb_set(
  jsonb_set(
    pricing_tiers,
    '{monthly, paddle_price_id}',
    '"REPLACE_WITH_PADDLE_MONTHLY_PRICE_ID"'
  ),
  '{annual, paddle_price_id}',
  '"REPLACE_WITH_PADDLE_ANNUAL_PRICE_ID"'
)
WHERE slug = 'pro';
```

**✅ Result:** All packages now have `paddle_price_id` fields (placeholders to be replaced in Phase 2)

---

### Step 1.3: Create Paddle Subscription Tables

**Objective:** Create new tables for Paddle subscription and transaction management

#### 1.3.1 Subscriptions Table

```sql
CREATE TABLE IF NOT EXISTS indb_subscriptions (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON indb_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_subscription_id ON indb_subscriptions(paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON indb_subscriptions(status);
```

**✅ Result:** Subscriptions table created with proper indexes

#### 1.3.2 Paddle Transactions Table

```sql
CREATE TABLE IF NOT EXISTS indb_paddle_transactions (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_paddle_transactions_user_id ON indb_paddle_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_paddle_transactions_subscription_id ON indb_paddle_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_paddle_transactions_status ON indb_paddle_transactions(status);
```

**✅ Result:** Paddle transactions table created with proper indexes

#### 1.3.3 Webhook Events Table

```sql
CREATE TABLE IF NOT EXISTS indb_paddle_webhook_events (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_paddle_webhooks_event_type ON indb_paddle_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_paddle_webhooks_processed ON indb_paddle_webhook_events(processed);
```

**✅ Result:** Webhook events table created with proper indexes

---

### Step 1.4: Update User Profiles Table

**Objective:** Add subscription-related fields to user profiles

**SQL Query:**
```sql
-- Add subscription fields to profiles
ALTER TABLE indb_auth_user_profiles 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50), -- 'free', 'pro', 'enterprise'
ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES indb_subscriptions(id);
```

**✅ Result:** Profile table updated with subscription fields

---

### Step 1.5: Deactivate Old Payment Gateways

**Objective:** Disable Midtrans and Bank Transfer gateways (preserve for history)

**SQL Query:**
```sql
-- Deactivate all Midtrans and Bank Transfer gateways
UPDATE indb_payment_gateways
SET 
  is_active = false,
  is_default = false,
  updated_at = NOW()
WHERE slug IN ('midtrans_snap', 'midtrans_recurring', 'bank_transfer', 'midtrans');
```

**✅ Result:** Old gateways deactivated (not deleted to preserve transaction history)

**Rationale for Not Deleting:**
- Preserves foreign key relationships with `indb_payment_transactions.gateway_id`
- Maintains audit trail for compliance
- Allows viewing historical transaction details
- Enables rollback if needed

---

### Step 1.6: Add Paddle Payment Gateway

**Objective:** Insert Paddle as new payment gateway

**SQL Query:**
```sql
-- Insert Paddle gateway
INSERT INTO indb_payment_gateways (
  name,
  slug,
  description,
  is_active,
  is_default,
  configuration,
  api_credentials
) VALUES (
  'Paddle',
  'paddle',
  'Global payment gateway for subscriptions',
  false,  -- Set to true when ready to activate
  false,  -- Set to true when ready to use as default
  '{"environment": "sandbox", "default_currency": "USD", "enabled_features": {"subscriptions": true, "one_time_payments": false, "customer_portal": true}}',
  '{"note": "Secrets in environment variables", "api_key_env": "PADDLE_API_KEY", "webhook_secret_env": "PADDLE_WEBHOOK_SECRET", "client_token_env": "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"}'
);
```

**✅ Result:** Paddle gateway added (inactive until API keys configured)

**Configuration Details:**
- **Environment:** `sandbox` (change to `production` when going live)
- **Default Currency:** `USD`
- **Enabled Features:** Subscriptions only (one-time payments disabled)
- **API Credentials:** Stored in environment variables for security

---

### Phase 1 Verification Queries

#### Check Pricing Structure
```sql
SELECT 
  name,
  slug,
  jsonb_pretty(pricing_tiers) as pricing_structure
FROM indb_payment_packages
WHERE slug IN ('basic', 'premium', 'pro')
ORDER BY sort_order;
```

#### Check Payment Gateways
```sql
SELECT 
  id,
  name,
  slug,
  is_active,
  is_default,
  jsonb_pretty(configuration) as config
FROM indb_payment_gateways
ORDER BY created_at;
```

#### Check New Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%paddle%' OR table_name = 'indb_subscriptions')
ORDER BY table_name;
```

#### Check Profile Subscription Fields
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'indb_auth_user_profiles'
  AND column_name IN ('subscription_tier', 'subscription_active', 'subscription_id');
```

---

## Phase 2: Update Paddle Price IDs 🔄 (PENDING)

**Status:** 🔄 PENDING (User Action Required)  
**Dependencies:** Paddle account setup  
**Estimated Time:** 30 minutes

### Objectives
- [ ] Create products in Paddle Dashboard
- [ ] Create price plans for each product (monthly, annual)
- [ ] Get Paddle Price IDs from dashboard
- [ ] Update database with real Paddle Price IDs

---

### Step 2.1: Create Products in Paddle Dashboard

**Action:** Log in to Paddle Dashboard → Catalog → Products

**Products to Create:**

1. **Basic Plan**
   - Name: `IndexNow Studio - Basic`
   - Description: `Basic plan with essential SEO tracking features`
   - Tax Category: `SaaS - Standard`

2. **Premium Plan**
   - Name: `IndexNow Studio - Premium`
   - Description: `Premium plan with advanced SEO analytics`
   - Tax Category: `SaaS - Standard`

3. **Pro Plan**
   - Name: `IndexNow Studio - Pro`
   - Description: `Pro plan with enterprise-grade features`
   - Tax Category: `SaaS - Standard`

---

### Step 2.2: Create Price Plans

**Action:** For each product, create 2 prices (monthly, annual)

**Pricing Matrix:**

| Package | Monthly Price | Annual Price | Annual Savings |
|---------|--------------|--------------|----------------|
| Basic | $9.99/mo | $80/year ($6.67/mo) | 33% |
| Premium | $15/mo | $159/year ($13.25/mo) | 12% |
| Pro | $45/mo | $499/year ($41.58/mo) | 7% |

**Price Creation Steps (for each):**
1. Click "Add Price" on product
2. Billing Type: `Recurring`
3. Billing Interval: `Month` or `Year`
4. Amount: Enter price from matrix
5. Currency: `USD`
6. Trial Period: `3 days` (optional, for trial-eligible plans)
7. Save and copy the Price ID

---

### Step 2.3: Update Database with Real Paddle Price IDs

**Get Price IDs from Paddle Dashboard:**
- Navigate to Paddle Dashboard → Catalog → Prices
- Copy Price IDs (format: `pri_01hxxxxx...`)

**SQL Queries to Update:**

```sql
-- Update Basic package with real Paddle Price IDs
UPDATE indb_payment_packages
SET pricing_tiers = jsonb_set(
  jsonb_set(
    pricing_tiers,
    '{monthly, paddle_price_id}',
    '"pri_01hXXXXX_basic_monthly"'  -- Replace with actual ID from Paddle
  ),
  '{annual, paddle_price_id}',
  '"pri_01hYYYYY_basic_annual"'     -- Replace with actual ID from Paddle
)
WHERE slug = 'basic';

-- Update Premium package with real Paddle Price IDs
UPDATE indb_payment_packages
SET pricing_tiers = jsonb_set(
  jsonb_set(
    pricing_tiers,
    '{monthly, paddle_price_id}',
    '"pri_01hZZZZZ_premium_monthly"'  -- Replace with actual ID from Paddle
  ),
  '{annual, paddle_price_id}',
  '"pri_01hAAAAA_premium_annual"'     -- Replace with actual ID from Paddle
)
WHERE slug = 'premium';

-- Update Pro package with real Paddle Price IDs
UPDATE indb_payment_packages
SET pricing_tiers = jsonb_set(
  jsonb_set(
    pricing_tiers,
    '{monthly, paddle_price_id}',
    '"pri_01hBBBBB_pro_monthly"'  -- Replace with actual ID from Paddle
  ),
  '{annual, paddle_price_id}',
  '"pri_01hCCCCC_pro_annual"'     -- Replace with actual ID from Paddle
)
WHERE slug = 'pro';
```

**Verification Query:**
```sql
SELECT 
  name,
  slug,
  pricing_tiers->'monthly'->'paddle_price_id' as monthly_price_id,
  pricing_tiers->'annual'->'paddle_price_id' as annual_price_id
FROM indb_payment_packages
WHERE slug IN ('basic', 'premium', 'pro');
```

**Expected Output:**
| name | slug | monthly_price_id | annual_price_id |
|------|------|-----------------|-----------------|
| Basic | basic | `"pri_01h..."` | `"pri_01h..."` |
| Premium | premium | `"pri_01h..."` | `"pri_01h..."` |
| Pro | pro | `"pri_01h..."` | `"pri_01h..."` |

**✅ Success Criteria:**
- All 3 packages have real Paddle Price IDs (not placeholders)
- IDs start with `pri_01h` or `pri_01j` (Paddle format)
- Monthly and annual IDs are different for each package

---

## Phase 3: Environment Variables Setup 🔄 (PENDING)

**Status:** 🔄 PENDING (User Action Required)  
**Dependencies:** Paddle account setup  
**Estimated Time:** 15 minutes

### Objectives
- [ ] Get API keys from Paddle Dashboard
- [ ] Add environment variables to `.env` file
- [ ] Verify environment variables are loaded correctly

---

### Step 3.1: Get Paddle API Keys

**Action:** Navigate to Paddle Dashboard → Developer Tools → Authentication

**Keys to Obtain:**

1. **Paddle API Key** (Server-side)
   - Format: `pk_test_xxxxx` (sandbox) or `pk_live_xxxxx` (production)
   - Used for: Backend API calls (create checkout, manage subscriptions)
   - Visibility: **SECRET** - Never commit to git

2. **Paddle Webhook Secret** (Server-side)
   - Format: `pdl_ntfset_xxxxx`
   - Used for: Verifying webhook signature
   - Visibility: **SECRET** - Never commit to git

3. **Paddle Client Token** (Client-side)
   - Format: `test_xxxxx` (sandbox) or `live_xxxxx` (production)
   - Used for: Frontend Paddle.js initialization
   - Visibility: **PUBLIC** - Safe to expose in browser

---

### Step 3.2: Add Environment Variables

**File:** `.env` (root of project)

**Add the following variables:**

```bash
# ==================================
# PADDLE PAYMENT GATEWAY
# ==================================

# Paddle API Key (Server-side ONLY - Never expose in browser)
# Get from: Paddle Dashboard → Developer Tools → Authentication
PADDLE_API_KEY=pk_test_xxxxx  # Use pk_live_xxxxx for production

# Paddle Webhook Secret (Server-side ONLY)
# Get from: Paddle Dashboard → Developer Tools → Notifications → Webhook endpoint
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxxxx

# Paddle Client Token (Client-side - Safe to expose)
# Get from: Paddle Dashboard → Developer Tools → Authentication
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_xxxxx  # Use live_xxxxx for production

# Paddle Environment (sandbox | production)
NEXT_PUBLIC_PADDLE_ENV=sandbox  # Change to 'production' when going live
```

**Important Notes:**
- ✅ **DO** prefix client-side variables with `NEXT_PUBLIC_`
- ❌ **DON'T** commit `.env` file to git (it's in `.gitignore`)
- ✅ **DO** add `.env.example` with placeholder values for team reference
- ⚠️ **SECURITY:** `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET` must NEVER be exposed to browser

---

### Step 3.3: Create `.env.example` for Team

**File:** `.env.example` (safe to commit to git)

```bash
# ==================================
# PADDLE PAYMENT GATEWAY
# ==================================

# Paddle API Key (Server-side ONLY)
PADDLE_API_KEY=pk_test_your_api_key_here

# Paddle Webhook Secret (Server-side ONLY)
PADDLE_WEBHOOK_SECRET=pdl_ntfset_your_webhook_secret_here

# Paddle Client Token (Client-side)
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_your_client_token_here

# Paddle Environment (sandbox | production)
NEXT_PUBLIC_PADDLE_ENV=sandbox
```

---

### Step 3.4: Verify Environment Variables

**Test Script:** Create temporary file `scripts/test-paddle-env.ts`

```typescript
// scripts/test-paddle-env.ts
// Run with: npx tsx scripts/test-paddle-env.ts

import dotenv from 'dotenv'

dotenv.config()

const requiredVars = [
  'PADDLE_API_KEY',
  'PADDLE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN',
  'NEXT_PUBLIC_PADDLE_ENV'
]

let allPresent = true

requiredVars.forEach(varName => {
  const value = process.env[varName]
  if (!value) {
    console.error(`❌ Missing: ${varName}`)
    allPresent = false
  } else {
    // Mask secret values
    const maskedValue = varName.includes('SECRET') || varName.includes('KEY')
      ? `${value.substring(0, 8)}...`
      : value
    console.log(`✅ ${varName}: ${maskedValue}`)
  }
})

if (allPresent) {
  console.log('\n✅ All Paddle environment variables are configured!')
} else {
  console.log('\n❌ Some Paddle environment variables are missing. Check .env file.')
  process.exit(1)
}
```

**Run:**
```bash
npx tsx scripts/test-paddle-env.ts
```

**Expected Output:**
```
✅ PADDLE_API_KEY: pk_test_...
✅ PADDLE_WEBHOOK_SECRET: pdl_ntfs...
✅ NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: test_abcd1234
✅ NEXT_PUBLIC_PADDLE_ENV: sandbox

✅ All Paddle environment variables are configured!
```

**After verification, delete the test script:**
```bash
rm scripts/test-paddle-env.ts
```

**✅ Success Criteria:**
- All 4 Paddle environment variables are present
- API keys have correct format (pk_test_, pdl_ntfset_, test_)
- Environment is set to `sandbox` for testing

---

## Phase 4: Install Paddle SDK 🔄 (PENDING)

**Status:** 🔄 PENDING  
**Dependencies:** Phase 3 complete  
**Estimated Time:** 5 minutes

### Objectives
- [ ] Install Paddle Node.js SDK (backend)
- [ ] Install Paddle.js SDK (frontend)
- [ ] Verify installations

---

### Step 4.1: Install Paddle SDKs

**Command:**
```bash
npm install @paddle/paddle-node-sdk @paddle/paddle-js
```

**Packages:**
- `@paddle/paddle-node-sdk` - Backend SDK for API calls
- `@paddle/paddle-js` - Frontend SDK for checkout overlay

---

### Step 4.2: Verify Installation

**Check `package.json`:**
```json
{
  "dependencies": {
    "@paddle/paddle-node-sdk": "^1.x.x",
    "@paddle/paddle-js": "^1.x.x"
  }
}
```

**✅ Success Criteria:**
- Both packages installed successfully
- No dependency conflicts
- `package-lock.json` updated

---

## Phase 5: Backend Service Layer 🔄 (PENDING)

**Status:** 🔄 PENDING  
**Dependencies:** Phase 4 complete  
**Estimated Time:** 2-3 hours

### Objectives
- [ ] Create Paddle service layer structure
- [ ] Implement PaddleService (core SDK wrapper)
- [ ] Implement PaddleCheckoutService
- [ ] Implement PaddleSubscriptionService
- [ ] Implement PaddleCustomerService

---

### Step 5.1: Create Service Layer Structure

**Directory Structure:**
```
lib/services/payments/paddle/
├── PaddleService.ts              # Core Paddle SDK wrapper
├── PaddleCheckoutService.ts      # Checkout creation logic
├── PaddleSubscriptionService.ts  # Subscription management
├── PaddleCustomerService.ts      # Customer operations
└── index.ts                      # Exports
```

---

### Step 5.2: Implement PaddleService (Core)

**File:** `lib/services/payments/paddle/PaddleService.ts`

```typescript
import { Paddle } from '@paddle/paddle-node-sdk'
import { supabaseAdmin } from '@/lib/database'

export class PaddleService {
  private static instance: Paddle | null = null

  static async getInstance(): Promise<Paddle> {
    // Get gateway configuration from database
    const { data: gateway } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'paddle')
      .eq('is_active', true)
      .single()

    if (!gateway) {
      throw new Error('Paddle gateway is not configured or inactive')
    }

    // Get secrets from environment
    const apiKey = process.env.PADDLE_API_KEY
    if (!apiKey) {
      throw new Error('PADDLE_API_KEY not configured in environment')
    }

    // Initialize SDK with env secret + database config
    if (!this.instance) {
      this.instance = new Paddle(apiKey, {
        environment: gateway.configuration.environment as 'production' | 'sandbox',
      })
    }

    return this.instance
  }

  static async getGatewayConfig() {
    const { data } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'paddle')
      .single()
    
    return data?.configuration || null
  }

  static resetInstance(): void {
    this.instance = null
  }
}
```

---

### Step 5.3: Implement PaddleCheckoutService

**File:** `lib/services/payments/paddle/PaddleCheckoutService.ts`

```typescript
import { PaddleService } from './PaddleService'
import { supabaseAdmin } from '@/lib/database'

export interface CreateCheckoutParams {
  priceId: string
  userId: string
  userEmail: string
  packageSlug: string
  billingPeriod: string
  customData?: Record<string, any>
}

export class PaddleCheckoutService {
  static async createCheckoutSession(params: CreateCheckoutParams) {
    const paddle = await PaddleService.getInstance()
    const { priceId, userId, userEmail, packageSlug, billingPeriod, customData } = params

    // Create checkout session via Paddle API
    const checkout = await paddle.checkouts.create({
      items: [
        {
          priceId: priceId,
          quantity: 1,
        },
      ],
      customer: {
        email: userEmail,
      },
      customData: {
        userId,
        packageSlug,
        billingPeriod,
        ...customData,
      },
      settings: {
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
        locale: 'en',
      },
    })

    return checkout
  }
}
```

---

### Step 5.4: Implement PaddleSubscriptionService

**File:** `lib/services/payments/paddle/PaddleSubscriptionService.ts`

```typescript
import { PaddleService } from './PaddleService'
import { supabaseAdmin } from '@/lib/database'

export class PaddleSubscriptionService {
  static async getSubscription(subscriptionId: string) {
    const paddle = await PaddleService.getInstance()
    return await paddle.subscriptions.get(subscriptionId)
  }

  static async cancelSubscription(subscriptionId: string, effectiveFrom: 'immediately' | 'next_billing_period' = 'next_billing_period') {
    const paddle = await PaddleService.getInstance()
    return await paddle.subscriptions.cancel(subscriptionId, {
      effectiveFrom,
    })
  }

  static async pauseSubscription(subscriptionId: string) {
    const paddle = await PaddleService.getInstance()
    return await paddle.subscriptions.pause(subscriptionId)
  }

  static async resumeSubscription(subscriptionId: string) {
    const paddle = await PaddleService.getInstance()
    return await paddle.subscriptions.resume(subscriptionId)
  }

  static async updateSubscription(subscriptionId: string, newPriceId: string) {
    const paddle = await PaddleService.getInstance()
    return await paddle.subscriptions.update(subscriptionId, {
      items: [{ priceId: newPriceId, quantity: 1 }],
    })
  }
}
```

---

### Step 5.5: Implement PaddleCustomerService

**File:** `lib/services/payments/paddle/PaddleCustomerService.ts`

```typescript
import { PaddleService } from './PaddleService'

export class PaddleCustomerService {
  static async getCustomer(customerId: string) {
    const paddle = await PaddleService.getInstance()
    return await paddle.customers.get(customerId)
  }

  static async getCustomerPortalSession(customerId: string) {
    const paddle = await PaddleService.getInstance()
    
    // Generate customer portal session
    const session = await paddle.customers.createCustomerPortalSession(customerId)
    
    return session.urls.customer_portal
  }
}
```

---

### Step 5.6: Create Service Exports

**File:** `lib/services/payments/paddle/index.ts`

```typescript
export { PaddleService } from './PaddleService'
export { PaddleCheckoutService } from './PaddleCheckoutService'
export { PaddleSubscriptionService } from './PaddleSubscriptionService'
export { PaddleCustomerService } from './PaddleCustomerService'
```

---

### Step 5.7: Update PaymentServiceFactory

**File:** `lib/services/payments/PaymentServiceFactory.ts`

```typescript
import { PaymentProcessor } from './core/PaymentProcessor'
import { PaddleService } from './paddle'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '../security/SecureServiceRoleWrapper'

export class PaymentServiceFactory {
  private static processor: PaymentProcessor | null = null

  static async getPaymentProcessor(): Promise<PaymentProcessor> {
    if (!this.processor) {
      this.processor = new PaymentProcessor()
      await this.initializeGateways(this.processor)
    }
    return this.processor
  }

  private static async initializeGateways(processor: PaymentProcessor): Promise<void> {
    try {
      // Get active payment gateway configurations
      const gateways = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'load_active_payment_gateway_configs',
          reason: 'Loading active payment gateway configurations for payment processor initialization',
          source: 'services/payments/PaymentServiceFactory',
          metadata: {
            operation_type: 'gateway_config_lookup'
          }
        },
        {
          table: 'indb_payment_gateway_configs',
          operationType: 'select',
          columns: ['*'],
          whereConditions: { is_active: true }
        },
        async () => {
          const { data: gateways, error } = await supabaseAdmin
            .from('indb_payment_gateways')
            .select('*')
            .eq('is_active', true)

          if (error) {
            throw new Error(`Failed to load payment gateway configurations: ${error.message}`)
          }

          return gateways || []
        }
      )

      // Register each gateway
      for (const gateway of gateways || []) {
        await this.registerGateway(processor, gateway)
      }

    } catch (error) {
      console.error('Error initializing payment gateways:', error)
    }
  }

  private static async registerGateway(processor: PaymentProcessor, config: any): Promise<void> {
    try {
      switch (config.slug.toLowerCase()) {
        case 'paddle':
          // Initialize Paddle SDK
          await PaddleService.getInstance()
          console.log('✅ Paddle gateway initialized successfully')
          break
          
        default:
          console.warn(`Unknown payment gateway: ${config.slug}`)
      }
    } catch (error) {
      console.error(`Error registering ${config.slug} gateway:`, error)
    }
  }

  static resetProcessor(): void {
    this.processor = null
    PaddleService.resetInstance()
  }
}
```

**✅ Success Criteria:**
- All Paddle service files created
- Services properly export functions
- PaymentServiceFactory updated to initialize Paddle
- No TypeScript errors

---

## Phase 6: Webhook Implementation 🔄 (PENDING)

**Status:** 🔄 PENDING  
**Dependencies:** Phase 5 complete  
**Estimated Time:** 3-4 hours

### Objectives
- [ ] Create webhook handler route
- [ ] Implement webhook signature verification
- [ ] Implement event routing logic
- [ ] Create event processors for key webhook events
- [ ] Add webhook logging to database

---

### Step 6.1: Create Webhook Route

**File:** `app/api/v1/payments/paddle/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/database'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = async (request: NextRequest) => {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('paddle-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Paddle signature' },
        { status: 401 }
      )
    }

    // Verify webhook signature
    const isValid = verifyPaddleSignature(rawBody, signature)
    
    if (!isValid) {
      await ErrorHandlingService.createError(
        ErrorType.SECURITY,
        'Invalid Paddle webhook signature',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 401,
          metadata: { signature }
        }
      )
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse event data
    const eventData = JSON.parse(rawBody)
    const { event_id, event_type, data } = eventData

    // Log webhook event to database
    await supabaseAdmin
      .from('indb_paddle_webhook_events')
      .insert({
        event_id,
        event_type,
        event_data: eventData,
        processed: false,
      })

    // Route to appropriate event handler
    await routeWebhookEvent(event_type, data, event_id)

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    await ErrorHandlingService.createError(
      ErrorType.EXTERNAL_API,
      error,
      {
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        metadata: { source: 'paddle_webhook' }
      }
    )
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

function verifyPaddleSignature(rawBody: string, signature: string): boolean {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET
  
  if (!webhookSecret) {
    throw new Error('PADDLE_WEBHOOK_SECRET not configured')
  }

  // Paddle signature format: ts=timestamp;h1=signature
  const parts = signature.split(';')
  const timestamp = parts[0].split('=')[1]
  const receivedSignature = parts[1].split('=')[1]

  // Create expected signature
  const payload = `${timestamp}.${rawBody}`
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(expectedSignature)
  )
}

async function routeWebhookEvent(eventType: string, data: any, eventId: string) {
  // Import event processors
  const { processSubscriptionCreated } = await import('./processors/subscription-created')
  const { processSubscriptionUpdated } = await import('./processors/subscription-updated')
  const { processSubscriptionCanceled } = await import('./processors/subscription-canceled')
  const { processTransactionCompleted } = await import('./processors/transaction-completed')

  try {
    switch (eventType) {
      case 'subscription.created':
        await processSubscriptionCreated(data)
        break
      case 'subscription.updated':
        await processSubscriptionUpdated(data)
        break
      case 'subscription.canceled':
        await processSubscriptionCanceled(data)
        break
      case 'subscription.paused':
        await processSubscriptionUpdated(data) // Reuse update handler
        break
      case 'subscription.resumed':
        await processSubscriptionUpdated(data) // Reuse update handler
        break
      case 'transaction.completed':
        await processTransactionCompleted(data)
        break
      default:
        console.log(`Unhandled webhook event: ${eventType}`)
    }

    // Mark event as processed
    await supabaseAdmin
      .from('indb_paddle_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('event_id', eventId)
  } catch (error) {
    // Log error and increment retry count
    await supabaseAdmin
      .from('indb_paddle_webhook_events')
      .update({ 
        error_message: error instanceof Error ? error.message : 'Unknown error',
        retry_count: supabaseAdmin.rpc('increment', { row_id: eventId, column_name: 'retry_count' })
      })
      .eq('event_id', eventId)
    
    throw error
  }
}
```

---

### Step 6.2: Implement Event Processors

**Directory:** `app/api/v1/payments/paddle/webhook/processors/`

#### subscription-created.ts

```typescript
import { supabaseAdmin } from '@/lib/database'

export async function processSubscriptionCreated(data: any) {
  const { subscription_id, customer_id, items, custom_data, current_billing_period } = data

  // Extract user info from custom_data
  const userId = custom_data?.userId
  const packageSlug = custom_data?.packageSlug

  if (!userId) {
    throw new Error('User ID not found in subscription custom data')
  }

  // Get package details
  const { data: packageData } = await supabaseAdmin
    .from('indb_payment_packages')
    .select('*')
    .eq('slug', packageSlug)
    .single()

  // Insert subscription record
  const { data: subscription } = await supabaseAdmin
    .from('indb_subscriptions')
    .insert({
      user_id: userId,
      paddle_subscription_id: subscription_id,
      paddle_customer_id: customer_id,
      status: 'active',
      plan_id: `${packageSlug}_${items[0].billing_cycle.frequency}`,
      paddle_price_id: items[0].price_id,
      current_period_start: current_billing_period.starts_at,
      current_period_end: current_billing_period.ends_at,
      metadata: { custom_data },
    })
    .select()
    .single()

  // Update user profile
  await supabaseAdmin
    .from('indb_auth_user_profiles')
    .update({
      package_id: packageData.id,
      subscribed_at: new Date().toISOString(),
      expires_at: current_billing_period.ends_at,
      subscription_tier: packageSlug,
      subscription_active: true,
      subscription_id: subscription.id,
    })
    .eq('user_id', userId)

  // Queue welcome email (if BullMQ enabled)
  // await emailQueue.add('subscription-welcome', { userId, packageSlug })
}
```

#### subscription-updated.ts

```typescript
import { supabaseAdmin } from '@/lib/database'

export async function processSubscriptionUpdated(data: any) {
  const { subscription_id, status, items, current_billing_period, paused_at } = data

  // Update subscription record
  await supabaseAdmin
    .from('indb_subscriptions')
    .update({
      status: status,
      paddle_price_id: items[0].price_id,
      current_period_start: current_billing_period?.starts_at,
      current_period_end: current_billing_period?.ends_at,
      paused_at: paused_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)

  // Get user_id from subscription
  const { data: subscription } = await supabaseAdmin
    .from('indb_subscriptions')
    .select('user_id, id')
    .eq('paddle_subscription_id', subscription_id)
    .single()

  if (subscription) {
    // Update user profile
    await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        subscription_active: status === 'active',
        expires_at: current_billing_period?.ends_at,
      })
      .eq('user_id', subscription.user_id)
  }
}
```

#### subscription-canceled.ts

```typescript
import { supabaseAdmin } from '@/lib/database'

export async function processSubscriptionCanceled(data: any) {
  const { subscription_id, canceled_at, current_billing_period } = data

  // Update subscription record
  await supabaseAdmin
    .from('indb_subscriptions')
    .update({
      status: 'canceled',
      canceled_at: canceled_at,
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)

  // Get user_id from subscription
  const { data: subscription } = await supabaseAdmin
    .from('indb_subscriptions')
    .select('user_id')
    .eq('paddle_subscription_id', subscription_id)
    .single()

  if (subscription) {
    // Update user profile - keep active until period ends
    await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        subscription_active: true, // Still active until period ends
        expires_at: current_billing_period?.ends_at,
      })
      .eq('user_id', subscription.user_id)
  }
}
```

#### transaction-completed.ts

```typescript
import { supabaseAdmin } from '@/lib/database'

export async function processTransactionCompleted(data: any) {
  const { transaction_id, status, items, customer_id, subscription_id, details } = data

  // Get subscription to find user_id
  const { data: subscription } = await supabaseAdmin
    .from('indb_subscriptions')
    .select('user_id, id')
    .eq('paddle_subscription_id', subscription_id)
    .single()

  if (!subscription) {
    console.warn(`Subscription not found for transaction: ${transaction_id}`)
    return
  }

  // Insert transaction record
  await supabaseAdmin
    .from('indb_paddle_transactions')
    .insert({
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      paddle_transaction_id: transaction_id,
      amount: details.totals.total,
      currency: details.totals.currency_code,
      status: status,
      payment_method: details.payment_method_type,
      receipt_url: details.receipt_url,
      invoice_number: details.invoice_number,
      metadata: { items, customer_id },
    })
}
```

**✅ Success Criteria:**
- Webhook route created and functional
- Signature verification working
- All key event processors implemented
- Webhook events logged to database
- User profiles updated on subscription changes

---

## Phase 7: Frontend Integration 🔄 (PENDING)

**Status:** 🔄 PENDING  
**Dependencies:** Phase 6 complete  
**Estimated Time:** 2-3 hours

### Objectives
- [ ] Create PaddleProvider context
- [ ] Initialize Paddle.js on frontend
- [ ] Integrate PaddleProvider into app layout

---

### Step 7.1: Create PaddleProvider

**File:** `lib/providers/PaddleProvider.tsx`

```typescript
'use client'

import { createContext, useEffect, useState, useContext } from 'react'
import { initializePaddle, Paddle } from '@paddle/paddle-js'

interface PaddleContextType {
  paddle: Paddle | null
  isLoading: boolean
}

const PaddleContext = createContext<PaddleContextType>({
  paddle: null,
  isLoading: true,
})

export function PaddleProvider({ children }: { children: React.ReactNode }) {
  const [paddle, setPaddle] = useState<Paddle | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initPaddle = async () => {
      try {
        const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
        const environment = process.env.NEXT_PUBLIC_PADDLE_ENV as 'production' | 'sandbox'

        if (!clientToken) {
          console.error('Paddle client token not configured')
          setIsLoading(false)
          return
        }

        const paddleInstance = await initializePaddle({
          environment: environment || 'sandbox',
          token: clientToken,
        })

        if (paddleInstance) {
          setPaddle(paddleInstance)
        }
      } catch (error) {
        console.error('Failed to initialize Paddle:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initPaddle()
  }, [])

  return (
    <PaddleContext.Provider value={{ paddle, isLoading }}>
      {children}
    </PaddleContext.Provider>
  )
}

export const usePaddle = () => useContext(PaddleContext)
```

---

### Step 7.2: Integrate PaddleProvider into App

**File:** `app/layout.tsx` (or appropriate root layout)

```typescript
import { PaddleProvider } from '@/lib/providers/PaddleProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PaddleProvider>
          {children}
        </PaddleProvider>
      </body>
    </html>
  )
}
```

**✅ Success Criteria:**
- PaddleProvider created and working
- Paddle.js initializes without errors
- `usePaddle()` hook available throughout app

---

## Phase 8: Checkout Flow 🔄 (PENDING)

**Status:** 🔄 PENDING  
**Dependencies:** Phase 7 complete  
**Estimated Time:** 3-4 hours

### Objectives
- [ ] Update checkout page to use Paddle
- [ ] Implement Paddle checkout overlay
- [ ] Handle checkout success/failure
- [ ] Update trial flow for Paddle

---

### Step 8.1: Update Checkout Page

**File:** `app/dashboard/settings/plans-billing/checkout/page.tsx`

Add Paddle checkout logic:

```typescript
'use client'

import { usePaddle } from '@/lib/providers/PaddleProvider'
import { useUser } from '@/hooks/useUser'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function CheckoutPage() {
  const { paddle, isLoading: paddleLoading } = usePaddle()
  const { data: user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [processing, setProcessing] = useState(false)

  const packageId = searchParams.get('package')
  const period = searchParams.get('period') || 'monthly'
  const isTrial = searchParams.get('trial') === 'true'

  const handleCheckout = async () => {
    if (!paddle || !user) return

    setProcessing(true)

    try {
      // Get package and paddle_price_id
      const response = await fetch(`/api/v1/billing/packages`)
      const { data } = await response.json()
      
      const selectedPackage = data.packages.find((pkg: any) => pkg.id === packageId)
      const priceId = selectedPackage?.pricing_tiers[period]?.paddle_price_id

      if (!priceId) {
        throw new Error('Paddle Price ID not found for selected package')
      }

      // Open Paddle checkout
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: user.email },
        customData: {
          userId: user.id,
          packageSlug: selectedPackage.slug,
          billingPeriod: period,
          isTrial: isTrial.toString(),
        },
        settings: {
          displayMode: 'overlay',
          successUrl: `${window.location.origin}/dashboard?subscription=success`,
          theme: 'light',
          locale: 'en',
        },
      })
    } catch (error) {
      console.error('Checkout error:', error)
      // Show error toast
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Complete Your Purchase</h1>
      
      {/* Order summary UI here */}
      
      <Button
        onClick={handleCheckout}
        disabled={paddleLoading || processing || !paddle}
        data-testid="button-complete-checkout"
      >
        {processing ? 'Processing...' : 'Complete Purchase'}
      </Button>
    </div>
  )
}
```

---

### Step 8.2: Handle Success/Failure

Update dashboard to show success/failure messages:

**File:** `app/dashboard/page.tsx`

```typescript
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  useEffect(() => {
    const status = searchParams.get('subscription')
    
    if (status === 'success') {
      addToast({
        title: 'Subscription Activated!',
        description: 'Your subscription has been successfully activated.',
        type: 'success',
      })
    } else if (status === 'failed') {
      addToast({
        title: 'Payment Failed',
        description: 'There was an issue processing your payment. Please try again.',
        type: 'error',
      })
    }
  }, [searchParams, addToast])

  // Rest of dashboard
}
```

**✅ Success Criteria:**
- Checkout page opens Paddle overlay
- Payment completes successfully
- User redirected to dashboard with success message
- Subscription created in database via webhook

---

## Phase 9: Subscription Management 🔄 (PENDING)

**Status:** 🔄 PENDING  
**Dependencies:** Phase 8 complete  
**Estimated Time:** 2-3 hours

### Objectives
- [ ] Create subscription management API endpoints
- [ ] Implement customer portal integration
- [ ] Add cancel/pause/resume functionality

---

### Step 9.1: Create Subscription API Endpoints

**File:** `app/api/v1/payments/paddle/subscription/cancel/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { PaddleSubscriptionService } from '@/lib/services/payments/paddle'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import type { AuthenticatedRequest } from '@/lib/core/api-middleware'

export const POST = authenticatedApiWrapper(async (request: NextRequest, auth: AuthenticatedRequest) => {
  try {
    const body = await request.json()
    const { subscriptionId, effectiveFrom } = body

    // Cancel subscription via Paddle
    const result = await PaddleSubscriptionService.cancelSubscription(
      subscriptionId,
      effectiveFrom || 'next_billing_period'
    )

    return formatSuccess({
      subscription: result,
      message: 'Subscription cancelled successfully',
    })
  } catch (error) {
    return formatError(error)
  }
})
```

Similar files for `pause/route.ts`, `resume/route.ts`, `update/route.ts`

---

### Step 9.2: Create Customer Portal Endpoint

**File:** `app/api/v1/payments/paddle/customer-portal/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { PaddleCustomerService } from '@/lib/services/payments/paddle'
import { supabaseAdmin } from '@/lib/database'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import type { AuthenticatedRequest } from '@/lib/core/api-middleware'

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth: AuthenticatedRequest) => {
  try {
    // Get user's active subscription
    const { data: subscription } = await supabaseAdmin
      .from('indb_subscriptions')
      .select('paddle_customer_id')
      .eq('user_id', auth.userId)
      .eq('status', 'active')
      .single()

    if (!subscription) {
      throw new Error('No active subscription found')
    }

    // Get customer portal URL
    const portalUrl = await PaddleCustomerService.getCustomerPortalSession(
      subscription.paddle_customer_id
    )

    return formatSuccess({
      portal_url: portalUrl,
    })
  } catch (error) {
    return formatError(error)
  }
})
```

---

### Step 9.3: Add Subscription Management UI

**File:** `components/dashboard/SubscriptionManagement.tsx`

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function SubscriptionManagement() {
  const [loading, setLoading] = useState(false)

  const handleManageSubscription = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/v1/payments/paddle/customer-portal')
      const { data } = await response.json()
      
      if (data?.portal_url) {
        window.open(data.portal_url, '_blank')
      }
    } catch (error) {
      console.error('Portal error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleManageSubscription}
      disabled={loading}
      data-testid="button-manage-subscription"
    >
      {loading ? 'Loading...' : 'Manage Subscription'}
    </Button>
  )
}
```

**✅ Success Criteria:**
- Cancel/pause/resume endpoints working
- Customer portal opens correctly
- Users can manage subscriptions via Paddle UI

---

## Phase 10: Testing & Validation 🔄 (PENDING)

**Status:** 🔄 PENDING  
**Dependencies:** Phase 9 complete  
**Estimated Time:** 4-6 hours

### Objectives
- [ ] Test complete subscription flow (sandbox)
- [ ] Test webhook event processing
- [ ] Test subscription lifecycle (cancel, pause, resume)
- [ ] Verify database updates
- [ ] Test error scenarios

---

### Test Scenarios

#### 1. New Subscription Flow
- [ ] User selects package and period
- [ ] Checkout overlay opens
- [ ] Payment completes successfully
- [ ] Webhook `subscription.created` fires
- [ ] Database updated:
  - Record in `indb_subscriptions`
  - `indb_auth_user_profiles` updated
  - User has access to features

#### 2. Subscription Cancellation
- [ ] User clicks "Manage Subscription"
- [ ] Customer portal opens
- [ ] User cancels subscription
- [ ] Webhook `subscription.canceled` fires
- [ ] Database updated:
  - Subscription status = 'canceled'
  - Access continues until period end

#### 3. Failed Payment
- [ ] Simulate failed payment
- [ ] Webhook `transaction.payment_failed` fires
- [ ] User receives notification
- [ ] Retry mechanism works

#### 4. Webhook Signature Verification
- [ ] Valid signature → accepted
- [ ] Invalid signature → rejected (401)
- [ ] Missing signature → rejected (401)

**✅ Success Criteria:**
- All test scenarios pass
- No database inconsistencies
- Error handling works correctly
- Webhooks process reliably

---

## Phase 11: Production Deployment 🔄 (PENDING)

**Status:** 🔄 PENDING  
**Dependencies:** Phase 10 complete  
**Estimated Time:** 1-2 hours

### Objectives
- [ ] Switch Paddle to production mode
- [ ] Update environment variables
- [ ] Activate Paddle gateway
- [ ] Configure webhook URL in Paddle
- [ ] Monitor initial transactions

---

### Step 11.1: Update Environment Variables

**File:** `.env`

```bash
# Change from sandbox to production
PADDLE_API_KEY=pk_live_xxxxx  # Production API key
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxxxx  # Production webhook secret
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=live_xxxxx  # Production client token
NEXT_PUBLIC_PADDLE_ENV=production  # Change to production
```

---

### Step 11.2: Activate Paddle Gateway

**SQL Query:**
```sql
-- Activate Paddle gateway
UPDATE indb_payment_gateways
SET 
  is_active = true,
  is_default = true,
  configuration = jsonb_set(
    configuration,
    '{environment}',
    '"production"'
  )
WHERE slug = 'paddle';
```

---

### Step 11.3: Configure Webhook in Paddle Dashboard

1. Navigate to Paddle Dashboard → Developer Tools → Notifications
2. Add webhook endpoint:
   - URL: `https://yourdomain.com/api/v1/payments/paddle/webhook`
   - Events: Select all subscription and transaction events
3. Copy webhook secret and update `.env`

---

### Step 11.4: Monitor Initial Transactions

**Queries to Monitor:**

```sql
-- Check recent subscriptions
SELECT * FROM indb_subscriptions
ORDER BY created_at DESC
LIMIT 10;

-- Check webhook events
SELECT event_type, processed, created_at
FROM indb_paddle_webhook_events
ORDER BY created_at DESC
LIMIT 20;

-- Check transactions
SELECT * FROM indb_paddle_transactions
ORDER BY created_at DESC
LIMIT 10;
```

**✅ Success Criteria:**
- Paddle gateway active in production
- Real payments processing successfully
- Webhooks working in production
- No errors in monitoring

---

## Post-Implementation Checklist

### Security
- [ ] API keys stored in environment variables (not database)
- [ ] Webhook signature verification working
- [ ] No secrets exposed in frontend code
- [ ] HTTPS enabled on all endpoints

### Database
- [ ] All tables created with proper indexes
- [ ] Foreign key constraints in place
- [ ] Historical data preserved
- [ ] Backup strategy in place

### Monitoring
- [ ] Webhook events being logged
- [ ] Error tracking configured
- [ ] Transaction monitoring in place
- [ ] User subscription status tracking

### Documentation
- [ ] API endpoints documented
- [ ] Webhook events documented
- [ ] Database schema documented
- [ ] Team trained on new system

---

## Rollback Plan

If issues occur in production:

### Emergency Rollback Steps

1. **Deactivate Paddle Gateway:**
```sql
UPDATE indb_payment_gateways
SET is_active = false
WHERE slug = 'paddle';
```

2. **Restore Old Gateway (if needed):**
```sql
UPDATE indb_payment_gateways
SET is_active = true, is_default = true
WHERE slug = 'midtrans_snap';  -- Or whichever was default
```

3. **Revert Environment Variables:**
- Switch back to sandbox mode
- Use test API keys

4. **Database Cleanup:**
- No data deletion required
- Paddle tables can remain (for audit trail)
- Old transactions preserved

---

## Support & Resources

### Paddle Documentation
- **SDK Docs:** https://developer.paddle.com/paddlejs/overview
- **API Reference:** https://developer.paddle.com/api-reference/overview
- **Webhook Events:** https://developer.paddle.com/webhooks/overview
- **Testing Guide:** https://developer.paddle.com/concepts/sell/test-transactions

### Internal Resources
- **Integration Guide:** `doc/PADDLE_INTEGRATION_GUIDE.md`
- **Migration Progress:** `doc/PADDLE_MIGRATION_PROGRESS.md`
- **Database Structure:** `doc/database-structure.md`
- **Project Changelog:** `doc/project.md`

---

**Document Version:** 1.0  
**Last Updated:** November 1, 2025  
**Next Review:** After each phase completion

# Paddle Database Migration - Implementation Log

**Project:** IndexNow Studio  
**Date Started:** November 1, 2025  
**Status:** Phase 1 Complete - Database Schema Updated  

---

## Table of Contents
1. [Overview](#overview)
2. [Migration Objectives](#migration-objectives)
3. [Database Changes Summary](#database-changes-summary)
4. [SQL Queries Executed](#sql-queries-executed)
5. [Current Database State](#current-database-state)
6. [Next Steps](#next-steps)

---

## Overview

This document tracks the database migration from Midtrans/Manual Bank Transfer payment system to Paddle payment gateway. The migration involves simplifying the pricing structure from multi-currency (USD/IDR) to USD-only, deactivating old payment gateways, and preparing the database for Paddle integration.

**Migration Strategy:** Hybrid approach - secrets in environment variables, configuration in database.

---

## Migration Objectives

### Primary Goals
1. ✅ **Simplify Pricing Structure** - Convert from nested multi-currency to flat USD-only pricing
2. ✅ **Add Paddle Price ID Fields** - Add `paddle_price_id` to each billing period in package pricing tiers
3. ✅ **Create Paddle Infrastructure** - Add new tables for Paddle subscriptions and transactions
4. ✅ **Deactivate Old Gateways** - Disable Midtrans and Bank Transfer gateways (preserve for history)
5. ✅ **Add Paddle Gateway** - Insert Paddle as new payment gateway in database
6. 🔄 **Code Cleanup** - Remove Midtrans/Bank Transfer code (Next Phase)
7. 🔄 **Frontend Updates** - Update pricing components to use USD-only (Next Phase)

---

## Database Changes Summary

### Tables Modified
- `indb_payment_packages` - Pricing structure simplified, Paddle Price IDs added
- `indb_payment_gateways` - Old gateways deactivated, Paddle gateway added
- `indb_auth_user_profiles` - Subscription fields added

### Tables Created
- `indb_subscriptions` - Paddle subscription management
- `indb_paddle_transactions` - Paddle transaction records
- `indb_paddle_webhook_events` - Paddle webhook event log

### Tables Preserved (No Changes)
- `indb_payment_transactions` - Historical transaction data
- `indb_payment_midtrans` - Midtrans-specific data (for audit trail)
- `indb_payment_invoices` - Invoice records

---

## SQL Queries Executed

### Step 1: Simplify Pricing Structure (Multi-Currency → USD-Only)

**Objective:** Transform `pricing_tiers` from `{"monthly": {"USD": {...}, "IDR": {...}}}` to `{"monthly": {...}}`

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

**Result:** ✅ All packages now have flat USD-only pricing structure

---

### Step 2: Add Paddle Price ID Fields

**Objective:** Add `paddle_price_id` field to each billing period for Paddle integration

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

**Result:** ✅ All packages now have `paddle_price_id` fields (placeholders to be replaced with actual Paddle Price IDs)

---

### Step 3: Create Paddle Subscription Tables

**Objective:** Create new tables for Paddle subscription and transaction management

#### 3.1 Subscriptions Table

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

**Result:** ✅ Subscriptions table created with proper indexes

#### 3.2 Paddle Transactions Table

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

**Result:** ✅ Paddle transactions table created with proper indexes

#### 3.3 Webhook Events Table

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

**Result:** ✅ Webhook events table created with proper indexes

---

### Step 4: Update User Profiles Table

**Objective:** Add subscription-related fields to user profiles

```sql
-- Add subscription fields to profiles
ALTER TABLE indb_auth_user_profiles 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50), -- 'free', 'pro', 'enterprise'
ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES indb_subscriptions(id);
```

**Result:** ✅ Profile table updated with subscription fields

---

### Step 5: Deactivate Old Payment Gateways

**Objective:** Disable Midtrans and Bank Transfer gateways (preserve for history)

```sql
-- Deactivate all Midtrans and Bank Transfer gateways
UPDATE indb_payment_gateways
SET 
  is_active = false,
  is_default = false,
  updated_at = NOW()
WHERE slug IN ('midtrans_snap', 'midtrans_recurring', 'bank_transfer', 'midtrans');
```

**Result:** ✅ Old gateways deactivated (not deleted to preserve transaction history)

**Rationale for Not Deleting:**
- Preserves foreign key relationships with `indb_payment_transactions.gateway_id`
- Maintains audit trail for compliance
- Allows viewing historical transaction details
- Enables rollback if needed

---

### Step 6: Add Paddle Payment Gateway

**Objective:** Insert Paddle as new payment gateway

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

**Result:** ✅ Paddle gateway added (inactive until API keys configured)

**Configuration Details:**
- **Environment:** `sandbox` (change to `production` when going live)
- **Default Currency:** `USD`
- **Enabled Features:** Subscriptions only (one-time payments disabled)
- **API Credentials:** Stored in environment variables for security

---

## Current Database State

### Package Pricing Structure (After Migration)

#### Basic Package
```json
{
  "annual": {
    "promo_price": 80,
    "period_label": "Annual",
    "regular_price": 149,
    "paddle_price_id": "REPLACE_WITH_PADDLE_ANNUAL_PRICE_ID"
  },
  "monthly": {
    "promo_price": 9.99,
    "period_label": "Monthly",
    "regular_price": 25,
    "paddle_price_id": "REPLACE_WITH_PADDLE_MONTHLY_PRICE_ID"
  }
}
```

#### Premium Package
```json
{
  "annual": {
    "promo_price": 159,
    "period_label": "Annual",
    "regular_price": 199,
    "paddle_price_id": "REPLACE_WITH_PADDLE_ANNUAL_PRICE_ID"
  },
  "monthly": {
    "promo_price": 15,
    "period_label": "Monthly",
    "regular_price": 19,
    "paddle_price_id": "REPLACE_WITH_PADDLE_MONTHLY_PRICE_ID"
  }
}
```

#### Pro Package
```json
{
  "annual": {
    "promo_price": 499,
    "period_label": "Annual",
    "regular_price": 599,
    "paddle_price_id": "REPLACE_WITH_PADDLE_ANNUAL_PRICE_ID"
  },
  "monthly": {
    "promo_price": 45,
    "period_label": "Monthly",
    "regular_price": 59,
    "paddle_price_id": "REPLACE_WITH_PADDLE_MONTHLY_PRICE_ID"
  }
}
```

#### Free Package
```json
null
```

---

### Payment Gateways Status

| Gateway | Slug | Active | Default | Notes |
|---------|------|--------|---------|-------|
| Midtrans Snap | `midtrans_snap` | ❌ false | ❌ false | Deactivated, preserved for history |
| Midtrans Recurring | `midtrans_recurring` | ❌ false | ❌ false | Deactivated, preserved for history |
| Bank Transfer | `bank_transfer` | ❌ false | ❌ false | Deactivated, preserved for history |
| Paddle | `paddle` | ❌ false | ❌ false | Added, waiting for activation |

---

### New Tables Created

| Table Name | Purpose | Records |
|------------|---------|---------|
| `indb_subscriptions` | Paddle subscription management | 0 (ready for data) |
| `indb_paddle_transactions` | Paddle transaction records | 0 (ready for data) |
| `indb_paddle_webhook_events` | Webhook event log | 0 (ready for data) |

---

## Next Steps

### Phase 2: Update Paddle Price IDs (User Action Required)

1. **Create Products in Paddle Dashboard:**
   - Create 3 products: Basic, Premium, Pro
   - For each product, create 2 prices: Monthly, Annual

2. **Get Paddle Price IDs:**
   - Navigate to Paddle Dashboard → Catalog → Prices
   - Copy the Price IDs (format: `pri_01h...`)

3. **Update Database with Real Paddle Price IDs:**

```sql
-- Update Basic package with real Paddle Price IDs
UPDATE indb_payment_packages
SET pricing_tiers = jsonb_set(
  jsonb_set(
    pricing_tiers,
    '{monthly, paddle_price_id}',
    '"pri_01hXXXXX_basic_monthly"'  -- Replace with actual ID
  ),
  '{annual, paddle_price_id}',
  '"pri_01hYYYYY_basic_annual"'    -- Replace with actual ID
)
WHERE slug = 'basic';

-- Repeat for Premium and Pro packages
```

---

### Phase 3: Configure Environment Variables

Add these to your `.env` file:

```bash
# Paddle API Keys (Get from Paddle Dashboard → Developer Tools → Authentication)
PADDLE_API_KEY=pk_test_xxxxx  # Use pk_live_xxxxx for production
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxxxx
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_xxxxx  # Use live_xxxxx for production
NEXT_PUBLIC_PADDLE_ENV=sandbox  # Change to 'production' when going live
```

---

### Phase 4: Code Cleanup (Pending)

**Files to Delete:**
- `app/api/v1/billing/channels/midtrans-snap/` (route + handler)
- `app/api/v1/billing/channels/midtrans-recurring/` (route + handler)
- `app/api/v1/billing/channels/bank-transfer/` (route + handler)
- `app/api/v1/billing/midtrans/` (all routes)
- `app/api/v1/billing/midtrans-3ds-callback/`
- `app/api/v1/billing/midtrans-config/`
- `app/api/v1/payments/midtrans/webhook/`
- `app/api/v1/payments/channels/snap/`
- `app/api/midtrans/webhook/`
- `lib/payment-services/midtrans-service.ts`
- `lib/payment-services/midtrans-recurring.ts`
- `lib/payment-services/midtrans-client-service.ts`
- `lib/utils/currency-converter.ts`
- `lib/services/payments/billing/CurrencyConverter.ts`
- `types/midtrans.d.ts`

**Files to Modify:**
- `hooks/business/usePricingData.ts` - Remove currency detection, access pricing directly
- `components/checkout/BillingPeriodSelector.tsx` - Remove userCurrency prop
- `app/api/v1/billing/packages/route.ts` - Remove currency detection logic
- `lib/utils/currency-utils.ts` - Simplify to USD-only formatting

**Total Code Reduction:** ~400+ lines of Midtrans/currency conversion code

---

### Phase 5: Frontend Updates (Pending)

**Components to Update:**
1. Remove currency detection from pricing hooks
2. Update billing period selector to use flat pricing structure
3. Simplify checkout components
4. Update admin package management forms

**Key Changes:**
- Access pricing directly: `pricing_tiers.monthly.promo_price` instead of `pricing_tiers.monthly.USD.promo_price`
- Remove `userCurrency` state and props
- Display USD only (Paddle handles currency conversion at checkout)

---

### Phase 6: Paddle Integration (Future)

**Implementation Tasks:**
1. Install Paddle SDK: `npm install @paddle/paddle-node-sdk @paddle/paddle-js`
2. Create Paddle service layer (`lib/services/payments/paddle/`)
3. Implement webhook handler (`app/api/v1/payments/paddle/webhook/route.ts`)
4. Add Paddle Provider to frontend (`lib/providers/PaddleProvider.tsx`)
5. Update checkout flow to use Paddle
6. Implement subscription management endpoints
7. Add customer portal integration

**Reference:** See `doc/PADDLE_INTEGRATION_GUIDE.md` for complete implementation details

---

## Verification Queries

### Check Pricing Structure

```sql
SELECT 
  name,
  slug,
  jsonb_pretty(pricing_tiers) as pricing_structure
FROM indb_payment_packages
WHERE slug IN ('basic', 'premium', 'pro')
ORDER BY sort_order;
```

### Check Payment Gateways

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

### Check New Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%paddle%' OR table_name = 'indb_subscriptions')
ORDER BY table_name;
```

### Check Profile Subscription Fields

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'indb_auth_user_profiles'
  AND column_name IN ('subscription_tier', 'subscription_active', 'subscription_id');
```

---

## Migration Summary

### ✅ Completed
- [x] Simplified pricing structure (multi-currency → USD-only)
- [x] Added `paddle_price_id` fields to all packages
- [x] Created Paddle subscription tables
- [x] Created Paddle transaction tables
- [x] Created Paddle webhook events table
- [x] Updated user profiles with subscription fields
- [x] Deactivated old payment gateways
- [x] Added Paddle payment gateway

### 🔄 Pending
- [ ] Replace Paddle Price ID placeholders with actual IDs from Paddle Dashboard
- [ ] Configure Paddle API keys in environment variables
- [ ] Remove Midtrans/Bank Transfer code
- [ ] Update frontend pricing components
- [ ] Implement Paddle integration code
- [ ] Test Paddle checkout flow
- [ ] Set Paddle gateway to active

---

## Rollback Plan

If issues occur, the migration can be rolled back:

1. **Revert Pricing Structure:**
```sql
-- Manual restoration required from backup
-- Contact database admin for backup restore
```

2. **Reactivate Old Gateways:**
```sql
UPDATE indb_payment_gateways
SET is_active = true, is_default = true
WHERE slug = 'midtrans_snap';  -- Or whichever was default
```

3. **Disable Paddle:**
```sql
UPDATE indb_payment_gateways
SET is_active = false
WHERE slug = 'paddle';
```

---

## Change Log

| Date | Change | Status |
|------|--------|--------|
| 2025-11-01 | Pricing structure simplified to USD-only | ✅ Complete |
| 2025-11-01 | Paddle Price ID fields added to packages | ✅ Complete |
| 2025-11-01 | Paddle tables created | ✅ Complete |
| 2025-11-01 | Old gateways deactivated | ✅ Complete |
| 2025-11-01 | Paddle gateway added | ✅ Complete |
| TBD | Replace Paddle Price ID placeholders | 🔄 Pending |
| TBD | Code cleanup (remove Midtrans) | 🔄 Pending |
| TBD | Frontend updates | 🔄 Pending |
| TBD | Paddle integration | 🔄 Pending |

---

**Document Version:** 1.0  
**Last Updated:** November 1, 2025  
**Next Review:** After Paddle Price IDs are configured

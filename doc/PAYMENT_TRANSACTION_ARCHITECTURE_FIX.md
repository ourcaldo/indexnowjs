# Payment Transaction Architecture Fix Plan

**Date**: November 3, 2025  
**Status**: Planning Phase - DO NOT EXECUTE YET  
**Priority**: HIGH - Data Integrity Issue

---

## Executive Summary

Currently, Paddle payment transactions are only being recorded in the gateway-specific table (`indb_paddle_transactions`), bypassing the main transaction table (`indb_payment_transactions`) and transaction history logging system. This breaks the payment architecture pattern established with the previous Midtrans integration.

**Impact**:
- ❌ Main transaction table (`indb_payment_transactions`) is empty for Paddle transactions
- ❌ Transaction history (`indb_payment_transactions_history`) is not logging Paddle payment events
- ❌ Inconsistent data architecture between payment gateways (Midtrans vs Paddle)
- ❌ Loss of audit trail and centralized transaction reporting
- ❌ Potential issues with financial reconciliation and reporting

---

## Current Architecture Issue

### How It Should Work (3-Table Pattern)

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  1. Main Transaction Table            │
        │     (indb_payment_transactions)       │
        │  - Universal transaction record       │
        │  - Gateway-agnostic fields            │
        │  - Links to gateway & package         │
        └───────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│  2. Gateway-Specific  │       │  3. Transaction       │
│     Table             │       │     History Log       │
│  - indb_paddle_       │       │  - Auto-populated     │
│    transactions       │       │    via trigger        │
│  - Paddle-specific    │       │  - Status changes     │
│    fields & metadata  │       │  - Audit trail        │
│  - References main    │       │                       │
│    transaction via FK │       │                       │
└───────────────────────┘       └───────────────────────┘
```

### How It Currently Works (BROKEN)

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  ❌ Main Transaction Table SKIPPED    │
        │     (indb_payment_transactions)       │
        │  - NO RECORDS FOR PADDLE              │
        └───────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Gateway-Specific Table   │
            │  (indb_paddle_transactions)│
            │  - ONLY TABLE RECEIVING   │
            │    PADDLE DATA            │
            │  - NO FK to main table    │
            └───────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  ❌ Transaction History NOT TRIGGERED │
        │     (indb_payment_transactions_history)│
        │  - NO AUDIT TRAIL FOR PADDLE          │
        └───────────────────────────────────────┘
```

---

## Database Schemas

### 1. Main Transaction Table: `indb_payment_transactions`

**Purpose**: Universal transaction record for ALL payment gateways

```sql
CREATE TABLE public.indb_payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid NULL,
  package_id uuid NOT NULL,
  gateway_id uuid NOT NULL,                      -- FK to indb_payment_gateways
  transaction_type text NOT NULL,                -- 'subscription' | 'one_time'
  transaction_status text NOT NULL DEFAULT 'pending',  -- 'pending' | 'completed' | 'failed' | 'refunded'
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'IDR',
  payment_method text NULL,
  payment_proof_url text NULL,
  gateway_transaction_id text NULL,              -- Paddle: txn_xxx, Midtrans: order-xxx
  gateway_response jsonb NULL DEFAULT '{}'::jsonb,
  processed_at timestamp with time zone NULL,
  verified_by uuid NULL,
  verified_at timestamp with time zone NULL,
  notes text NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  billing_period text NULL,                      -- 'month' | 'year'
  trial_metadata jsonb NULL,
  
  CONSTRAINT indb_payment_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT indb_payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT indb_payment_transactions_package_id_fkey FOREIGN KEY (package_id) REFERENCES indb_payment_packages (id),
  CONSTRAINT indb_payment_transactions_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES indb_payment_gateways (id)
);

-- Automatic History Logging Trigger
CREATE TRIGGER trigger_log_transaction_history
AFTER INSERT OR UPDATE ON indb_payment_transactions 
FOR EACH ROW
EXECUTE FUNCTION log_transaction_history();
```

**Key Fields**:
- `gateway_transaction_id`: Stores Paddle transaction ID (`txn_xxx`)
- `gateway_id`: References the Paddle gateway record
- `transaction_status`: Maps to Paddle statuses

### 2. Paddle Gateway-Specific Table: `indb_paddle_transactions`

**Purpose**: Store Paddle-specific transaction data and metadata

```sql
CREATE TABLE public.indb_paddle_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid NULL,
  transaction_id uuid NULL,                      -- ❌ MISSING: Should FK to indb_payment_transactions
  paddle_transaction_id varchar(255) NOT NULL,   -- txn_xxx
  amount numeric(10, 2) NOT NULL,
  currency varchar(3) NOT NULL,
  status varchar(50) NOT NULL,                   -- 'completed' | 'refunded' | 'failed'
  payment_method varchar(100) NULL,
  receipt_url text NULL,
  invoice_number varchar(255) NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,       -- Paddle-specific data
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  refund_amount numeric(10, 2) NULL,
  refund_reason text NULL,
  refunded_at timestamp with time zone NULL,
  
  CONSTRAINT indb_paddle_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT indb_paddle_transactions_paddle_transaction_id_key UNIQUE (paddle_transaction_id),
  CONSTRAINT indb_paddle_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT indb_paddle_transactions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES indb_payment_subscriptions (id) ON DELETE SET NULL
  -- ❌ MISSING CONSTRAINT: FOREIGN KEY (transaction_id) REFERENCES indb_payment_transactions (id)
);
```

**What Needs to Be Added**:
- `transaction_id` column should reference main transaction table
- Foreign key constraint to maintain referential integrity

### 3. Midtrans Reference Pattern (How It Should Work)

**Purpose**: Example of correct architecture from old Midtrans integration

```sql
CREATE TABLE public.indb_payment_midtrans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,                  -- ✅ CORRECTLY REFERENCES MAIN TABLE
  user_id uuid NOT NULL,
  midtrans_subscription_id varchar(255) NULL,
  saved_token_id varchar(255) NOT NULL,
  masked_card varchar(50) NULL,
  card_type varchar(20) NULL,
  bank varchar(50) NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  
  CONSTRAINT indb_payment_midtrans_pkey PRIMARY KEY (id),
  CONSTRAINT indb_payment_midtrans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT indb_payment_midtrans_transaction_fkey FOREIGN KEY (transaction_id) REFERENCES indb_payment_transactions (id) ON DELETE CASCADE  -- ✅ FK TO MAIN TABLE
);
```

### 4. Transaction History Table: `indb_payment_transactions_history`

**Purpose**: Automatic audit log populated by database trigger

```sql
-- This table is automatically populated by the trigger on indb_payment_transactions
-- Structure mirrors the main table with additional change tracking fields
-- Triggered on INSERT or UPDATE to indb_payment_transactions
```

**Current Issue**: Since Paddle transactions aren't being inserted into the main table, the history trigger never fires, resulting in no audit trail.

---

## Gateway Configuration

### Paddle Gateway Record

```sql
INSERT INTO indb_payment_gateways (id, name, slug, is_active, is_default)
VALUES (
  'e24339a4-ec2c-44f7-a6d5-41836025fd47',  -- Paddle gateway ID
  'Paddle',
  'paddle',
  true,
  true
);
```

**Note**: This ID must be used when creating main transaction records for Paddle payments.

---

## Files That Need Updates

### 1. Database Schema Updates

**File**: Database migration (manual SQL or schema update)
- Add `transaction_id uuid` column to `indb_paddle_transactions`
- Add foreign key constraint linking to `indb_payment_transactions`
- Update existing Paddle transactions to backfill main table records (if any exist)

### 2. Webhook Processors (Primary Changes)

#### A. `transaction.completed` Processor
**File**: `app/api/v1/payments/paddle/webhook/processors/transaction-completed.ts`

**Current Behavior**: Only inserts into `indb_paddle_transactions`

**Required Changes**:
1. **Get Paddle gateway ID** from database or environment
2. **Get package ID** from subscription or custom_data
3. **Insert into main transaction table FIRST** (`indb_payment_transactions`)
4. **Get returned transaction ID** from main table insert
5. **Insert into Paddle-specific table** with `transaction_id` FK
6. **History table auto-logs** via trigger (no code needed)

**Pseudo-code Flow**:
```typescript
// 1. Extract data from Paddle webhook
const userId = validatedData.userId
const packageId = await getPackageIdFromSubscription(subscription_id)
const paddleGatewayId = 'e24339a4-ec2c-44f7-a6d5-41836025fd47'

// 2. Insert into MAIN transaction table
const { data: mainTransaction } = await supabaseAdmin
  .from('indb_payment_transactions')
  .insert({
    user_id: userId,
    subscription_id: dbSubscriptionId,
    package_id: packageId,
    gateway_id: paddleGatewayId,
    transaction_type: subscription_id ? 'subscription' : 'one_time',
    transaction_status: 'completed',
    amount: parseFloat(amount) / 100,
    currency: currency,
    payment_method: paymentMethod,
    gateway_transaction_id: transaction_id,  // Paddle txn_xxx
    gateway_response: data,  // Full Paddle webhook data
    processed_at: new Date().toISOString(),
    billing_period: getBillingPeriod(items),
    metadata: { custom_data, items }
  })
  .select()
  .single()

// 3. Insert into PADDLE-SPECIFIC table (with FK reference)
await supabaseAdmin
  .from('indb_paddle_transactions')
  .insert({
    transaction_id: mainTransaction.id,  // ✅ FK to main table
    user_id: userId,
    subscription_id: dbSubscriptionId,
    paddle_transaction_id: transaction_id,
    amount: parseFloat(amount) / 100,
    currency: currency,
    status: 'completed',
    payment_method: paymentMethod,
    receipt_url: details.receipt_url || null,
    invoice_number: details.invoice_number || null,
    metadata: { custom_data, items }
  })

// 4. History table automatically populated by trigger ✅
```

#### B. `transaction.refunded` Processor
**File**: `app/api/v1/payments/paddle/webhook/processors/transaction-refunded.ts`

**Current Behavior**: Only updates `indb_paddle_transactions`

**Required Changes**:
1. **Update Paddle-specific table** (current behavior)
2. **Find and update main transaction table** using `gateway_transaction_id`
3. **Update transaction_status to 'refunded'**
4. **History table auto-logs** the status change via trigger

**Pseudo-code Flow**:
```typescript
// 1. Update Paddle-specific table (existing code)
await supabaseAdmin
  .from('indb_paddle_transactions')
  .update({
    status: 'refunded',
    refund_amount: parseFloat(refund_amount) / 100,
    refund_reason: refund_reason,
    refunded_at: new Date().toISOString(),
    metadata: updatedMetadata
  })
  .eq('paddle_transaction_id', transaction_id)

// 2. NEW: Update main transaction table
await supabaseAdmin
  .from('indb_payment_transactions')
  .update({
    transaction_status: 'refunded',
    notes: `Refund: ${refund_reason}`,
    updated_at: new Date().toISOString()
  })
  .eq('gateway_transaction_id', transaction_id)  // Find by Paddle txn_xxx

// 3. History table automatically logs the status change ✅
```

#### C. `transaction.payment_failed` Processor
**File**: `app/api/v1/payments/paddle/webhook/processors/transaction-payment-failed.ts`

**Current Behavior**: Likely only logs error or updates Paddle table

**Required Changes**:
1. **Insert failed transaction into main table** (for audit trail)
2. **Set transaction_status to 'failed'**
3. **Insert into Paddle-specific table** with failure details

### 3. Helper Functions to Create

#### A. Package ID Resolver
**New File**: `app/api/v1/payments/paddle/webhook/processors/helpers.ts`

```typescript
/**
 * Get package ID from subscription or custom_data
 */
export async function getPackageIdFromSubscription(
  subscriptionId: string | null,
  customData: any
): Promise<string> {
  // Try subscription first
  if (subscriptionId) {
    const { data: subscription } = await supabaseAdmin
      .from('indb_payment_subscriptions')
      .select('package_id')
      .eq('paddle_subscription_id', subscriptionId)
      .maybeSingle()
    
    if (subscription?.package_id) {
      return subscription.package_id
    }
  }
  
  // Fallback to custom_data
  if (customData?.packageId) {
    return customData.packageId
  }
  
  throw new Error('Unable to determine package_id for transaction')
}

/**
 * Extract billing period from Paddle items
 */
export function getBillingPeriod(items: any[]): 'month' | 'year' | null {
  if (!items || items.length === 0) return null
  
  const interval = items[0]?.price?.billing_cycle?.interval
  if (interval === 'month') return 'month'
  if (interval === 'year') return 'year'
  return null
}

/**
 * Get Paddle gateway ID from database
 */
export async function getPaddleGatewayId(): Promise<string> {
  const { data: gateway } = await supabaseAdmin
    .from('indb_payment_gateways')
    .select('id')
    .eq('slug', 'paddle')
    .eq('is_active', true)
    .single()
  
  if (!gateway) {
    throw new Error('Paddle gateway not configured in database')
  }
  
  return gateway.id
}
```

### 4. Service Layer Updates

#### A. Cancellation Service
**File**: `lib/services/payments/paddle/PaddleCancellationService.ts`

**Current Behavior**: Updates `indb_paddle_transactions` for refund status

**Required Changes**:
- When processing refunds, also update main transaction table status
- Ensure both tables stay in sync

---

## Implementation Plan (Step-by-Step)

### Phase 1: Database Schema Updates ✅
**DO NOT USE DRIZZLE - Manual SQL Only**

1. **Add `transaction_id` column to Paddle table**
   ```sql
   ALTER TABLE indb_paddle_transactions 
   ADD COLUMN transaction_id uuid NULL;
   ```

2. **Add foreign key constraint**
   ```sql
   ALTER TABLE indb_paddle_transactions 
   ADD CONSTRAINT indb_paddle_transactions_transaction_id_fkey 
   FOREIGN KEY (transaction_id) 
   REFERENCES indb_payment_transactions (id) 
   ON DELETE CASCADE;
   ```

3. **Add index for performance**
   ```sql
   CREATE INDEX idx_paddle_transactions_transaction_id 
   ON indb_paddle_transactions(transaction_id);
   ```

4. **Verify gateway exists**
   ```sql
   SELECT id, name, slug, is_active, is_default 
   FROM indb_payment_gateways 
   WHERE slug = 'paddle';
   
   -- Should return: e24339a4-ec2c-44f7-a6d5-41836025fd47
   ```

### Phase 2: Create Helper Functions

1. **Create `helpers.ts` with utility functions**
   - `getPackageIdFromSubscription()`
   - `getBillingPeriod()`
   - `getPaddleGatewayId()`

2. **Test helpers independently**
   - Verify package ID resolution logic
   - Verify gateway ID retrieval

### Phase 3: Update `transaction.completed` Processor

1. **Import helper functions**
2. **Implement dual-insert pattern**:
   - Insert into `indb_payment_transactions` FIRST
   - Capture returned transaction ID
   - Insert into `indb_paddle_transactions` with FK reference
3. **Add error handling** for transaction failures
4. **Test with Paddle sandbox webhook**

### Phase 4: Update `transaction.refunded` Processor

1. **Add main table update logic**
2. **Ensure status sync** between both tables
3. **Verify history logging** captures refund status changes
4. **Test refund flow end-to-end**

### Phase 5: Update `transaction.payment_failed` Processor

1. **Add failed transaction logging** to main table
2. **Record failure details** in both tables
3. **Test payment failure scenarios**

### Phase 6: Update Cancellation Service

1. **Modify refund logic** to update both tables
2. **Ensure transaction status sync** on cancellation
3. **Test 7-day refund window flow**

### Phase 7: Backfill Existing Data (If Needed)

⚠️ **ONLY IF THERE ARE EXISTING PADDLE TRANSACTIONS**

1. **Query existing Paddle transactions without main table record**
   ```sql
   SELECT * FROM indb_paddle_transactions pt
   WHERE NOT EXISTS (
     SELECT 1 FROM indb_payment_transactions t
     WHERE t.gateway_transaction_id = pt.paddle_transaction_id
   );
   ```

2. **Create backfill script** to populate main table
3. **Update Paddle table records** with `transaction_id` FK
4. **Verify history is properly logged**

### Phase 8: Testing & Validation

1. **Test new transaction creation**
   - Verify main table record created
   - Verify Paddle table record with FK
   - Verify history table auto-populated

2. **Test transaction updates**
   - Refund scenarios
   - Status changes
   - Verify history captures all changes

3. **Test failure scenarios**
   - Payment failures logged in both tables
   - Error handling works correctly

4. **Verify reporting queries**
   - Cross-gateway reporting works
   - Financial reconciliation accurate

---

## Data Flow Validation Checklist

After implementation, verify these flows work correctly:

### ✅ New Transaction Flow
- [ ] Paddle webhook received (`transaction.completed`)
- [ ] Main transaction table receives insert
- [ ] Paddle-specific table receives insert with FK
- [ ] History table automatically logs creation
- [ ] Both tables have matching data
- [ ] Subscription status updated

### ✅ Refund Flow
- [ ] Paddle webhook received (`transaction.refunded`)
- [ ] Main transaction status updated to 'refunded'
- [ ] Paddle-specific table updated with refund details
- [ ] History table logs status change
- [ ] User access properly revoked (if full refund)

### ✅ Failed Payment Flow
- [ ] Paddle webhook received (`transaction.payment_failed`)
- [ ] Main transaction logged with 'failed' status
- [ ] Paddle-specific table logs failure details
- [ ] History table captures failure event
- [ ] Error notification sent to user

### ✅ Cancellation Flow
- [ ] User cancels subscription (≤7 days)
- [ ] Refund processed via Paddle API
- [ ] Both transaction tables updated to 'refunded'
- [ ] History table logs cancellation + refund
- [ ] Subscription canceled in database
- [ ] User access revoked

---

## Rollback Plan

If issues occur during implementation:

1. **Database rollback**:
   ```sql
   -- Remove FK constraint
   ALTER TABLE indb_paddle_transactions 
   DROP CONSTRAINT IF EXISTS indb_paddle_transactions_transaction_id_fkey;
   
   -- Remove column
   ALTER TABLE indb_paddle_transactions 
   DROP COLUMN IF EXISTS transaction_id;
   ```

2. **Code rollback**: Revert webhook processor changes
3. **Verify**: Paddle transactions still work (legacy mode)

---

## Success Metrics

After implementation, verify:

1. **Data Consistency**:
   - Every Paddle transaction has both main table and Paddle-specific record
   - `transaction_id` FK properly links the two tables
   - History table logs all status changes

2. **Reporting Accuracy**:
   - Cross-gateway reports include Paddle transactions
   - Financial reconciliation matches Paddle dashboard
   - Audit trail is complete

3. **Functional Verification**:
   - New subscriptions create records in all 3 tables
   - Refunds update all tables correctly
   - Failed payments are properly logged

---

## Notes & Warnings

⚠️ **CRITICAL WARNINGS**:

1. **DO NOT use Drizzle for schema changes** - Manual SQL only
2. **DO NOT execute `db:push`** - Will cause migration issues
3. **Test in sandbox first** - Verify with Paddle test webhooks
4. **Backup database** before schema changes
5. **Coordinate with team** - This affects payment reporting

📋 **REQUIREMENTS**:

1. All code must be refactored, not rewritten from scratch
2. Preserve existing functionality while adding new features
3. Follow established error handling patterns
4. Maintain backward compatibility with existing Paddle transactions
5. Update `doc/project.md` changelog after implementation

🔍 **TESTING REQUIREMENTS**:

1. Test with real Paddle sandbox webhooks
2. Verify all three tables receive data
3. Confirm history trigger fires correctly
4. Test edge cases (missing data, duplicate webhooks)
5. Verify reporting queries work correctly

---

## Timeline Estimate

- **Phase 1 (Schema)**: 30 minutes
- **Phase 2 (Helpers)**: 1 hour
- **Phase 3-6 (Processors)**: 3-4 hours
- **Phase 7 (Backfill)**: 1 hour (if needed)
- **Phase 8 (Testing)**: 2-3 hours

**Total**: 7-9 hours of development + testing

---

## Related Documentation

- `doc/PADDLE_ENHANCEMENT.md` - Original Paddle implementation plan
- `doc/PADDLE_IMPLEMENTATION_PLAN.md` - Paddle integration guide
- `doc/project.md` - Project changelog
- `doc/database-structure.md` - Full database schema reference

---

**END OF PLAN - AWAITING APPROVAL TO EXECUTE**

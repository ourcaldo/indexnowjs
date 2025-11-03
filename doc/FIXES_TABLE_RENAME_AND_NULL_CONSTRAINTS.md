# Backend Fixes: Table Rename and NULL Constraint Violations

**Date:** November 3, 2025  
**Issue:** Backend errors related to table naming mismatch and NULL constraint violations

## Issues Fixed

### Issue 1: Table Name Mismatch
**Error:**
```
Could not find a relationship between 'indb_payment_subscriptions' and 'indb_payment_packages' in the schema cache
```

**Root Cause:**  
Code was referencing `indb_payment_subscriptions` but the actual database table was named `indb_subscriptions`.

**Solution:**  
Renamed the table from `indb_subscriptions` to `indb_payment_subscriptions` to match the code references and maintain consistency with other payment-related tables (`indb_payment_packages`, `indb_payment_transactions`, `indb_payment_gateways`).

### Issue 2: NULL Constraint Violation
**Error:**
```
null value in column "current_period_start" of relation "indb_subscriptions" violates not-null constraint
```

**Root Cause:**  
Paddle webhook processors (`subscription-updated.ts` and `subscription-activated.ts`) were allowing NULL values for `current_period_start` when the billing period data was missing:
```typescript
current_period_start: current_billing_period?.starts_at || null
```

This violated the database NOT NULL constraint on the `current_period_start` column.

**Solution:**  
Added validation to ensure required billing period dates are present before attempting database updates:
```typescript
if (!current_billing_period?.starts_at || !current_billing_period?.ends_at) {
  throw new Error('Missing required billing period dates in subscription update')
}
```

## Files Modified

### SQL Script Created
- `doc/sql-rename-subscriptions-table.sql` - Complete SQL script to rename table and all associated constraints/indexes

### Code Files Updated (23 files)

**Webhook Processors:**
- `app/api/v1/payments/paddle/webhook/processors/subscription-activated.ts`
- `app/api/v1/payments/paddle/webhook/processors/subscription-canceled.ts`
- `app/api/v1/payments/paddle/webhook/processors/subscription-created.ts`
- `app/api/v1/payments/paddle/webhook/processors/subscription-past-due.ts`
- `app/api/v1/payments/paddle/webhook/processors/subscription-paused.ts`
- `app/api/v1/payments/paddle/webhook/processors/subscription-resumed.ts`
- `app/api/v1/payments/paddle/webhook/processors/subscription-updated.ts`
- `app/api/v1/payments/paddle/webhook/processors/transaction-completed.ts`
- `app/api/v1/payments/paddle/webhook/processors/transaction-payment-failed.ts`
- `app/api/v1/payments/paddle/webhook/processors/transaction-refunded.ts`

**Subscription API Routes:**
- `app/api/v1/payments/paddle/subscription/cancel/route.ts`
- `app/api/v1/payments/paddle/subscription/my-subscription/route.ts`
- `app/api/v1/payments/paddle/subscription/pause/route.ts`
- `app/api/v1/payments/paddle/subscription/resume/route.ts`
- `app/api/v1/payments/paddle/subscription/update/route.ts`
- `app/api/v1/payments/paddle/customer-portal/route.ts`

**Service Files:**
- `lib/services/payments/paddle/PaddleSubscriptionService.ts`
- `lib/services/payments/paddle/PaddleCancellationService.ts`

**Other API Files:**
- `app/api/v1/billing/overview/route.ts`
- `app/api/v1/rank-tracking/keywords/route.ts` (also fixed field name from `subscription_status` to `status`)
- `app/api/v1/auth/user/trial-status/route.ts`

## Changes Made

### 1. Table Rename
All references to `indb_subscriptions` were updated to `indb_payment_subscriptions`:
```typescript
// Before
.from('indb_subscriptions')

// After
.from('indb_payment_subscriptions')
```

### 2. NULL Constraint Validation
Added validation in `subscription-updated.ts`:
```typescript
if (!current_billing_period?.starts_at || !current_billing_period?.ends_at) {
  throw new Error('Missing required billing period dates in subscription update')
}

const { error: subscriptionError } = await supabaseAdmin
  .from('indb_payment_subscriptions')
  .update({
    status: status,
    paddle_price_id: priceId,
    current_period_start: current_billing_period.starts_at,  // No longer nullable
    current_period_end: current_billing_period.ends_at,      // No longer nullable
    paused_at: paused_at || null,
    updated_at: new Date().toISOString(),
  })
  .eq('paddle_subscription_id', subscription_id)
```

Added validation in `subscription-activated.ts`:
```typescript
if (!current_billing_period?.starts_at || !current_billing_period?.ends_at) {
  throw new Error('Missing required billing period dates in subscription activation')
}

const { error: subscriptionError } = await supabaseAdmin
  .from('indb_payment_subscriptions')
  .update({
    status: 'active',
    current_period_start: current_billing_period.starts_at,  // No longer nullable
    current_period_end: current_billing_period.ends_at,      // No longer nullable
    updated_at: new Date().toISOString(),
  })
  .eq('paddle_subscription_id', subscription_id)
```

### 3. Bug Fix in Rank Tracking
Fixed field name in `app/api/v1/rank-tracking/keywords/route.ts`:
```typescript
// Before
.eq('subscription_status', 'active')

// After
.eq('status', 'active')
```

The database table uses `status` field, not `subscription_status`.

## Database Migration Steps

**IMPORTANT:** Run this SQL script on your production database BEFORE deploying the code changes:

1. Execute the SQL script:
   ```bash
   psql -h <your-db-host> -U <your-db-user> -d <your-db-name> -f doc/sql-rename-subscriptions-table.sql
   ```

2. Verify the rename:
   ```sql
   SELECT tablename FROM pg_tables WHERE tablename = 'indb_payment_subscriptions';
   ```

3. Deploy the updated code

## Testing Recommendations

1. **Test Paddle Webhooks:**
   - Test subscription.updated webhook
   - Test subscription.activated webhook
   - Verify that billing period dates are properly validated
   - Ensure no NULL constraint violations occur

2. **Test Subscription API:**
   - Test fetching user subscription
   - Test canceling subscription
   - Test pausing/resuming subscription

3. **Test Billing Overview:**
   - Verify billing data loads correctly
   - Check that subscription information displays properly

4. **Monitor Error Logs:**
   - Watch for any table name related errors
   - Watch for NULL constraint violations
   - Verify all webhook processors work correctly

## Expected Results

After deploying these changes:

✅ No more "Could not find a relationship" errors  
✅ No more NULL constraint violations on `current_period_start`  
✅ All Paddle webhooks process correctly  
✅ Subscription data loads and displays properly  
✅ Consistent table naming across all payment-related tables  

## Notes

- The table rename maintains consistency with other payment tables (`indb_payment_packages`, `indb_payment_transactions`, `indb_payment_gateways`)
- All foreign key relationships are preserved during the rename
- The validation ensures Paddle always provides required billing period data
- If Paddle webhook doesn't include billing period dates, the webhook will fail with a clear error message instead of silently creating invalid data

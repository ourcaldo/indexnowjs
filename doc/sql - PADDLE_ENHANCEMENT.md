# Paddle Enhancement - Database Schema Changes

**Date:** November 2, 2025  
**Purpose:** Add refund tracking fields to support 7-day refund policy

---

## SQL Queries to Run in Supabase SQL Editor

These queries add refund tracking fields to the existing Paddle tables. Run them in your Supabase SQL Editor.

### 1. Add Refund Tracking to Transactions Table

```sql
-- Add refund tracking fields to paddle transactions
ALTER TABLE indb_paddle_transactions
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS refund_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for refund queries (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS idx_paddle_transactions_refunded 
ON indb_paddle_transactions(refunded_at) 
WHERE refunded_at IS NOT NULL;
```

### 2. Add Cancellation Tracking to Subscriptions Table

```sql
-- Add cancellation reason tracking to subscriptions
ALTER TABLE indb_subscriptions
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS days_active_at_cancellation INTEGER DEFAULT NULL;

-- Create index for cancellation analytics (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_subscriptions_canceled_at 
ON indb_subscriptions(canceled_at) 
WHERE canceled_at IS NOT NULL;
```

---

## Verification Queries

After running the above queries, verify the changes with these SELECT statements:

### Verify Transaction Table Changes
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'indb_paddle_transactions'
  AND column_name IN ('refund_amount', 'refund_reason', 'refunded_at')
ORDER BY column_name;
```

**Expected Output:**
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| refund_amount | numeric | YES | NULL |
| refund_reason | text | YES | NULL |
| refunded_at | timestamp with time zone | YES | NULL |

### Verify Subscription Table Changes
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'indb_subscriptions'
  AND column_name IN ('cancellation_reason', 'days_active_at_cancellation')
ORDER BY column_name;
```

**Expected Output:**
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| cancellation_reason | text | YES | NULL |
| days_active_at_cancellation | integer | YES | NULL |

### Verify Indexes
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('idx_paddle_transactions_refunded', 'idx_subscriptions_canceled_at')
ORDER BY indexname;
```

**Expected Output:**
| indexname | tablename |
|-----------|-----------|
| idx_paddle_transactions_refunded | indb_paddle_transactions |
| idx_subscriptions_canceled_at | indb_subscriptions |

---

## Notes

1. **Optional Fields:** All new fields are nullable to preserve existing data
2. **Performance:** Indexes are created to improve query performance for refund lookups and cancellation analytics
3. **Backward Compatible:** Existing data is not affected; new fields default to NULL
4. **No Data Migration Needed:** The webhook processors will populate these fields for new transactions/cancellations

---

## Rollback (If Needed)

If you need to remove these changes:

```sql
-- Remove transaction refund fields
ALTER TABLE indb_paddle_transactions
DROP COLUMN IF EXISTS refund_amount,
DROP COLUMN IF EXISTS refund_reason,
DROP COLUMN IF EXISTS refunded_at;

DROP INDEX IF EXISTS idx_paddle_transactions_refunded;

-- Remove subscription cancellation fields
ALTER TABLE indb_subscriptions
DROP COLUMN IF EXISTS cancellation_reason,
DROP COLUMN IF EXISTS days_active_at_cancellation;

DROP INDEX IF EXISTS idx_subscriptions_canceled_at;
```

---

**Status:** Ready to execute  
**Impact:** Low risk - only adds optional fields, no data modification

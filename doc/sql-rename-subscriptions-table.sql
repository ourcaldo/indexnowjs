-- SQL Script to Rename indb_subscriptions to indb_payment_subscriptions
-- This script renames the table and all associated constraints and indexes
-- Run this script on your production database before deploying code changes

-- Step 1: Rename the table
ALTER TABLE public.indb_subscriptions 
RENAME TO indb_payment_subscriptions;

-- Step 2: Rename the primary key constraint
ALTER TABLE public.indb_payment_subscriptions 
RENAME CONSTRAINT indb_subscriptions_pkey 
TO indb_payment_subscriptions_pkey;

-- Step 3: Rename the unique constraint
ALTER TABLE public.indb_payment_subscriptions 
RENAME CONSTRAINT indb_subscriptions_paddle_subscription_id_key 
TO indb_payment_subscriptions_paddle_subscription_id_key;

-- Step 4: Rename the foreign key constraint
ALTER TABLE public.indb_payment_subscriptions 
RENAME CONSTRAINT indb_subscriptions_user_id_fkey 
TO indb_payment_subscriptions_user_id_fkey;

-- Step 5: Rename all indexes
ALTER INDEX public.idx_subscriptions_user_id 
RENAME TO idx_payment_subscriptions_user_id;

ALTER INDEX public.idx_subscriptions_paddle_subscription_id 
RENAME TO idx_payment_subscriptions_paddle_subscription_id;

ALTER INDEX public.idx_subscriptions_status 
RENAME TO idx_payment_subscriptions_status;

ALTER INDEX public.idx_subscriptions_canceled_at 
RENAME TO idx_payment_subscriptions_canceled_at;

-- Verify the rename
SELECT 
  tablename, 
  indexname 
FROM pg_indexes 
WHERE tablename = 'indb_payment_subscriptions'
ORDER BY indexname;

-- Verify constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.indb_payment_subscriptions'::regclass
ORDER BY conname;

-- Success message
SELECT 'Table successfully renamed from indb_subscriptions to indb_payment_subscriptions' AS status;

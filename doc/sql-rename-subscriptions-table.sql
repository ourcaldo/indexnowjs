-- SQL Script to Rename indb_subscriptions to indb_payment_subscriptions
-- This script renames the table and all associated constraints and indexes
-- Run this script on your production database before deploying code changes
-- Safe to run multiple times (uses IF EXISTS checks)

-- Step 1: Rename the table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'indb_subscriptions') THEN
    ALTER TABLE public.indb_subscriptions RENAME TO indb_payment_subscriptions;
    RAISE NOTICE 'Table renamed from indb_subscriptions to indb_payment_subscriptions';
  ELSE
    RAISE NOTICE 'Table indb_subscriptions does not exist, skipping rename';
  END IF;
END
$$;

-- Step 2: Rename the primary key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'indb_subscriptions_pkey' 
    AND conrelid = 'public.indb_payment_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.indb_payment_subscriptions 
    RENAME CONSTRAINT indb_subscriptions_pkey 
    TO indb_payment_subscriptions_pkey;
    RAISE NOTICE 'Primary key constraint renamed';
  ELSE
    RAISE NOTICE 'Primary key constraint already renamed or does not exist';
  END IF;
END
$$;

-- Step 3: Rename the unique constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'indb_subscriptions_paddle_subscription_id_key' 
    AND conrelid = 'public.indb_payment_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.indb_payment_subscriptions 
    RENAME CONSTRAINT indb_subscriptions_paddle_subscription_id_key 
    TO indb_payment_subscriptions_paddle_subscription_id_key;
    RAISE NOTICE 'Unique constraint renamed';
  ELSE
    RAISE NOTICE 'Unique constraint already renamed or does not exist';
  END IF;
END
$$;

-- Step 4: Rename the foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'indb_subscriptions_user_id_fkey' 
    AND conrelid = 'public.indb_payment_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.indb_payment_subscriptions 
    RENAME CONSTRAINT indb_subscriptions_user_id_fkey 
    TO indb_payment_subscriptions_user_id_fkey;
    RAISE NOTICE 'Foreign key constraint renamed';
  ELSE
    RAISE NOTICE 'Foreign key constraint already renamed or does not exist';
  END IF;
END
$$;

-- Step 5: Rename all indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_user_id') THEN
    ALTER INDEX public.idx_subscriptions_user_id 
    RENAME TO idx_payment_subscriptions_user_id;
    RAISE NOTICE 'Index idx_subscriptions_user_id renamed';
  ELSE
    RAISE NOTICE 'Index idx_subscriptions_user_id already renamed or does not exist';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_paddle_subscription_id') THEN
    ALTER INDEX public.idx_subscriptions_paddle_subscription_id 
    RENAME TO idx_payment_subscriptions_paddle_subscription_id;
    RAISE NOTICE 'Index idx_subscriptions_paddle_subscription_id renamed';
  ELSE
    RAISE NOTICE 'Index idx_subscriptions_paddle_subscription_id already renamed or does not exist';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_status') THEN
    ALTER INDEX public.idx_subscriptions_status 
    RENAME TO idx_payment_subscriptions_status;
    RAISE NOTICE 'Index idx_subscriptions_status renamed';
  ELSE
    RAISE NOTICE 'Index idx_subscriptions_status already renamed or does not exist';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_canceled_at') THEN
    ALTER INDEX public.idx_subscriptions_canceled_at 
    RENAME TO idx_payment_subscriptions_canceled_at;
    RAISE NOTICE 'Index idx_subscriptions_canceled_at renamed';
  ELSE
    RAISE NOTICE 'Index idx_subscriptions_canceled_at already renamed or does not exist';
  END IF;
END
$$;

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

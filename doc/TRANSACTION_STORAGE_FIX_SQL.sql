-- =========================================================
-- PAYMENT TRANSACTION ARCHITECTURE FIX - DATABASE UPDATES
-- =========================================================
-- Date: November 3, 2025
-- Purpose: Add transaction_id FK column to indb_paddle_transactions
--          to properly link Paddle transactions to main transaction table
--
-- INSTRUCTIONS: Run this SQL in Supabase SQL Editor
-- =========================================================

-- Step 1: Add transaction_id column to indb_paddle_transactions
-- This column will reference the main indb_payment_transactions table
ALTER TABLE indb_paddle_transactions 
ADD COLUMN IF NOT EXISTS transaction_id uuid NULL;

-- Step 2: Add foreign key constraint
-- This maintains referential integrity between tables
ALTER TABLE indb_paddle_transactions 
ADD CONSTRAINT IF NOT EXISTS indb_paddle_transactions_transaction_id_fkey 
FOREIGN KEY (transaction_id) 
REFERENCES indb_payment_transactions (id) 
ON DELETE CASCADE;

-- Step 3: Add index for performance
-- Improves query performance when joining tables
CREATE INDEX IF NOT EXISTS idx_paddle_transactions_transaction_id 
ON indb_paddle_transactions(transaction_id);

-- Step 4: Verify the Paddle gateway exists and is properly configured
-- This should return the Paddle gateway record
SELECT id, name, slug, is_active, is_default 
FROM indb_payment_gateways 
WHERE slug = 'paddle';

-- Expected result: 
-- id: e24339a4-ec2c-44f7-a6d5-41836025fd47
-- name: Paddle
-- slug: paddle
-- is_active: true/false (depends on your setup)
-- is_default: true/false (depends on your setup)

-- =========================================================
-- VERIFICATION QUERIES
-- =========================================================

-- Check if column was added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'indb_paddle_transactions' 
  AND column_name = 'transaction_id';

-- Check if foreign key constraint was added
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'indb_paddle_transactions' 
  AND constraint_name = 'indb_paddle_transactions_transaction_id_fkey';

-- Check if index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'indb_paddle_transactions' 
  AND indexname = 'idx_paddle_transactions_transaction_id';

-- =========================================================
-- NOTES
-- =========================================================
-- 1. The transaction_id column is nullable because existing records
--    won't have this value (they were created before this fix)
-- 2. All NEW transactions will have this field populated automatically
-- 3. The ON DELETE CASCADE ensures that if a main transaction is deleted,
--    the Paddle-specific record is also deleted (data consistency)
-- 4. If you have existing Paddle transactions, they will continue to work
--    but won't have the FK link to the main table (that's okay for historical data)

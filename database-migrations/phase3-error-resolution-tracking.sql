-- ============================================
-- Phase 3: Error Resolution Tracking Schema
-- ============================================
-- Date: October 7, 2025
-- Purpose: Add resolution tracking columns and indexes to indb_system_error_logs table
-- for Phase 3 Error Logging Dashboard implementation
--
-- IMPORTANT: Execute these statements in order
-- This migration is safe to run (all columns are nullable, no data loss)
-- ============================================

-- Step 1: Add resolution tracking columns
-- These columns track when and by whom errors are resolved or acknowledged
ALTER TABLE indb_system_error_logs 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 2: Create performance indexes
-- These indexes optimize the error dashboard queries

-- Index for severity filtering (most common filter)
CREATE INDEX IF NOT EXISTS idx_error_logs_severity 
ON indb_system_error_logs(severity);

-- Index for error_type filtering
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type 
ON indb_system_error_logs(error_type);

-- Index for created_at ordering (descending for recent errors)
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at 
ON indb_system_error_logs(created_at DESC);

-- Index for user_id filtering
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id 
ON indb_system_error_logs(user_id);

-- Partial index for unresolved errors (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved 
ON indb_system_error_logs(created_at DESC) 
WHERE resolved_at IS NULL;

-- Composite index for severity + unresolved errors
CREATE INDEX IF NOT EXISTS idx_error_logs_severity_unresolved 
ON indb_system_error_logs(severity, created_at DESC) 
WHERE resolved_at IS NULL;

-- Index for endpoint filtering (for error grouping)
CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint 
ON indb_system_error_logs(endpoint) 
WHERE endpoint IS NOT NULL;

-- Step 3: Add table comment for documentation
COMMENT ON TABLE indb_system_error_logs IS 
'System error logs with resolution tracking for Phase 3 error monitoring dashboard. 
Includes columns for error tracking, user context, and resolution management.';

-- Step 4: Add column comments for clarity
COMMENT ON COLUMN indb_system_error_logs.resolved_at IS 
'Timestamp when the error was marked as resolved by an admin';

COMMENT ON COLUMN indb_system_error_logs.resolved_by IS 
'Admin user ID who resolved the error (foreign key to auth.users)';

COMMENT ON COLUMN indb_system_error_logs.acknowledged_at IS 
'Timestamp when the error was acknowledged by an admin';

COMMENT ON COLUMN indb_system_error_logs.acknowledged_by IS 
'Admin user ID who acknowledged the error (foreign key to auth.users)';

-- ============================================
-- Verification Queries
-- ============================================
-- Run these queries after migration to verify success:

-- 1. Verify new columns exist
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'indb_system_error_logs' 
-- AND column_name IN ('resolved_at', 'resolved_by', 'acknowledged_at', 'acknowledged_by');

-- 2. Verify indexes were created
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'indb_system_error_logs' 
-- AND indexname LIKE 'idx_error_logs%';

-- 3. Check table structure
-- SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'indb_system_error_logs'
-- ORDER BY ordinal_position;

-- ============================================
-- Rollback Script (if needed)
-- ============================================
-- CAUTION: Only use this if you need to undo the migration
-- This will remove the resolution tracking columns and indexes

-- DROP INDEX IF EXISTS idx_error_logs_severity;
-- DROP INDEX IF EXISTS idx_error_logs_error_type;
-- DROP INDEX IF EXISTS idx_error_logs_created_at;
-- DROP INDEX IF EXISTS idx_error_logs_user_id;
-- DROP INDEX IF EXISTS idx_error_logs_unresolved;
-- DROP INDEX IF EXISTS idx_error_logs_severity_unresolved;
-- DROP INDEX IF EXISTS idx_error_logs_endpoint;

-- ALTER TABLE indb_system_error_logs 
-- DROP COLUMN IF EXISTS resolved_at,
-- DROP COLUMN IF EXISTS resolved_by,
-- DROP COLUMN IF EXISTS acknowledged_at,
-- DROP COLUMN IF EXISTS acknowledged_by;

-- ============================================
-- Migration Complete
-- ============================================

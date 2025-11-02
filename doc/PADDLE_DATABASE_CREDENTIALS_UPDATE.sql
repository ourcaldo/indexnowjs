-- ===================================================================
-- PADDLE CREDENTIALS - DATABASE UPDATE
-- ===================================================================
-- 
-- This SQL updates the Paddle payment gateway to store ACTUAL credentials
-- in the database instead of references to environment variables.
-- 
-- CRITICAL SECURITY:
-- - API keys and secrets are stored in database (encrypted at rest by Supabase)
-- - Frontend NEVER sees api_key or webhook_secret (only client_token via secure API)
-- - Backend routes handle all sensitive operations
-- 
-- ===================================================================

-- Step 1: Update Paddle gateway api_credentials with ACTUAL values
-- Replace the placeholder values below with your actual Paddle credentials

UPDATE indb_payment_gateways
SET 
  api_credentials = jsonb_build_object(
    'api_key', 'YOUR_ACTUAL_PADDLE_API_KEY_HERE',           -- e.g., 'pdl_sdbx_apikey_01k9031t4hj93qdw5tgp9p42j4_AzarJH82tBn82KzvXn4Rqs_Ag5'
    'webhook_secret', 'YOUR_ACTUAL_PADDLE_WEBHOOK_SECRET',   -- e.g., 'ntfset_01k9039g1bp7jbrg8trgsas17v'
    'client_token', 'YOUR_ACTUAL_PADDLE_CLIENT_TOKEN'        -- e.g., 'test_8657f80d36e644b89276fe6bfe6'
  ),
  updated_at = NOW()
WHERE slug = 'paddle';

-- Step 2: Verify the update (DO NOT expose this in production logs!)
SELECT 
  id,
  name,
  slug,
  is_active,
  is_default,
  api_credentials->>'api_key' as api_key_present,
  api_credentials->>'webhook_secret' as webhook_secret_present,
  api_credentials->>'client_token' as client_token_present,
  configuration->>'environment' as environment,
  updated_at
FROM indb_payment_gateways
WHERE slug = 'paddle';

-- Expected output (credentials values should NOT be 'YOUR_ACTUAL_...' anymore):
-- 
-- | name   | slug   | is_active | api_key_present           | webhook_secret_present | client_token_present | environment |
-- |--------|--------|-----------|---------------------------|------------------------|----------------------|-------------|
-- | Paddle | paddle | true      | pdl_sdbx_apikey_01k9...   | ntfset_01k9039g1bp...  | test_8657f80d36e6... | sandbox     |

-- ===================================================================
-- HOW TO GET YOUR PADDLE CREDENTIALS
-- ===================================================================
-- 
-- 1. Log into Paddle Dashboard: https://vendors.paddle.com/authentication/login
-- 
-- 2. Navigate to: Developer Tools → Authentication
--    - Copy "Paddle API Key" (starts with 'pdl_sdbx_apikey_' for sandbox or 'pdl_live_apikey_' for production)
--    - Copy "Client-side token" (starts with 'test_' for sandbox or 'live_' for production)
-- 
-- 3. Navigate to: Developer Tools → Notifications → Webhook endpoints
--    - Click on your webhook endpoint (or create one if it doesn't exist)
--    - Copy "Secret Key" (starts with 'ntfset_')
-- 
-- 4. Replace the placeholders in the SQL above with your actual values
-- 
-- 5. Run the UPDATE statement in your database
-- 
-- ===================================================================

-- Step 3: Activate Paddle gateway (if not already active)
UPDATE indb_payment_gateways
SET 
  is_active = true,
  is_default = true,
  updated_at = NOW()
WHERE slug = 'paddle';

-- Step 4: Verify Paddle is the active default gateway
SELECT name, slug, is_active, is_default
FROM indb_payment_gateways
ORDER BY is_default DESC, is_active DESC;

-- ===================================================================
-- SECURITY NOTES
-- ===================================================================
-- 
-- ✅ GOOD: Credentials stored in database (encrypted at rest by Supabase)
-- ✅ GOOD: Frontend loads client_token via secure backend API route
-- ✅ GOOD: Backend services load api_key and webhook_secret from database
-- ✅ GOOD: No NEXT_PUBLIC_ environment variables exposing secrets
-- 
-- ❌ BAD: Do NOT commit this SQL file with actual credentials to git
-- ❌ BAD: Do NOT use NEXT_PUBLIC_PADDLE_API_KEY (exposes secret to browser)
-- ❌ BAD: Do NOT print credentials to console logs
-- 
-- ===================================================================

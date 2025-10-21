# API Reference

This document lists all HTTP API endpoints automatically extracted from the codebase. Replace BASE_URL with your deployment domain.

## debug

### /api/debug/payment-result

- **methods**: —
- **auth**: unknown

## health

### /api/health

- **methods**: —
- **auth**: unknown

## midtrans

### /api/midtrans/webhook

- **methods**: —
- **auth**: unknown

## revalidate

### /api/revalidate

- **methods**: —
- **auth**: unknown

## system

### /api/system/restart-worker

- **methods**: —
- **auth**: unknown

### /api/system/status

- **methods**: —
- **auth**: unknown

### /api/system/worker-status

- **methods**: —
- **auth**: unknown

## v1/activity

### /api/v1/activity

- **methods**: POST
- **auth**: authenticated
- **description**: POST /api/v1/activity Log user activity from frontend (payment pages, checkout, etc.)  Authentication: Requires authenticated user (NOT admin) Database: Uses ActivityLogger which internally uses service role key for secure writes

```bash
curl -X POST \
  '${BASE_URL}/api/v1/activity' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

## v1/admin

### /api/v1/admin/activity

- **methods**: POST, GET
- **auth**: admin

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/activity' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/activity' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/activity/:id

- **methods**: GET
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/activity/:id' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/cms/categories

- **methods**: GET, POST
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/cms/categories' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/cms/categories' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/cms/categories/:id

- **methods**: GET, PUT, DELETE
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/cms/categories/:id' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X PUT \
  '${BASE_URL}/api/v1/admin/cms/categories/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

```bash
curl -X DELETE \
  '${BASE_URL}/api/v1/admin/cms/categories/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/cms/pages

- **methods**: GET, POST
- **auth**: admin
- **description**: GET /api/v1/admin/cms/pages Fetch all CMS pages  @security Requires super admin authentication @returns ApiSuccessResponse<CMSPage[]> | ApiErrorResponse

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/cms/pages' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/cms/pages' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/cms/pages/:id

- **methods**: GET, PUT, DELETE
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/cms/pages/:id' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X PUT \
  '${BASE_URL}/api/v1/admin/cms/pages/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

```bash
curl -X DELETE \
  '${BASE_URL}/api/v1/admin/cms/pages/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/cms/pages/:id/status

- **methods**: PATCH
- **auth**: admin

```bash
curl -X PATCH \
  '${BASE_URL}/api/v1/admin/cms/pages/:id/status' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/cms/pages/validate-slug

- **methods**: GET
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/cms/pages/validate-slug' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/cms/posts

- **methods**: GET, POST
- **auth**: admin
- **description**: GET /api/v1/admin/cms/posts Fetch all CMS posts with author information  @security Requires super admin authentication @returns ApiSuccessResponse<CMSPostWithAuthor[]> | ApiErrorResponse

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/cms/posts' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/cms/posts' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/cms/posts/:id

- **methods**: GET, PUT, DELETE
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/cms/posts/:id' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X PUT \
  '${BASE_URL}/api/v1/admin/cms/posts/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

```bash
curl -X DELETE \
  '${BASE_URL}/api/v1/admin/cms/posts/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/cms/posts/:id/status

- **methods**: PATCH
- **auth**: admin

```bash
curl -X PATCH \
  '${BASE_URL}/api/v1/admin/cms/posts/:id/status' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/cms/posts/validate-slug

- **methods**: GET
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/cms/posts/validate-slug' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/cms/revalidate

- **methods**: POST, GET
- **auth**: admin

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/cms/revalidate' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/cms/revalidate' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/cms/upload

- **methods**: POST
- **auth**: admin

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/cms/upload' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/dashboard

- **methods**: GET
- **auth**: admin
- **description**: Admin Dashboard Stats - Standardized Response Format GET /api/v1/admin/dashboard  Returns: ApiSuccessResponse<stats> | ApiErrorResponse

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/dashboard' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/debug-auth

- **methods**: GET, POST
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/debug-auth' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/debug-auth' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/errors

- **methods**: GET
- **auth**: admin
- **description**: GET /api/v1/admin/errors Retrieve paginated error list with comprehensive filtering  Query Parameters: - page: Page number (default: 1) - limit: Items per page (default: 100, max: 200) - severity: Filter by severity (CRITICAL, HIGH, MEDIUM, LOW) - type: Filter by error type (AUTHENTICATION, DATABASE, EXTERNAL_API, etc.) - userId: Filter by user ID - endpoint: Filter by endpoint (partial match) - dateFrom: Filter errors from date (ISO 8601) - dateTo: Filter errors to date (ISO 8601) - status: Filter by resolution status (new, acknowledged, resolved) - search: Full-text search in message and user_message - sortBy: Sort field (default: created_at) - sortOrder: Sort order (asc|desc, default: desc)

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/errors' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/errors/:id

- **methods**: GET, PATCH
- **auth**: admin
- **description**: GET /api/v1/admin/errors/[id] Retrieve detailed error information by ID

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/errors/:id' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X PATCH \
  '${BASE_URL}/api/v1/admin/errors/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/errors/critical

- **methods**: GET
- **auth**: admin
- **description**: GET /api/v1/admin/errors/critical Query Parameters: - limit: Maximum number of critical errors to return (default: 50, max: 200)

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/errors/critical' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/errors/stats

- **methods**: GET
- **auth**: admin
- **description**: GET /api/v1/admin/errors/stats Query Parameters: - range: Time range (24h, 7d, 30d) - defaults to 24h

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/errors/stats' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/orders

- **methods**: GET
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/orders' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/orders/:id

- **methods**: GET
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/orders/:id' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/orders/:id/status

- **methods**: PATCH
- **auth**: admin

```bash
curl -X PATCH \
  '${BASE_URL}/api/v1/admin/orders/:id/status' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/packages

- **methods**: GET
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/packages' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/rank-tracker/trigger-manual-check

- **methods**: POST, GET
- **auth**: admin
- **description**: Admin API - Manual Rank Check Trigger Allows admin to manually trigger the daily rank check process

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/rank-tracker/trigger-manual-check' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/rank-tracker/trigger-manual-check' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/seo/sitemap/monitoring

- **methods**: GET, DELETE
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/seo/sitemap/monitoring' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X DELETE \
  '${BASE_URL}/api/v1/admin/seo/sitemap/monitoring' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/seo/sitemap/regenerate

- **methods**: POST
- **auth**: admin

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/seo/sitemap/regenerate' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/seo/sitemap/test

- **methods**: POST
- **auth**: admin

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/seo/sitemap/test' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/settings/packages

- **methods**: GET, POST
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/settings/packages' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/settings/packages' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/settings/packages/:id

- **methods**: PATCH, DELETE
- **auth**: admin

```bash
curl -X PATCH \
  '${BASE_URL}/api/v1/admin/settings/packages/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

```bash
curl -X DELETE \
  '${BASE_URL}/api/v1/admin/settings/packages/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/settings/payments

- **methods**: GET, POST
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/settings/payments' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/settings/payments' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/settings/payments/:id

- **methods**: PATCH, DELETE
- **auth**: admin

```bash
curl -X PATCH \
  '${BASE_URL}/api/v1/admin/settings/payments/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

```bash
curl -X DELETE \
  '${BASE_URL}/api/v1/admin/settings/payments/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/settings/payments/:id/default

- **methods**: PATCH
- **auth**: admin

```bash
curl -X PATCH \
  '${BASE_URL}/api/v1/admin/settings/payments/:id/default' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/settings/site

- **methods**: GET, PATCH
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/settings/site' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X PATCH \
  '${BASE_URL}/api/v1/admin/settings/site' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/settings/site/test-email

- **methods**: POST
- **auth**: admin

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/settings/site/test-email' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/users

- **methods**: GET
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/users' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/users/:id

- **methods**: GET, PATCH
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/users/:id' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X PATCH \
  '${BASE_URL}/api/v1/admin/users/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/users/:id/activity

- **methods**: GET
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/users/:id/activity' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/users/:id/api-stats

- **methods**: GET
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/users/:id/api-stats' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/users/:id/change-package

- **methods**: POST
- **auth**: admin

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/users/:id/change-package' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/users/:id/extend-subscription

- **methods**: POST
- **auth**: admin

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/users/:id/extend-subscription' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/users/:id/quota-usage

- **methods**: GET
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/users/:id/quota-usage' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/users/:id/reset-password

- **methods**: POST
- **auth**: admin

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/users/:id/reset-password' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/users/:id/reset-quota

- **methods**: POST
- **auth**: admin

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/users/:id/reset-quota' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/users/:id/security

- **methods**: GET
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/users/:id/security' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/users/:id/service-accounts

- **methods**: GET
- **auth**: admin

```bash
curl -X GET \
  '${BASE_URL}/api/v1/admin/users/:id/service-accounts' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/admin/users/:id/suspend

- **methods**: PATCH
- **auth**: admin

```bash
curl -X PATCH \
  '${BASE_URL}/api/v1/admin/users/:id/suspend' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/admin/verify-role

- **methods**: POST
- **auth**: admin

```bash
curl -X POST \
  '${BASE_URL}/api/v1/admin/verify-role' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

## v1/auth

### /api/v1/auth/callback

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/auth/callback'
```

### /api/v1/auth/detect-location

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/auth/detect-location'
```

### /api/v1/auth/login

- **methods**: POST
- **auth**: public

```bash
curl -X POST \
  '${BASE_URL}/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/auth/logout

- **methods**: POST
- **auth**: public

```bash
curl -X POST \
  '${BASE_URL}/api/v1/auth/logout' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/auth/register

- **methods**: POST
- **auth**: public

```bash
curl -X POST \
  '${BASE_URL}/api/v1/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/auth/resend-verification

- **methods**: POST
- **auth**: public

```bash
curl -X POST \
  '${BASE_URL}/api/v1/auth/resend-verification' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/auth/session

- **methods**: GET, POST, DELETE
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/auth/session'
```

```bash
curl -X POST \
  '${BASE_URL}/api/v1/auth/session' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

```bash
curl -X DELETE \
  '${BASE_URL}/api/v1/auth/session' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/auth/test-login

- **methods**: POST
- **auth**: public

```bash
curl -X POST \
  '${BASE_URL}/api/v1/auth/test-login' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/auth/user/change-password

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/auth/user/change-password' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/auth/user/profile

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/auth/user/profile' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/auth/user/quota

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/auth/user/quota' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/auth/user/settings

- **methods**: GET, PUT
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/auth/user/settings' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X PUT \
  '${BASE_URL}/api/v1/auth/user/settings' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/auth/user/trial-eligibility

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/auth/user/trial-eligibility' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/auth/user/trial-status

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/auth/user/trial-status' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/auth/verify

- **methods**: GET
- **auth**: public
- **description**: Supabase Email Verification Route Handles verification URLs from Supabase with different types: - type=signup: Email confirmation for new registration - type=recovery: Password reset verification - type=magiclink: Magic link authentication  Note: This route returns redirects (not JSON) as it's accessed via email links

```bash
curl -X GET \
  '${BASE_URL}/api/v1/auth/verify'
```

## v1/billing

### /api/v1/billing/cancel-trial

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/billing/cancel-trial' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/billing/channels/bank-transfer

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/billing/channels/bank-transfer' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/billing/channels/midtrans-recurring

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/billing/channels/midtrans-recurring' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/billing/channels/midtrans-snap

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/billing/channels/midtrans-snap' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/billing/history

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/billing/history' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/billing/midtrans-3ds-callback

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/billing/midtrans-3ds-callback' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/billing/midtrans-config

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/billing/midtrans-config' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/billing/midtrans/create-payment

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/billing/midtrans/create-payment' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/billing/midtrans/process-recurring

- **methods**: POST
- **auth**: public

```bash
curl -X POST \
  '${BASE_URL}/api/v1/billing/midtrans/process-recurring' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/billing/orders/:id

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/billing/orders/:id' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/billing/overview

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/billing/overview' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/billing/packages

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/billing/packages' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/billing/packages/:id

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/billing/packages/:id'
```

### /api/v1/billing/payment

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/billing/payment' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/billing/payment-gateways

- **methods**: GET
- **auth**: authenticated
- **description**: SECURITY FIX: This endpoint now requires authentication Previously had NO authentication check - critical security vulnerability fixed

```bash
curl -X GET \
  '${BASE_URL}/api/v1/billing/payment-gateways' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/billing/transactions/:id

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/billing/transactions/:id' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/billing/upload-proof

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/billing/upload-proof' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

## v1/blog

### /api/v1/blog/categories

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/blog/categories'
```

### /api/v1/blog/posts

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/blog/posts'
```

### /api/v1/blog/posts/:slug

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/blog/posts/:slug'
```

## v1/dashboard

### /api/v1/dashboard

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/dashboard' \
  -H 'Authorization: Bearer ${TOKEN}'
```

## v1/indexing

### /api/v1/indexing/jobs

- **methods**: GET, POST
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/indexing/jobs' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X POST \
  '${BASE_URL}/api/v1/indexing/jobs' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/indexing/jobs/:id

- **methods**: GET, PUT, PATCH, DELETE
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/indexing/jobs/:id' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X PUT \
  '${BASE_URL}/api/v1/indexing/jobs/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

```bash
curl -X PATCH \
  '${BASE_URL}/api/v1/indexing/jobs/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

```bash
curl -X DELETE \
  '${BASE_URL}/api/v1/indexing/jobs/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/indexing/jobs/:id/process

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/indexing/jobs/:id/process' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/indexing/jobs/:id/submissions

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/indexing/jobs/:id/submissions' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/indexing/jobs/stop-all

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/indexing/jobs/stop-all' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/indexing/jobs/trigger-processing

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/indexing/jobs/trigger-processing' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/indexing/parse-sitemap

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/indexing/parse-sitemap' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/indexing/service-accounts

- **methods**: GET, POST
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/indexing/service-accounts' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X POST \
  '${BASE_URL}/api/v1/indexing/service-accounts' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/indexing/service-accounts/:id

- **methods**: DELETE
- **auth**: authenticated

```bash
curl -X DELETE \
  '${BASE_URL}/api/v1/indexing/service-accounts/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

## v1/integrations

### /api/v1/integrations/seranking/health

- **methods**: GET
- **auth**: public
- **description**: SeRanking Health Check API Endpoint GET /api/v1/integrations/seranking/health  Provides comprehensive health status of SeRanking integration

```bash
curl -X GET \
  '${BASE_URL}/api/v1/integrations/seranking/health'
```

### /api/v1/integrations/seranking/health/metrics

- **methods**: GET
- **auth**: system
- **description**: SeRanking Performance Metrics API Endpoint GET /api/v1/integrations/seranking/health/metrics  Provides detailed performance metrics and API analytics

```bash
curl -X GET \
  '${BASE_URL}/api/v1/integrations/seranking/health/metrics'
```

### /api/v1/integrations/seranking/keyword-data

- **methods**: GET
- **auth**: system
- **description**: SeRanking Single Keyword Intelligence API Endpoint GET /api/v1/integrations/seranking/keyword-data  Provides keyword intelligence data with cache-first strategy

```bash
curl -X GET \
  '${BASE_URL}/api/v1/integrations/seranking/keyword-data'
```

### /api/v1/integrations/seranking/keyword-data/bulk

- **methods**: POST
- **auth**: system
- **description**: SeRanking Bulk Keyword Enrichment API Endpoint POST /api/v1/integrations/seranking/keyword-data/bulk  Handles bulk keyword enrichment with queue-based processing

```bash
curl -X POST \
  '${BASE_URL}/api/v1/integrations/seranking/keyword-data/bulk' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/integrations/seranking/quota/history

- **methods**: GET
- **auth**: system
- **description**: SeRanking Quota Usage History API Endpoint GET /api/v1/integrations/seranking/quota/history  Provides historical quota usage data and analytics

```bash
curl -X GET \
  '${BASE_URL}/api/v1/integrations/seranking/quota/history'
```

### /api/v1/integrations/seranking/quota/status

- **methods**: GET
- **auth**: authenticated
- **description**: SeRanking Quota Status API Endpoint GET /api/v1/integrations/seranking/quota/status  Provides current quota usage status and limits

```bash
curl -X GET \
  '${BASE_URL}/api/v1/integrations/seranking/quota/status' \
  -H 'Authorization: Bearer ${TOKEN}'
```

## v1/notifications

### /api/v1/notifications/dismiss/:id

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/notifications/dismiss/:id' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/notifications/service-account-quota

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/notifications/service-account-quota' \
  -H 'Authorization: Bearer ${TOKEN}'
```

## v1/payments

### /api/v1/payments/channels/snap

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/payments/channels/snap' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/payments/midtrans/webhook

- **methods**: POST
- **auth**: public

```bash
curl -X POST \
  '${BASE_URL}/api/v1/payments/midtrans/webhook' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

## v1/public

### /api/v1/public/contact

- **methods**: POST
- **auth**: public

```bash
curl -X POST \
  '${BASE_URL}/api/v1/public/contact' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/public/packages

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/public/packages'
```

### /api/v1/public/pages

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/public/pages'
```

### /api/v1/public/pages/:slug

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/public/pages/:slug'
```

### /api/v1/public/settings

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/public/settings'
```

### /api/v1/public/site-settings

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/public/site-settings'
```

## v1/rank-tracking

### /api/v1/rank-tracking/check-rank

- **methods**: POST, GET
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/rank-tracking/check-rank' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

```bash
curl -X GET \
  '${BASE_URL}/api/v1/rank-tracking/check-rank' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/rank-tracking/countries

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/rank-tracking/countries'
```

### /api/v1/rank-tracking/domains

- **methods**: GET, POST
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/rank-tracking/domains' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X POST \
  '${BASE_URL}/api/v1/rank-tracking/domains' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/rank-tracking/keyword-usage

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/rank-tracking/keyword-usage' \
  -H 'Authorization: Bearer ${TOKEN}'
```

### /api/v1/rank-tracking/keywords

- **methods**: GET, POST
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/rank-tracking/keywords' \
  -H 'Authorization: Bearer ${TOKEN}'
```

```bash
curl -X POST \
  '${BASE_URL}/api/v1/rank-tracking/keywords' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/rank-tracking/keywords/add-tag

- **methods**: POST
- **auth**: authenticated

```bash
curl -X POST \
  '${BASE_URL}/api/v1/rank-tracking/keywords/add-tag' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/rank-tracking/keywords/bulk-delete

- **methods**: DELETE
- **auth**: authenticated

```bash
curl -X DELETE \
  '${BASE_URL}/api/v1/rank-tracking/keywords/bulk-delete' \
  -H 'Authorization: Bearer ${TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"example\":\"value\"}'
```

### /api/v1/rank-tracking/rank-history

- **methods**: GET
- **auth**: authenticated

```bash
curl -X GET \
  '${BASE_URL}/api/v1/rank-tracking/rank-history' \
  -H 'Authorization: Bearer ${TOKEN}'
```

## v1/system

### /api/v1/system/health

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/system/health'
```

### /api/v1/system/status

- **methods**: GET
- **auth**: public

```bash
curl -X GET \
  '${BASE_URL}/api/v1/system/status'
```

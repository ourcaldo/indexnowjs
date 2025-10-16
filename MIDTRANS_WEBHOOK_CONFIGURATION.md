# Midtrans Webhook Configuration Guide

## Issue
After implementing subdomain (api.domain.com), the webhook URL returns 404.

**Incorrect URL (404):**
```
https://api.indexnow.studio/v1/billing/midtrans/webhook
```

## ✅ Correct Webhook URLs

### Option 1: Unified Webhook (Recommended)
**URL:** `https://api.indexnow.studio/api/midtrans/webhook`

**Features:**
- Handles both Snap and Recurring payments
- Automatic payment type detection
- Comprehensive logging
- Signature verification for both payment types
- Subscription event handling

**Route Location:** `app/api/midtrans/webhook/route.ts`

### Option 2: Legacy Webhook
**URL:** `https://api.indexnow.studio/api/v1/payments/midtrans/webhook`

**Features:**
- Basic Midtrans notification handling
- Signature verification
- Transaction status updates

**Route Location:** `app/api/v1/payments/midtrans/webhook/route.ts`

## Configuration in Midtrans Dashboard

1. **Login to Midtrans Dashboard**
   - Sandbox: https://dashboard.sandbox.midtrans.com
   - Production: https://dashboard.midtrans.com

2. **Navigate to Settings > Configuration**
   - Find "Payment Notification URL" or "Webhook URL"

3. **Set the Webhook URL**
   ```
   https://api.indexnow.studio/api/midtrans/webhook
   ```

4. **Save Configuration**

## Testing the Webhook

### Test if webhook is accessible:
```bash
curl -X GET "https://api.indexnow.studio/api/midtrans/webhook"
```

Expected response:
```json
{
  "status": "ok",
  "message": "Webhook endpoint active"
}
```

### Test webhook with sample data:
```bash
curl -X POST "https://api.indexnow.studio/api/midtrans/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "test-order-123",
    "transaction_status": "settlement",
    "status_code": "200",
    "gross_amount": "100000"
  }'
```

## Important Notes

### Subdomain Configuration
- ✅ Main domain: `https://indexnow.studio` (frontend)
- ✅ API subdomain: `https://api.indexnow.studio` (backend API)
- ✅ Webhook URL uses API subdomain

### Supported Payment Methods
The unified webhook handles:
- **Snap payments** (midtrans_snap)
- **Recurring payments** (midtrans_recurring / midtrans)
- **Bank transfer** (via Snap)
- **Credit card** (3DS authentication)
- **Subscription events**

### Webhook Events Handled
- `capture` - Payment captured
- `settlement` - Payment settled
- `pending` - Payment pending
- `deny` - Payment denied
- `cancel` - Payment cancelled
- `expire` - Payment expired
- `failure` - Payment failed
- **Subscription events:**
  - `subscription.created`
  - `subscription.updated`
  - `subscription.disabled`
  - `subscription.charged`

## Troubleshooting

### 404 Error
**Problem:** Webhook URL returns 404
**Solution:** 
- Check you're using the correct URL (see above)
- Ensure API subdomain is properly configured
- Verify Next.js API routes are deployed

### Signature Verification Failed
**Problem:** Webhook receives notifications but signature verification fails
**Solution:**
- Ensure `MIDTRANS_SERVER_KEY` environment variable is set correctly
- Check the server key matches between app and Midtrans dashboard

### Transaction Not Found
**Problem:** Webhook cannot find transaction
**Solution:**
- Ensure order_id from Midtrans matches transaction ID in database
- Check if transaction was created before webhook notification

## Environment Variables Required

```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
MIDTRANS_MERCHANT_ID=your_merchant_id

# API Base URL (for subdomain)
NEXT_PUBLIC_API_BASE_URL=https://api.indexnow.studio/api
```

## Endpoint Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/midtrans/webhook` | POST | Unified webhook handler (recommended) |
| `/api/midtrans/webhook` | GET | Webhook verification |
| `/api/v1/payments/midtrans/webhook` | POST | Legacy webhook handler |

# Order ID Migration Plan: From payment_reference to id

## Executive Summary
This document outlines the complete migration plan to replace the custom `payment_reference` order ID system with the database table's primary `id` field as the order identifier throughout IndexNow Studio.

---

## Current State Analysis

### Order ID Generation Patterns Found
1. **Midtrans Create Payment**: `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
2. **Snap Handler**: `SNAP-${Date.now()}-${user_id.slice(0, 8)}`
3. **Bank Transfer**: `BT-${Date.now()}-${user_id.slice(0, 8)}`
4. **Core Processor**: `${method}_${userPrefix}_${timestamp}`

### Database Schema Impact
- **Current Primary Key**: `id` (UUID) - Already unique and secure
- **Current Order Reference**: `payment_reference` (TEXT) - Custom generated, to be removed
- **Gateway Reference**: `gateway_transaction_id` (TEXT) - Remains unchanged

---

## Complete Order ID Usage Locations

### 1. Backend API Endpoints

#### Payment Creation APIs
- **File**: `app/api/v1/billing/midtrans/create-payment/route.ts`
  - **Line 79**: `const orderId = ORDER-${Date.now()}-${Math.random()...}`
  - **Line 87**: `order_id: orderId` in Midtrans payload
  - **Line 204**: `order_id: orderId` in response data
  - **Action**: Remove generation, use database `id` from transaction creation

#### Payment Channel Handlers
- **File**: `app/api/v1/billing/channels/midtrans-snap/handler.ts`
  - **Line 29**: `const orderId = SNAP-${Date.now()}-${user_id...}`
  - **Line 32**: `createPendingTransaction(orderId, ...)`
  - **Line 70**: `redirect_url: /dashboard/settings/plans-billing/order/${orderId}`
  - **Line 72**: `order_id: orderId` in response
  - **Action**: Create transaction first, then use returned `id`

- **File**: `app/api/v1/billing/channels/bank-transfer/handler.ts`
  - **Line 20**: `const orderId = BT-${Date.now()}-${user_id...}`
  - **Line 42**: `.eq('payment_reference', orderId)` for database update
  - **Line 48**: `orderId: orderId` in email service
  - **Line 70**: `redirect_url: /order/${orderId}`
  - **Line 72**: `order_id: orderId` in response
  - **Action**: Create transaction first, then use returned `id`

- **File**: `app/api/v1/billing/channels/midtrans-recurring/handler.ts`
  - **Similar pattern to above handlers**
  - **Action**: Create transaction first, then use returned `id`

#### Order Lookup APIs
- **File**: `app/api/v1/billing/orders/[order_id]/route.ts`
  - **Line 11**: Route parameter `{ order_id: string }`
  - **Line 48**: `console.log('[ORDER-API] Searching for payment_reference:', order_id...)`
  - **Line 56**: `.eq('payment_reference', order_id)` database query
  - **Line 89**: `order_id: transaction.payment_reference` in response
  - **Action**: Change route to `[id]`, query by `id` field, return `id` as order_id

- **File**: `app/api/v1/billing/transactions/[id]/route.ts`
  - **Line 40**: `.eq('id', (await params).id)` - Already uses table id
  - **Action**: No changes needed - this is the target pattern

#### Billing History APIs
- **File**: `app/api/v1/billing/history/route.ts`
  - **Line 44**: `payment_reference,` in SELECT query
  - **Line 90-94**: Response mapping includes `payment_reference`
  - **Action**: Remove `payment_reference` from SELECT, map `id` as `order_id`

#### Admin Order Management
- **File**: `app/api/v1/admin/orders/route.ts`
  - **Line 60**: `payment_reference,` in SELECT query
  - **Line 148-168**: Response transformation with `payment_reference`
  - **Action**: Remove `payment_reference` from SELECT, map `id` as `order_id`

- **File**: `app/api/v1/admin/orders/[id]/route.ts`
  - **Line 45**: `.eq('id', orderId)` - Already uses table id
  - **Action**: No changes needed - this is the target pattern

#### Webhook and Callback Handlers
- **File**: `app/api/v1/billing/midtrans-3ds-callback/route.ts`
  - **Line 9**: `const { transaction_id, order_id } = await request.json()`
  - **Line 26**: `.eq('gateway_transaction_id', transaction_id)` for lookup
  - **Action**: Update to use table `id` for internal references

- **File**: `app/api/midtrans/webhook/route.ts`
  - **Contains webhook processing logic**
  - **Action**: Review and update order lookup logic

### 2. Frontend Components

#### Order Detail Pages
- **File**: `app/dashboard/settings/plans-billing/order/[id]/page.tsx`
  - **Line 24**: `payment_reference: string` in Transaction interface
  - **Line 75**: `fetch(/api/v1/billing/transactions/${params.id})` - Uses correct API
  - **Line 275**: `{transaction.payment_reference}` in Order ID display
  - **Line 433**: `{transaction.payment_reference}` in Reference Number display
  - **Action**: Update interface, remove payment_reference displays, show `id` as Order ID

#### Billing History Components
- **File**: `app/dashboard/settings/plans-billing/page.tsx`
  - **Line 46**: `payment_reference: string` in Transaction interface
  - **Action**: Remove from interface, handle in BillingHistory component

- **File**: `app/dashboard/settings/plans-billing/components/BillingHistory.tsx`
  - **Contains transaction display logic**
  - **Action**: Update to display `id` as Order ID

- **File**: `app/dashboard/settings/plans-billing/history/HistoryTab.tsx`
  - **Contains history tab display logic**
  - **Action**: Update Order ID column to show `id`

#### Admin Order Management
- **File**: `app/backend/admin/orders/page.tsx`
  - **Contains admin order list display**
  - **Action**: Update Order ID column to show `id`

- **File**: `app/backend/admin/orders/[id]/page.tsx`
  - **Contains admin order detail display**
  - **Action**: Update Order ID display to show `id`

### 3. Email Templates

#### Billing Confirmation Emails
- **File**: `lib/email/templates/billing-confirmation.html`
  - **Line 222**: `<span class="stats-value">{{orderId}}</span>`
  - **Line 299**: `include your Order ID ({{orderId}}) in the payment reference`
  - **Action**: Update template to use table `id` as {{orderId}}

#### Email Service
- **File**: `lib/email/emailService.ts`
  - **Line 229**: `orderId: data.orderId,` in email data
  - **Action**: Update email service to pass table `id` as orderId

### 4. Payment Service Logic

#### Base Handler
- **File**: `app/api/v1/billing/channels/shared/base-handler.ts`
  - **Contains transaction creation logic**
  - **Action**: Update to create transaction first, return `id` for order operations

#### Payment Router
- **File**: `lib/payment-services/payment-router.ts`
  - **Contains payment processing coordination**
  - **Action**: Update response handling to use table `id`

#### Midtrans Services
- **File**: `lib/services/payments/midtrans/MidtransSnapService.ts`
  - **Contains Snap payment processing**
  - **Action**: Update order_id handling in responses

---

## Migration Implementation Plan

### Phase 1: Database Schema Changes
1. **Add migration safety check**
   - Verify all existing `payment_reference` values are unique
   - Check for any external dependencies on `payment_reference` format

2. **Update database queries preparation**
   - Create backup of current `payment_reference` data
   - Prepare SQL queries for column removal

### Phase 2: Backend API Migration
1. **Update transaction creation flow**
   - Modify base handlers to create transaction record first
   - Use returned database `id` for all subsequent operations
   - Remove custom order ID generation logic

2. **Update payment channel handlers**
   - `midtrans-snap/handler.ts`: Create transaction → use `id`
   - `bank-transfer/handler.ts`: Create transaction → use `id`  
   - `midtrans-recurring/handler.ts`: Create transaction → use `id`

3. **Update order lookup APIs**
   - Change `/api/v1/billing/orders/[order_id]/route.ts` to use `id` queries
   - Update response mapping to use `id` as `order_id`
   - Update all `.eq('payment_reference', ...)` to `.eq('id', ...)`

4. **Update billing and admin APIs**
   - Remove `payment_reference` from SELECT queries
   - Update response transformations to map `id` as `order_id`
   - Update admin order management to use `id`

### Phase 3: Frontend Component Updates
1. **Update TypeScript interfaces**
   - Remove `payment_reference` from Transaction interfaces
   - Update all components to use `id` as order identifier

2. **Update order detail pages**
   - `/order/[id]/page.tsx`: Display `id` as Order ID
   - Remove `payment_reference` references
   - Update API calls to use `id` parameter

3. **Update billing history displays**
   - Update table columns to show `id` as Order ID
   - Remove `payment_reference` column displays
   - Update sorting and filtering logic

4. **Update admin panels**
   - Update order list to display `id` as Order ID
   - Update order detail pages
   - Update bulk operations to use `id`

### Phase 4: Email and Notification Updates
1. **Update email templates**
   - Replace `{{orderId}}` references to use table `id`
   - Update payment instructions to reference table `id`

2. **Update email service**
   - Pass table `id` as `orderId` in email data
   - Update all email notification calls

### Phase 5: Gateway Integration Updates
1. **Update Midtrans integration**
   - Use table `id` in Midtrans `order_id` field
   - Update webhook processing to handle UUID order IDs
   - Test gateway compatibility with UUID format

2. **Update redirect URLs**
   - Change all redirect URLs to use table `id`
   - Update success/failure page routing

### Phase 6: Database Schema Cleanup
1. **Remove payment_reference column**
   - Drop column from `indb_payment_transactions`
   - Update any remaining database constraints
   - Clean up any related indexes

---

## Risk Assessment & Considerations

### High Priority Risks
1. **Gateway Compatibility**: Some payment gateways may have restrictions on order ID format
2. **External References**: Any external systems storing the old `payment_reference` format
3. **Email Tracking**: Existing emails with old order IDs may become untrackable
4. **URL Breaking**: Existing order detail URLs with `payment_reference` will break

### Medium Priority Risks
1. **Customer Experience**: UUID order IDs are less user-friendly
2. **Support Issues**: Support team may prefer readable order IDs
3. **Webhook Processing**: External webhooks may reference old order ID format

### Low Priority Risks
1. **Database Performance**: UUID vs VARCHAR query performance differences
2. **Logging**: Log analysis tools may expect specific order ID formats

---

## Rollback Strategy

### Immediate Rollback (if issues found)
1. Keep `payment_reference` column during migration
2. Maintain dual-reference system temporarily
3. Switch back to `payment_reference` queries if needed

### Data Recovery
1. Backup all transaction data before migration
2. Keep mapping between old `payment_reference` and new `id` usage
3. Maintain email template versioning for troubleshooting

---

## Testing Requirements

### Unit Tests
- Test all payment channel handlers with new `id` system
- Test order lookup APIs with UUID parameters
- Test email generation with table `id` as order reference

### Integration Tests  
- Test complete payment flow from checkout to completion
- Test webhook processing with new order ID format
- Test admin order management functionality

### User Acceptance Tests
- Test checkout process with new order ID format
- Test order detail page display
- Test email notifications with new order IDs
- Test billing history display

---

## Implementation Timeline

### Week 1: Preparation
- Day 1-2: Database backup and safety checks
- Day 3-4: Backend API updates (Phase 2)
- Day 5: Testing and validation

### Week 2: Frontend Migration  
- Day 1-3: Frontend component updates (Phase 3)
- Day 4-5: Email and notification updates (Phase 4)

### Week 3: Gateway Integration
- Day 1-3: Gateway integration updates (Phase 5)
- Day 4-5: Comprehensive testing

### Week 4: Cleanup and Monitoring
- Day 1-2: Database schema cleanup (Phase 6)
- Day 3-5: Monitoring and issue resolution

---

## Files Requiring Changes (Complete List)

### Backend Files (19 files)
1. `app/api/v1/billing/midtrans/create-payment/route.ts`
2. `app/api/v1/billing/channels/midtrans-snap/handler.ts`
3. `app/api/v1/billing/channels/bank-transfer/handler.ts`
4. `app/api/v1/billing/channels/midtrans-recurring/handler.ts`
5. `app/api/v1/billing/channels/shared/base-handler.ts`
6. `app/api/v1/billing/orders/[order_id]/route.ts` → rename to `[id]/route.ts`
7. `app/api/v1/billing/history/route.ts`
8. `app/api/v1/billing/upload-proof/route.ts`
9. `app/api/v1/billing/midtrans-3ds-callback/route.ts`
10. `app/api/v1/admin/orders/route.ts`
11. `app/api/v1/admin/orders/[id]/route.ts`
12. `app/api/v1/admin/orders/[id]/status/route.ts`
13. `app/api/midtrans/webhook/route.ts`
14. `lib/email/emailService.ts`
15. `lib/services/payments/core/PaymentProcessor.ts`
16. `lib/services/payments/midtrans/MidtransSnapService.ts`
17. `lib/payment-services/payment-router.ts`
18. `lib/types/services/Database.ts`

### Frontend Files (8 files)
1. `app/dashboard/settings/plans-billing/page.tsx`
2. `app/dashboard/settings/plans-billing/order/[id]/page.tsx`
3. `app/dashboard/settings/plans-billing/history/page.tsx`
4. `app/dashboard/settings/plans-billing/history/HistoryTab.tsx`
5. `app/dashboard/settings/plans-billing/components/BillingHistory.tsx`
6. `app/backend/admin/orders/page.tsx`
7. `app/backend/admin/orders/[id]/page.tsx`

### Email Templates (1 file)
1. `lib/email/templates/billing-confirmation.html`

### Database Schema (1 change)
1. **Remove column**: `payment_reference` from `indb_payment_transactions`

---

## Step-by-Step Migration Implementation

### Step 1: Update Base Payment Handler
**File**: `app/api/v1/billing/channels/shared/base-handler.ts`
- Modify `createPendingTransaction` method to return the created transaction
- Update all child handlers to create transaction first, then use returned `id`

### Step 2: Update Payment Channel Handlers (4 files)
**Files**: 
- `app/api/v1/billing/channels/midtrans-snap/handler.ts`
- `app/api/v1/billing/channels/bank-transfer/handler.ts`
- `app/api/v1/billing/channels/midtrans-recurring/handler.ts`
- `app/api/v1/billing/midtrans/create-payment/route.ts`

**Changes per file**:
- Remove custom order ID generation logic
- Create transaction record first
- Use returned transaction `id` for all operations
- Update redirect URLs to use table `id`
- Update response data to use table `id` as `order_id`

### Step 3: Update Order Lookup API
**File**: `app/api/v1/billing/orders/[order_id]/route.ts` → **Rename to**: `[id]/route.ts`
- Change route parameter from `order_id` to `id`
- Update database query: `.eq('payment_reference', order_id)` → `.eq('id', id)`
- Update response mapping: `order_id: transaction.payment_reference` → `order_id: transaction.id`

### Step 4: Update Billing History API
**File**: `app/api/v1/billing/history/route.ts`
- Remove `payment_reference` from SELECT query (line 44)
- Update response transformation to map `id` as `order_id`
- Update all response objects to use table `id`

### Step 5: Update Admin Order APIs (3 files)
**Files**:
- `app/api/v1/admin/orders/route.ts`
- `app/api/v1/admin/orders/[id]/route.ts`
- `app/api/v1/admin/orders/[id]/status/route.ts`

**Changes**:
- Remove `payment_reference` from SELECT queries
- Update response transformations to use table `id` as order identifier
- Ensure admin interfaces use table `id` for order operations

### Step 6: Update Webhook and Callback Processing (2 files)
**Files**:
- `app/api/v1/billing/midtrans-3ds-callback/route.ts`
- `app/api/midtrans/webhook/route.ts`

**Changes**:
- Update order lookup logic to use table `id`
- Update webhook processing to handle UUID order IDs
- Test gateway compatibility with new order ID format

### Step 7: Update Email Service and Templates (2 files)
**File**: `lib/email/emailService.ts`
- Update `sendBillingConfirmation` method to use table `id` as `orderId`
- Update all email service calls to pass table `id`

**File**: `lib/email/templates/billing-confirmation.html`
- Ensure `{{orderId}}` displays the table `id`
- Update payment reference instructions to use table `id`

### Step 8: Update Frontend TypeScript Interfaces (8 files)
**Files**: All frontend components
- Remove `payment_reference: string` from Transaction interfaces
- Update all components to use `id` as the order identifier
- Update Order ID display elements to show `transaction.id`

### Step 9: Update Frontend Order Detail Page
**File**: `app/dashboard/settings/plans-billing/order/[id]/page.tsx`
- Update Transaction interface (remove `payment_reference`)
- Update Order ID display: `{transaction.payment_reference}` → `{transaction.id}`
- Update Reference Number display: `{transaction.payment_reference}` → `{transaction.id}`

### Step 10: Update Frontend Billing History (4 files)
**Files**:
- `app/dashboard/settings/plans-billing/components/BillingHistory.tsx`
- `app/dashboard/settings/plans-billing/history/HistoryTab.tsx`
- `app/dashboard/settings/plans-billing/page.tsx`

**Changes**:
- Remove `payment_reference` from interfaces
- Update Order ID column displays to show `id`
- Update click handlers and navigation to use `id`

### Step 11: Update Admin Frontend (2 files)
**Files**:
- `app/backend/admin/orders/page.tsx`
- `app/backend/admin/orders/[id]/page.tsx`

**Changes**:
- Update Order ID column to display table `id`
- Update navigation links to use table `id`
- Remove `payment_reference` references

### Step 12: Update Payment Processing Services (3 files)
**Files**:
- `lib/services/payments/core/PaymentProcessor.ts`
- `lib/services/payments/midtrans/MidtransSnapService.ts`
- `lib/payment-services/payment-router.ts`

**Changes**:
- Remove custom order ID generation methods
- Update service responses to use table `id`
- Update order tracking to use table `id`

### Step 13: Database Schema Cleanup
**Action**: Remove `payment_reference` column from `indb_payment_transactions`
**SQL Query for Supabase SQL Editor**:
```sql
ALTER TABLE indb_payment_transactions 
DROP COLUMN payment_reference;
```

### Step 14: Final Validation and Testing
- Test complete payment flow end-to-end
- Verify all order lookups work with table `id`
- Test email notifications with new order IDs
- Verify admin panel functionality
- Test webhook and callback processing

---

## Success Criteria

### Technical Success
- [ ] All payment flows use table `id` as order identifier
- [ ] No references to `payment_reference` remain in codebase
- [ ] All order lookups work correctly with UUID format
- [ ] Email notifications display correct order IDs
- [ ] Admin panel fully functional with new system

### Business Success
- [ ] No payment processing disruptions
- [ ] Customer order tracking continues to work
- [ ] Support team can reference orders by UUID
- [ ] All existing orders remain accessible
- [ ] Gateway integration remains stable

---

## Post-Migration Monitoring

### Week 1 Post-Migration
- Monitor payment success rates
- Check customer support ticket volume
- Verify email delivery and formatting
- Monitor gateway callback processing

### Week 2-4 Post-Migration
- Performance monitoring of UUID-based queries
- Customer feedback on new order ID format
- Support team adaptation to UUID references
- Gateway integration stability

---

## Emergency Procedures

### If Critical Issues Arise
1. **Immediate**: Stop payment processing temporarily
2. **Rollback**: Restore `payment_reference` column and revert code
3. **Investigation**: Identify root cause while system is stable
4. **Re-plan**: Adjust migration plan based on findings

### Communication Plan
- Notify support team of new order ID format
- Update customer documentation if needed
- Prepare FAQ for UUID-based order IDs
- Train support staff on new order lookup process

---

*Migration plan created on January 31, 2025*
*Total estimated effort: 2-3 weeks with testing*
*Risk level: Medium (due to payment system criticality)*
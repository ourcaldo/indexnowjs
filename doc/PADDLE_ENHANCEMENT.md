# Paddle Payment Integration - Enhancement Plan

**Project:** IndexNow Studio  
**Date Created:** November 2, 2025  
**Status:** Planning Phase  
**Priority:** HIGH - Revenue Protection & User Experience

---

## Table of Contents
1. [Overview](#overview)
2. [Business Requirements](#business-requirements)
3. [Missing Webhook Handlers](#missing-webhook-handlers)
4. [7-Day Refund Policy Implementation](#7-day-refund-policy-implementation)
5. [Technical Implementation Plan](#technical-implementation-plan)
6. [Database Changes Required](#database-changes-required)
7. [Frontend UX Changes](#frontend-ux-changes)
8. [Testing Strategy](#testing-strategy)
9. [Rollout Plan](#rollout-plan)

---

## Overview

This document outlines the comprehensive enhancement plan for the Paddle payment integration in IndexNow Studio. The enhancements address critical gaps in webhook handling, implement a customer-friendly 7-day refund policy, and improve the overall subscription management experience.

### Current State (As of November 2, 2025)

**✅ Implemented Webhook Handlers (7 total):**
- `subscription.created` - New subscription provisioning
- `subscription.updated` - Plan changes and status updates
- `subscription.canceled` - Cancellation events (scheduled or immediate)
- `subscription.paused` - Subscription pause
- `subscription.resumed` - Subscription resume
- `transaction.completed` - Successful payment logging
- `transaction.payment_failed` - Failed payment logging

**❌ Missing Critical Webhook Handlers (3 identified):**
- `subscription.past_due` - Payment failure handling (CRITICAL - Revenue Loss Risk)
- `transaction.refunded` - Refund processing (IMPORTANT - Data Integrity)
- `subscription.activated` - Trial/reactivation handling (NICE TO HAVE)

**⚠️ Current Problem:**
When users cancel their subscription via Paddle Customer Portal:
1. Paddle uses **scheduled cancellation** by default (cancel at next billing period)
2. Database shows: `status: 'canceled'`, `cancel_at_period_end: true`, `subscription_active: true`
3. **Frontend still shows user as "Active Subscriber"** - causing confusion
4. No refund logic based on subscription age
5. No differentiated treatment for new vs. long-term subscribers

---

## Business Requirements

### 1. 7-Day Refund Policy (New Requirement)

**Policy Statement:**
- **Within 7 days of purchase (H+7):** Full refund + immediate cancellation
- **After 7 days:** No refund + scheduled cancellation (access until period end)

**Business Justification:**
- Industry standard "satisfaction guarantee" period
- Reduces chargebacks and support tickets
- Improves customer trust and conversion rates
- Compliant with consumer protection regulations in most jurisdictions

**User Experience:**
```
User clicks "Cancel Subscription"
  ↓
System checks: subscription_created_at vs. current_date
  ↓
If ≤ 7 days:
  - Show: "You're within the 7-day refund window"
  - Action: Cancel immediately + Process refund
  - Result: Immediate access loss + Money back
  ↓
If > 7 days:
  - Show: "You'll keep access until {end_date}"
  - Action: Scheduled cancellation (no refund)
  - Result: Access until current_period_end
```

### 2. Transparent Cancellation Status Display

**Current Problem:**
User sees "Active" even after clicking cancel (when scheduled)

**Required Solution:**
Show subscription state clearly with visual indicators:
- ✅ **Active** - Normal subscription
- ⚠️ **Cancels on {date}** - Scheduled cancellation pending
- ⏸️ **Paused** - Temporarily suspended
- 🔴 **Past Due** - Payment failed, retry in progress
- ❌ **Canceled** - Fully terminated

---

## Missing Webhook Handlers

### 1. subscription.past_due (CRITICAL - Priority 1)

**Paddle Event Details:**
- **Fires when:** Recurring payment fails (expired card, insufficient funds, bank decline)
- **Frequency:** Immediately after payment failure, then Paddle retries automatically
- **Data includes:** subscription_id, customer_id, failed transaction details

**Business Impact if Not Handled:**
- ❌ User keeps premium access despite non-payment
- ❌ Revenue loss from undetected payment failures
- ❌ No user notification about payment issues
- ❌ Database shows "active" when Paddle shows "past_due"
- ❌ Analytics data becomes inaccurate

**What Happens Currently:**
```
Payment fails → Paddle marks subscription as past_due
     ↓
NO webhook handler → Event ignored
     ↓
Database still shows: status='active', subscription_active=true
     ↓
User continues using premium features WITHOUT paying
```

**Required Implementation:**
```typescript
// File: app/api/v1/payments/paddle/webhook/processors/subscription-past-due.ts

export async function processSubscriptionPastDue(data: any) {
  const subscription_id = data.id
  const current_billing_period = data.current_billing_period
  
  // 1. Update subscription status in database
  await supabaseAdmin
    .from('indb_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)
  
  // 2. Get user details
  const { data: subscription } = await supabaseAdmin
    .from('indb_subscriptions')
    .select('user_id, plan_id')
    .eq('paddle_subscription_id', subscription_id)
    .single()
  
  if (!subscription) return
  
  // 3. Disable user's premium access
  await supabaseAdmin
    .from('indb_auth_user_profiles')
    .update({
      subscription_active: false,
      // Keep package_id and expires_at for recovery if payment succeeds
    })
    .eq('user_id', subscription.user_id)
  
  // 4. Queue email notification via BullMQ
  // await emailQueue.add('payment-failed-notification', {
  //   userId: subscription.user_id,
  //   subscriptionId: subscription_id,
  //   planId: subscription.plan_id,
  //   nextRetryDate: calculateNextRetry(current_billing_period),
  // })
  
  // 5. Log error for admin monitoring
  await ErrorHandlingService.createError(
    ErrorType.EXTERNAL_API,
    `Payment failed for subscription ${subscription_id}`,
    {
      severity: ErrorSeverity.HIGH,
      metadata: {
        subscription_id,
        user_id: subscription.user_id,
        plan_id: subscription.plan_id,
      },
    }
  )
}
```

**Email Template Required:**
```
Subject: Payment Failed - Update Your Payment Method

Hi [Name],

We couldn't process your payment for IndexNow Studio [Plan Name].

What happens next:
- Your premium access has been temporarily suspended
- We'll automatically retry in 3 days
- Update your payment method to restore access immediately

[Update Payment Method Button]

Questions? Reply to this email.
```

---

### 2. transaction.refunded (IMPORTANT - Priority 2)

**Paddle Event Details:**
- **Fires when:** Refund is issued via Paddle Dashboard or API
- **Types:** Full refund, partial refund
- **Data includes:** transaction_id, refund_amount, refund_reason

**Business Impact if Not Handled:**
- ❌ Transaction stays as "completed" after refund
- ❌ User profile shows as paid when money was returned
- ❌ No quota adjustment after refund
- ❌ Audit trail incomplete
- ❌ Financial reports show incorrect revenue

**What Happens Currently:**
```
Admin issues refund in Paddle Dashboard
     ↓
NO webhook handler → Event ignored
     ↓
Database still shows: transaction status='completed', subscription_active=true
     ↓
Financial mismatch: Books show revenue but money was refunded
```

**Required Implementation:**
```typescript
// File: app/api/v1/payments/paddle/webhook/processors/transaction-refunded.ts

export async function processTransactionRefunded(data: any) {
  const transaction_id = data.id
  const refund_amount = data.refund?.amount || '0'
  const refund_reason = data.refund?.reason || 'unknown'
  const subscription_id = data.subscription_id
  
  // 1. Update transaction status
  await supabaseAdmin
    .from('indb_paddle_transactions')
    .update({
      status: 'refunded',
      metadata: sql`metadata || ${JSON.stringify({
        refund_amount,
        refund_reason,
        refunded_at: new Date().toISOString(),
      })}`,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_transaction_id', transaction_id)
  
  // 2. If full refund, revoke access immediately
  if (subscription_id) {
    const { data: transaction } = await supabaseAdmin
      .from('indb_paddle_transactions')
      .select('user_id, amount')
      .eq('paddle_transaction_id', transaction_id)
      .single()
    
    if (!transaction) return
    
    // Check if full refund
    const isFullRefund = parseFloat(refund_amount) >= transaction.amount
    
    if (isFullRefund) {
      // Revoke subscription access
      await supabaseAdmin
        .from('indb_subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('paddle_subscription_id', subscription_id)
      
      // Disable user access
      await supabaseAdmin
        .from('indb_auth_user_profiles')
        .update({
          subscription_active: false,
          package_id: null,
        })
        .eq('user_id', transaction.user_id)
    }
  }
  
  // 3. Log for admin audit trail
  await ErrorHandlingService.createError(
    ErrorType.BUSINESS_LOGIC,
    `Refund processed for transaction ${transaction_id}`,
    {
      severity: ErrorSeverity.LOW,
      metadata: {
        transaction_id,
        refund_amount,
        refund_reason,
      },
    }
  )
}
```

---

### 3. subscription.activated (NICE TO HAVE - Priority 3)

**Paddle Event Details:**
- **Fires when:** 
  - Trial period ends and subscription becomes active
  - Payment retry succeeds after past_due status
  - Paused subscription reactivates
- **Data includes:** subscription_id, customer_id, activated_at timestamp

**Business Impact if Not Handled:**
- ⚠️ Missed state transition from trial → active
- ⚠️ No notification when payment retry succeeds
- ⚠️ Inconsistent data after recovery from past_due

**Required Implementation:**
```typescript
// File: app/api/v1/payments/paddle/webhook/processors/subscription-activated.ts

export async function processSubscriptionActivated(data: any) {
  const subscription_id = data.id
  const current_billing_period = data.current_billing_period
  const activated_from_trial = data.started_at !== data.first_billed_at
  
  // 1. Update subscription to active
  await supabaseAdmin
    .from('indb_subscriptions')
    .update({
      status: 'active',
      current_period_start: current_billing_period?.starts_at,
      current_period_end: current_billing_period?.ends_at,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', subscription_id)
  
  // 2. Enable user access
  const { data: subscription } = await supabaseAdmin
    .from('indb_subscriptions')
    .select('user_id, plan_id')
    .eq('paddle_subscription_id', subscription_id)
    .single()
  
  if (!subscription) return
  
  await supabaseAdmin
    .from('indb_auth_user_profiles')
    .update({
      subscription_active: true,
      expires_at: current_billing_period?.ends_at,
    })
    .eq('user_id', subscription.user_id)
  
  // 3. Send notification if recovered from past_due
  // if (wasInPastDue) {
  //   await emailQueue.add('payment-recovered-notification', {
  //     userId: subscription.user_id,
  //     planId: subscription.plan_id,
  //   })
  // }
}
```

---

## 7-Day Refund Policy Implementation

### Architecture Overview

```
User clicks "Cancel Subscription"
         ↓
Frontend calls: POST /api/v1/payments/paddle/subscription/cancel
         ↓
Backend Service Layer: PaddleCancellationService.cancelWithRefundPolicy()
         ↓
    Calculate subscription age
         ↓
    ┌─────────────────────────────────────┐
    │  Is subscription ≤ 7 days old?      │
    └─────────────────────────────────────┘
         ↓                    ↓
      YES (≤7d)            NO (>7d)
         ↓                    ↓
    [IMMEDIATE]          [SCHEDULED]
    Cancel now           Cancel at period end
    Process refund       No refund
    Revoke access        Keep access until end
         ↓                    ↓
    Paddle webhook: subscription.canceled + transaction.refunded
         ↓                    ↓
    Update database      Update database
    Send confirmation    Send confirmation
```

### Service Layer Implementation

**New Service File:** `lib/services/payments/paddle/PaddleCancellationService.ts`

```typescript
import { PaddleService } from './PaddleService'
import { supabaseAdmin } from '@/lib/database'
import { differenceInDays } from 'date-fns'

interface CancellationResult {
  action: 'immediate_with_refund' | 'scheduled_no_refund'
  subscription: any
  refund?: any
  daysActive: number
  refundEligible: boolean
}

export class PaddleCancellationService {
  private static REFUND_WINDOW_DAYS = 7

  /**
   * Cancel subscription with automatic refund policy
   * - ≤7 days: Immediate cancellation + full refund
   * - >7 days: Scheduled cancellation at period end
   */
  static async cancelWithRefundPolicy(
    subscriptionId: string,
    userId: string
  ): Promise<CancellationResult> {
    // 1. Get subscription details from database
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('indb_subscriptions')
      .select('*, created_at')
      .eq('paddle_subscription_id', subscriptionId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !subscription) {
      throw new Error('Subscription not found or access denied')
    }

    // 2. Calculate subscription age
    const createdDate = new Date(subscription.created_at)
    const currentDate = new Date()
    const daysActive = differenceInDays(currentDate, createdDate)

    // 3. Determine cancellation strategy
    const refundEligible = daysActive <= this.REFUND_WINDOW_DAYS

    if (refundEligible) {
      return await this.cancelImmediatelyWithRefund(subscription, daysActive)
    } else {
      return await this.cancelAtPeriodEnd(subscription, daysActive)
    }
  }

  /**
   * Cancel immediately and process refund (≤7 days)
   */
  private static async cancelImmediatelyWithRefund(
    subscription: any,
    daysActive: number
  ): Promise<CancellationResult> {
    const paddle = await PaddleService.getInstance()
    const subscriptionId = subscription.paddle_subscription_id

    // 1. Cancel subscription immediately via Paddle
    const canceledSubscription = await paddle.subscriptions.cancel(subscriptionId, {
      effectiveFrom: 'immediately',
    })

    // 2. Find the most recent completed transaction for this subscription
    const { data: transaction } = await supabaseAdmin
      .from('indb_paddle_transactions')
      .select('*')
      .eq('subscription_id', subscription.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let refund = null

    if (transaction) {
      // 3. Process refund via Paddle API
      try {
        refund = await paddle.adjustments.create({
          action: 'refund',
          transactionId: transaction.paddle_transaction_id,
          reason: 'Canceled within 7-day refund period',
          items: [{
            type: 'full',
            itemId: transaction.paddle_transaction_id,
          }],
        })

        // Note: Webhook will handle transaction status update
      } catch (refundError) {
        // Log error but don't block cancellation
        await ErrorHandlingService.createError(
          ErrorType.EXTERNAL_API,
          `Refund failed for transaction ${transaction.paddle_transaction_id}`,
          {
            severity: ErrorSeverity.HIGH,
            metadata: { error: refundError },
          }
        )
      }
    }

    // 4. Update local database (immediate sync)
    await supabaseAdmin
      .from('indb_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        subscription_active: false,
        package_id: null,
      })
      .eq('user_id', subscription.user_id)

    return {
      action: 'immediate_with_refund',
      subscription: canceledSubscription,
      refund,
      daysActive,
      refundEligible: true,
    }
  }

  /**
   * Schedule cancellation at period end (>7 days)
   */
  private static async cancelAtPeriodEnd(
    subscription: any,
    daysActive: number
  ): Promise<CancellationResult> {
    const paddle = await PaddleService.getInstance()
    const subscriptionId = subscription.paddle_subscription_id

    // 1. Cancel at next billing period
    const canceledSubscription = await paddle.subscriptions.cancel(subscriptionId, {
      effectiveFrom: 'next_billing_period',
    })

    // 2. Update local database
    await supabaseAdmin
      .from('indb_subscriptions')
      .update({
        status: 'active', // Remains active until period end
        canceled_at: new Date().toISOString(),
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    // Keep subscription_active = true (access until period end)
    // No changes to user profile

    return {
      action: 'scheduled_no_refund',
      subscription: canceledSubscription,
      daysActive,
      refundEligible: false,
    }
  }

  /**
   * Get refund window info for UI display
   */
  static async getRefundWindowInfo(subscriptionId: string): Promise<{
    daysActive: number
    daysRemaining: number
    refundEligible: boolean
    refundWindowDays: number
  }> {
    const { data: subscription } = await supabaseAdmin
      .from('indb_subscriptions')
      .select('created_at')
      .eq('paddle_subscription_id', subscriptionId)
      .single()

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    const createdDate = new Date(subscription.created_at)
    const currentDate = new Date()
    const daysActive = differenceInDays(currentDate, createdDate)
    const daysRemaining = Math.max(0, this.REFUND_WINDOW_DAYS - daysActive)

    return {
      daysActive,
      daysRemaining,
      refundEligible: daysActive <= this.REFUND_WINDOW_DAYS,
      refundWindowDays: this.REFUND_WINDOW_DAYS,
    }
  }
}
```

### Updated API Route

**File:** `app/api/v1/payments/paddle/subscription/cancel/route.ts`

```typescript
import { PaddleCancellationService } from '@/lib/services/payments/paddle'

export const POST = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const body = await request.json()
  const { subscriptionId } = body

  // Validate ownership
  const { data: subscription } = await supabaseAdmin
    .from('indb_subscriptions')
    .select('user_id')
    .eq('paddle_subscription_id', subscriptionId)
    .single()

  if (!subscription || subscription.user_id !== auth.userId) {
    return formatError({ message: 'Unauthorized', statusCode: 403 })
  }

  // Execute cancellation with refund policy
  const result = await PaddleCancellationService.cancelWithRefundPolicy(
    subscriptionId,
    auth.userId
  )

  return formatSuccess({
    ...result,
    message: result.action === 'immediate_with_refund'
      ? `Subscription canceled and refund of ${result.refund?.amount || 'full amount'} processed. You had ${result.daysActive} days of access.`
      : `Subscription will be canceled at the end of your billing period. You'll keep access until then.`,
  })
})
```

---

## Database Changes Required

### 1. Add Refund Tracking Fields (Optional but Recommended)

**SQL to run in Supabase SQL Editor:**

```sql
-- Add refund tracking to transactions table
ALTER TABLE indb_paddle_transactions
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS refund_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add cancellation reason tracking
ALTER TABLE indb_subscriptions
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS days_active_at_cancellation INTEGER DEFAULT NULL;

-- Create index for refund queries
CREATE INDEX IF NOT EXISTS idx_paddle_transactions_refunded 
ON indb_paddle_transactions(refunded_at) 
WHERE refunded_at IS NOT NULL;

-- Create index for cancellation analytics
CREATE INDEX IF NOT EXISTS idx_subscriptions_canceled_at 
ON indb_subscriptions(canceled_at) 
WHERE canceled_at IS NOT NULL;
```

### 2. Add Webhook Event Routing

**Update webhook route handler:**

File: `app/api/v1/payments/paddle/webhook/route.ts`

Add to `routeWebhookEvent()` function:

```typescript
case 'subscription.past_due':
  await processSubscriptionPastDue(data)
  break
case 'transaction.refunded':
  await processTransactionRefunded(data)
  break
case 'subscription.activated':
  await processSubscriptionActivated(data)
  break
```

---

## Frontend UX Changes

### 1. Cancellation Confirmation Dialog

**File:** `app/dashboard/settings/plans-billing/components/CancelSubscriptionDialog.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDistanceToNow } from 'date-fns'

export function CancelSubscriptionDialog({ 
  subscriptionId, 
  onClose, 
  onSuccess 
}: {
  subscriptionId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [refundInfo, setRefundInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    // Fetch refund eligibility info
    fetch(`/api/v1/payments/paddle/subscription/refund-info?subscriptionId=${subscriptionId}`)
      .then(res => res.json())
      .then(data => {
        setRefundInfo(data.data)
        setLoading(false)
      })
  }, [subscriptionId])

  const handleCancel = async () => {
    setCanceling(true)
    try {
      const response = await fetch('/api/v1/payments/paddle/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        onSuccess()
      }
    } catch (error) {
      console.error('Cancellation failed:', error)
    } finally {
      setCanceling(false)
    }
  }

  if (loading) {
    return <Dialog open><DialogContent>Loading...</DialogContent></Dialog>
  }

  const { refundEligible, daysActive, daysRemaining } = refundInfo

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="dialog-cancel-subscription">
        <DialogHeader>
          <DialogTitle>Cancel Subscription?</DialogTitle>
          <DialogDescription>
            {refundEligible 
              ? `You're within the ${refundInfo.refundWindowDays}-day refund window` 
              : 'This will cancel your subscription'}
          </DialogDescription>
        </DialogHeader>

        {refundEligible ? (
          <Alert className="bg-green-50 border-green-200" data-testid="alert-refund-eligible">
            <AlertDescription>
              <strong>Full Refund Available</strong>
              <p className="mt-2">Since you subscribed {daysActive} days ago, you qualify for a full refund.</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>✅ Subscription will be canceled immediately</li>
                <li>✅ You'll receive a full refund</li>
                <li>✅ Premium access will be revoked now</li>
                <li>✅ Refund processed within 5-10 business days</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Refund window expires in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-blue-50 border-blue-200" data-testid="alert-scheduled-cancel">
            <AlertDescription>
              <strong>Scheduled Cancellation</strong>
              <p className="mt-2">Your subscription will be canceled at the end of the current billing period.</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>✅ You'll keep premium access until your plan expires</li>
                <li>✅ No refund (you've used the service for {daysActive} days)</li>
                <li>✅ No future charges after this period</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 justify-end mt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-cancel-dialog-close"
          >
            Keep Subscription
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancel}
            disabled={canceling}
            data-testid="button-confirm-cancel"
          >
            {canceling ? 'Canceling...' : refundEligible ? 'Cancel & Refund' : 'Cancel Subscription'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 2. Subscription Status Badge Component

**File:** `app/dashboard/settings/plans-billing/components/SubscriptionStatusBadge.tsx`

```typescript
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export function SubscriptionStatusBadge({ subscription }: { subscription: any }) {
  // Scheduled cancellation
  if (subscription.cancel_at_period_end && subscription.subscription_active) {
    return (
      <Badge variant="warning" data-testid="badge-subscription-canceling">
        ⚠️ Cancels on {format(new Date(subscription.expires_at), 'MMM d, yyyy')}
      </Badge>
    )
  }

  // Active subscription
  if (subscription.subscription_active && subscription.status === 'active') {
    return (
      <Badge variant="success" data-testid="badge-subscription-active">
        ✅ Active
      </Badge>
    )
  }

  // Past due (payment failed)
  if (subscription.status === 'past_due') {
    return (
      <Badge variant="destructive" data-testid="badge-subscription-past-due">
        🔴 Past Due - Update Payment
      </Badge>
    )
  }

  // Paused
  if (subscription.status === 'paused') {
    return (
      <Badge variant="secondary" data-testid="badge-subscription-paused">
        ⏸️ Paused
      </Badge>
    )
  }

  // Canceled
  if (subscription.status === 'canceled') {
    return (
      <Badge variant="outline" data-testid="badge-subscription-canceled">
        ❌ Canceled
      </Badge>
    )
  }

  return (
    <Badge variant="outline" data-testid="badge-subscription-unknown">
      {subscription.status}
    </Badge>
  )
}
```

### 3. New API Endpoint for Refund Info

**File:** `app/api/v1/payments/paddle/subscription/refund-info/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess } from '@/lib/core/api-response-middleware'
import { PaddleCancellationService } from '@/lib/services/payments/paddle'

export const GET = authenticatedApiWrapper(async (request: NextRequest, auth) => {
  const { searchParams } = new URL(request.url)
  const subscriptionId = searchParams.get('subscriptionId')

  if (!subscriptionId) {
    return formatError({ message: 'subscriptionId required', statusCode: 400 })
  }

  const refundInfo = await PaddleCancellationService.getRefundWindowInfo(subscriptionId)

  return formatSuccess(refundInfo)
})
```

---

## Testing Strategy

### Unit Tests

**File:** `__tests__/services/paddle/PaddleCancellationService.test.ts`

```typescript
describe('PaddleCancellationService', () => {
  describe('cancelWithRefundPolicy', () => {
    it('should cancel immediately and refund when subscription ≤7 days old', async () => {
      // Mock subscription created 5 days ago
      const result = await PaddleCancellationService.cancelWithRefundPolicy(
        'sub_test_5days',
        'user_123'
      )
      
      expect(result.action).toBe('immediate_with_refund')
      expect(result.refundEligible).toBe(true)
      expect(result.daysActive).toBeLessThanOrEqual(7)
    })

    it('should schedule cancellation when subscription >7 days old', async () => {
      // Mock subscription created 10 days ago
      const result = await PaddleCancellationService.cancelWithRefundPolicy(
        'sub_test_10days',
        'user_123'
      )
      
      expect(result.action).toBe('scheduled_no_refund')
      expect(result.refundEligible).toBe(false)
      expect(result.daysActive).toBeGreaterThan(7)
    })
  })
})
```

### Integration Tests

Test webhook handling end-to-end:

1. **subscription.past_due webhook test**
   - Simulate failed payment
   - Verify database updated: status='past_due', subscription_active=false
   - Verify email queued

2. **transaction.refunded webhook test**
   - Simulate refund event
   - Verify transaction updated: status='refunded'
   - Verify access revoked if full refund

3. **7-day refund policy test**
   - Create test subscription 3 days old → Verify immediate cancel + refund
   - Create test subscription 10 days old → Verify scheduled cancel, no refund

---

## Rollout Plan

### Phase 1: Missing Webhook Handlers (Week 1)
**Priority: CRITICAL**

1. ✅ Implement `subscription.past_due` processor
2. ✅ Implement `transaction.refunded` processor
3. ✅ Implement `subscription.activated` processor
4. ✅ Update webhook router to handle new events
5. ✅ Add email notification templates
6. ✅ Test with Paddle webhook simulator

**Success Criteria:**
- All 3 webhook handlers working in sandbox
- Email notifications sending correctly
- Database updates syncing properly

---

### Phase 2: 7-Day Refund Policy (Week 2)
**Priority: HIGH**

1. ✅ Create `PaddleCancellationService` with refund logic
2. ✅ Add database fields for refund tracking
3. ✅ Update cancel API route to use new service
4. ✅ Create refund info API endpoint
5. ✅ Test cancellation scenarios (≤7d and >7d)

**Success Criteria:**
- Refund issued automatically for subscriptions ≤7 days
- Scheduled cancellation works for subscriptions >7 days
- Database accurately tracks refund data

---

### Phase 3: Frontend UX Improvements (Week 2-3)
**Priority: MEDIUM**

1. ✅ Create `CancelSubscriptionDialog` with refund info display
2. ✅ Create `SubscriptionStatusBadge` component
3. ✅ Update subscription management page
4. ✅ Add refund policy to pricing page
5. ✅ Update help documentation

**Success Criteria:**
- Users see clear refund eligibility before canceling
- Subscription status displays correctly (active, canceling, past_due, etc.)
- Refund policy visible during checkout

---

### Phase 4: Testing & Validation (Week 3)
**Priority: HIGH**

1. ✅ Run all unit tests
2. ✅ Run integration tests in sandbox
3. ✅ Manual testing of all cancellation scenarios
4. ✅ Test webhook handling with Paddle simulator
5. ✅ Load testing for webhook handlers

**Success Criteria:**
- All tests passing
- No errors in sandbox environment
- Webhook handlers respond within 5 seconds

---

### Phase 5: Production Deployment (Week 4)
**Priority: CRITICAL**

1. ✅ Deploy to production
2. ✅ Configure Paddle production webhooks
3. ✅ Monitor error logs for 48 hours
4. ✅ Verify first real cancellation works correctly
5. ✅ Update admin documentation

**Success Criteria:**
- Zero errors in first 48 hours
- All webhook events processing successfully
- First real refund processes correctly

---

## Risk Assessment

### High Risk Items
1. **Refund API failures** - If Paddle refund API fails, user gets cancellation but no refund
   - **Mitigation:** Retry logic + manual admin notification for failed refunds

2. **Webhook delivery failures** - Paddle webhooks might not arrive
   - **Mitigation:** Webhook retry mechanism + manual reconciliation job

3. **Database sync issues** - Paddle and database could become out of sync
   - **Mitigation:** Daily reconciliation job to compare Paddle vs database state

### Medium Risk Items
1. **Email delivery failures** - Users might not receive notifications
   - **Mitigation:** Queue with retry + admin dashboard to resend

2. **Timezone confusion** - Subscription age calculation across timezones
   - **Mitigation:** All calculations use UTC timestamps

---

## Success Metrics

### Technical Metrics
- **Webhook Success Rate:** >99.5% of webhooks processed without error
- **Refund Processing Time:** <2 minutes from cancel to refund issued
- **Database Sync Accuracy:** 100% consistency between Paddle and database

### Business Metrics
- **Refund Rate:** Track % of cancellations that trigger refunds (target: <20%)
- **Customer Satisfaction:** Measure support tickets related to cancellation (target: -50%)
- **Revenue Recovery:** Track reactivations after past_due recovery (target: 15%)

### User Experience Metrics
- **Cancellation Clarity:** User surveys on cancellation process (target: >4.5/5)
- **Support Tickets:** Cancellation-related tickets (target: <5% of total)

---

## Appendix

### A. Paddle Webhook Event Reference

Complete list of Paddle webhook events:

**Subscription Events:**
- subscription.created ✅
- subscription.updated ✅
- subscription.activated ⚠️ (planned)
- subscription.canceled ✅
- subscription.paused ✅
- subscription.resumed ✅
- subscription.past_due ⚠️ (planned)
- subscription.trialing (future consideration)

**Transaction Events:**
- transaction.created
- transaction.updated
- transaction.completed ✅
- transaction.payment_failed ✅
- transaction.refunded ⚠️ (planned)
- transaction.billed
- transaction.canceled
- transaction.past_due
- transaction.ready

**Customer Events:**
- customer.created
- customer.updated
- customer.imported

**Price/Product Events:**
- price.created
- price.updated
- price.imported
- product.created
- product.updated
- product.imported

### B. Error Codes Reference

| Error Code | Description | Recovery Action |
|------------|-------------|-----------------|
| REFUND_FAILED | Paddle refund API failed | Manual admin refund via dashboard |
| WEBHOOK_VERIFICATION_FAILED | Invalid signature | Check webhook secret in database |
| SUBSCRIPTION_NOT_FOUND | Subscription ID doesn't exist | User may need to contact support |
| UNAUTHORIZED_CANCEL | User trying to cancel someone else's sub | Block action, log security event |
| DATABASE_SYNC_FAILED | Paddle updated but DB didn't | Run reconciliation job |

### C. Admin Playbooks

**When a user reports "I canceled but still charged":**
1. Check `indb_subscriptions` for subscription status
2. Check `indb_paddle_webhook_events` for cancellation event
3. Verify in Paddle dashboard: was it scheduled vs immediate?
4. If scheduled, explain they keep access until period end
5. If error, manually cancel in Paddle + update database

**When refund doesn't process:**
1. Check `indb_paddle_webhook_events` for `transaction.refunded` event
2. If no event, check Paddle dashboard for refund status
3. If Paddle shows refunded but DB doesn't, manually update transaction status
4. If Paddle shows no refund, manually issue via dashboard

---

## Change Log

**November 2, 2025** - Document created
- Identified 3 missing webhook handlers (past_due, refunded, activated)
- Designed 7-day refund policy architecture
- Planned frontend UX improvements for subscription status display
- Created comprehensive testing and rollout plan

---

## Next Actions

**Immediate (This Week):**
1. Get user approval on 7-day refund policy approach
2. Decide on Phase 1 implementation timeline
3. Review and approve service architecture

**Short Term (Next 2 Weeks):**
1. Implement missing webhook handlers
2. Build refund policy service layer
3. Test in Paddle sandbox environment

**Long Term (Next Month):**
1. Deploy to production
2. Monitor metrics
3. Iterate based on user feedback

---

**Document Status:** ✅ COMPLETE - Ready for Review  
**Last Updated:** November 2, 2025  
**Next Review:** After Phase 1 completion

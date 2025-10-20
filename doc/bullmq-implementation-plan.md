# BullMQ Implementation Plan for IndexNow Studio

**Document Version:** 1.0  
**Created:** October 20, 2025  
**Author:** Development Team  
**Status:** Planning Phase

---

## Executive Summary

This document outlines a comprehensive plan to modernize IndexNow Studio's background job infrastructure by migrating from `node-cron` and fire-and-forget patterns to **BullMQ**, a Redis-backed job queue system. This migration will provide:

- ✅ **Better Reliability**: Automatic retries with exponential backoff
- ✅ **Enhanced Monitoring**: Real-time job status, metrics, and dashboards
- ✅ **Improved Scalability**: Horizontal scaling with multiple workers
- ✅ **Rate Limiting**: Built-in rate limiting for API protection (Firecrawl 30 req/min)
- ✅ **Job Prioritization**: Process urgent jobs first
- ✅ **Dead Letter Queues**: Handle permanently failed jobs
- ✅ **Job Dependencies**: Parent-child job flows

**Implementation Timeline:** 3 Phases (estimated 2-3 weeks)

**Risk Level:** Medium (mitigated by phased rollout with feature flags)

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Implementation Phases](#implementation-phases)
   - [Phase 1: Foundation + High-Value Services](#phase-1-foundation--high-value-services)
   - [Phase 2: Scheduled Cron Jobs Migration](#phase-2-scheduled-cron-jobs-migration)
   - [Phase 3: Advanced Features](#phase-3-advanced-features)
5. [File Structure & Organization](#file-structure--organization)
6. [Migration Strategy](#migration-strategy)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Plan](#rollback-plan)
9. [Monitoring & Operations](#monitoring--operations)
10. [Appendix: Job Catalog](#appendix-job-catalog)

---

## Current State Analysis

### Identified Background Services

IndexNow Studio currently has **11 background services** across 3 categories:

#### 📅 **Scheduled Cron Jobs** (7 services)

| Service | File Path | Schedule | Purpose |
|---------|-----------|----------|---------|
| **DailyRankCheckJob** | `lib/rank-tracking/daily-rank-check-job.ts` | Daily at 2 AM UTC | Processes rank checks for all keywords via BatchProcessor |
| **RecurringBillingJob** | `lib/payment-services/recurring-billing-job.ts` | Daily at 6 AM | Processes recurring payments (DISABLED - Midtrans handles) |
| **AutoCancelJob** | `lib/payment-services/auto-cancel-job.ts` | Every hour | Auto-cancels payment transactions >24hrs old + sends emails |
| **TrialMonitorJob** | `lib/job-management/trial-monitor-job.ts` | Every 15 minutes | Processes expired trials, sends notifications |
| **KeywordEnrichmentWorker** | `lib/job-management/keyword-enrichment-worker.ts` | Every hour at :30 | Enriches keywords with SeRanking API data |
| **QuotaResetMonitor** | `lib/monitoring/quota-reset-monitor.ts` | Hourly at :05 + 15min around midnight PT | Reactivates Google service accounts after quota reset |
| **JobMonitor** | `lib/job-management/job-monitor.ts` | Every minute | Processes pending Google indexing jobs |

#### ⚡ **Background Async Operations** (4 services)

| Service | File Path | Trigger | Purpose |
|---------|-----------|---------|---------|
| **ImmediateRankCheck** | `lib/rank-tracking/immediate-rank-check.ts` | Fire-and-forget after keyword addition | Immediate rank checking for new keywords |
| **EmailService** | `lib/email/emailService.ts` | Various triggers | Transactional emails (billing, orders, notifications) |
| **Midtrans Webhooks** | `app/api/midtrans/webhook/route.ts` | External webhook | Payment processing + email notifications |
| **BatchProcessor** | `lib/job-management/batch-processor.ts` | Used by DailyRankCheckJob | Batch processing with rate limiting |

### Current Pain Points

1. **No Job Visibility**: Cannot see job status, history, or failures
2. **Limited Retry Logic**: Manual error handling in each service
3. **Fire-and-Forget Risks**: ImmediateRankCheck has no retry if fails
4. **Rate Limiting Complexity**: Custom FirecrawlRateLimiter needs maintenance
5. **No Job Prioritization**: All jobs treated equally
6. **Difficult Debugging**: Hard to reproduce job failures
7. **No Horizontal Scaling**: All jobs run on single server instance
8. **Manual Monitoring**: No automated alerts for job failures

---

## Architecture Overview

### BullMQ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   API Routes │  │   Webhooks   │  │  Manual Jobs │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                    ┌───────▼────────┐                           │
│                    │  Queue Manager  │                           │
│                    │  (Job Enqueue)  │                           │
│                    └───────┬────────┘                           │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Redis Server   │ ◄─── Persistent Job Storage
                    │   (Job Queues)   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐         ┌────▼────┐        ┌────▼────┐
    │ Worker 1│         │ Worker 2│        │ Worker N│
    │ Process │         │ Process │        │ Process │
    └────┬────┘         └────┬────┘        └────┬────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼─────────┐
                    │  Job Processing   │
                    │  (Business Logic) │
                    └──────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐         ┌────▼────┐        ┌────▼────┐
    │Supabase │         │Firecrawl│        │  SMTP   │
    │   DB    │         │   API   │        │ Server  │
    └─────────┘         └─────────┘        └─────────┘
```

### Queue Architecture

```
lib/queues/
├── rank-check         → Immediate rank checking (high priority)
├── rank-schedule      → Daily scheduled rank checks
├── email              → Transactional emails
├── payments           → Payment processing (webhook-triggered)
├── trial-monitor      → Trial expiration monitoring
├── keyword-enrichment → SeRanking keyword enrichment
├── quota              → Google quota reset monitoring
└── indexing-monitor   → Google indexing job processing
```

### Key Design Principles

1. **Separation of Concerns**: Queue definitions separate from business logic
2. **Centralized Management**: Single `QueueManager` coordinates all queues
3. **Idempotency**: All jobs must be idempotent (safe to retry)
4. **Feature Flags**: Gradual rollout with environment variable toggles
5. **Backward Compatibility**: Maintain existing APIs during migration
6. **Observability First**: Built-in logging, metrics, and monitoring

---

## Infrastructure Setup

### Prerequisites

#### 1. Redis Server

**Local Development:**
```yaml
# docker-compose.yml (add to project root)
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

**Staging/Production:**
- Use managed Redis service (AWS ElastiCache, Redis Cloud, Upstash)
- Minimum: 512MB RAM
- Recommended: 2GB RAM for production

#### 2. Environment Variables

Add to `.env`:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Empty for local, set for production
REDIS_DB=0

# BullMQ Feature Flags
ENABLE_BULLMQ=false  # Toggle to true when ready
BULLMQ_CONCURRENCY_RANK_CHECK=5
BULLMQ_CONCURRENCY_EMAIL=10
BULLMQ_CONCURRENCY_PAYMENTS=3

# Monitoring
BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=  # Set in production
```

#### 3. Package Installation

```bash
npm install bullmq ioredis
npm install --save-dev @bull-board/api @bull-board/express
```

**Packages:**
- `bullmq` - Job queue library
- `ioredis` - Redis client (BullMQ dependency)
- `@bull-board/api` - Dashboard for monitoring queues
- `@bull-board/express` - Express adapter for Bull Board

---

## Implementation Phases

### Phase 1: Foundation + High-Value Services

**Duration:** 5-7 days  
**Goal:** Establish infrastructure and migrate critical async operations

#### Step 1.1: Create Base Infrastructure

**File:** `lib/queues/config.ts`

```typescript
import { ConnectionOptions } from 'bullmq'

export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
}

export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2s, then 4s, 8s
  },
  removeOnComplete: {
    age: 24 * 3600, // Keep successful jobs for 24 hours
    count: 1000, // Keep max 1000 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
  },
}

export const queueConfig = {
  rankCheck: {
    name: 'rank-check',
    concurrency: parseInt(process.env.BULLMQ_CONCURRENCY_RANK_CHECK || '5'),
    limiter: {
      max: 28, // Respect Firecrawl rate limit (30/min with buffer)
      duration: 60000, // 1 minute
    },
  },
  email: {
    name: 'email',
    concurrency: parseInt(process.env.BULLMQ_CONCURRENCY_EMAIL || '10'),
    limiter: {
      max: 50, // SMTP rate limit
      duration: 60000,
    },
  },
  payments: {
    name: 'payments',
    concurrency: parseInt(process.env.BULLMQ_CONCURRENCY_PAYMENTS || '3'),
  },
}
```

**File:** `lib/queues/types.ts`

```typescript
import { z } from 'zod'

// ============================================
// Immediate Rank Check Jobs
// ============================================

export const ImmediateRankCheckJobSchema = z.object({
  keywordId: z.string().uuid(),
  userId: z.string().uuid(),
  domainId: z.string().uuid(),
  keyword: z.string(),
  countryCode: z.string(),
  device: z.enum(['desktop', 'mobile']),
})

export type ImmediateRankCheckJob = z.infer<typeof ImmediateRankCheckJobSchema>

// ============================================
// Email Jobs
// ============================================

export const EmailJobSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  template: z.enum([
    'billing_confirmation',
    'payment_received',
    'package_activated',
    'order_expired',
    'trial_expiring',
    'login_notification',
  ]),
  data: z.record(z.any()),
})

export type EmailJob = z.infer<typeof EmailJobSchema>

// ============================================
// Payment Processing Jobs
// ============================================

export const PaymentWebhookJobSchema = z.object({
  orderId: z.string(),
  transactionId: z.string(),
  status: z.enum(['pending', 'settlement', 'expire', 'cancel', 'deny']),
  paymentType: z.string(),
  webhookData: z.record(z.any()),
})

export type PaymentWebhookJob = z.infer<typeof PaymentWebhookJobSchema>

// ============================================
// Scheduled Jobs (will be added in Phase 2)
// ============================================

export const DailyRankCheckJobSchema = z.object({
  scheduledAt: z.string().datetime(),
  batchSize: z.number().optional(),
})

export type DailyRankCheckJob = z.infer<typeof DailyRankCheckJobSchema>
```

#### Step 1.2: Create Queue Manager

**File:** `lib/queues/QueueManager.ts`

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq'
import { redisConnection, defaultJobOptions, queueConfig } from './config'
import { logger } from '@/lib/monitoring/error-handling'

export class QueueManager {
  private static instance: QueueManager
  private queues: Map<string, Queue> = new Map()
  private workers: Map<string, Worker> = new Map()
  private queueEvents: Map<string, QueueEvents> = new Map()

  private constructor() {}

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager()
    }
    return QueueManager.instance
  }

  /**
   * Create or get existing queue
   */
  getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: redisConnection,
        defaultJobOptions,
      })

      this.queues.set(queueName, queue)
      logger.info({ queueName }, 'Queue created')
    }

    return this.queues.get(queueName)!
  }

  /**
   * Register a worker for a queue
   */
  registerWorker(
    queueName: string,
    processor: (job: any) => Promise<any>,
    options: {
      concurrency?: number
      limiter?: { max: number; duration: number }
    } = {}
  ): Worker {
    if (this.workers.has(queueName)) {
      logger.warn({ queueName }, 'Worker already registered for queue')
      return this.workers.get(queueName)!
    }

    const worker = new Worker(queueName, processor, {
      connection: redisConnection,
      concurrency: options.concurrency || 1,
      limiter: options.limiter,
    })

    // Event listeners
    worker.on('completed', (job) => {
      logger.info(
        { jobId: job.id, queueName, returnValue: job.returnvalue },
        'Job completed'
      )
    })

    worker.on('failed', (job, err) => {
      logger.error(
        { jobId: job?.id, queueName, error: err.message },
        'Job failed'
      )
    })

    worker.on('error', (err) => {
      logger.error({ queueName, error: err.message }, 'Worker error')
    })

    this.workers.set(queueName, worker)
    logger.info({ queueName, ...options }, 'Worker registered')

    return worker
  }

  /**
   * Add a job to a queue
   */
  async enqueueJob(
    queueName: string,
    jobName: string,
    data: any,
    options: any = {}
  ): Promise<string> {
    const queue = this.getQueue(queueName)
    const job = await queue.add(jobName, data, options)

    logger.info(
      { jobId: job.id, queueName, jobName },
      'Job enqueued'
    )

    return job.id!
  }

  /**
   * Graceful shutdown - close all queues and workers
   */
  async shutdown(): Promise<void> {
    logger.info({}, 'Starting graceful shutdown of queues and workers')

    // Close all workers first
    for (const [queueName, worker] of this.workers.entries()) {
      await worker.close()
      logger.info({ queueName }, 'Worker closed')
    }

    // Close all queues
    for (const [queueName, queue] of this.queues.entries()) {
      await queue.close()
      logger.info({ queueName }, 'Queue closed')
    }

    // Close queue events
    for (const [queueName, queueEvents] of this.queueEvents.entries()) {
      await queueEvents.close()
      logger.info({ queueName }, 'Queue events closed')
    }

    logger.info({}, 'All queues and workers shut down successfully')
  }
}

// Export singleton instance
export const queueManager = QueueManager.getInstance()

// Helper function for easy job enqueuing
export async function enqueueJob(
  queueName: string,
  jobName: string,
  data: any,
  options: any = {}
): Promise<string> {
  return queueManager.enqueueJob(queueName, jobName, data, options)
}
```

#### Step 1.3: Migrate ImmediateRankCheck to BullMQ

**File:** `lib/queues/workers/rank-check.worker.ts`

```typescript
import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { queueConfig } from '../config'
import { ImmediateRankCheckJob, ImmediateRankCheckJobSchema } from '../types'
import { RankTracker } from '@/lib/rank-tracking/rank-tracker'
import { logger } from '@/lib/monitoring/error-handling'

/**
 * Process individual rank check job
 */
async function processRankCheck(job: Job<ImmediateRankCheckJob>): Promise<{
  success: boolean
  rank?: number
  error?: string
}> {
  const { keywordId, userId } = job.data

  logger.info({ jobId: job.id, keywordId, userId }, 'Processing rank check job')

  try {
    // Validate job data
    const validatedData = ImmediateRankCheckJobSchema.parse(job.data)

    // Initialize rank tracker
    const rankTracker = new RankTracker()

    // Get keyword details
    const keywordData = await rankTracker.getKeywordWithDetails(
      validatedData.keywordId,
      validatedData.userId
    )

    if (!keywordData) {
      throw new Error('Keyword not found or not accessible')
    }

    // Track the keyword (this will store result in database)
    await rankTracker.trackKeyword(keywordData)

    logger.info({ jobId: job.id, keywordId }, 'Rank check completed successfully')

    return { success: true }
  } catch (error) {
    logger.error(
      { jobId: job.id, keywordId, error: error instanceof Error ? error.message : 'Unknown error' },
      'Rank check failed'
    )

    throw error // Let BullMQ handle retry
  }
}

/**
 * Initialize rank check worker
 */
export function initializeRankCheckWorker(): void {
  const { concurrency, limiter } = queueConfig.rankCheck

  queueManager.registerWorker(
    queueConfig.rankCheck.name,
    processRankCheck,
    { concurrency, limiter }
  )

  logger.info(
    { queue: queueConfig.rankCheck.name, concurrency, limiter },
    'Rank check worker initialized'
  )
}
```

**File:** `lib/rank-tracking/immediate-rank-check.ts` (UPDATED)

```typescript
/**
 * Immediate Rank Check Service
 * Now uses BullMQ for better reliability and monitoring
 */

import { enqueueJob } from '@/lib/queues/QueueManager'
import { queueConfig } from '@/lib/queues/config'
import { logger } from '@/lib/monitoring/error-handling'
import { RankTracker } from './rank-tracker'

/**
 * Trigger immediate rank check for newly added keywords
 * Uses BullMQ for reliable background processing
 * 
 * @param keywordIds - Array of keyword IDs to check immediately
 * @param userId - User ID who owns these keywords
 */
export async function triggerImmediateRankCheck(
  keywordIds: string[],
  userId: string
): Promise<void> {
  // Feature flag check
  if (process.env.ENABLE_BULLMQ !== 'true') {
    // Fallback to old implementation
    return triggerImmediateRankCheckLegacy(keywordIds, userId)
  }

  // Validate input parameters
  if (!keywordIds || keywordIds.length === 0) {
    logger.info({}, 'No keywords to check - skipping immediate rank check')
    return
  }

  if (!userId) {
    logger.error({}, 'Missing userId - cannot proceed with immediate rank check')
    return
  }

  // Deduplicate keyword IDs
  const uniqueKeywordIds = Array.from(new Set(keywordIds))
  
  if (uniqueKeywordIds.length !== keywordIds.length) {
    logger.warn({ 
      original: keywordIds.length, 
      deduplicated: uniqueKeywordIds.length 
    }, 'Duplicate keyword IDs detected - deduplication applied')
  }

  logger.info({ 
    keywordCount: uniqueKeywordIds.length, 
    userId 
  }, 'Enqueuing immediate rank checks to BullMQ')

  // Fetch keyword details and enqueue jobs
  const rankTracker = new RankTracker()

  for (const keywordId of uniqueKeywordIds) {
    try {
      // Get keyword details
      const keywordData = await rankTracker.getKeywordWithDetails(keywordId, userId)
      
      if (!keywordData) {
        logger.warn({ keywordId }, 'Keyword not found - skipping')
        continue
      }

      // Enqueue job to BullMQ
      await enqueueJob(
        queueConfig.rankCheck.name,
        'immediate-rank-check',
        {
          keywordId: keywordData.id,
          userId: keywordData.user_id,
          domainId: keywordData.domain_id,
          keyword: keywordData.keyword,
          countryCode: keywordData.country_code,
          device: keywordData.device,
        },
        {
          priority: 1, // High priority for immediate checks
        }
      )

      logger.info({ keywordId }, 'Rank check job enqueued')
    } catch (error) {
      logger.error(
        { keywordId, error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to enqueue rank check job'
      )
    }
  }
}

/**
 * Legacy implementation (fallback when BullMQ disabled)
 */
async function triggerImmediateRankCheckLegacy(
  keywordIds: string[],
  userId: string
): Promise<void> {
  // ... existing implementation ...
  logger.info({}, 'Using legacy immediate rank check implementation')
}
```

#### Step 1.4: Migrate EmailService to BullMQ

**File:** `lib/queues/workers/email.worker.ts`

```typescript
import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { queueConfig } from '../config'
import { EmailJob, EmailJobSchema } from '../types'
import { emailService } from '@/lib/email/emailService'
import { logger } from '@/lib/monitoring/error-handling'

/**
 * Process email job
 */
async function processEmail(job: Job<EmailJob>): Promise<{
  success: boolean
  messageId?: string
}> {
  const { to, subject, template, data } = job.data

  logger.info({ jobId: job.id, to, template }, 'Processing email job')

  try {
    // Validate job data
    const validatedData = EmailJobSchema.parse(job.data)

    // Send email based on template
    let result
    switch (validatedData.template) {
      case 'billing_confirmation':
        result = await emailService.sendBillingConfirmation(to, data)
        break
      case 'payment_received':
        result = await emailService.sendPaymentReceived(to, data)
        break
      case 'package_activated':
        result = await emailService.sendPackageActivated(to, data)
        break
      case 'order_expired':
        result = await emailService.sendOrderExpired(to, data)
        break
      case 'trial_expiring':
        result = await emailService.sendTrialExpiringNotification(to, data)
        break
      case 'login_notification':
        result = await emailService.sendLoginNotification(to, data)
        break
      default:
        throw new Error(`Unknown email template: ${template}`)
    }

    logger.info({ jobId: job.id, to, template }, 'Email sent successfully')

    return { success: true, messageId: result?.messageId }
  } catch (error) {
    logger.error(
      { jobId: job.id, to, template, error: error instanceof Error ? error.message : 'Unknown error' },
      'Email sending failed'
    )

    throw error // Let BullMQ handle retry
  }
}

/**
 * Initialize email worker
 */
export function initializeEmailWorker(): void {
  const { concurrency, limiter } = queueConfig.email

  queueManager.registerWorker(
    queueConfig.email.name,
    processEmail,
    { concurrency, limiter }
  )

  logger.info(
    { queue: queueConfig.email.name, concurrency, limiter },
    'Email worker initialized'
  )
}
```

**File:** `lib/email/index.ts` (NEW - Helper for enqueuing emails)

```typescript
import { enqueueJob } from '@/lib/queues/QueueManager'
import { queueConfig } from '@/lib/queues/config'
import { EmailJob } from '@/lib/queues/types'

export async function sendEmailAsync(emailData: EmailJob): Promise<string> {
  // Feature flag check
  if (process.env.ENABLE_BULLMQ !== 'true') {
    // Fallback to direct sending
    const { emailService } = await import('./emailService')
    // ... call appropriate method based on template
    return 'sent-directly'
  }

  // Enqueue to BullMQ
  return enqueueJob(
    queueConfig.email.name,
    'send-email',
    emailData,
    {
      priority: emailData.template === 'login_notification' ? 1 : 5, // Login alerts are high priority
    }
  )
}
```

#### Step 1.5: Migrate Payment Webhook Processing

**File:** `lib/queues/workers/payments.worker.ts`

```typescript
import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { queueConfig } from '../config'
import { PaymentWebhookJob, PaymentWebhookJobSchema } from '../types'
import { logger } from '@/lib/monitoring/error-handling'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { sendEmailAsync } from '@/lib/email'

/**
 * Process payment webhook job
 */
async function processPaymentWebhook(job: Job<PaymentWebhookJob>): Promise<{
  success: boolean
}> {
  const { orderId, transactionId, status } = job.data

  logger.info({ jobId: job.id, orderId, status }, 'Processing payment webhook job')

  try {
    // Validate job data
    const validatedData = PaymentWebhookJobSchema.parse(job.data)

    // Idempotency check - has this transaction already been processed?
    const existingProcessing = await supabaseAdmin
      .from('indb_payment_transactions')
      .select('processed_at, transaction_status')
      .eq('id', transactionId)
      .single()

    if (existingProcessing.data?.processed_at && existingProcessing.data.transaction_status === status) {
      logger.info({ jobId: job.id, transactionId }, 'Transaction already processed - skipping')
      return { success: true } // Already processed, not an error
    }

    // Process based on status
    switch (validatedData.status) {
      case 'settlement':
        await handlePaymentSettlement(validatedData)
        break
      case 'expire':
        await handlePaymentExpire(validatedData)
        break
      case 'cancel':
        await handlePaymentCancel(validatedData)
        break
      case 'deny':
        await handlePaymentDeny(validatedData)
        break
      default:
        logger.warn({ status }, 'Unknown payment status')
    }

    logger.info({ jobId: job.id, orderId, status }, 'Payment webhook processed successfully')

    return { success: true }
  } catch (error) {
    logger.error(
      { jobId: job.id, orderId, error: error instanceof Error ? error.message : 'Unknown error' },
      'Payment webhook processing failed'
    )

    throw error // Let BullMQ handle retry
  }
}

async function handlePaymentSettlement(data: PaymentWebhookJob): Promise<void> {
  // Update transaction status
  // Activate user package
  // Send payment received email
  await sendEmailAsync({
    to: 'user@example.com', // Get from transaction
    subject: 'Payment Received',
    template: 'payment_received',
    data: { /* payment data */ },
  })
}

async function handlePaymentExpire(data: PaymentWebhookJob): Promise<void> {
  // Update transaction status
  // Send order expired email
  await sendEmailAsync({
    to: 'user@example.com',
    subject: 'Order Expired',
    template: 'order_expired',
    data: { /* expiry data */ },
  })
}

async function handlePaymentCancel(data: PaymentWebhookJob): Promise<void> {
  // Similar to expire
}

async function handlePaymentDeny(data: PaymentWebhookJob): Promise<void> {
  // Handle denied payment
}

/**
 * Initialize payment worker
 */
export function initializePaymentWorker(): void {
  const { concurrency } = queueConfig.payments

  queueManager.registerWorker(
    queueConfig.payments.name,
    processPaymentWebhook,
    { concurrency }
  )

  logger.info(
    { queue: queueConfig.payments.name, concurrency },
    'Payment worker initialized'
  )
}
```

**File:** `app/api/midtrans/webhook/route.ts` (UPDATE)

```typescript
// Add at the top
import { enqueueJob } from '@/lib/queues/QueueManager'
import { queueConfig } from '@/lib/queues/config'

// In POST handler, replace direct processing with:
export async function POST(request: NextRequest) {
  // ... existing webhook signature validation ...

  // Feature flag check
  if (process.env.ENABLE_BULLMQ === 'true') {
    // Enqueue to BullMQ for processing
    await enqueueJob(
      queueConfig.payments.name,
      'payment-webhook',
      {
        orderId: body.order_id,
        transactionId: body.transaction_id,
        status: body.transaction_status,
        paymentType: body.payment_type,
        webhookData: body,
      },
      {
        jobId: `payment-${body.transaction_id}-${Date.now()}`, // Idempotency key
      }
    )

    // Return immediately
    return NextResponse.json({ success: true, message: 'Webhook received and queued' })
  }

  // ... existing synchronous processing (fallback) ...
}
```

#### Step 1.6: Initialize Workers on Startup

**File:** `lib/queues/workers/index.ts`

```typescript
import { initializeRankCheckWorker } from './rank-check.worker'
import { initializeEmailWorker } from './email.worker'
import { initializePaymentWorker } from './payments.worker'
import { logger } from '@/lib/monitoring/error-handling'

export async function initializeAllWorkers(): Promise<void> {
  if (process.env.ENABLE_BULLMQ !== 'true') {
    logger.info({}, 'BullMQ disabled - skipping worker initialization')
    return
  }

  logger.info({}, 'Initializing BullMQ workers')

  try {
    initializeRankCheckWorker()
    initializeEmailWorker()
    initializePaymentWorker()

    logger.info({}, 'All BullMQ workers initialized successfully')
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to initialize BullMQ workers'
    )
    throw error
  }
}
```

**File:** `lib/job-management/worker-startup.ts` (UPDATE)

```typescript
// Add import
import { initializeAllWorkers } from '@/lib/queues/workers'

// In initialize() method, add:
async initialize(): Promise<void> {
  // ... existing code ...

  const result = await JobErrorHandler.withJobErrorHandling(
    async () => {
      // Initialize BullMQ workers if enabled
      await initializeAllWorkers()

      // ... existing worker initialization ...
      
      this.isInitialized = true
      return { initialized: true }
    },
    // ... existing error handling ...
  )
}
```

#### Phase 1 Deliverables

✅ Redis infrastructure set up (local + production)  
✅ Base BullMQ configuration and Queue Manager created  
✅ Job type schemas defined with Zod validation  
✅ 3 critical workers migrated: Rank Check, Email, Payment Webhooks  
✅ Feature flag system for gradual rollout  
✅ Backward compatibility maintained  

**Testing Checklist:**
- [ ] Add keyword → verify rank check job enqueued
- [ ] Payment webhook → verify payment job processed
- [ ] Send email → verify email job sent
- [ ] Job retry on failure → verify exponential backoff works
- [ ] Rate limiting → verify 28 jobs/min for rank checks

---

### Phase 2: Scheduled Cron Jobs Migration

**Duration:** 5-7 days  
**Goal:** Replace all node-cron jobs with BullMQ repeatable jobs

#### Step 2.1: Migrate DailyRankCheckJob

**File:** `lib/queues/workers/rank-schedule.worker.ts`

```typescript
import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { DailyRankCheckJob } from '../types'
import { BatchProcessor } from '@/lib/job-management/batch-processor'
import { logger } from '@/lib/monitoring/error-handling'

/**
 * Process daily rank check job
 */
async function processDailyRankCheck(job: Job<DailyRankCheckJob>): Promise<{
  checkedToday: number
  completionRate: string
}> {
  logger.info({ jobId: job.id }, 'Processing daily rank check job')

  try {
    const batchProcessor = new BatchProcessor()
    
    const initialStats = await batchProcessor.getProcessingStats()
    await batchProcessor.processDailyRankChecks()
    const finalStats = await batchProcessor.getProcessingStats()

    logger.info(
      { 
        jobId: job.id, 
        checkedToday: finalStats.checkedToday,
        completionRate: finalStats.completionRate 
      },
      'Daily rank check completed'
    )

    return {
      checkedToday: finalStats.checkedToday,
      completionRate: finalStats.completionRate,
    }
  } catch (error) {
    logger.error(
      { jobId: job.id, error: error instanceof Error ? error.message : 'Unknown error' },
      'Daily rank check failed'
    )
    throw error
  }
}

/**
 * Initialize daily rank check worker
 */
export function initializeDailyRankCheckWorker(): void {
  const queueName = 'rank-schedule'

  // Register worker
  queueManager.registerWorker(queueName, processDailyRankCheck, {
    concurrency: 1, // Only one daily job at a time
  })

  // Schedule repeatable job
  const queue = queueManager.getQueue(queueName)
  queue.add(
    'daily-rank-check',
    { scheduledAt: new Date().toISOString() },
    {
      repeat: {
        pattern: '0 2 * * *', // Daily at 2 AM UTC
        tz: 'UTC',
      },
    }
  )

  logger.info({ queue: queueName, schedule: '0 2 * * *' }, 'Daily rank check worker initialized')
}
```

#### Step 2.2: Migrate AutoCancelJob

**File:** `lib/queues/workers/auto-cancel.worker.ts`

```typescript
import { Job } from 'bullmq'
import { queueManager } from '../QueueManager'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { sendEmailAsync } from '@/lib/email'
import { logger } from '@/lib/monitoring/error-handling'

/**
 * Process auto-cancel job
 */
async function processAutoCancel(job: Job): Promise<{
  successCount: number
  errorCount: number
  totalFound: number
}> {
  logger.info({ jobId: job.id }, 'Processing auto-cancel job')

  try {
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    // Find expired transactions
    const expiredTransactions = await SecureServiceRoleWrapper.executeSecureOperation(
      {
        userId: 'system',
        operation: 'get_expired_payment_transactions',
        reason: 'Auto-cancel service finding payment transactions older than 24 hours',
        source: 'auto-cancel.worker',
        metadata: { cutoffTime: twentyFourHoursAgo.toISOString() }
      },
      { table: 'indb_payment_transactions', operationType: 'select' },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_payment_transactions')
          .select('*')
          .eq('transaction_status', 'pending')
          .lt('created_at', twentyFourHoursAgo.toISOString())

        if (error) throw error
        return data
      }
    )

    if (!expiredTransactions || expiredTransactions.length === 0) {
      return { successCount: 0, errorCount: 0, totalFound: 0 }
    }

    let successCount = 0
    let errorCount = 0

    // Process each expired transaction
    for (const transaction of expiredTransactions) {
      try {
        // Update transaction status
        await supabaseAdmin
          .from('indb_payment_transactions')
          .update({
            transaction_status: 'cancelled',
            processed_at: new Date().toISOString(),
          })
          .eq('id', transaction.id)

        // Send order expired email
        await sendEmailAsync({
          to: transaction.user_email,
          subject: 'Order Expired',
          template: 'order_expired',
          data: {
            customerName: transaction.customer_name,
            orderId: transaction.order_id,
            packageName: transaction.package_name,
            // ... other fields
          },
        })

        successCount++
      } catch (error) {
        errorCount++
        logger.error(
          { transactionId: transaction.id, error: error instanceof Error ? error.message : 'Unknown' },
          'Failed to cancel transaction'
        )
      }
    }

    logger.info(
      { jobId: job.id, successCount, errorCount, totalFound: expiredTransactions.length },
      'Auto-cancel job completed'
    )

    return { successCount, errorCount, totalFound: expiredTransactions.length }
  } catch (error) {
    logger.error(
      { jobId: job.id, error: error instanceof Error ? error.message : 'Unknown error' },
      'Auto-cancel job failed'
    )
    throw error
  }
}

/**
 * Initialize auto-cancel worker
 */
export function initializeAutoCancelWorker(): void {
  const queueName = 'auto-cancel'

  queueManager.registerWorker(queueName, processAutoCancel, {
    concurrency: 1,
  })

  const queue = queueManager.getQueue(queueName)
  queue.add(
    'auto-cancel-expired-transactions',
    {},
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
        tz: 'UTC',
      },
    }
  )

  logger.info({ queue: queueName, schedule: '0 * * * *' }, 'Auto-cancel worker initialized')
}
```

#### Step 2.3: Migrate Remaining Cron Jobs

Following the same pattern as above, create workers for:

**File:** `lib/queues/workers/trial-monitor.worker.ts`
- Schedule: `*/15 * * * *` (every 15 minutes)
- Queue: `trial-monitor`

**File:** `lib/queues/workers/keyword-enrichment.worker.ts`
- Schedule: `30 * * * *` (hourly at :30)
- Queue: `keyword-enrichment`
- Rate limiter: SeRanking API limits

**File:** `lib/queues/workers/quota-reset.worker.ts`
- Schedule: `5 * * * *` (hourly at :05)
- Queue: `quota-reset`
- Additional schedule: `*/15 * * * *` for midnight PT checks

**File:** `lib/queues/workers/indexing-monitor.worker.ts`
- Schedule: `* * * * *` (every minute)
- Queue: `indexing-monitor`

#### Step 2.4: Remove node-cron Dependencies

After all workers are migrated and tested:

```bash
npm uninstall node-cron @types/node-cron
```

**Files to Delete:**
- `lib/rank-tracking/daily-rank-check-job.ts`
- `lib/payment-services/auto-cancel-job.ts`
- `lib/payment-services/recurring-billing-job.ts`
- `lib/job-management/trial-monitor-job.ts`
- `lib/job-management/keyword-enrichment-worker.ts`
- `lib/monitoring/quota-reset-monitor.ts`
- `lib/job-management/job-monitor.ts`

**Files to Update:**
- `lib/job-management/worker-startup.ts` - Remove cron job initialization, keep only BullMQ

#### Phase 2 Deliverables

✅ All 7 cron jobs migrated to BullMQ repeatable jobs  
✅ node-cron dependency removed  
✅ Legacy cron job files deleted  
✅ Worker startup updated to use BullMQ exclusively  

**Testing Checklist:**
- [ ] Daily rank check runs at 2 AM UTC
- [ ] Auto-cancel runs every hour
- [ ] Trial monitor runs every 15 minutes
- [ ] Keyword enrichment runs hourly at :30
- [ ] Quota reset runs hourly at :05
- [ ] Indexing monitor runs every minute
- [ ] All jobs respect rate limits

---

### Phase 3: Advanced Features

**Duration:** 3-5 days  
**Goal:** Add monitoring, metrics, and operational excellence

#### Step 3.1: Add Bull Board Dashboard

**File:** `app/api/admin/bull-board/route.ts`

```typescript
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { queueManager } from '@/lib/queues/QueueManager'
import basicAuth from 'basic-auth'

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/api/admin/bull-board')

// Initialize Bull Board with all queues
const queues = [
  'rank-check',
  'rank-schedule',
  'email',
  'payments',
  'trial-monitor',
  'keyword-enrichment',
  'quota-reset',
  'indexing-monitor',
]

createBullBoard({
  queues: queues.map(q => new BullMQAdapter(queueManager.getQueue(q))),
  serverAdapter,
})

// Basic auth middleware
function authenticate(req: any): boolean {
  const credentials = basicAuth(req)

  if (!credentials || 
      credentials.name !== process.env.BULL_BOARD_USERNAME || 
      credentials.pass !== process.env.BULL_BOARD_PASSWORD) {
    return false
  }

  return true
}

export async function GET(request: Request) {
  if (!authenticate(request)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Bull Board"' },
    })
  }

  return serverAdapter.registerPlugin()
}
```

**Access:** `https://your-domain.com/api/admin/bull-board`

#### Step 3.2: Add Queue Metrics & Monitoring

**File:** `lib/monitoring/queue-events.ts`

```typescript
import { QueueEvents } from 'bullmq'
import { queueManager } from '@/lib/queues/QueueManager'
import { logger } from './error-handling'

export class QueueMetricsCollector {
  private queueEvents: Map<string, QueueEvents> = new Map()

  async initialize(queueNames: string[]): Promise<void> {
    for (const queueName of queueNames) {
      const queueEvents = new QueueEvents(queueName, {
        connection: queueManager['redisConnection'],
      })

      // Listen to events
      queueEvents.on('completed', ({ jobId, returnvalue }) => {
        logger.info({ queueName, jobId, returnvalue }, 'Job completed')
        // TODO: Send to Prometheus/Datadog
      })

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        logger.error({ queueName, jobId, failedReason }, 'Job failed')
        // TODO: Send to Sentry
      })

      queueEvents.on('stalled', ({ jobId }) => {
        logger.warn({ queueName, jobId }, 'Job stalled')
        // TODO: Alert operations team
      })

      this.queueEvents.set(queueName, queueEvents)
    }

    logger.info({ queueCount: queueNames.length }, 'Queue metrics collector initialized')
  }

  async shutdown(): Promise<void> {
    for (const [queueName, queueEvents] of this.queueEvents.entries()) {
      await queueEvents.close()
      logger.info({ queueName }, 'Queue events closed')
    }
  }
}
```

#### Step 3.3: Add Dead Letter Queue (DLQ) Handler

**File:** `lib/queues/dlq-handler.ts`

```typescript
import { queueManager } from './QueueManager'
import { logger } from '@/lib/monitoring/error-handling'

/**
 * Move permanently failed jobs to dead letter queue for manual inspection
 */
export async function moveToDLQ(queueName: string, jobId: string): Promise<void> {
  const queue = queueManager.getQueue(queueName)
  const job = await queue.getJob(jobId)

  if (!job) {
    logger.warn({ queueName, jobId }, 'Job not found for DLQ move')
    return
  }

  const dlqQueue = queueManager.getQueue(`${queueName}-dlq`)
  
  await dlqQueue.add(
    `dlq-${job.name}`,
    {
      originalQueue: queueName,
      originalJobId: jobId,
      originalData: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: new Date().toISOString(),
    }
  )

  logger.info({ queueName, jobId }, 'Job moved to DLQ')
}

/**
 * Retry jobs from DLQ
 */
export async function retryFromDLQ(queueName: string, dlqJobId: string): Promise<void> {
  const dlqQueue = queueManager.getQueue(`${queueName}-dlq`)
  const dlqJob = await dlqQueue.getJob(dlqJobId)

  if (!dlqJob) {
    logger.warn({ queueName, dlqJobId }, 'DLQ job not found')
    return
  }

  const originalQueue = queueManager.getQueue(queueName)
  await originalQueue.add(dlqJob.data.originalData.name, dlqJob.data.originalData)

  await dlqJob.remove()

  logger.info({ queueName, dlqJobId }, 'Job retried from DLQ')
}
```

#### Step 3.4: Add Job Priority System

Update existing workers to support priority:

```typescript
// In immediate rank check
await enqueueJob(
  queueConfig.rankCheck.name,
  'immediate-rank-check',
  data,
  {
    priority: 1, // Highest priority
  }
)

// In daily rank check
await enqueueJob(
  queueConfig.rankCheck.name,
  'daily-rank-check',
  data,
  {
    priority: 5, // Lower priority
  }
)
```

#### Step 3.5: Add Prometheus Metrics

**File:** `lib/monitoring/prometheus-metrics.ts`

```typescript
import client from 'prom-client'

// Job processing metrics
export const jobProcessingDuration = new client.Histogram({
  name: 'bullmq_job_processing_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['queue', 'job_name', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
})

export const jobsProcessedTotal = new client.Counter({
  name: 'bullmq_jobs_processed_total',
  help: 'Total number of jobs processed',
  labelNames: ['queue', 'job_name', 'status'],
})

export const jobsInQueue = new client.Gauge({
  name: 'bullmq_jobs_in_queue',
  help: 'Number of jobs currently in queue',
  labelNames: ['queue', 'status'],
})

// Update workers to record metrics
// In worker processor:
const startTime = Date.now()
try {
  const result = await processJob(job)
  const duration = (Date.now() - startTime) / 1000

  jobProcessingDuration.observe(
    { queue: queueName, job_name: job.name, status: 'success' },
    duration
  )
  jobsProcessedTotal.inc({ queue: queueName, job_name: job.name, status: 'success' })

  return result
} catch (error) {
  const duration = (Date.now() - startTime) / 1000

  jobProcessingDuration.observe(
    { queue: queueName, job_name: job.name, status: 'failed' },
    duration
  )
  jobsProcessedTotal.inc({ queue: queueName, job_name: job.name, status: 'failed' })

  throw error
}
```

#### Phase 3 Deliverables

✅ Bull Board dashboard for queue monitoring  
✅ Queue metrics collection with Prometheus integration  
✅ Dead letter queue for failed jobs  
✅ Job priority system implemented  
✅ Alerting for stalled/failed jobs  

**Testing Checklist:**
- [ ] Access Bull Board at /api/admin/bull-board
- [ ] View job status, logs, and retry failed jobs
- [ ] Metrics exported to Prometheus
- [ ] DLQ receives permanently failed jobs
- [ ] High-priority jobs processed first

---

## File Structure & Organization

```
lib/
├── queues/
│   ├── index.ts                    # Main exports
│   ├── config.ts                   # Redis connection, queue configs
│   ├── types.ts                    # Job type schemas (Zod)
│   ├── QueueManager.ts             # Centralized queue management
│   ├── dlq-handler.ts              # Dead letter queue utilities
│   ├── workers/
│   │   ├── index.ts                # Worker initialization
│   │   ├── rank-check.worker.ts    # Immediate rank check worker
│   │   ├── rank-schedule.worker.ts # Daily rank check worker
│   │   ├── email.worker.ts         # Email sending worker
│   │   ├── payments.worker.ts      # Payment webhook worker
│   │   ├── trial-monitor.worker.ts # Trial monitoring worker
│   │   ├── keyword-enrichment.worker.ts
│   │   ├── quota-reset.worker.ts
│   │   └── indexing-monitor.worker.ts
│   └── utils/
│       ├── job-helpers.ts          # Utility functions
│       └── retry-strategies.ts     # Custom retry logic
│
├── monitoring/
│   ├── queue-events.ts             # Queue metrics collector
│   └── prometheus-metrics.ts       # Prometheus integration
│
├── email/
│   └── index.ts                    # Email enqueue helper (NEW)
│
└── rank-tracking/
    └── immediate-rank-check.ts     # UPDATED with BullMQ

app/
└── api/
    └── admin/
        └── bull-board/
            └── route.ts            # Bull Board dashboard endpoint

docker-compose.yml                  # Redis for local development
.env                                # Environment variables
```

---

## Migration Strategy

### Gradual Rollout Plan

#### Stage 1: Infrastructure Setup (Day 1-2)
1. ✅ Set up Redis (local + production)
2. ✅ Install BullMQ packages
3. ✅ Create base queue infrastructure
4. ✅ Add feature flag `ENABLE_BULLMQ=false`

#### Stage 2: Parallel Operation (Day 3-7)
1. ✅ Implement BullMQ workers alongside existing cron jobs
2. ✅ Feature flag controls which system is active
3. ✅ Both systems running in staging for comparison
4. ✅ Monitor for discrepancies

**Environment Variables:**
```bash
# Staging
ENABLE_BULLMQ=true

# Production
ENABLE_BULLMQ=false  # Keep old system until validated
```

#### Stage 3: Validation (Day 8-10)
1. ✅ Run integration tests
2. ✅ Compare job execution times
3. ✅ Verify job success rates
4. ✅ Check error handling
5. ✅ Monitor resource usage (CPU, memory, Redis)

**Success Criteria:**
- ✅ 99% job success rate
- ✅ No job losses
- ✅ Retry logic works correctly
- ✅ Rate limiting respected
- ✅ Email delivery maintains 95%+ rate

#### Stage 4: Production Rollout (Day 11-14)
1. ✅ Enable BullMQ in production: `ENABLE_BULLMQ=true`
2. ✅ Monitor closely for 48 hours
3. ✅ Keep cron jobs as backup (disable but don't delete)
4. ✅ If issues arise, toggle back to cron: `ENABLE_BULLMQ=false`

#### Stage 5: Cleanup (Day 15+)
1. ✅ After 1 week of stable operation, remove cron code
2. ✅ Uninstall node-cron
3. ✅ Update documentation
4. ✅ Remove feature flags (BullMQ becomes default)

### Rollback Procedure

If BullMQ encounters critical issues:

1. **Immediate Rollback:**
   ```bash
   # Set environment variable
   ENABLE_BULLMQ=false
   
   # Restart application
   pm2 restart all  # or your deployment method
   ```

2. **Drain BullMQ Queues:**
   ```typescript
   // Run this script to process remaining jobs
   const queue = queueManager.getQueue('rank-check')
   await queue.drain()  // Process all pending jobs
   await queue.clean(0, 'wait')  // Remove waiting jobs
   ```

3. **Re-enable Cron Jobs:**
   - Cron code remains in codebase during Stage 4
   - Feature flag switches back to cron implementation

4. **Post-Mortem:**
   - Review logs
   - Identify root cause
   - Fix issues
   - Re-test in staging
   - Retry rollout

---

## Testing Strategy

### Unit Tests

**File:** `lib/queues/__tests__/QueueManager.test.ts`

```typescript
import { queueManager } from '../QueueManager'
import { queueConfig } from '../config'

describe('QueueManager', () => {
  it('should create a queue', () => {
    const queue = queueManager.getQueue(queueConfig.rankCheck.name)
    expect(queue).toBeDefined()
    expect(queue.name).toBe(queueConfig.rankCheck.name)
  })

  it('should enqueue a job', async () => {
    const jobId = await queueManager.enqueueJob(
      queueConfig.rankCheck.name,
      'test-job',
      { test: 'data' }
    )
    expect(jobId).toBeDefined()
  })

  it('should register a worker', () => {
    const worker = queueManager.registerWorker(
      'test-queue',
      async (job) => ({ success: true }),
      { concurrency: 1 }
    )
    expect(worker).toBeDefined()
  })
})
```

### Integration Tests

**File:** `lib/queues/__tests__/integration/rank-check.integration.test.ts`

```typescript
import { queueManager } from '../../QueueManager'
import { queueConfig } from '../../config'
import { supabaseAdmin } from '@/lib/database'

describe('Rank Check Integration', () => {
  beforeAll(async () => {
    // Initialize worker
    await initializeRankCheckWorker()
  })

  it('should process immediate rank check job end-to-end', async () => {
    // Create test keyword in database
    const keyword = await supabaseAdmin
      .from('indb_keyword_keywords')
      .insert({
        keyword: 'test seo tool',
        user_id: 'test-user-id',
        domain_id: 'test-domain-id',
        country_code: 'US',
        device: 'desktop',
      })
      .select()
      .single()

    // Enqueue job
    const jobId = await queueManager.enqueueJob(
      queueConfig.rankCheck.name,
      'immediate-rank-check',
      {
        keywordId: keyword.data.id,
        userId: 'test-user-id',
        domainId: 'test-domain-id',
        keyword: 'test seo tool',
        countryCode: 'US',
        device: 'desktop',
      }
    )

    // Wait for job to complete (max 30s)
    const queue = queueManager.getQueue(queueConfig.rankCheck.name)
    const job = await queue.getJob(jobId)

    await job.waitUntilFinished(queueManager['queueEvents'].get(queueConfig.rankCheck.name))

    // Verify rank result in database
    const rankResult = await supabaseAdmin
      .from('indb_keyword_rank_history')
      .select('*')
      .eq('keyword_id', keyword.data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    expect(rankResult.data).toBeDefined()
    expect(rankResult.data.rank).toBeGreaterThan(0)

    // Cleanup
    await supabaseAdmin.from('indb_keyword_keywords').delete().eq('id', keyword.data.id)
  })
})
```

### Load Testing

**File:** `scripts/load-test-bullmq.ts`

```typescript
import { queueManager } from '../lib/queues/QueueManager'
import { queueConfig } from '../lib/queues/config'

async function loadTest() {
  console.log('Starting BullMQ load test...')

  const jobCount = 1000
  const startTime = Date.now()

  // Enqueue 1000 jobs
  const promises = []
  for (let i = 0; i < jobCount; i++) {
    promises.push(
      queueManager.enqueueJob(
        queueConfig.rankCheck.name,
        'load-test-job',
        { index: i, keyword: `test-keyword-${i}` }
      )
    )
  }

  await Promise.all(promises)

  const enqueueTime = Date.now() - startTime
  console.log(`Enqueued ${jobCount} jobs in ${enqueueTime}ms`)
  console.log(`Average: ${enqueueTime / jobCount}ms per job`)

  // Wait for all jobs to complete
  const queue = queueManager.getQueue(queueConfig.rankCheck.name)
  
  const completedJobs = await queue.getCompletedCount()
  console.log(`Completed jobs: ${completedJobs}`)
}

loadTest()
```

### Testing Checklist

- [ ] **Unit Tests**: All queue operations (enqueue, worker registration, shutdown)
- [ ] **Integration Tests**: End-to-end job processing for each worker
- [ ] **Load Tests**: 1000+ jobs processed without failures
- [ ] **Rate Limit Tests**: Verify Firecrawl 30 req/min limit respected
- [ ] **Retry Tests**: Jobs retry on failure with exponential backoff
- [ ] **DLQ Tests**: Permanently failed jobs move to dead letter queue
- [ ] **Priority Tests**: High-priority jobs processed before low-priority
- [ ] **Idempotency Tests**: Duplicate jobs don't cause double processing

---

## Rollback Plan

### Immediate Rollback (Critical Issues)

**When to Rollback:**
- Job loss detected (jobs not processed)
- Database corruption
- Redis connection failures causing app crashes
- Email delivery drops below 80%
- Rate limiting failures causing API bans

**Rollback Steps:**

1. **Disable BullMQ:**
   ```bash
   # Update environment variable
   export ENABLE_BULLMQ=false
   
   # Or via deployment platform
   heroku config:set ENABLE_BULLMQ=false  # Heroku
   vercel env add ENABLE_BULLMQ false     # Vercel
   ```

2. **Restart Application:**
   ```bash
   pm2 restart all
   # or
   systemctl restart indexnow-studio
   ```

3. **Drain Remaining BullMQ Jobs:**
   ```typescript
   // Run this admin script
   import { queueManager } from './lib/queues/QueueManager'

   async function drainAllQueues() {
     const queueNames = ['rank-check', 'email', 'payments', /* ... */]
     
     for (const queueName of queueNames) {
       const queue = queueManager.getQueue(queueName)
       await queue.drain()  // Wait for all jobs to complete
       await queue.clean(0, 'wait')  // Remove waiting jobs
       console.log(`Drained ${queueName}`)
     }
   }

   drainAllQueues()
   ```

4. **Monitor Cron Jobs:**
   - Verify cron jobs are running
   - Check logs for job execution
   - Confirm email delivery resumes

### Gradual Rollback (Performance Issues)

**When to Use:**
- Jobs processing slower than expected
- Higher resource usage than anticipated
- Non-critical errors increasing

**Rollback Steps:**

1. **Disable BullMQ for Specific Queues:**
   ```typescript
   // In relevant service file
   if (process.env.ENABLE_BULLMQ_RANK_CHECK !== 'true') {
     // Use legacy implementation
     return triggerImmediateRankCheckLegacy(keywordIds, userId)
   }
   ```

2. **Keep Other Queues Active:**
   - Email queue continues using BullMQ
   - Payment queue continues using BullMQ
   - Only problematic queue reverts

3. **Investigate and Fix:**
   - Review queue metrics
   - Optimize worker concurrency
   - Adjust rate limits
   - Fix bugs

4. **Re-enable Gradually:**
   - Fix issues in staging
   - Re-enable queue with monitoring
   - Verify improvements

### Data Recovery

**If Jobs Lost:**

1. **Identify Missing Jobs:**
   ```sql
   -- Find keywords without rank checks in last 24 hours
   SELECT k.id, k.keyword
   FROM indb_keyword_keywords k
   LEFT JOIN indb_keyword_rank_history rh 
     ON k.id = rh.keyword_id 
     AND rh.created_at > NOW() - INTERVAL '24 hours'
   WHERE rh.id IS NULL
     AND k.is_active = true
   ```

2. **Re-enqueue Jobs:**
   ```typescript
   // Run recovery script
   const missingKeywords = /* ... from SQL query ... */
   
   for (const keyword of missingKeywords) {
     await triggerImmediateRankCheck([keyword.id], keyword.user_id)
   }
   ```

3. **Verify Recovery:**
   - Check rank history table
   - Confirm all keywords have recent checks

---

## Monitoring & Operations

### Dashboard Access

**Bull Board:**
- URL: `https://your-domain.com/api/admin/bull-board`
- Username: `process.env.BULL_BOARD_USERNAME`
- Password: `process.env.BULL_BOARD_PASSWORD`

**Metrics:**
- View job counts by queue
- See active, completed, failed jobs
- Retry failed jobs manually
- View job data and logs

### Key Metrics to Monitor

#### Queue Health

```sql
-- Check queue depths (via Bull Board or Redis)
KEYS bull:rank-check:*
LLEN bull:rank-check:wait
LLEN bull:rank-check:active
LLEN bull:rank-check:failed
```

**Alerts:**
- ⚠️ Warning: Queue depth > 1000 jobs
- 🚨 Critical: Queue depth > 5000 jobs
- 🚨 Critical: Failed jobs > 100

#### Job Processing Rates

**Monitor:**
- Jobs processed per minute
- Average job duration
- Job success rate (should be > 99%)

**Alerts:**
- ⚠️ Warning: Success rate < 95%
- 🚨 Critical: Success rate < 90%

#### Worker Health

**Monitor:**
- Worker uptime
- Worker memory usage
- Worker CPU usage

**Alerts:**
- 🚨 Critical: Worker crashed
- ⚠️ Warning: Worker memory > 80%

### Operational Procedures

#### Manual Job Retry

```typescript
// Via Bull Board UI
// Or via script:
import { queueManager } from './lib/queues/QueueManager'

async function retryJob(queueName: string, jobId: string) {
  const queue = queueManager.getQueue(queueName)
  const job = await queue.getJob(jobId)
  
  if (job && job.isFailed()) {
    await job.retry()
    console.log(`Retried job ${jobId}`)
  }
}
```

#### Pause Queue (Maintenance)

```typescript
import { queueManager } from './lib/queues/QueueManager'

async function pauseQueue(queueName: string) {
  const queue = queueManager.getQueue(queueName)
  await queue.pause()
  console.log(`Queue ${queueName} paused`)
}

async function resumeQueue(queueName: string) {
  const queue = queueManager.getQueue(queueName)
  await queue.resume()
  console.log(`Queue ${queueName} resumed`)
}
```

#### Clean Old Jobs

```typescript
// Run weekly to clean up old completed jobs
import { queueManager } from './lib/queues/QueueManager'

async function cleanOldJobs() {
  const queueNames = ['rank-check', 'email', 'payments']
  
  for (const queueName of queueNames) {
    const queue = queueManager.getQueue(queueName)
    
    // Remove completed jobs older than 7 days
    await queue.clean(7 * 24 * 60 * 60 * 1000, 'completed')
    
    // Remove failed jobs older than 30 days
    await queue.clean(30 * 24 * 60 * 60 * 1000, 'failed')
    
    console.log(`Cleaned old jobs from ${queueName}`)
  }
}
```

### Alerting Configuration

**Recommended Alerts:**

1. **Job Failure Rate > 5%**
   - Severity: Warning
   - Action: Investigate logs, check API health

2. **Job Failure Rate > 10%**
   - Severity: Critical
   - Action: Consider rollback, page on-call engineer

3. **Queue Depth > 5000**
   - Severity: Critical
   - Action: Increase worker concurrency, investigate bottleneck

4. **Worker Crashed**
   - Severity: Critical
   - Action: Restart worker, check logs

5. **Redis Connection Lost**
   - Severity: Critical
   - Action: Check Redis health, restart if needed

### Performance Tuning

#### Concurrency Optimization

```typescript
// Adjust based on monitoring data
export const queueConfig = {
  rankCheck: {
    concurrency: 10, // Increase if jobs processing slowly
    limiter: {
      max: 28, // Keep for API protection
      duration: 60000,
    },
  },
  email: {
    concurrency: 20, // Increase for faster email delivery
  },
}
```

#### Memory Management

```typescript
// Limit job data size
export const defaultJobOptions = {
  removeOnComplete: {
    age: 3600, // Keep for 1 hour instead of 24
    count: 100, // Keep max 100 jobs instead of 1000
  },
}
```

---

## Appendix: Job Catalog

### Complete Job Type Reference

| Job Type | Queue | Priority | Retry | Rate Limit | Schedule |
|----------|-------|----------|-------|------------|----------|
| immediate-rank-check | rank-check | 1 (high) | 3x exponential | 28/min | On-demand |
| daily-rank-check | rank-schedule | 5 (low) | 3x exponential | 28/min | Daily 2 AM UTC |
| send-email | email | 1-5 | 3x exponential | 50/min | On-demand |
| payment-webhook | payments | 1 (high) | 3x fixed delay | N/A | Webhook-triggered |
| auto-cancel | auto-cancel | 5 (low) | 2x | N/A | Hourly |
| trial-monitor | trial-monitor | 5 (low) | 2x | N/A | Every 15 min |
| keyword-enrichment | keyword-enrichment | 5 (low) | 3x | SeRanking limit | Hourly at :30 |
| quota-reset | quota-reset | 5 (low) | 2x | N/A | Hourly at :05 |
| indexing-monitor | indexing-monitor | 3 (medium) | 2x | Google API limit | Every minute |

### Environment Variables Reference

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# BullMQ
ENABLE_BULLMQ=false
BULLMQ_CONCURRENCY_RANK_CHECK=5
BULLMQ_CONCURRENCY_EMAIL=10
BULLMQ_CONCURRENCY_PAYMENTS=3

# Monitoring
BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Jobs not processing | Worker not started | Check worker initialization in startup logs |
| Redis connection failed | Wrong credentials | Verify REDIS_HOST, REDIS_PORT, REDIS_PASSWORD |
| Rate limit exceeded | Too high concurrency | Reduce concurrency in queueConfig |
| Jobs stuck in "active" | Worker crashed mid-job | Restart worker, jobs will auto-retry |
| Memory leak | Too many completed jobs | Reduce removeOnComplete.count |
| Duplicate job processing | Missing jobId (idempotency key) | Add unique jobId to job options |

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Set up Redis (local + production)
- [ ] Install BullMQ packages
- [ ] Create `lib/queues/config.ts`
- [ ] Create `lib/queues/types.ts`
- [ ] Create `lib/queues/QueueManager.ts`
- [ ] Implement rank-check.worker.ts
- [ ] Implement email.worker.ts
- [ ] Implement payments.worker.ts
- [ ] Update worker-startup.ts
- [ ] Add feature flag ENABLE_BULLMQ
- [ ] Test in staging
- [ ] Enable in production (monitor)

### Phase 2: Cron Migration (Week 2)
- [ ] Implement rank-schedule.worker.ts
- [ ] Implement auto-cancel.worker.ts
- [ ] Implement trial-monitor.worker.ts
- [ ] Implement keyword-enrichment.worker.ts
- [ ] Implement quota-reset.worker.ts
- [ ] Implement indexing-monitor.worker.ts
- [ ] Test all scheduled jobs in staging
- [ ] Enable in production (monitor)
- [ ] Verify cron jobs no longer needed
- [ ] Uninstall node-cron
- [ ] Delete old cron job files

### Phase 3: Advanced Features (Week 3)
- [ ] Add Bull Board dashboard
- [ ] Implement queue-events.ts
- [ ] Add Prometheus metrics
- [ ] Implement DLQ handler
- [ ] Add job priority system
- [ ] Configure alerting
- [ ] Write documentation
- [ ] Create runbooks

### Final Verification
- [ ] All tests passing (unit + integration)
- [ ] Load test completed successfully
- [ ] All queues processing jobs
- [ ] Monitoring dashboard accessible
- [ ] Alerts configured
- [ ] Rollback procedure tested
- [ ] Documentation updated
- [ ] Team trained on BullMQ

---

## Success Criteria

✅ **Reliability**: 99.9% job success rate  
✅ **Performance**: Jobs processed within SLA (rank checks < 5min, emails < 30s)  
✅ **Scalability**: Can handle 10x current load  
✅ **Observability**: Real-time monitoring via Bull Board  
✅ **Maintainability**: Clear code structure, comprehensive tests  
✅ **Operations**: Runbooks for common issues, automated alerts  

---

**Next Steps:**
1. Review this plan with the team
2. Provision Redis infrastructure
3. Begin Phase 1 implementation
4. Schedule regular progress reviews

**Questions or Concerns:**
- Contact: Development Team
- Slack: #indexnow-infrastructure
- Email: dev@indexnow.studio

---

*End of Document*

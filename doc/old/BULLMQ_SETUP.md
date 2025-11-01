# BullMQ Implementation - Setup Guide

## Installation

### 1. Install Required Packages

```bash
npm install bullmq ioredis @bull-board/api @bull-board/api/bullMQAdapter
```

### 2. Environment Variables

⚠️ **SECURITY WARNING**: Never commit real credentials to version control!

Add the following to your `.env.local` file (obtain actual Redis credentials from your infrastructure admin):

```bash
# Redis Configuration (REQUIRED)
REDIS_HOST=your-redis-host        # Contact admin for production Redis credentials
REDIS_PORT=6379
REDIS_USER=your-redis-user
REDIS_PASSWORD=your-redis-password
REDIS_URL=redis://user:password@host:port

# BullMQ Feature Flags
ENABLE_BULLMQ=false  # Set to true when ready to use BullMQ
BULLMQ_CONCURRENCY_RANK_CHECK=5
BULLMQ_CONCURRENCY_EMAIL=10
BULLMQ_CONCURRENCY_PAYMENTS=3

# Rate Limiting Configuration (Optional - defaults shown)
BULLMQ_RATE_LIMIT_RANK_CHECK=28     # Jobs per minute (Firecrawl API limit with buffer)
BULLMQ_RATE_LIMIT_EMAIL=50          # Jobs per minute (SMTP limit)

# Bull Board Monitoring (REQUIRED - no defaults for security)
BULL_BOARD_USERNAME=              # Set a strong username
BULL_BOARD_PASSWORD=              # Set a strong password (min 16 chars)
```

### 3. Gradual Rollout

The implementation uses a feature flag system for safe rollout:

**Stage 1: Testing (Development)**
```bash
ENABLE_BULLMQ=false  # Use legacy cron jobs
```

**Stage 2: Validation (Staging)**
```bash
ENABLE_BULLMQ=true   # Enable BullMQ
```

**Stage 3: Production Rollout**
```bash
ENABLE_BULLMQ=true   # After successful staging validation
```

### 4. Monitoring

Access Bull Board dashboard:
```
https://your-domain.com/api/admin/bull-board
```

Use Basic Auth with credentials from environment variables.

## What Changed

### New Services Migrated to BullMQ

**Phase 1: Background Async Operations**
- ✅ Immediate Rank Check (fire-and-forget → reliable queue)
- ✅ Email Service (direct send → queued with retry)
- ✅ Payment Webhooks (inline processing → queued processing)

**Phase 2: Scheduled Cron Jobs**
- ✅ Daily Rank Check (2 AM UTC)
- ✅ Auto-Cancel Expired Transactions (Every hour)
- ✅ Trial Monitoring (Every 15 minutes)
- ✅ Keyword Enrichment (Every hour at :30)
- ✅ Quota Reset Monitoring (Hourly at :05 + midnight checks)
- ✅ Google Indexing Monitor (Every minute)

**Phase 3: Monitoring & Operations**
- ✅ Bull Board dashboard for queue visualization
- ✅ Queue metrics collection and event monitoring
- ✅ Job retry/pause/resume capabilities

## Architecture

### Queue Structure

```
lib/queues/
├── config.ts               # Redis connection & queue configs
├── types.ts                # Job type schemas (Zod)
├── QueueManager.ts         # Centralized queue management
├── index.ts                # Exports
└── workers/
    ├── index.ts                        # Worker initialization
    ├── rank-check.worker.ts            # Immediate rank checks
    ├── email.worker.ts                 # Email sending
    ├── payments.worker.ts              # Payment webhooks
    ├── rank-schedule.worker.ts         # Daily rank checks
    ├── auto-cancel.worker.ts           # Auto-cancel expired
    ├── trial-monitor.worker.ts         # Trial monitoring
    ├── keyword-enrichment.worker.ts    # Keyword enrichment
    ├── quota-reset.worker.ts           # Quota reset
    └── indexing-monitor.worker.ts      # Indexing monitor
```

### Benefits

1. **Reliability**: Automatic retries with exponential backoff
2. **Monitoring**: Real-time job status via Bull Board
3. **Scalability**: Horizontal scaling with multiple workers
4. **Rate Limiting**: Built-in rate limiting (28 req/min for Firecrawl)
5. **Job Prioritization**: High-priority jobs processed first
6. **Dead Letter Queues**: Failed jobs isolated for inspection
7. **Graceful Degradation**: Falls back to legacy implementation when disabled

## Testing Checklist

### Phase 1 Tests
- [ ] Add keyword → verify rank check job enqueued
- [ ] Payment webhook → verify payment job processed
- [ ] Send email → verify email job sent
- [ ] Job retry on failure → verify exponential backoff works
- [ ] Rate limiting → verify 28 jobs/min for rank checks

### Phase 2 Tests
- [ ] Daily rank check runs at 2 AM UTC
- [ ] Auto-cancel runs every hour
- [ ] Trial monitor runs every 15 minutes
- [ ] Keyword enrichment runs hourly at :30
- [ ] Quota reset runs hourly at :05
- [ ] Indexing monitor runs every minute
- [ ] All jobs respect rate limits

### Phase 3 Tests
- [ ] Access Bull Board at /api/admin/bull-board
- [ ] View job status, logs, and retry failed jobs
- [ ] Queue pause/resume works correctly
- [ ] Metrics show job counts accurately

## Rollback Procedure

If issues arise:

```bash
# 1. Disable BullMQ immediately
ENABLE_BULLMQ=false

# 2. Restart application
npm run dev  # or your deployment command

# 3. System automatically falls back to legacy cron jobs
```

## Maintenance

### Clean Old Jobs

Run weekly:
```typescript
// Access Bull Board dashboard and use UI, or run:
import { queueManager } from '@/lib/queues/QueueManager'

const queue = queueManager.getQueue('rank-check')
await queue.clean(7 * 24 * 60 * 60 * 1000, 'completed')  // 7 days
await queue.clean(30 * 24 * 60 * 60 * 1000, 'failed')    // 30 days
```

### Monitor Queue Health

Key metrics:
- Queue depth < 1000 (warning at 1000, critical at 5000)
- Job success rate > 99%
- Worker uptime > 99.9%

## Troubleshooting

### Redis Connection Failed
- Verify REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- Check Redis server is running and accessible

### Jobs Not Processing
- Check worker initialization in startup logs
- Verify ENABLE_BULLMQ=true
- Confirm Redis connection is stable

### Rate Limit Exceeded
- Reduce concurrency in config.ts
- Check limiter settings for queue

### Jobs Stuck in Active
- Worker may have crashed mid-job
- Restart workers - jobs will auto-retry

## Support

For issues or questions:
- Check logs: Bull Board dashboard
- Review metrics: Queue events monitoring
- Fallback: Set ENABLE_BULLMQ=false

import { ConnectionOptions } from 'bullmq'

export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  username: process.env.REDIS_USER || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}

export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: {
    age: 24 * 3600,
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600,
  },
}

export const queueConfig = {
  rankCheck: {
    name: 'rank-check',
    concurrency: parseInt(process.env.BULLMQ_CONCURRENCY_RANK_CHECK || '5'),
    limiter: {
      max: parseInt(process.env.BULLMQ_RATE_LIMIT_RANK_CHECK_MAX || '28'),
      duration: parseInt(process.env.BULLMQ_RATE_LIMIT_RANK_CHECK_DURATION || '60000'),
    },
  },
  rankSchedule: {
    name: 'rank-schedule',
    concurrency: 1,
  },
  email: {
    name: 'email',
    concurrency: parseInt(process.env.BULLMQ_CONCURRENCY_EMAIL || '10'),
    limiter: {
      max: parseInt(process.env.BULLMQ_RATE_LIMIT_EMAIL_MAX || '50'),
      duration: parseInt(process.env.BULLMQ_RATE_LIMIT_EMAIL_DURATION || '60000'),
    },
  },
  payments: {
    name: 'payments',
    concurrency: parseInt(process.env.BULLMQ_CONCURRENCY_PAYMENTS || '3'),
  },
  keywordEnrichment: {
    name: 'keyword-enrichment',
    concurrency: 1,
  },
  quotaReset: {
    name: 'quota-reset',
    concurrency: 1,
  },
  indexingMonitor: {
    name: 'indexing-monitor',
    concurrency: 2,
  },
  autoCancel: {
    name: 'auto-cancel',
    concurrency: 1,
  },
  hourlyRankRetry: {
    name: 'hourly-rank-retry',
    concurrency: 1,
  },
}

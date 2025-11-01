import { z } from 'zod'

export const ImmediateRankCheckJobSchema = z.object({
  keywordId: z.string().uuid(),
  userId: z.string().uuid(),
  domainId: z.string().uuid(),
  keyword: z.string(),
  countryCode: z.string(),
  device: z.enum(['desktop', 'mobile']),
})

export type ImmediateRankCheckJob = z.infer<typeof ImmediateRankCheckJobSchema>

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
    'contact_form',
  ]),
  data: z.record(z.any()),
})

export type EmailJob = z.infer<typeof EmailJobSchema>

export const PaymentWebhookJobSchema = z.object({
  orderId: z.string(),
  transactionId: z.string(),
  status: z.enum(['pending', 'settlement', 'expire', 'cancel', 'deny']),
  paymentType: z.string(),
  webhookData: z.record(z.any()),
})

export type PaymentWebhookJob = z.infer<typeof PaymentWebhookJobSchema>

export const DailyRankCheckJobSchema = z.object({
  scheduledAt: z.string().datetime(),
  batchSize: z.number().optional(),
})

export type DailyRankCheckJob = z.infer<typeof DailyRankCheckJobSchema>

export const AutoCancelJobSchema = z.object({
  scheduledAt: z.string().datetime(),
})

export type AutoCancelJob = z.infer<typeof AutoCancelJobSchema>

export const KeywordEnrichmentJobSchema = z.object({
  scheduledAt: z.string().datetime(),
})

export type KeywordEnrichmentJob = z.infer<typeof KeywordEnrichmentJobSchema>

export const QuotaResetJobSchema = z.object({
  scheduledAt: z.string().datetime(),
})

export type QuotaResetJob = z.infer<typeof QuotaResetJobSchema>

export const IndexingMonitorJobSchema = z.object({
  scheduledAt: z.string().datetime(),
})

export type IndexingMonitorJob = z.infer<typeof IndexingMonitorJobSchema>

export const HourlyRankRetryJobSchema = z.object({
  scheduledAt: z.string().datetime(),
})

export type HourlyRankRetryJob = z.infer<typeof HourlyRankRetryJobSchema>

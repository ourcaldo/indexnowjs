import { NextRequest } from 'next/server'
import { logger } from '@/lib/monitoring/error-handling'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'

export const POST = publicApiWrapper(async (request: NextRequest) => {
  logger.info({ message: '🚫 DEPRECATED: Manual recurring payment processing disabled' }, 'Info')
  logger.info({ message: '📡 Midtrans handles recurring payments automatically via webhook notifications' }, 'Info')
  logger.info({ message: '🔔 Payment confirmations are processed at: /api/v1/payments/midtrans/webhook' }, 'Info')
  
  return formatSuccess({ 
    message: 'Recurring billing is handled automatically by Midtrans webhooks',
    processed: 0,
    failed: 0,
    status: 'disabled_automatic_processing',
    info: 'Midtrans processes recurring payments automatically and sends webhook notifications'
  })
})

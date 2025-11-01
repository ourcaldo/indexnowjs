/**
 * Paddle Webhook Handler
 * Receives and processes webhook events from Paddle
 * 
 * Security:
 * - Validates webhook signature using PADDLE_WEBHOOK_SECRET
 * - Logs all events to indb_paddle_webhook_events
 * - Routes events to appropriate processors
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/database'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import {
  processSubscriptionCreated,
  processSubscriptionUpdated,
  processSubscriptionCanceled,
  processSubscriptionPaused,
  processSubscriptionResumed,
  processTransactionCompleted,
  processTransactionPaymentFailed,
} from './processors'

export const POST = async (request: NextRequest) => {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('paddle-signature')

    if (!signature) {
      await ErrorHandlingService.createError(
        ErrorType.AUTHORIZATION,
        'Missing Paddle webhook signature',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 401,
        }
      )
      return NextResponse.json(
        { error: 'Missing Paddle signature' },
        { status: 401 }
      )
    }

    const isValid = verifyPaddleSignature(rawBody, signature)
    
    if (!isValid) {
      await ErrorHandlingService.createError(
        ErrorType.AUTHORIZATION,
        'Invalid Paddle webhook signature',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 401,
          metadata: { signature_preview: signature.substring(0, 20) + '...' }
        }
      )
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const eventData = JSON.parse(rawBody)
    const { event_id, event_type, data } = eventData

    await supabaseAdmin
      .from('indb_paddle_webhook_events')
      .insert({
        event_id,
        event_type,
        event_data: eventData,
        processed: false,
      })

    await routeWebhookEvent(event_type, data, event_id)

    await supabaseAdmin
      .from('indb_paddle_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('event_id', event_id)

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    await ErrorHandlingService.createError(
      ErrorType.EXTERNAL_API,
      error instanceof Error ? error : new Error('Unknown webhook processing error'),
      {
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        metadata: { source: 'paddle_webhook' }
      }
    )
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

function verifyPaddleSignature(rawBody: string, signature: string): boolean {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET
  
  if (!webhookSecret) {
    throw new Error('PADDLE_WEBHOOK_SECRET not configured in environment variables')
  }

  try {
    const parts = signature.split(';')
    const timestamp = parts[0].split('=')[1]
    const receivedSignature = parts[1].split('=')[1]

    const payload = `${timestamp}.${rawBody}`
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    return false
  }
}

async function routeWebhookEvent(eventType: string, data: any, eventId: string) {
  try {
    switch (eventType) {
      case 'subscription.created':
        await processSubscriptionCreated(data)
        break
      case 'subscription.updated':
        await processSubscriptionUpdated(data)
        break
      case 'subscription.canceled':
        await processSubscriptionCanceled(data)
        break
      case 'subscription.paused':
        await processSubscriptionPaused(data)
        break
      case 'subscription.resumed':
        await processSubscriptionResumed(data)
        break
      case 'transaction.completed':
        await processTransactionCompleted(data)
        break
      case 'transaction.payment_failed':
        await processTransactionPaymentFailed(data)
        break
      default:
    }
  } catch (error) {
    await supabaseAdmin
      .from('indb_paddle_webhook_events')
      .update({
        error_message: error instanceof Error ? error.message : 'Unknown error',
        retry_count: 0,
      })
      .eq('event_id', eventId)

    throw error
  }
}

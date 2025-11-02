/**
 * Paddle Webhook Handler
 * Receives and processes webhook events from Paddle
 * 
 * Security:
 * - Validates webhook signature using webhook secret from DATABASE
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

const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000

async function getWebhookSecretFromDatabase(): Promise<string> {
  const { data: gateway, error } = await supabaseAdmin
    .from('indb_payment_gateways')
    .select('api_credentials')
    .eq('slug', 'paddle')
    .eq('is_active', true)
    .single()

  if (error || !gateway) {
    throw new Error('Paddle gateway not found or not active')
  }

  const webhookSecret = gateway.api_credentials?.webhook_secret

  if (!webhookSecret) {
    throw new Error('PADDLE webhook secret not found in database. Please update indb_payment_gateways.api_credentials with actual webhook_secret.')
  }

  return webhookSecret
}

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

    const verificationResult = await verifyPaddleSignature(rawBody, signature)
    
    if (!verificationResult.valid) {
      await ErrorHandlingService.createError(
        ErrorType.AUTHORIZATION,
        `Paddle webhook signature verification failed: ${verificationResult.error}`,
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 401,
          metadata: { error: verificationResult.error }
        }
      )
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const eventData = JSON.parse(rawBody)
    const { event_id, event_type, data } = eventData

    if (!event_id || !event_type) {
      await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        'Missing event_id or event_type in webhook payload',
        {
          severity: ErrorSeverity.MEDIUM,
          statusCode: 400,
        }
      )
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    const { data: existingEvent } = await supabaseAdmin
      .from('indb_paddle_webhook_events')
      .select('id, processed')
      .eq('event_id', event_id)
      .single()

    if (existingEvent) {
      if (existingEvent.processed) {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('indb_paddle_webhook_events')
        .insert({
          event_id,
          event_type,
          event_data: eventData,
          processed: false,
        })

      if (insertError) {
        throw new Error(`Failed to log webhook event: ${insertError.message}`)
      }
    }

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

interface SignatureVerificationResult {
  valid: boolean
  error?: string
}

async function verifyPaddleSignature(rawBody: string, signature: string): Promise<SignatureVerificationResult> {
  // CRITICAL: Load webhook secret from DATABASE (not environment variables)
  const webhookSecret = await getWebhookSecretFromDatabase()

  try {
    const parts = signature.split(';')
    
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid signature format' }
    }

    const timestampPart = parts[0].split('=')
    const signaturePart = parts[1].split('=')

    if (timestampPart.length !== 2 || timestampPart[0] !== 'ts' ||
        signaturePart.length !== 2 || signaturePart[0] !== 'h1') {
      return { valid: false, error: 'Invalid signature structure' }
    }

    const timestamp = timestampPart[1]
    const receivedSignature = signaturePart[1]

    if (!timestamp || !receivedSignature) {
      return { valid: false, error: 'Missing timestamp or signature value' }
    }

    if (!/^\d+$/.test(timestamp)) {
      return { valid: false, error: 'Invalid timestamp format' }
    }

    if (!/^[0-9a-fA-F]+$/.test(receivedSignature)) {
      return { valid: false, error: 'Invalid signature hex format' }
    }

    const timestampMs = parseInt(timestamp, 10) * 1000
    const currentMs = Date.now()
    const timeDiffMs = Math.abs(currentMs - timestampMs)

    if (timeDiffMs > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
      return { valid: false, error: 'Timestamp outside tolerance window (replay attack protection)' }
    }

    const payload = `${timestamp}:${rawBody}`
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex')

    if (receivedSignature.length !== expectedSignature.length) {
      return { valid: false, error: 'Signature length mismatch' }
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )

    return { valid: isValid, error: isValid ? undefined : 'Signature mismatch' }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown verification error' }
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

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BasePaymentHandler, PaymentData } from '../channels/shared/base-handler'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import type { AuthenticatedRequest } from '@/lib/core/api-middleware'

// Import handlers directly
import MidtransSnapHandler from '../channels/midtrans-snap/handler'
import MidtransRecurringHandler from '../channels/midtrans-recurring/handler'  
import BankTransferHandler from '../channels/bank-transfer/handler'

export const POST = authenticatedApiWrapper(async (request: NextRequest, auth: AuthenticatedRequest) => {
  // Parse request body
  const body = await request.json()
  const { payment_method, package_id, billing_period, customer_info, token_id, is_trial } = body

  // Check trial eligibility if this is a trial flow
  if (is_trial) {
    const cookieStore2 = await cookies()
    const supabase2 = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore2.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore2.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    // Check if user has already used trial using SecureWrapper
    const userProfile = await SecureServiceRoleWrapper.executeWithUserSession(
      supabase2,
      {
        userId: auth.userId,
        operation: 'check_trial_eligibility',
        source: 'billing/payment',
        reason: 'Checking if user has already used trial before payment',
        metadata: { package_id, payment_method, billing_period }
      },
      { table: 'indb_auth_user_profiles', operationType: 'select' },
      async (db) => {
        const { data, error } = await db
          .from('indb_auth_user_profiles')
          .select('has_used_trial, trial_used_at')
          .eq('user_id', auth.userId)
          .single()
        
        if (error) throw error
        return data
      }
    )

    if (userProfile?.has_used_trial) {
      const error = await ErrorHandlingService.createError(
        ErrorType.BUSINESS_LOGIC,
        `Free trial already used on ${new Date(userProfile.trial_used_at).toLocaleDateString()}`,
        {
          severity: ErrorSeverity.MEDIUM,
          statusCode: 400,
          userId: auth.userId,
          userMessageKey: 'default'
        }
      )
      return formatError(error)
    }
  }

  // Prepare payment data
  const paymentData: PaymentData = {
    package_id,
    billing_period,
    customer_info,
    user: auth.user,
    is_trial
  }

  // Route to specific payment channel handler
  let handler: BasePaymentHandler

  switch (payment_method) {
    case 'midtrans_snap':
      handler = new MidtransSnapHandler(paymentData)
      break
    
    case 'midtrans_recurring':
      if (!token_id) {
        const error = await ErrorHandlingService.createError(
          ErrorType.VALIDATION,
          'Valid card token is required for recurring payments',
          {
            severity: ErrorSeverity.MEDIUM,
            statusCode: 400,
            userId: auth.userId,
            userMessageKey: 'missing_required'
          }
        )
        return formatError(error)
      }
      handler = new MidtransRecurringHandler(paymentData, token_id)
      break
      
    case 'bank_transfer':
      handler = new BankTransferHandler(paymentData)
      break
      
    default:
      const error = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        `Unsupported payment method: ${payment_method}`,
        {
          severity: ErrorSeverity.MEDIUM,
          statusCode: 400,
          userId: auth.userId,
          userMessageKey: 'invalid_format'
        }
      )
      return formatError(error)
  }

  try {
    // Execute payment processing
    const result = await handler.execute()
    
    // The handler returns NextResponse, so we return it as-is
    // (handlers already use their own response formatting)
    return result

  } catch (error: any) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.EXTERNAL_API,
      error,
      {
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        userId: auth.userId,
        userMessageKey: 'default'
      }
    )
    return formatError(structuredError)
  }
})

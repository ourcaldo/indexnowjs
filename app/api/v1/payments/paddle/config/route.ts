/**
 * Paddle Configuration API Route
 * Returns Paddle client-side configuration loaded from database
 * 
 * SECURITY: Only returns client_token (safe for frontend)
 * API key and webhook secret are NEVER exposed to frontend
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Load Paddle gateway configuration from database
    const { data: gateway, error } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'paddle')
      .eq('is_active', true)
      .single()

    if (error || !gateway) {
      await ErrorHandlingService.createError(
        ErrorType.DATABASE,
        'Paddle gateway not found or not active',
        {
          severity: ErrorSeverity.MEDIUM,
          statusCode: 404,
          metadata: { error: error?.message }
        }
      )
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Paddle payment gateway is not configured' 
        },
        { status: 404 }
      )
    }

    // Extract credentials from database
    const apiCredentials = gateway.api_credentials || {}
    const configuration = gateway.configuration || {}

    // CRITICAL: Only return client_token (safe for frontend)
    // NEVER expose api_key or webhook_secret to frontend
    const clientToken = apiCredentials.client_token

    if (!clientToken) {
      await ErrorHandlingService.createError(
        ErrorType.DATABASE,
        'Paddle client token not found in database',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 500,
          metadata: { 
            gateway_id: gateway.id,
            has_api_credentials: !!apiCredentials,
            api_credentials_keys: Object.keys(apiCredentials)
          }
        }
      )

      return NextResponse.json(
        { 
          success: false,
          error: 'Paddle client token not configured in database' 
        },
        { status: 500 }
      )
    }

    // Return safe configuration for frontend
    return NextResponse.json(
      {
        success: true,
        data: {
          clientToken,
          environment: configuration.environment || 'sandbox',
          isActive: gateway.is_active,
          isDefault: gateway.is_default
        }
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
        }
      }
    )

  } catch (error) {
    console.error('[Paddle Config API] Error loading configuration:', error)
    
    await ErrorHandlingService.createError(
      ErrorType.EXTERNAL_API,
      error instanceof Error ? error.message : String(error),
      {
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        metadata: { source: 'paddle_config_api' }
      }
    )

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load Paddle configuration' 
      },
      { status: 500 }
    )
  }
}

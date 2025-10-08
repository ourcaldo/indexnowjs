import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdminAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/monitoring/error-handling'

export async function POST(request: NextRequest) {
  try {
    // Debug routes enabled always for development behavior
    
    const { payment_method, result } = await request.json()
    
    // Sanitize sensitive data in logs
    const sanitizedResult = {
      ...result,
      // Remove sensitive payment details if present
      card_number: result.card_number ? '****' + result.card_number?.slice(-4) : undefined,
      cvv: result.cvv ? '***' : undefined,
      bank_account: result.bank_account ? '****' + result.bank_account?.slice(-4) : undefined
    }
    
    logger.info({ data: [{
      payment_method, result: JSON.stringify(sanitizedResult, null, 2),
      timestamp: new Date().toISOString(),
      environment: 'development'
    }] }, '📋 [DEBUG] Payment result received:')
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Debug payment result error:')
    
    // Handle authentication errors
    if (error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ success: false, error: 'Debug failed' }, { status: 500 })
  }
}
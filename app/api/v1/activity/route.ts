import { NextRequest } from 'next/server'
import { authenticatedApiWrapper, formatSuccess } from '@/lib/core/api-response-middleware'
import { ActivityLogger } from '@/lib/monitoring'

/**
 * POST /api/v1/activity
 * Log user activity from frontend (payment pages, checkout, etc.)
 * 
 * Authentication: Requires authenticated user (NOT admin)
 * Database: Uses ActivityLogger which internally uses service role key for secure writes
 */
export const POST = authenticatedApiWrapper(async (request: NextRequest, authenticatedUser) => {
  const body = await request.json()
  
  // Use authenticated user info from wrapper
  const userId = authenticatedUser.user.id
  const userEmail = authenticatedUser.user.email || ''
  
  // Extract and parse IP address properly (handle multiple IPs from proxy)
  const rawIpAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || body.ip_address || ''
  const cleanIpAddress = rawIpAddress.split(',')[0].trim() || ''

  // Log the activity using the ActivityLogger static method
  // ActivityLogger internally uses supabaseAdmin (service role key) to write to database
  await ActivityLogger.logActivity({
    userId,
    eventType: body.eventType || body.action_type || 'system_action',
    actionDescription: body.actionDescription || body.action_description || 'User action performed',
    ipAddress: cleanIpAddress,
    userAgent: request.headers.get('user-agent') || body.user_agent || '',
    request,
    metadata: {
      userEmail,
      originalIpHeader: rawIpAddress,
      ...body.metadata || {}
    }
  })

  return formatSuccess({ 
    message: 'Activity logged successfully'
  })
})

import { NextRequest } from 'next/server'
import { adminApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import { ActivityLogger } from '@/lib/monitoring'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const GET = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const { id: userId } = await params

  const securityContext = {
    userId: adminUser.id,
    operation: 'admin_get_user_security_logs',
    reason: 'Admin fetching user security activity logs for security analysis',
    source: 'admin/users/[id]/security',
    metadata: {
      targetUserId: userId,
      endpoint: '/api/v1/admin/users/[id]/security'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }

  const securityLogs = await SecureServiceRoleWrapper.executeSecureOperation(
    securityContext,
    {
      table: 'indb_security_activity_logs',
      operationType: 'select',
      columns: ['ip_address', 'device_info', 'location_data', 'event_type', 'created_at', 'success'],
      whereConditions: { user_id: userId }
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_security_activity_logs')
        .select('ip_address, device_info, location_data, event_type, created_at, success')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        throw new Error(`Failed to fetch user security data: ${error.message}`)
      }

      return data || []
    }
  )

  const ipAddresses = new Set<string>()
  const devices = new Map<string, any>()
  const locations = new Set<string>()
  const loginAttempts = []
  let lastActivity = null
  let firstSeen = null

  for (const log of securityLogs) {
    if (log.ip_address) {
      ipAddresses.add(log.ip_address)
    }

    if (log.device_info) {
      const deviceKey = `${log.device_info.type}-${log.device_info.browser}-${log.device_info.os}`
      if (!devices.has(deviceKey)) {
        devices.set(deviceKey, {
          ...log.device_info,
          firstSeen: log.created_at,
          lastUsed: log.created_at,
          usageCount: 1
        })
      } else {
        const existing = devices.get(deviceKey)
        existing.lastUsed = log.created_at
        existing.usageCount++
      }
    }

    if (log.location_data) {
      const locationString = [
        log.location_data.city,
        log.location_data.region,
        log.location_data.country
      ].filter(Boolean).join(', ')
      
      if (locationString) {
        locations.add(locationString)
      }
    }

    if (log.event_type === 'login') {
      loginAttempts.push({
        success: log.success,
        timestamp: log.created_at,
        ip_address: log.ip_address,
        device_info: log.device_info
      })
    }

    if (!lastActivity) lastActivity = log.created_at
    firstSeen = log.created_at
  }

  const totalLoginAttempts = loginAttempts.length
  const failedLoginAttempts = loginAttempts.filter(attempt => !attempt.success).length
  const successfulLogins = loginAttempts.filter(attempt => attempt.success).length
  const securityScore = calculateSecurityScore(
    Array.from(ipAddresses).length,
    devices.size,
    failedLoginAttempts,
    totalLoginAttempts
  )

  const riskLevel = securityScore >= 80 ? 'low' : securityScore >= 60 ? 'medium' : 'high'

  await ActivityLogger.logAdminAction(
    adminUser.id,
    'security_analysis',
    userId,
    `Analyzed security profile for user ${userId} - Risk Level: ${riskLevel}`,
    request,
    { 
      securityAnalysis: true, 
      riskLevel, 
      securityScore: Math.round(securityScore * 100) / 100,
      uniqueIPs: Array.from(ipAddresses).length,
      uniqueDevices: devices.size,
      uniqueLocations: locations.size,
      loginAttempts: totalLoginAttempts,
      failedAttempts: failedLoginAttempts
    }
  )

  return formatSuccess({
    security: {
      ipAddresses: Array.from(ipAddresses),
      devices: Array.from(devices.values()),
      locations: Array.from(locations),
      loginAttempts: {
        total: totalLoginAttempts,
        successful: successfulLogins,
        failed: failedLoginAttempts,
        recent: loginAttempts.slice(0, 10)
      },
      activity: {
        lastActivity,
        firstSeen,
        totalActivities: securityLogs.length
      },
      securityScore,
      riskLevel
    }
  })
})

function calculateSecurityScore(
  uniqueIPs: number,
  uniqueDevices: number,
  failedLogins: number,
  totalLogins: number
): number {
  let score = 100

  if (uniqueIPs > 10) score -= 20
  else if (uniqueIPs > 5) score -= 10

  if (uniqueDevices > 5) score -= 15
  else if (uniqueDevices > 3) score -= 5

  if (totalLogins > 0) {
    const failureRate = failedLogins / totalLogins
    if (failureRate > 0.3) score -= 30
    else if (failureRate > 0.1) score -= 15
  }

  if (uniqueIPs <= 2 && uniqueDevices <= 2) score += 10

  return Math.max(0, Math.min(100, score))
}

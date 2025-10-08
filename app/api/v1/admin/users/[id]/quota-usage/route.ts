import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const GET = adminApiWrapper(async (
  request: NextRequest,
  adminUser,
  { params }: { params: { id: string } }
) => {
  const { id: userId } = await params

  const serviceAccountsResult = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: adminUser.id,
      operation: 'admin_get_user_service_accounts',
      reason: 'Admin retrieving user service accounts to check quota usage',
      source: 'admin/users/[id]/quota-usage',
      metadata: {
        targetUserId: userId,
        endpoint: '/api/v1/admin/users/[id]/quota-usage',
        method: 'GET'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    },
    {
      table: 'indb_google_service_accounts',
      operationType: 'select',
      columns: ['id'],
      whereConditions: { user_id: userId }
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_google_service_accounts')
        .select('id')
        .eq('user_id', userId)
      return { data, error }
    }
  )
  
  const { data: serviceAccounts, error: serviceAccountsError } = serviceAccountsResult
  if (serviceAccountsError) {
    return await createStandardError(
      ErrorType.DATABASE,
      'Failed to fetch service accounts',
      500,
      ErrorSeverity.HIGH,
      { userId }
    )
  }

  if (!serviceAccounts || serviceAccounts.length === 0) {
    return formatSuccess({ usage: [] })
  }

  const serviceAccountIds = serviceAccounts.map(acc => acc.id)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const quotaUsageResult = await SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: adminUser.id,
      operation: 'admin_get_user_quota_usage',
      reason: 'Admin retrieving user quota usage for the last 30 days',
      source: 'admin/users/[id]/quota-usage',
      metadata: {
        targetUserId: userId,
        serviceAccountIds: serviceAccountIds,
        dateRange: '30_days',
        endpoint: '/api/v1/admin/users/[id]/quota-usage',
        method: 'GET'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    },
    {
      table: 'indb_google_quota_usage',
      operationType: 'select',
      columns: ['id', 'service_account_id', 'date', 'requests_made', 'requests_successful', 'requests_failed', 'last_request_at'],
      whereConditions: { service_account_id: serviceAccountIds, date_gte: thirtyDaysAgo.toISOString().split('T')[0] }
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_google_quota_usage')
        .select(`
          id,
          service_account_id,
          date,
          requests_made,
          requests_successful,
          requests_failed,
          last_request_at
        `)
        .in('service_account_id', serviceAccountIds)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })
      return { data, error }
    }
  )

  const { data: quotaUsage, error } = quotaUsageResult
  if (error) {
    return await createStandardError(
      ErrorType.DATABASE,
      'Failed to fetch quota usage',
      500,
      ErrorSeverity.HIGH,
      { userId }
    )
  }

  return formatSuccess({ usage: quotaUsage || [] })
})

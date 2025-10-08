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
      reason: 'Admin retrieving user service accounts for management interface',
      source: 'admin/users/[id]/service-accounts',
      metadata: {
        targetUserId: userId,
        endpoint: '/api/v1/admin/users/[id]/service-accounts',
        method: 'GET'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    },
    {
      table: 'indb_google_service_accounts',
      operationType: 'select',
      columns: ['id', 'name', 'email', 'is_active', 'daily_quota_limit', 'minute_quota_limit', 'created_at', 'updated_at'],
      whereConditions: { user_id: userId }
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_google_service_accounts')
        .select(`
          id,
          name,
          email,
          is_active,
          daily_quota_limit,
          minute_quota_limit,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      return { data, error }
    }
  )

  const { data: serviceAccounts, error } = serviceAccountsResult
  if (error) {
    return await createStandardError(
      ErrorType.DATABASE,
      'Failed to fetch service accounts',
      500,
      ErrorSeverity.HIGH,
      { userId }
    )
  }

  return formatSuccess({ serviceAccounts: serviceAccounts || [] })
})

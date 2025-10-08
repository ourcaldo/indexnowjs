import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { EncryptionService } from '@/lib/auth/encryption'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

// Schema for Google service account JSON
const googleServiceAccountSchema = z.object({
  type: z.string(),
  project_id: z.string(),
  private_key_id: z.string(),
  private_key: z.string(),
  client_email: z.string().email(),
  client_id: z.string(),
  auth_uri: z.string().url(),
  token_uri: z.string().url(),
  auth_provider_x509_cert_url: z.string().url(),
  client_x509_cert_url: z.string().url(),
  universe_domain: z.string().optional(),
})

// Schema for creating a new service account
const createServiceAccountSchema = z.object({
  name: z.string().min(1, 'Service account name is required'),
  email: z.string().email('Valid email is required'),
  credentials: googleServiceAccountSchema,
})

export const GET = authenticatedApiWrapper(async (request, auth) => {
  try {
    // Fetch user's service accounts using SecureWrapper
    const serviceAccountsWithQuota = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_user_service_accounts_with_quota',
        source: 'indexing/service-accounts',
        reason: 'User retrieving their service accounts and quota usage for dashboard display',
        metadata: {
          endpoint: '/api/v1/indexing/service-accounts',
          method: 'GET'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_google_service_accounts', operationType: 'select' },
      async (db) => {
        // Fetch user's service accounts
        const { data, error } = await db
          .from('indb_google_service_accounts')
          .select('id, name, email, is_active, daily_quota_limit, minute_quota_limit, created_at, updated_at')
          .eq('user_id', auth.userId)
          .order('created_at', { ascending: false })

        if (error) throw new Error(`Database query failed: ${error.message}`)
        
        const serviceAccounts = data || []
        const today = new Date().toISOString().split('T')[0]
        
        // Fetch quota usage for each service account
        const serviceAccountsWithQuota = await Promise.all(
          serviceAccounts.map(async (account) => {
            const { data: quotaUsage } = await db
              .from('indb_google_quota_usage')
              .select('requests_made, requests_successful, requests_failed')
              .eq('service_account_id', account.id)
              .eq('date', today)
              .single()

            return {
              ...account,
              quota_usage: quotaUsage || {
                requests_made: 0,
                requests_successful: 0,
                requests_failed: 0,
              },
            }
          })
        )

        return serviceAccountsWithQuota
      }
    )

    return formatSuccess({
      service_accounts: serviceAccountsWithQuota,
    })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint: '/api/v1/indexing/service-accounts',
        method: 'GET',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }
})

export const POST = authenticatedApiWrapper(async (request, auth) => {
  try {
    // Validate request body
    const body = await request.json()
    const result = createServiceAccountSchema.safeParse(body)
    
    if (!result.success) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        'Invalid request data',
        {
          severity: ErrorSeverity.LOW,
          userId: auth.userId,
          endpoint: '/api/v1/indexing/service-accounts',
          statusCode: 400,
          metadata: { validationErrors: result.error.errors }
        }
      )
      return formatError(validationError)
    }

    const { name, credentials } = result.data
    const email = credentials.client_email

    // Check existing service account and package limitations using SecureWrapper
    const validationData = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'validate_service_account_creation',
        source: 'indexing/service-accounts',
        reason: 'User creating new service account - validate uniqueness and quota limits',
        metadata: {
          email,
          name,
          endpoint: '/api/v1/indexing/service-accounts',
          method: 'POST'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_google_service_accounts', operationType: 'select' },
      async (db) => {
        // Check if service account with this email already exists for this user
        const { data: existingAccount, error: existingError } = await db
          .from('indb_google_service_accounts')
          .select('id')
          .eq('user_id', auth.userId)
          .eq('email', email)
          .single()

        if (existingError && existingError.code !== 'PGRST116') {
          throw new Error(`Database query failed: ${existingError.message}`)
        }

        if (existingAccount) {
          throw new Error('Service account with this email already exists')
        }

        // Get user's package information
        const { data: userProfile, error: profileError } = await db
          .from('indb_auth_user_profiles')
          .select(`
            package:indb_payment_packages(
              slug,
              name,
              quota_limits
            )
          `)
          .eq('user_id', auth.userId)
          .single()

        if (profileError) throw new Error(`Failed to fetch user profile: ${profileError.message}`)

        // Count existing service accounts
        const { count, error: countError } = await db
          .from('indb_google_service_accounts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.userId)
          .eq('is_active', true)

        if (countError) throw new Error(`Failed to count service accounts: ${countError.message}`)

        return { userProfile, existingCount: count || 0 }
      }
    )

    const { userProfile, existingCount } = validationData

    const packageData = Array.isArray(userProfile.package) ? userProfile.package[0] : userProfile.package
    const maxServiceAccounts = packageData?.quota_limits?.service_accounts || 1
    
    // Check if user has reached service account limit
    if (maxServiceAccounts !== -1 && existingCount >= maxServiceAccounts) {
      const quotaError = await ErrorHandlingService.createError(
        ErrorType.QUOTA_EXCEEDED,
        `${packageData?.name || 'Current'} plan allows maximum ${maxServiceAccounts} service account${maxServiceAccounts > 1 ? 's' : ''}. Upgrade your plan to add more.`,
        {
          severity: ErrorSeverity.LOW,
          userId: auth.userId,
          endpoint: '/api/v1/indexing/service-accounts',
          statusCode: 403,
          metadata: { maxServiceAccounts, existingCount }
        }
      )
      return formatError(quotaError)
    }

    // Encrypt credentials with proper error handling
    let encryptedCredentials: string
    try {
      encryptedCredentials = EncryptionService.encrypt(JSON.stringify(credentials))
    } catch (encryptionError) {
      const cryptoError = await ErrorHandlingService.createError(
        ErrorType.SYSTEM,
        encryptionError as Error,
        {
          severity: ErrorSeverity.HIGH,
          userId: auth.userId,
          endpoint: '/api/v1/indexing/service-accounts',
          statusCode: 500,
          metadata: { operation: 'encrypt_credentials' }
        }
      )
      return formatError(cryptoError)
    }

    // Create service account using SecureWrapper
    const serviceAccount = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'create_service_account',
        source: 'indexing/service-accounts',
        reason: 'User creating new Google service account for indexing operations',
        metadata: {
          name,
          email,
          endpoint: '/api/v1/indexing/service-accounts',
          method: 'POST'
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_google_service_accounts', operationType: 'insert' },
      async (db) => {
        const { data, error } = await db
          .from('indb_google_service_accounts')
          .insert({
            user_id: auth.userId,
            name,
            email,
            encrypted_credentials: encryptedCredentials,
            is_active: true,
          })
          .select('id, name, email, is_active, daily_quota_limit, minute_quota_limit, created_at, updated_at')
          .single()

        if (error) throw new Error(`Database insert failed: ${error.message}`)
        return data
      }
    )

    // Log service account creation activity
    try {
      await ActivityLogger.logServiceAccountActivity(
        auth.userId,
        ActivityEventTypes.SERVICE_ACCOUNT_ADD,
        serviceAccount.id,
        name,
        {
          actionDescription: `Added Google service account: ${name} (${email})`,
          serviceAccountEmail: email,
          packageData: packageData?.name,
          quotaLimits: {
            dailyQuotaLimit: serviceAccount.daily_quota_limit,
            minuteQuotaLimit: serviceAccount.minute_quota_limit
          }
        }
      )
    } catch (logError) {
      // Non-critical error, log but continue
      await ErrorHandlingService.createError(
        ErrorType.SYSTEM,
        logError as Error,
        {
          severity: ErrorSeverity.LOW,
          userId: auth.userId,
          endpoint: '/api/v1/indexing/service-accounts',
          metadata: { operation: 'log_activity', serviceAccountId: serviceAccount.id }
        }
      )
    }

    return formatSuccess({
      service_account: serviceAccount,
      message: 'Service account created successfully',
    }, 201)
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint: '/api/v1/indexing/service-accounts',
        method: 'POST',
        statusCode: 500
      }
    )
    return formatError(structuredError)
  }
})

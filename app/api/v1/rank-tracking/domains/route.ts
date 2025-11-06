import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import { SubscriptionValidator } from '@/lib/services/validation/SubscriptionValidator'

const createDomainSchema = z.object({
  domain_name: z.string().min(1, 'Domain name is required'),
  display_name: z.string().optional()
})

export const GET = authenticatedApiWrapper(async (request, auth) => {
  try {
    const domains = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'get_user_domains',
        source: 'rank-tracking/domains',
        reason: 'User fetching their domains with keyword counts',
        metadata: { endpoint: '/api/v1/rank-tracking/domains', method: 'GET' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'indb_keyword_domains', operationType: 'select' },
      async (db) => {
        const { data, error } = await db
          .from('indb_keyword_domains')
          .select(`
            *,
            keyword_count:indb_keyword_keywords(count)
          `)
          .eq('user_id', auth.userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      }
    )

    return formatSuccess({ data: domains || [] })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/rank-tracking/domains', method: 'GET', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

export const POST = authenticatedApiWrapper(async (request, auth) => {
  try {
    const body = await request.json()
    const validation = createDomainSchema.safeParse(body)

    if (!validation.success) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        validation.error.issues[0].message,
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const { domain_name, display_name } = validation.data

    const subscriptionCheck = await SubscriptionValidator.validateActiveSubscription(
      auth.supabase,
      auth.userId,
      {
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent') || undefined,
        endpoint: '/api/v1/rank-tracking/domains',
        operation: 'create_domain'
      }
    )

    if (!subscriptionCheck.isValid) {
      const subscriptionError = await ErrorHandlingService.createError(
        ErrorType.AUTHORIZATION,
        subscriptionCheck.error || 'Subscription required',
        { severity: ErrorSeverity.MEDIUM, userId: auth.userId, statusCode: 403 }
      )
      return formatError(subscriptionError)
    }

    const cleanDomain = domain_name
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .toLowerCase()

    const newDomain = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'create_user_domain',
        source: 'rank-tracking/domains',
        reason: 'User creating a new domain for rank tracking',
        metadata: { domainName: cleanDomain, displayName: display_name || cleanDomain },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      },
      { table: 'indb_keyword_domains', operationType: 'insert' },
      async (db) => {
        const { data: existingDomain } = await db
          .from('indb_keyword_domains')
          .select('id')
          .eq('domain_name', cleanDomain)
          .single()

        if (existingDomain) {
          throw new Error('Domain already exists')
        }

        const { data, error } = await db
          .from('indb_keyword_domains')
          .insert({
            domain_name: cleanDomain,
            display_name: display_name || cleanDomain,
            verification_status: 'verified',
            user_id: auth.userId
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    )

    return formatSuccess({ data: newDomain })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/rank-tracking/domains', method: 'POST', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

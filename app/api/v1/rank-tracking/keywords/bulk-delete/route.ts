import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

const bulkDeleteSchema = z.object({
  keywordIds: z.array(z.string().uuid()).min(1, 'At least one keyword ID is required')
})

export const DELETE = authenticatedApiWrapper(async (request, auth) => {
  try {
    const body = await request.json()
    const validation = bulkDeleteSchema.safeParse(body)

    if (!validation.success) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        validation.error.issues[0].message,
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const { keywordIds } = validation.data

    const keywords = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'bulk_delete_keywords',
        source: 'rank-tracking/keywords/bulk-delete',
        reason: 'User bulk deleting keywords and related data',
        metadata: { keywordIds, keywordCount: keywordIds.length },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_keyword_keywords', operationType: 'delete' },
      async (db) => {
        const { data: verifiedKeywords, error: verifyError } = await db
          .from('indb_keyword_keywords')
          .select('id, keyword, domain:indb_keyword_domains(domain_name)')
          .in('id', keywordIds)

        if (verifyError) throw new Error(`Failed to verify keywords: ${verifyError.message}`)
        if (!verifiedKeywords || verifiedKeywords.length !== keywordIds.length) {
          throw new Error('Some keywords not found or access denied')
        }

        await db.from('indb_keyword_rank_history').delete().in('keyword_id', keywordIds)
        await db.from('indb_keyword_rankings').delete().in('keyword_id', keywordIds)
        await db.from('indb_keyword_keywords').delete().in('id', keywordIds)

        return verifiedKeywords
      }
    )

    const keywordNames = keywords.map((k: any) => k.keyword).join(', ')
    const domainNames = Array.from(new Set(keywords.map((k: any) => k.domain?.domain_name))).join(', ')
    
    await ActivityLogger.logKeywordActivity(
      auth.userId,
      ActivityEventTypes.KEYWORD_BULK_DELETE,
      `${keywords.length} keywords from ${domainNames}`,
      request,
      { keywordCount: keywords.length, keywordNames: keywordNames.substring(0, 100), domains: domainNames }
    )

    return formatSuccess({ message: `Successfully deleted ${keywords.length} keywords` })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/rank-tracking/keywords/bulk-delete', method: 'DELETE', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticatedApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

const addTagSchema = z.object({
  keywordIds: z.array(z.string().uuid()).min(1, 'At least one keyword ID is required'),
  tag: z.string().min(1, 'Tag is required').max(50, 'Tag must be 50 characters or less')
})

export const POST = authenticatedApiWrapper(async (request, auth) => {
  try {
    const body = await request.json()
    const validation = addTagSchema.safeParse(body)

    if (!validation.success) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        validation.error.issues[0].message,
        { severity: ErrorSeverity.LOW, userId: auth.userId, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const { keywordIds, tag } = validation.data
    const cleanTag = tag.trim().toLowerCase()

    const { keywords, keywordsToUpdate } = await SecureServiceRoleWrapper.executeWithUserSession(
      auth.supabase,
      {
        userId: auth.userId,
        operation: 'add_tag_to_keywords',
        source: 'rank-tracking/keywords/add-tag',
        reason: 'User adding tags to their keywords',
        metadata: { keywordIds, tag: cleanTag, keywordCount: keywordIds.length },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent')
      },
      { table: 'indb_keyword_keywords', operationType: 'update' },
      async (db) => {
        const { data: verifiedKeywords, error: verifyError } = await db
          .from('indb_keyword_keywords')
          .select('id, keyword, tags, domain:indb_keyword_domains(domain_name)')
          .in('id', keywordIds)

        if (verifyError) throw new Error(`Failed to verify keywords: ${verifyError.message}`)
        if (!verifiedKeywords || verifiedKeywords.length !== keywordIds.length) {
          throw new Error('Some keywords not found or access denied')
        }

        const keywordsNeedingUpdate = verifiedKeywords.filter(kw => !(kw.tags || []).includes(cleanTag))
        if (keywordsNeedingUpdate.length === 0) {
          return { keywords: verifiedKeywords, keywordsToUpdate: [] }
        }

        await Promise.all(keywordsNeedingUpdate.map(kw => 
          db
            .from('indb_keyword_keywords')
            .update({ tags: [...(kw.tags || []), cleanTag] })
            .eq('id', kw.id)
        ))

        return { keywords: verifiedKeywords, keywordsToUpdate: keywordsNeedingUpdate }
      }
    )

    if (keywordsToUpdate.length === 0) {
      return formatSuccess({ message: 'All selected keywords already have this tag' })
    }

    const keywordNames = keywords.filter((_, i) => !keywords[i].tags?.includes(cleanTag)).map((k: any) => k.keyword).join(', ')
    const domainNames = Array.from(new Set(keywords.map((k: any) => k.domain?.domain_name))).join(', ')
    
    await ActivityLogger.logKeywordActivity(
      auth.userId,
      ActivityEventTypes.KEYWORD_TAG_ADD,
      `"${tag}" to ${keywordsToUpdate.length} keywords`,
      request,
      { tag: cleanTag, keywordCount: keywordsToUpdate.length, keywordNames: keywordNames.substring(0, 100), domains: domainNames }
    )

    return formatSuccess({ message: `Successfully added tag "${tag}" to ${keywordsToUpdate.length} keywords` })
  } catch (error) {
    const structuredError = await ErrorHandlingService.createError(
      ErrorType.DATABASE,
      error as Error,
      { severity: ErrorSeverity.HIGH, userId: auth.userId, endpoint: '/api/v1/rank-tracking/keywords/add-tag', method: 'POST', statusCode: 500 }
    )
    return formatError(structuredError)
  }
})

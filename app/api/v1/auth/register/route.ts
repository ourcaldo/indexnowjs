import { NextRequest } from 'next/server'
import { supabase } from '@/lib/database'
import { registerSchema } from '@/shared/schema'
import { publicApiWrapper, formatSuccess, formatError } from '@/lib/core/api-response-middleware'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { SecureServiceRoleHelpers } from '@/lib/services/security/SecureServiceRoleWrapper'

export const POST = publicApiWrapper(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      const validationError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        validation.error.issues[0].message,
        { severity: ErrorSeverity.LOW, statusCode: 400 }
      )
      return formatError(validationError)
    }

    const { name, email, password, phoneNumber, country } = validation.data

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, phone_number: phoneNumber, country } }
    })

    if (error) {
      const authError = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        `Registration failed for ${email}: ${error.message}`,
        { severity: ErrorSeverity.MEDIUM, statusCode: 400, metadata: { email, errorCode: error.code || 'unknown', operation: 'user_registration' } }
      )

      try {
        await ActivityLogger.logAuth(email, ActivityEventTypes.REGISTER, false, request, error.message)
      } catch (logError) {}

      return formatError(authError)
    }

    if (data.user?.id) {
      try {
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        const operationContext = {
          userId: data.user.id,
          operation: 'registration_profile_update',
          reason: 'Complete user profile after successful registration',
          source: 'auth/register',
          metadata: { hasPhoneNumber: !!phoneNumber, hasCountry: !!country, hasName: !!name },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
        
        const existingProfiles = await SecureServiceRoleHelpers.secureSelect(
          operationContext,
          'indb_auth_user_profiles',
          ['id', 'phone_number', 'country', 'full_name'],
          { user_id: data.user.id }
        )

        if (existingProfiles.length > 0) {
          const updateData = {
            phone_number: phoneNumber?.toString().replace(/[^\d+\-\s\(\)]/g, '') || null,
            country: country?.toString().substring(0, 100) || null,
            full_name: name?.toString().substring(0, 255) || null
          }
          
          await SecureServiceRoleHelpers.secureUpdate(
            operationContext,
            'indb_auth_user_profiles',
            updateData,
            { user_id: data.user.id }
          )
        }
      } catch (profileError) {}
    }

    if (data.user?.id) {
      try {
        await ActivityLogger.logAuth(data.user.id, ActivityEventTypes.REGISTER, true, request)
      } catch (logError) {}
    }

    return formatSuccess({
      user: data.user,
      session: data.session,
      message: 'Registration successful. Please check your email to verify your account.'
    }, 201)

  } catch (error) {
    const systemError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      { severity: ErrorSeverity.CRITICAL, statusCode: 500, metadata: { operation: 'user_registration' } }
    )
    return formatError(systemError)
  }
})

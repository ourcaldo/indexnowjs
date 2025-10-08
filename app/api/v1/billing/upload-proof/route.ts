import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { cookies } from 'next/headers'
import { authenticatedApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'
import type { AuthenticatedRequest } from '@/lib/core/api-middleware'

export const POST = authenticatedApiWrapper(async (request: NextRequest, auth: AuthenticatedRequest) => {
  // Create user's authenticated Supabase client
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const formData = await request.formData()
  const proofFile = formData.get('proof_file') as File
  const transactionId = formData.get('transaction_id') as string

  if (!proofFile || !transactionId) {
    const error = await ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      'Missing required fields: proof_file and transaction_id are required',
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 400,
        userId: auth.userId,
        userMessageKey: 'missing_required'
      }
    )
    return formatError(error)
  }

  // Validate file type and size
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!allowedTypes.includes(proofFile.type)) {
    const error = await ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      'Invalid file type. Please upload JPG, PNG, WebP, or PDF files only.',
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 400,
        userId: auth.userId,
        userMessageKey: 'invalid_format'
      }
    )
    return formatError(error)
  }

  if (proofFile.size > maxSize) {
    const error = await ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      'File size too large. Maximum size is 5MB.',
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 400,
        userId: auth.userId,
        userMessageKey: 'invalid_format'
      }
    )
    return formatError(error)
  }

  // Verify transaction ownership using secure wrapper with RLS
  const transaction = await SecureServiceRoleWrapper.executeWithUserSession(
    supabase,
    {
      userId: auth.userId,
      operation: 'verify_transaction_ownership',
      source: 'billing/upload-proof',
      reason: 'User verifying transaction ownership before uploading payment proof',
      metadata: {
        transactionId,
        endpoint: '/api/v1/billing/upload-proof'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    },
    { table: 'indb_payment_transactions', operationType: 'select' },
    async (db) => {
      const { data, error } = await db
        .from('indb_payment_transactions')
        .select('*')
        .eq('id', transactionId)
        .single()
      
      if (error) throw error
      return data
    }
  )

  if (!transaction) {
    const error = await ErrorHandlingService.createError(
      ErrorType.NOT_FOUND,
      'Transaction not found or access denied',
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 404,
        userId: auth.userId,
        userMessageKey: 'not_found'
      }
    )
    return formatError(error)
  }

  // Generate unique filename
  const fileExtension = proofFile.name.split('.').pop()
  const fileName = `payment-proof-${transactionId}-${Date.now()}.${fileExtension}`
  const filePath = `payment-proofs/${auth.userId}/${fileName}`

  // Upload file and update transaction using secure wrapper with RLS
  const uploadResult = await SecureServiceRoleWrapper.executeWithUserSession(
    supabase,
    {
      userId: auth.userId,
      operation: 'upload_payment_proof',
      source: 'billing/upload-proof',
      reason: 'User uploading payment proof and updating transaction status',
      metadata: {
        transactionId,
        fileName,
        fileSize: proofFile.size,
        fileType: proofFile.type,
        endpoint: '/api/v1/billing/upload-proof'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    },
    { table: 'indb_payment_transactions', operationType: 'update' },
    async (db) => {
      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await db.storage
        .from('indexnow-public')
        .upload(filePath, proofFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = db.storage
        .from('indexnow-public')
        .getPublicUrl(filePath)

      // Update transaction with proof URL and status
      const { error: updateError } = await db
        .from('indb_payment_transactions')
        .update({
          payment_proof_url: urlData.publicUrl,
          transaction_status: 'proof_uploaded',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)

      if (updateError) {
        throw new Error(`Failed to update transaction: ${updateError.message}`)
      }

      return {
        publicUrl: urlData.publicUrl,
        uploadData
      }
    }
  )

  // Log payment proof upload activity
  try {
    const { ActivityLogger, ActivityEventTypes } = await import('@/lib/monitoring/activity-logger')
    await ActivityLogger.logBillingActivity(
      auth.userId,
      ActivityEventTypes.PAYMENT_PROOF_UPLOADED,
      `Order #${transactionId.slice(0, 8)} - ${fileName}`,
      request,
      {
        transaction_id: transactionId,
        file_name: fileName,
        file_size: proofFile.size,
        file_type: proofFile.type,
        order_id: transactionId,
        storage_path: filePath
      }
    )
  } catch (logError) {
    // Continue even if activity logging fails
  }

  return formatSuccess({
    message: 'Payment proof uploaded successfully',
    file_url: uploadResult.publicUrl
  })
})

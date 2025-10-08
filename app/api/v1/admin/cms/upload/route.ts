import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { supabaseAdmin } from '@/lib/database'
import sharp from 'sharp'
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return await createStandardError(
      ErrorType.VALIDATION,
      'No file provided',
      400,
      ErrorSeverity.LOW,
      { field: 'file' }
    )
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    return await createStandardError(
      ErrorType.VALIDATION,
      'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.',
      400,
      ErrorSeverity.LOW,
      { field: 'file', fileType: file.type, allowedTypes: validTypes }
    )
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return await createStandardError(
      ErrorType.VALIDATION,
      'File too large. Maximum size is 5MB.',
      400,
      ErrorSeverity.LOW,
      { field: 'file', fileSize: file.size, maxSize }
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer) as any as Buffer
  
  // Generate unique filename
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  const fileName = `cms-${timestamp}-${randomStr}.${fileExtension}`
  const filePath = `cms/posts/${fileName}`

  // Optimize image with Sharp
  let optimizedBuffer = buffer
  
  if (file.type !== 'image/gif') {
    optimizedBuffer = await sharp(buffer)
      .resize(1200, 800, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: 85,
        progressive: true
      })
      .toBuffer()
  }

  // Upload to Supabase Storage using secure wrapper
  const uploadContext = {
    userId: adminUser.id,
    operation: 'admin_cms_upload_image',
    reason: 'Admin uploading image file to CMS storage bucket',
    source: 'admin/cms/upload',
    metadata: {
      fileName: fileName,
      originalName: file.name,
      fileType: file.type,
      fileSize: optimizedBuffer.length,
      endpoint: '/api/v1/admin/cms/upload'
    },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
    userAgent: request.headers.get('user-agent') || undefined
  }

  const uploadData = await SecureServiceRoleWrapper.executeSecureOperation(
    uploadContext,
    {
      table: 'storage.objects',
      operationType: 'insert',
      columns: ['bucket_id', 'name', 'metadata'],
      whereConditions: { bucket_id: 'indexnow-bucket', name: filePath }
    },
    async () => {
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('indexnow-bucket')
        .upload(filePath, optimizedBuffer, {
          contentType: file.type === 'image/gif' ? file.type : 'image/jpeg',
          cacheControl: '3600'
        })

      if (uploadError) {
        return null
      }
      return uploadData
    }
  )

  if (!uploadData) {
    return await createStandardError(
      ErrorType.SYSTEM,
      'Failed to upload file',
      500,
      ErrorSeverity.HIGH,
      { fileName, filePath }
    )
  }

  // Get public URL using secure wrapper
  const publicUrlContext = {
    userId: adminUser.id,
    operation: 'admin_cms_get_public_url',
    reason: 'Admin getting public URL for uploaded CMS image',
    source: 'admin/cms/upload',
    metadata: {
      fileName: fileName,
      filePath: filePath
    }
  }

  const publicUrlData = await SecureServiceRoleWrapper.executeSecureOperation(
    publicUrlContext,
    {
      table: 'storage.objects',
      operationType: 'select',
      columns: ['name'],
      whereConditions: { bucket_id: 'indexnow-bucket', name: filePath }
    },
    async () => {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('indexnow-bucket')
        .getPublicUrl(filePath)
      return publicUrlData
    }
  )

  if (!publicUrlData?.publicUrl) {
    return await createStandardError(
      ErrorType.SYSTEM,
      'Failed to get public URL',
      500,
      ErrorSeverity.HIGH,
      { fileName, filePath }
    )
  }

  return formatSuccess({
    url: publicUrlData.publicUrl,
    path: filePath,
    fileName: fileName,
    originalName: file.name,
    size: optimizedBuffer.length,
    type: file.type === 'image/gif' ? file.type : 'image/jpeg'
  }, undefined, 201) // 201 Created for successful file upload
})
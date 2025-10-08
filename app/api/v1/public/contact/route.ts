import { NextRequest } from 'next/server'
import { z } from 'zod'
import { publicApiWrapper } from '@/lib/core/api-response-middleware'
import { formatSuccess, formatError } from '@/lib/core/api-response-formatter'
import { ErrorHandlingService, ErrorType } from '@/lib/monitoring/error-handling'
import { logger } from '@/lib/monitoring/error-handling'

// Contact form validation schema
const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  type: z.enum(['Support', 'Sales', 'Partnership', 'Issues'], {
    required_error: 'Contact type is required'
  }),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  orderId: z.string().max(50, 'Order ID too long').optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message too long')
})

type ContactFormData = z.infer<typeof contactFormSchema>

export const POST = publicApiWrapper(async (request: NextRequest) => {
  const body = await request.json()
  
  // Validate request data
  const validation = contactFormSchema.safeParse(body)
  
  if (!validation.success) {
    const error = await ErrorHandlingService.createError(
      ErrorType.VALIDATION,
      new Error('Invalid form data'),
      { statusCode: 400, metadata: { errors: validation.error.errors } }
    )
    return formatError(error)
  }
  
  const validatedData = validation.data
  
  // Get request information for logging
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Send contact email asynchronously (fire-and-forget)
  process.nextTick(async () => {
    try {
      const { contactEmailService } = await import('@/lib/email/contact-email-service')
      
      await contactEmailService.sendContactFormSubmission({
        name: validatedData.name,
        email: validatedData.email,
        type: validatedData.type,
        subject: validatedData.subject,
        orderId: validatedData.orderId || '',
        message: validatedData.message,
        ipAddress,
        userAgent,
        submittedAt: new Date().toISOString()
      })
      
      logger.info({ data: [{
        email: validatedData.email, type: validatedData.type, subject: validatedData.subject
      }] }, '✅ Contact form email sent successfully')
      
    } catch (emailError) {
      logger.error({ error: emailError instanceof Error ? emailError.message : String(emailError) }, '❌ Failed to send contact form email:')
    }
  })
  
  // Log the contact form submission for admin tracking
  logger.info({ data: [{
    name: validatedData.name, 
    email: validatedData.email, 
    type: validatedData.type, 
    subject: validatedData.subject, 
    hasOrderId: Boolean(validatedData.orderId),
    messageLength: validatedData.message.length,
    ipAddress,
    timestamp: new Date().toISOString()
  }] }, '📝 Contact form submitted')
  
  return formatSuccess({ 
    message: 'Contact form submitted successfully. We\'ll get back to you soon!' 
  })
})

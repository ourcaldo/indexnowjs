import { NextRequest } from 'next/server'
import { z } from 'zod'

// Enhanced Zod schemas for payment validation
const customerInfoSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email must be less than 255 characters'),
  phone: z.string()
    .optional()
    .refine(
      (phone) => !phone || /^\+?[\d\s\-\(\)]{7,20}$/.test(phone),
      'Invalid phone number format'
    ),
  address: z.string()
    .min(1, 'Address is required')
    .max(200, 'Address must be less than 200 characters'),
  city: z.string()
    .min(1, 'City is required')
    .max(100, 'City must be less than 100 characters'),
  state: z.string()
    .min(1, 'State is required')
    .max(100, 'State must be less than 100 characters'),
  zip_code: z.string()
    .min(1, 'ZIP code is required')
    .max(20, 'ZIP code must be less than 20 characters'),
  country: z.string()
    .min(1, 'Country is required')
    .max(100, 'Country must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
})

const paymentRequestSchema = z.object({
  package_id: z.string()
    .uuid('Invalid package ID format'),
  billing_period: z.enum(['monthly', 'quarterly', 'biannual', 'annual'], {
    errorMap: () => ({ message: 'Invalid billing period. Must be monthly, quarterly, biannual, or annual' })
  }),
  customer_info: customerInfoSchema
})

// Enhanced validation function with detailed error reporting
export async function validatePaymentRequest(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request body structure
    const validatedData = paymentRequestSchema.parse(body)
    
    // Additional business logic validation
    await validateBusinessRules(validatedData)
    
    return {
      success: true,
      data: validatedData,
      errors: null
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      
      return {
        success: false,
        data: null,
        errors: formattedErrors
      }
    }
    
    // Handle other validation errors
    return {
      success: false,
      data: null,
      errors: [{
        field: 'general',
        message: error instanceof Error ? error.message : 'Validation failed',
        code: 'validation_error'
      }]
    }
  }
}

// Business rules validation
async function validateBusinessRules(data: any): Promise<void> {
  // Validate email domain (basic spam prevention)
  const email = data.customer_info.email.toLowerCase()
  const suspiciousDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com']
  
  if (suspiciousDomains.some(domain => email.includes(domain))) {
    throw new Error('Temporary email addresses are not allowed')
  }
  
  // Validate country-specific requirements
  if (data.customer_info.country === 'Indonesia' && !data.customer_info.phone) {
    throw new Error('Phone number is required for Indonesian customers')
  }
}

// Rate limiting implementation
const rateLimits = new Map<string, { count: number; resetTime: number; blocked: boolean }>()

export function checkRateLimit(
  userKey: string, 
  maxAttempts: number = 5, 
  windowMs: number = 15 * 60 * 1000,
  blockDurationMs: number = 60 * 60 * 1000 // 1 hour block after limit exceeded
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const userLimit = rateLimits.get(userKey)

  // Check if user is currently blocked
  if (userLimit?.blocked && now < userLimit.resetTime) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimit.resetTime
    }
  }

  // Reset or initialize rate limit window
  if (!userLimit || now > userLimit.resetTime) {
    rateLimits.set(userKey, { 
      count: 1, 
      resetTime: now + windowMs,
      blocked: false
    })
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: now + windowMs
    }
  }

  // Check if limit exceeded
  if (userLimit.count >= maxAttempts) {
    // Block user for extended period
    rateLimits.set(userKey, {
      count: userLimit.count + 1,
      resetTime: now + blockDurationMs,
      blocked: true
    })
    return {
      allowed: false,
      remaining: 0,
      resetTime: now + blockDurationMs
    }
  }

  // Increment count
  userLimit.count++
  return {
    allowed: true,
    remaining: maxAttempts - userLimit.count,
    resetTime: userLimit.resetTime
  }
}

// Input sanitization helper
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential XSS characters
      .substring(0, 1000) // Limit string length
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string' || typeof value === 'object') {
        sanitized[key] = sanitizeInput(value)
      } else {
        sanitized[key] = value
      }
    }
    return sanitized
  }
  
  return input
}

// Generate unique request ID for tracing
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Validation result type
export interface ValidationResult {
  success: boolean
  data: any | null
  errors: Array<{
    field: string
    message: string
    code: string
  }> | null
}
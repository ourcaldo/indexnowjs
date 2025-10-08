/**
 * Phase 2 Migration Examples - API Response Standardization
 * 
 * This file contains before/after examples for migrating API routes
 * to use the new standardized response middleware from api-response-middleware.ts
 * 
 * Migration Pattern:
 * 1. Replace custom response logic with adminApiWrapper/authenticatedApiWrapper/publicApiWrapper
 * 2. Use formatSuccess() for successful responses
 * 3. Use formatError() or createStandardError() for error responses
 * 4. Remove manual error handling - the wrapper handles it
 */

import { NextRequest } from 'next/server'
import { adminApiWrapper, createSuccessResponse, createStandardError, withDatabaseOperation } from './api-response-middleware'
import { formatSuccess, formatError } from './api-response-formatter'
import { ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

// ========================================
// EXAMPLE 1: Admin Dashboard Route
// ========================================

/* ❌ BEFORE (Inconsistent Pattern):
 
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSuperAdminAuth(request)
    
    if (!authResult) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }
    
    const stats = await fetchDashboardStats()
    
    return NextResponse.json({ 
      success: true, 
      stats: stats 
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
*/

/* ✅ AFTER (Standardized Pattern):

export const GET = adminApiWrapper(async (request, adminUser) => {
  // Fetch dashboard stats with database error handling
  const response = await withDatabaseOperation(
    async () => {
      const stats = await fetchDashboardStats()
      return stats
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/dashboard' }
  )
  
  // Response is already formatted (ApiSuccessResponse | ApiErrorResponse)
  return response
})
*/

// ========================================
// EXAMPLE 2: Admin Users List Route
// ========================================

/* ❌ BEFORE (Inconsistent Pattern):

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireSuperAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const users = await fetchAllUsers()
    
    const responseData = { 
      success: true, 
      users: users 
    }
    
    return NextResponse.json(responseData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
*/

/* ✅ AFTER (Standardized Pattern):

export const GET = adminApiWrapper(async (request, adminUser) => {
  // Fetch users with automatic error handling
  const response = await withDatabaseOperation(
    async () => {
      const users = await fetchAllUsers()
      return users
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/users' }
  )
  
  return response
})
*/

// ========================================
// EXAMPLE 3: Admin Update Route with Validation
// ========================================

/* ❌ BEFORE (Inconsistent Pattern):

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireSuperAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Manual validation
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const updated = await updateUser(params.id, body)
    
    return NextResponse.json({ 
      success: true, 
      user: updated 
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}
*/

/* ✅ AFTER (Standardized Pattern):

export const PATCH = adminApiWrapper(async (request, adminUser) => {
  const params = { id: request.nextUrl.pathname.split('/').pop()! }
  
  try {
    const body = await request.json()
    
    // Validate request
    if (!body.name) {
      return await createStandardError(
        ErrorType.VALIDATION,
        'Name is required',
        400,
        ErrorSeverity.LOW
      )
    }

    // Update with database error handling
    const response = await withDatabaseOperation(
      async () => {
        const updated = await updateUser(params.id, body)
        return updated
      },
      { userId: adminUser.id, endpoint: '/api/v1/admin/users/' + params.id }
    )
    
    return response
  } catch (error) {
    return await createStandardError(
      ErrorType.SYSTEM,
      error as Error,
      500,
      ErrorSeverity.HIGH
    )
  }
})
*/

// ========================================
// EXAMPLE 4: Route with External API Call
// ========================================

/* ❌ BEFORE (Inconsistent Pattern):

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireSuperAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const result = await externalApiCall()
    
    return NextResponse.json({ 
      success: true, 
      data: result 
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'External API failed' },
      { status: 503 }
    )
  }
}
*/

/* ✅ AFTER (Standardized Pattern):

import { withExternalAPI } from './api-response-middleware'

export const POST = adminApiWrapper(async (request, adminUser) => {
  // Call external API with automatic error handling
  const response = await withExternalAPI(
    async () => {
      const result = await externalApiCall()
      return result
    },
    'ExternalService',
    { userId: adminUser.id, endpoint: '/api/v1/admin/external' }
  )
  
  return response
})
*/

// ========================================
// EXAMPLE 5: Route with Complex Logic
// ========================================

/* ✅ BEST PRACTICE (Refactored Service Layer):

// services/admin-service.ts
export class AdminService {
  static async getDashboardStats(userId: string) {
    const stats = await SecureServiceRoleWrapper.executeSecureOperation(
      // ... context
      async () => {
        const { data, error } = await supabaseAdmin
          .from('admin_dashboard_stats')
          .select('*')
          .single()
        
        if (error) throw error
        return data
      }
    )
    return stats
  }
}

// app/api/v1/admin/dashboard/route.ts
export const GET = adminApiWrapper(async (request, adminUser) => {
  const response = await withDatabaseOperation(
    async () => {
      const stats = await AdminService.getDashboardStats(adminUser.id)
      return stats
    },
    { userId: adminUser.id, endpoint: '/api/v1/admin/dashboard' }
  )
  
  return response
})
*/

// ========================================
// MIGRATION CHECKLIST
// ========================================

/**
 * For each admin route, follow these steps:
 * 
 * 1. ✅ Import adminApiWrapper from '@/lib/core/api-response-middleware'
 * 2. ✅ Replace export async function with export const METHOD = adminApiWrapper
 * 3. ✅ Remove manual requireSuperAdminAuth check (wrapper does it)
 * 4. ✅ Remove manual error handling try/catch (wrapper handles it)
 * 5. ✅ Use withDatabaseOperation for database queries
 * 6. ✅ Use withExternalAPI for external API calls
 * 7. ✅ Return formatSuccess(data) or use helper wrappers
 * 8. ✅ For manual errors, use createStandardError()
 * 9. ✅ Remove all NextResponse.json({ success: true/false }) patterns
 * 10. ✅ Test the route to ensure standardized response format
 */

/**
 * Benefits of Migration:
 * - ✅ 100% consistent API response format across all routes
 * - ✅ Automatic error handling with proper severity levels
 * - ✅ Automatic security logging for admin routes
 * - ✅ Reduced boilerplate code (30-50% less code per route)
 * - ✅ Better error tracking with structured logging
 * - ✅ TypeScript type safety for all responses
 * - ✅ Easier frontend integration (single response format to handle)
 */

/**
 * System Authentication Middleware
 * Restricts access to system-level operations like SeRanking API calls
 * Only allows authenticated admin users and internal system processes
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../database/supabase';
import { SecureServiceRoleWrapper } from '../../../lib/services/security/SecureServiceRoleWrapper';

export interface SystemAuthContext {
  isAuthorized: boolean;
  userId?: string;
  userRole?: string;
  isSystemRequest: boolean;
  error?: string;
}

/**
 * Verify system-level authorization for sensitive operations
 * This should be used for SeRanking integration endpoints that consume API quota
 */
export async function verifySystemAuthorization(request: NextRequest): Promise<SystemAuthContext> {
  try {
    // Check for system API key in headers (for internal system processes)
    const systemApiKey = request.headers.get('X-System-API-Key');
    const expectedSystemKey = process.env.SYSTEM_API_KEY;
    
    if (systemApiKey && expectedSystemKey && systemApiKey === expectedSystemKey) {
      return {
        isAuthorized: true,
        isSystemRequest: true,
        userId: 'system'
      };
    }

    // Check for user authentication via Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isAuthorized: false,
        isSystemRequest: false,
        error: 'No valid authorization token provided'
      };
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT token with Supabase using secure service role wrapper
    let user = null;
    try {
      const authContext = {
        userId: 'system',
        operation: 'verify_user_auth_token',
        reason: 'System auth middleware verifying user authentication token',
        source: 'lib/middleware/auth/SystemAuthMiddleware',
        metadata: {
          hasToken: !!token,
          tokenLength: token?.length
        }
      };

      const authResult = await SecureServiceRoleWrapper.executeSecureOperation(
        authContext,
        {
          table: 'auth.users',
          operationType: 'select',
          columns: ['id', 'email'],
          whereConditions: { token: token }
        },
        async () => {
          const { data, error } = await supabaseAdmin.auth.getUser(token);
          if (error || !data?.user) {
            throw new Error(error?.message || 'Invalid or expired token');
          }
          return data.user;
        }
      );

      user = authResult;
    } catch (authError) {
      return {
        isAuthorized: false,
        isSystemRequest: false,
        error: 'Invalid or expired token'
      };
    }

    // For now, only allow system API key access to SeRanking endpoints
    // TODO: Implement proper user role checking when indb_profiles table is available
    return {
      isAuthorized: false,
      isSystemRequest: false,
      userId: user.id,
      userRole: 'user',
      error: 'SeRanking API access restricted to system processes only'
    };

  } catch (error) {
    console.error('System authorization error:', error);
    return {
      isAuthorized: false,
      isSystemRequest: false,
      error: 'Authorization verification failed'
    };
  }
}

/**
 * Middleware wrapper for system endpoints
 */
export function withSystemAuth<T extends any[]>(
  handler: (request: NextRequest, authContext: SystemAuthContext, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authContext = await verifySystemAuthorization(request);
    
    if (!authContext.isAuthorized) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'unauthorized',
          message: authContext.error || 'Access denied - system authorization required'
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(request, authContext, ...args);
  };
}
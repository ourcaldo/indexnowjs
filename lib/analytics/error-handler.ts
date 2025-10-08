/**
 * Error Handler Wrapper
 * Wraps API routes and server actions with automatic error tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackServerError } from './sentry-server';

type ApiHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

/**
 * Wraps API route handlers with automatic error tracking
 * Usage:
 * export const GET = withErrorHandler(async (req) => { ... })
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      const err = error as Error;
      
      trackServerError(err, {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
        errorType: 'api_route_error',
      });

      return NextResponse.json(
        {
          error: true,
          message: 'An unexpected error occurred',
          details: {
            type: 'SYSTEM',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Wraps server actions with automatic error tracking
 * Usage:
 * export const myAction = withServerActionErrorHandler(async () => { ... })
 */
export function withServerActionErrorHandler<T extends (...args: any[]) => Promise<any>>(
  action: T
): T {
  return (async (...args: any[]) => {
    try {
      return await action(...args);
    } catch (error) {
      const err = error as Error;
      
      trackServerError(err, {
        actionName: action.name || 'anonymous',
        args: args,
        errorType: 'server_action_error',
      });

      throw error;
    }
  }) as T;
}

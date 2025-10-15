import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundServicesStatus } from '@/lib/job-management/worker-startup';
import { requireServerAdminAuth } from '@/lib/auth/server-auth'
import { logger, ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling';
import { formatError } from '@/lib/core/api-response-formatter';

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication to access worker status
    await requireServerAdminAuth(request);
    const status = getBackgroundServicesStatus();
    
    return NextResponse.json({
      system: 'IndexNow Studio Background Worker',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      backgroundServices: status,
      environment: 'development'
    });
  } catch (error: any) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error getting worker status:');
    
    // Handle authentication errors
    if (error.message === 'Admin access required') {
      const authError = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        'Admin access required',
        {
          severity: ErrorSeverity.MEDIUM,
          statusCode: 403,
          userMessageKey: 'default'
        }
      );
      const errorResponse = formatError(authError);
      return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
    }
    
    const systemError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error,
      {
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        userMessageKey: 'default'
      }
    );
    const errorResponse = formatError(systemError);
    return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode });
  }
}
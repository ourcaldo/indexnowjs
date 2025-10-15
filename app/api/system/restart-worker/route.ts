import { NextRequest, NextResponse } from 'next/server';
import { backgroundWorker } from '@/lib/job-management/background-worker';
import { requireServerSuperAdminAuth } from '@/lib/auth/server-auth'
import { logger, ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling';
import { formatError } from '@/lib/core/api-response-formatter';

export async function POST(request: NextRequest) {
  try {
    // Require super admin authentication using role column from user profiles table
    await requireServerSuperAdminAuth(request);
    
    logger.info({ message: 'Manual worker restart requested' }, 'Info');
    
    // Stop current worker
    backgroundWorker.stop();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start worker again
    backgroundWorker.start();
    
    return NextResponse.json({
      message: 'Background worker restarted successfully',
      timestamp: new Date().toISOString(),
      status: backgroundWorker.getStatus()
    });
  } catch (error: any) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error restarting worker:');
    
    // Handle authentication errors
    if (error.message === 'Super admin access required') {
      const authError = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        'Super admin access required',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 401,
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
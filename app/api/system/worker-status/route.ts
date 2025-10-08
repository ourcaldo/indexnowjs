import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundServicesStatus } from '@/lib/job-management/worker-startup';
import { requireServerAdminAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/monitoring/error-handling';

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
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get worker status' },
      { status: 500 }
    );
  }
}
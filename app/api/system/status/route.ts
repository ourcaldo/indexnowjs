import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundServicesStatus } from '@/lib/job-management/worker-startup';
import { requireServerAdminAuth } from '@/lib/auth/server-auth';
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper';
import { supabaseAdmin } from '@/lib/database/supabase'
import { logger } from '@/lib/monitoring/error-handling';

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication to access system status
    const adminUser = await requireServerAdminAuth(request);
    
    // Get job statistics using secure wrapper
    const jobStatsContext = {
      userId: adminUser.id,
      operation: 'system_get_job_statistics',
      reason: 'Admin accessing system status and job statistics',
      source: 'system/status',
      metadata: {
        endpoint: '/api/system/status',
        method: 'GET'
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent')
    }

    const jobStats = await SecureServiceRoleWrapper.executeSecureOperation(
      jobStatsContext,
      {
        table: 'indb_indexing_jobs',
        operationType: 'select',
        columns: ['status'],
        whereConditions: {}
      },
      async () => {
        const { data, error } = await supabaseAdmin
          .from('indb_indexing_jobs')
          .select('status')
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) {
          throw new Error(`Error fetching job stats: ${error.message}`)
        }

        return data
      }
    )

    const stats = {
      pending: jobStats?.filter(j => j.status === 'pending').length || 0,
      running: jobStats?.filter(j => j.status === 'running').length || 0,
      completed: jobStats?.filter(j => j.status === 'completed').length || 0,
      failed: jobStats?.filter(j => j.status === 'failed').length || 0,
      total: jobStats?.length || 0
    };

    // Get background worker status
    const workerStatus = getBackgroundServicesStatus();

    return Response.json({
      system: 'IndexNow Studio',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      jobStats: stats,
      database: 'Supabase Connected',
      googleApi: 'Available',
      backgroundWorker: workerStatus
    });

  } catch (error: any) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error getting system status:');
    
    // Handle authentication errors
    if (error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get system status' }, 
      { status: 500 }
    );
  }
}
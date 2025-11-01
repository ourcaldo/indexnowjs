# Phase 3: Error Enhancement Implementation Plan
**IndexNow Studio - Production-Ready Error Monitoring & Recovery System**

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [P3.1: Error Logging Dashboard](#p31-error-logging-dashboard)
4. [P3.2: Automated Error Detection](#p32-automated-error-detection)
5. [P3.3: Error Recovery Mechanisms](#p33-error-recovery-mechanisms)
6. [Testing & Validation](#testing--validation)
7. [Timeline & Effort](#timeline--effort)

---

## Overview

### Phase 3 Goals
- **P3.1**: Admin dashboard for monitoring and analyzing errors from `indb_system_error_logs`
- **P3.2**: Automated checks to prevent error handling regressions (ESLint, pre-commit hooks)
- **P3.3**: Resilience improvements with circuit breakers, exponential backoff, and fallback strategies

### Success Criteria
- ✅ Admins can view, filter, and analyze all application errors in real-time
- ✅ Automated checks prevent console.* and improper error handling from being committed
- ✅ External API failures don't crash the application - automatic retries and fallbacks active
- ✅ 100% monitoring coverage with Sentry integration for all error types

### Assumptions
- Phase 1 (Critical Fixes) and Phase 2 (Standardization) are **COMPLETED**
- All API routes are using standardized wrappers (`adminApiWrapper`, `authenticatedApiWrapper`, `publicApiWrapper`)
- Background workers are integrated with `ErrorHandlingService`
- Supabase database has `indb_system_error_logs` table with proper schema

---

## Prerequisites

### Database Schema Verification

**✅ VERIFIED - Actual Database Schema (October 7, 2025)**

The `indb_system_error_logs` table structure has been verified in the production database:

| Column Name  | Data Type                | Is Nullable |
| ------------ | ------------------------ | ----------- |
| id           | uuid                     | NO          |
| user_id      | uuid                     | YES         |
| error_type   | text                     | NO          |
| severity     | text                     | NO          |
| message      | text                     | NO          |
| user_message | text                     | NO          |
| endpoint     | text                     | YES         |
| http_method  | text                     | YES         |
| status_code  | integer                  | YES         |
| metadata     | jsonb                    | YES         |
| stack_trace  | text                     | YES         |
| created_at   | timestamp with time zone | YES         |
| updated_at   | timestamp with time zone | YES         |

#### Schema Notes & Required Additions

**✅ Existing Columns (Ready to Use):**
- `id` - Primary key (UUID) - will be used as error ID
- `user_id` - Links error to user
- `error_type`, `severity`, `message`, `user_message` - Error details
- `endpoint`, `http_method`, `status_code` - Request context
- `metadata` (JSONB) - Additional error data
- `stack_trace` - Debug information
- `created_at`, `updated_at` - Timestamps

**⚠️ Missing Columns (Need to Add for P3.1):**

For the error resolution feature (mark as resolved/acknowledged), add these columns:

```sql
-- Add resolution tracking columns
ALTER TABLE indb_system_error_logs 
ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN resolved_by UUID REFERENCES auth.users(id),
ADD COLUMN acknowledged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN acknowledged_by UUID REFERENCES auth.users(id);

-- Add indexes for performance
CREATE INDEX idx_error_logs_severity ON indb_system_error_logs(severity);
CREATE INDEX idx_error_logs_error_type ON indb_system_error_logs(error_type);
CREATE INDEX idx_error_logs_created_at ON indb_system_error_logs(created_at DESC);
CREATE INDEX idx_error_logs_user_id ON indb_system_error_logs(user_id);
CREATE INDEX idx_error_logs_resolved ON indb_system_error_logs(resolved_at) WHERE resolved_at IS NULL;

-- Add comment for documentation
COMMENT ON TABLE indb_system_error_logs IS 'System error logs with resolution tracking for Phase 3 error monitoring dashboard';
```

**Database Adjustments in Code:**

Since the table uses `http_method` instead of `method`, all code examples in this plan should reference:
- ✅ Use: `error.http_method` 
- ❌ Not: `error.method`

Since there's no separate `error_id` column:
- ✅ Use: `error.id` as the error ID
- ❌ Not: `error.error_id`

### Required Access
- ✅ Admin super_admin role access
- ✅ Database read access to `indb_system_error_logs`
- ✅ Sentry project access (for dashboard integration)
- ✅ Repository write access (for ESLint rules and hooks)

---

## P3.1: Error Logging Dashboard

**Duration:** 3 days  
**Priority:** High  
**Goal:** Admin UI for comprehensive error monitoring and analysis

### Day 1: Backend API Endpoints (Morning)

#### Step 1.1: Create Error Statistics API
**File:** `app/api/v1/admin/errors/stats/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { adminApiWrapper } from '@/lib/core/api-response-middleware';
import { createApiResponse } from '@/lib/core/api-response-formatter';
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper';

export const GET = adminApiWrapper(async (request: NextRequest, auth, endpoint) => {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('range') || '24h'; // 24h, 7d, 30d

  const stats = await SecureServiceRoleWrapper.executeSecureOperation(
    async (supabase) => {
      const timeFilter = getTimeFilter(timeRange);
      
      // Total errors
      const { count: totalErrors } = await supabase
        .from('indb_system_error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', timeFilter);

      // Critical errors
      const { count: criticalErrors } = await supabase
        .from('indb_system_error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'CRITICAL')
        .gte('created_at', timeFilter);

      // Errors by type
      const { data: errorsByType } = await supabase
        .from('indb_system_error_logs')
        .select('error_type')
        .gte('created_at', timeFilter);

      const typeDistribution = errorsByType?.reduce((acc, row) => {
        acc[row.error_type] = (acc[row.error_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Most common errors
      const { data: commonErrors } = await supabase
        .from('indb_system_error_logs')
        .select('message, error_type, severity')
        .gte('created_at', timeFilter)
        .limit(5);

      // Error trend (previous period comparison)
      const previousTimeFilter = getPreviousTimeFilter(timeRange);
      const { count: previousPeriodErrors } = await supabase
        .from('indb_system_error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousTimeFilter)
        .lt('created_at', timeFilter);

      const trend = previousPeriodErrors > 0 
        ? ((totalErrors - previousPeriodErrors) / previousPeriodErrors) * 100 
        : 0;

      return {
        totalErrors,
        criticalErrors,
        typeDistribution,
        commonErrors,
        trend: {
          value: trend,
          direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'
        },
        timeRange
      };
    },
    {
      userId: auth.userId,
      operation: 'fetch_error_stats',
      reason: 'Admin viewing error statistics',
      source: endpoint
    }
  );

  return createApiResponse({ stats });
});

function getTimeFilter(range: string): string {
  const now = new Date();
  switch (range) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }
}

function getPreviousTimeFilter(range: string): string {
  const now = new Date();
  switch (range) {
    case '24h':
      return new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  }
}
```

#### Step 1.2: Create Error List API with Filtering
**File:** `app/api/v1/admin/errors/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { adminApiWrapper } from '@/lib/core/api-response-middleware';
import { createApiResponse } from '@/lib/core/api-response-formatter';
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper';

export const GET = adminApiWrapper(async (request: NextRequest, auth, endpoint) => {
  const { searchParams } = new URL(request.url);
  
  // Pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  // Filters
  const severity = searchParams.get('severity'); // CRITICAL, HIGH, MEDIUM, LOW
  const errorType = searchParams.get('type'); // AUTHENTICATION, DATABASE, etc.
  const userId = searchParams.get('userId');
  const endpoint_filter = searchParams.get('endpoint');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const status = searchParams.get('status'); // new, acknowledged, resolved
  const search = searchParams.get('search'); // Full-text search

  // Sort
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  const result = await SecureServiceRoleWrapper.executeSecureOperation(
    async (supabase) => {
      let query = supabase
        .from('indb_system_error_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (severity) {
        query = query.eq('severity', severity);
      }
      if (errorType) {
        query = query.eq('error_type', errorType);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (endpoint_filter) {
        query = query.ilike('endpoint', `%${endpoint_filter}%`);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }
      if (status === 'resolved') {
        query = query.not('resolved_at', 'is', null);
      } else if (status === 'new') {
        query = query.is('resolved_at', null);
      }
      if (search) {
        query = query.or(`message.ilike.%${search}%,user_message.ilike.%${search}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const { data: errors, error, count } = await query
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        errors: errors || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    },
    {
      userId: auth.userId,
      operation: 'fetch_errors',
      reason: 'Admin viewing error list',
      source: endpoint,
      metadata: { filters: { severity, errorType, userId, status } }
    }
  );

  return createApiResponse(result);
});
```

#### Step 1.3: Create Error Details API
**File:** `app/api/v1/admin/errors/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { adminApiWrapper } from '@/lib/core/api-response-middleware';
import { createApiResponse } from '@/lib/core/api-response-formatter';
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper';

export const GET = adminApiWrapper(async (
  request: NextRequest, 
  auth, 
  endpoint,
  { params }: { params: { id: string } }
) => {
  const errorId = params.id;

  const result = await SecureServiceRoleWrapper.executeSecureOperation(
    async (supabase) => {
      // Get error details
      const { data: error, error: fetchError } = await supabase
        .from('indb_system_error_logs')
        .select('*')
        .eq('id', errorId)
        .single();

      if (fetchError) throw fetchError;
      if (!error) throw new Error('Error not found');

      // Get user info if user_id exists
      let userInfo = null;
      if (error.user_id) {
        const { data: user } = await supabase
          .from('indb_auth_user_profiles')
          .select('email, full_name')
          .eq('user_id', error.user_id)
          .single();
        userInfo = user;
      }

      // Get related errors (same type, same user, same endpoint - last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: relatedErrors } = await supabase
        .from('indb_system_error_logs')
        .select('id, error_type, message, severity, created_at')
        .neq('id', errorId)
        .or(`error_type.eq.${error.error_type},user_id.eq.${error.user_id},endpoint.eq.${error.endpoint}`)
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        error,
        userInfo,
        relatedErrors: relatedErrors || []
      };
    },
    {
      userId: auth.userId,
      operation: 'fetch_error_details',
      reason: 'Admin viewing error details',
      source: endpoint,
      metadata: { errorId }
    }
  );

  return createApiResponse(result);
});

// PATCH - Mark error as resolved/acknowledged
export const PATCH = adminApiWrapper(async (
  request: NextRequest, 
  auth, 
  endpoint,
  { params }: { params: { id: string } }
) => {
  const errorId = params.id;
  const body = await request.json();
  const { action } = body; // 'resolve' or 'acknowledge'

  const result = await SecureServiceRoleWrapper.executeSecureOperation(
    async (supabase) => {
      const updateData: any = {};
      
      if (action === 'resolve') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = auth.userId;
      } else if (action === 'acknowledge') {
        updateData.acknowledged_at = new Date().toISOString();
        updateData.acknowledged_by = auth.userId;
      }

      const { data, error } = await supabase
        .from('indb_system_error_logs')
        .update(updateData)
        .eq('id', errorId)
        .select()
        .single();

      if (error) throw error;

      return { error: data };
    },
    {
      userId: auth.userId,
      operation: 'update_error_status',
      reason: `Admin ${action}d error`,
      source: endpoint,
      metadata: { errorId, action }
    }
  );

  return createApiResponse(result);
});
```

#### Step 1.4: Create Critical Errors API
**File:** `app/api/v1/admin/errors/critical/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { adminApiWrapper } from '@/lib/core/api-response-middleware';
import { createApiResponse } from '@/lib/core/api-response-formatter';
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper';

export const GET = adminApiWrapper(async (request: NextRequest, auth, endpoint) => {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  const result = await SecureServiceRoleWrapper.executeSecureOperation(
    async (supabase) => {
      const { data: criticalErrors, error } = await supabase
        .from('indb_system_error_logs')
        .select('*')
        .eq('severity', 'CRITICAL')
        .is('resolved_at', null) // Only unresolved critical errors
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        criticalErrors: criticalErrors || [],
        count: criticalErrors?.length || 0
      };
    },
    {
      userId: auth.userId,
      operation: 'fetch_critical_errors',
      reason: 'Admin viewing critical errors',
      source: endpoint
    }
  );

  return createApiResponse(result);
});
```

### Day 1-2: Frontend Dashboard UI

#### Step 2.1: Create Error Stats Cards Component
**File:** `components/admin/errors/ErrorStatsCards.tsx`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ErrorStatsProps {
  timeRange: '24h' | '7d' | '30d';
}

export function ErrorStatsCards({ timeRange }: ErrorStatsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/v1/admin/errors/stats', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/errors/stats?range=${timeRange}`, {
        credentials: 'include'
      });
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="stats-loading">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = data?.data?.stats;
  if (!stats) return null;

  const getTrendIcon = () => {
    if (stats.trend.direction === 'up') return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (stats.trend.direction === 'down') return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const mostCommonType = Object.entries(stats.typeDistribution || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))[0];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card data-testid="card-total-errors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-total-errors">
            {stats.totalErrors.toLocaleString()}
          </div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {getTrendIcon()}
            <span className="ml-1">
              {Math.abs(stats.trend.value).toFixed(1)}% from previous period
            </span>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-critical-errors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive" data-testid="text-critical-errors">
            {stats.criticalErrors.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Requires immediate attention
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-error-rate">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-error-rate">
            {(stats.totalErrors / (timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720)).toFixed(1)}/hr
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Average errors per hour
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-most-common">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Common Type</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-most-common-type">
            {mostCommonType?.[0] || 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {mostCommonType?.[1] || 0} occurrences
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Step 2.2: Create Error List Table Component
**File:** `components/admin/errors/ErrorListTable.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface ErrorListTableProps {
  filters: {
    severity?: string;
    type?: string;
    userId?: string;
    endpoint?: string;
    status?: string;
    search?: string;
  };
  onViewDetails: (errorId: string) => void;
}

export function ErrorListTable({ filters, onViewDetails }: ErrorListTableProps) {
  const [page, setPage] = useState(1);
  const limit = 100;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/v1/admin/errors', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const res = await fetch(`/api/v1/admin/errors?${params}`, {
        credentials: 'include'
      });
      return res.json();
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="table-loading">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const errors = data?.data?.errors || [];
  const pagination = data?.data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors.map((error: any) => (
              <TableRow key={error.id} data-testid={`row-error-${error.id}`}>
                <TableCell className="font-mono text-sm" data-testid={`text-timestamp-${error.id}`}>
                  {format(new Date(error.created_at), 'MMM dd, HH:mm:ss')}
                </TableCell>
                <TableCell>
                  <Badge variant={getSeverityColor(error.severity)} data-testid={`badge-severity-${error.id}`}>
                    {error.severity}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`text-type-${error.id}`}>
                  {error.error_type}
                </TableCell>
                <TableCell className="max-w-md truncate" data-testid={`text-message-${error.id}`}>
                  {error.user_message || error.message}
                </TableCell>
                <TableCell className="font-mono text-xs" data-testid={`text-endpoint-${error.id}`}>
                  {error.endpoint || '-'}
                </TableCell>
                <TableCell>
                  {error.resolved_at ? (
                    <Badge variant="outline" data-testid={`badge-status-${error.id}`}>Resolved</Badge>
                  ) : (
                    <Badge variant="secondary" data-testid={`badge-status-${error.id}`}>Open</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(error.id)}
                    data-testid={`button-view-${error.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
          Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of{' '}
          {pagination.total} errors
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= pagination.totalPages}
            data-testid="button-next-page"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

#### Step 2.3: Create Error Filters Component
**File:** `components/admin/errors/ErrorFilters.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';

interface ErrorFiltersProps {
  onFilterChange: (filters: any) => void;
}

export function ErrorFilters({ onFilterChange }: ErrorFiltersProps) {
  const [filters, setFilters] = useState({
    severity: '',
    type: '',
    status: '',
    search: ''
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = { severity: '', type: '', status: '', search: '' };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search errors..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="pl-9"
          data-testid="input-search"
        />
      </div>

      <Select value={filters.severity} onValueChange={(v) => handleFilterChange('severity', v)}>
        <SelectTrigger className="w-[180px]" data-testid="select-severity">
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value=" ">All Severities</SelectItem>
          <SelectItem value="CRITICAL">Critical</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
        <SelectTrigger className="w-[200px]" data-testid="select-type">
          <SelectValue placeholder="Error Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value=" ">All Types</SelectItem>
          <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
          <SelectItem value="DATABASE">Database</SelectItem>
          <SelectItem value="EXTERNAL_API">External API</SelectItem>
          <SelectItem value="VALIDATION">Validation</SelectItem>
          <SelectItem value="SYSTEM">System</SelectItem>
          <SelectItem value="NETWORK">Network</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
        <SelectTrigger className="w-[150px]" data-testid="select-status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value=" ">All Status</SelectItem>
          <SelectItem value="new">Open</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="outline" size="icon" onClick={clearFilters} data-testid="button-clear-filters">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

#### Step 2.4: Create Error Details Modal
**File:** `components/admin/errors/ErrorDetailModal.tsx`

```typescript
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, ExternalLink, User, Code } from 'lucide-react';
import { format } from 'date-fns';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ErrorDetailModalProps {
  errorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ErrorDetailModal({ errorId, open, onOpenChange }: ErrorDetailModalProps) {
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/v1/admin/errors', errorId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/errors/${errorId}`, {
        credentials: 'include'
      });
      return res.json();
    },
    enabled: !!errorId && open
  });

  const resolveMutation = useMutation({
    mutationFn: async (action: 'resolve' | 'acknowledge') => {
      const res = await fetch(`/api/v1/admin/errors/${errorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action })
      });
      if (!res.ok) throw new Error('Failed to update error');
      return res.json();
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/errors'] });
      toast({
        title: 'Success',
        description: `Error ${action}d successfully`
      });
      onOpenChange(false);
    }
  });

  if (!errorId) return null;

  const error = data?.data?.error;
  const userInfo = data?.data?.userInfo;
  const relatedErrors = data?.data?.relatedErrors || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="modal-error-details">
        <DialogHeader>
          <DialogTitle>Error Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4" data-testid="modal-loading">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        ) : error ? (
          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={error.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                      {error.severity}
                    </Badge>
                    <Badge variant="outline">{error.error_type}</Badge>
                    {error.resolved_at && <Badge variant="outline">Resolved</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-error-id">
                    Error ID: {error.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!error.resolved_at && (
                    <Button
                      size="sm"
                      onClick={() => resolveMutation.mutate('resolve')}
                      disabled={resolveMutation.isPending}
                      data-testid="button-resolve"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Error Message */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">User Message</h3>
                <p className="text-sm" data-testid="text-user-message">{error.user_message}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Technical Message</h3>
                <p className="text-sm font-mono bg-muted p-3 rounded" data-testid="text-tech-message">
                  {error.message}
                </p>
              </div>

              {/* Error Context */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Endpoint</h3>
                  <p className="text-sm font-mono" data-testid="text-endpoint">
                    {error.http_method} {error.endpoint || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Status Code</h3>
                  <p className="text-sm" data-testid="text-status-code">{error.status_code || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Timestamp</h3>
                  <p className="text-sm" data-testid="text-timestamp">
                    {format(new Date(error.created_at), 'PPpp')}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User
                  </h3>
                  {userInfo ? (
                    <div>
                      <p className="text-sm">{userInfo.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{userInfo.email}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">System/Anonymous</p>
                  )}
                </div>
              </div>

              {/* Stack Trace */}
              {error.stack_trace && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Stack Trace
                  </h3>
                  <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto" data-testid="text-stack-trace">
                    {error.stack_trace}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {error.metadata && Object.keys(error.metadata).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Metadata</h3>
                  <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto" data-testid="text-metadata">
                    {JSON.stringify(error.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Sentry Link */}
              {error.id && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://sentry.io/issues/?query=${error.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-sentry"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in Sentry
                  </a>
                </Button>
              )}

              {/* Related Errors */}
              {relatedErrors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Related Errors (Last 24h)</h3>
                  <div className="space-y-2">
                    {relatedErrors.map((related: any) => (
                      <div
                        key={related.id}
                        className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                        data-testid={`related-error-${related.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{related.severity}</Badge>
                          <span className="truncate max-w-md">{related.message}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(related.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
```

#### Step 2.5: Create Main Error Dashboard Page
**File:** `app/backend/admin/errors/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorStatsCards } from '@/components/admin/errors/ErrorStatsCards';
import { ErrorFilters } from '@/components/admin/errors/ErrorFilters';
import { ErrorListTable } from '@/components/admin/errors/ErrorListTable';
import { ErrorDetailModal } from '@/components/admin/errors/ErrorDetailModal';

export default function ErrorsPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [filters, setFilters] = useState({});
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleViewDetails = (errorId: string) => {
    setSelectedErrorId(errorId);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Error Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor and analyze application errors
          </p>
        </div>
      </div>

      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
        <TabsList>
          <TabsTrigger value="24h" data-testid="tab-24h">Last 24 Hours</TabsTrigger>
          <TabsTrigger value="7d" data-testid="tab-7d">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30d" data-testid="tab-30d">Last 30 Days</TabsTrigger>
        </TabsList>

        <TabsContent value={timeRange} className="space-y-6">
          <ErrorStatsCards timeRange={timeRange} />
          
          <div className="space-y-4">
            <ErrorFilters onFilterChange={setFilters} />
            <ErrorListTable filters={filters} onViewDetails={handleViewDetails} />
          </div>
        </TabsContent>
      </Tabs>

      <ErrorDetailModal
        errorId={selectedErrorId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
```

### Day 3: Real-time Monitoring & Sentry Integration

#### Step 3.1: Add WebSocket Real-time Updates (if websocket exists)
**File:** `lib/websocket/error-events.ts`

```typescript
import { WebSocketService } from './websocket-service';

export class ErrorWebSocketHandler {
  static broadcastCriticalError(error: {
    id: string;
    severity: string;
    message: string;
    endpoint: string;
  }) {
    // Broadcast to all admin users
    WebSocketService.broadcastToAdmins({
      type: 'critical_error',
      data: error
    });
  }

  static broadcastErrorResolved(errorId: string, resolvedBy: string) {
    WebSocketService.broadcastToAdmins({
      type: 'error_resolved',
      data: { errorId, resolvedBy }
    });
  }
}
```

#### Step 3.2: Integrate WebSocket Notifications in Frontend
**File:** `components/admin/errors/ErrorNotifications.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';

export function ErrorNotifications() {
  const { toast } = useToast();

  useEffect(() => {
    // Connect to WebSocket for real-time error notifications
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'critical_error') {
        toast({
          variant: 'destructive',
          title: 'Critical Error Detected',
          description: message.data.message,
          duration: 10000,
          action: (
            <a href={`/backend/admin/errors?errorId=${message.data.id}`} className="text-sm underline">
              View Details
            </a>
          )
        });

        // Optional: Play sound alert
        if (typeof Audio !== 'undefined') {
          const audio = new Audio('/alert.mp3');
          audio.play().catch(() => {}); // Ignore if autoplay blocked
        }
      }
    };

    return () => {
      ws.close();
    };
  }, [toast]);

  return null; // This component doesn't render anything
}
```

#### Step 3.3: Add Sentry Dashboard Integration Widget
**File:** `components/admin/errors/SentryIntegration.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export function SentryIntegration() {
  const sentryProjectUrl = process.env.NEXT_PUBLIC_SENTRY_PROJECT_URL;

  if (!sentryProjectUrl) {
    return null; // Sentry not configured
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Sentry Dashboard
          <Button variant="outline" size="sm" asChild>
            <a href={sentryProjectUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Sentry
            </a>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <iframe
          src={`${sentryProjectUrl}/embed/`}
          className="w-full h-96 border rounded"
          title="Sentry Dashboard"
        />
      </CardContent>
    </Card>
  );
}
```

---

## P3.2: Automated Error Detection

**Duration:** 2 days  
**Priority:** Medium  
**Goal:** Prevent error handling regressions through automated checks

### Day 1: ESLint Custom Rule

#### Step 4.1: Create Custom ESLint Rule
**File:** `eslint-rules/no-console-in-api-routes.js`

```javascript
/**
 * Custom ESLint rule: no-console-in-api-routes
 * Prevents console.* usage in API routes, enforces logger usage
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow console.* in API routes',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      noConsoleInApiRoutes: 
        'console.{{method}}() is not allowed in API routes. Use logger.{{method}}() instead.\n\n' +
        'Example:\n' +
        '  // ❌ Bad\n' +
        '  console.error("Error:", error)\n\n' +
        '  // ✅ Good\n' +
        '  logger.error({ error, userId, endpoint }, "Error occurred")',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          allowedPatterns: {
            type: 'array',
            items: { type: 'string' }
          },
          exceptions: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        additionalProperties: false
      }
    ]
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedPatterns = options.allowedPatterns || ['app/api/**/*.ts', 'app/api/**/*.js'];
    const exceptions = options.exceptions || ['middleware.ts'];
    
    const filename = context.getFilename();
    
    // Check if file is in API routes
    const isApiRoute = allowedPatterns.some(pattern => {
      const regex = new RegExp(pattern.replace('**', '.*').replace('*', '[^/]*'));
      return regex.test(filename);
    });

    // Check if file is in exceptions list
    const isException = exceptions.some(exception => filename.includes(exception));

    if (!isApiRoute || isException) {
      return {}; // Don't check this file
    }

    return {
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'console' &&
          node.property.type === 'Identifier'
        ) {
          const method = node.property.name;
          
          context.report({
            node,
            messageId: 'noConsoleInApiRoutes',
            data: { method },
            fix(fixer) {
              // Auto-fix: Replace console with logger
              return fixer.replaceText(node.object, 'logger');
            }
          });
        }
      }
    };
  }
};
```

#### Step 4.2: Register Custom ESLint Rule
**File:** `.eslintrc.json`

```json
{
  "extends": "next/core-web-vitals",
  "plugins": ["custom-rules"],
  "rules": {
    "custom-rules/no-console-in-api-routes": ["error", {
      "allowedPatterns": ["app/api/**/*.ts", "app/api/**/*.js"],
      "exceptions": ["middleware.ts", "instrumentation.ts"]
    }]
  }
}
```

**File:** `eslint-rules/index.js`

```javascript
module.exports = {
  rules: {
    'no-console-in-api-routes': require('./no-console-in-api-routes')
  }
};
```

**Update:** `package.json`

```json
{
  "eslintConfig": {
    "plugins": ["./eslint-rules"]
  }
}
```

### Day 1-2: Pre-commit Hooks

#### Step 4.3: Install and Configure Husky
```bash
# Install Husky
npm install --save-dev husky

# Initialize Husky
npx husky init

# Create pre-commit hook
npx husky add .husky/pre-commit "npm run lint-staged"
```

#### Step 4.4: Configure Lint-Staged
**File:** `package.json`

```json
{
  "scripts": {
    "lint": "next lint",
    "lint-staged": "lint-staged",
    "typecheck": "tsc --noEmit"
  },
  "lint-staged": {
    "app/api/**/*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{ts,tsx}": [
      "bash -c 'npm run typecheck'"
    ]
  },
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0"
  }
}
```

#### Step 4.5: Create Pre-commit Hook File
**File:** `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Run lint-staged (ESLint + Prettier)
npm run lint-staged

# Run TypeScript type checking
echo "🔍 Type checking..."
npm run typecheck

# Validate error response format (custom script)
echo "🔍 Validating error handling..."
node scripts/validate-error-handling.js

echo "✅ Pre-commit checks passed!"
```

### Day 2: CI/CD Pipeline Check

#### Step 4.6: Create Error Handling Validation Script
**File:** `scripts/validate-error-handling.js`

```javascript
/**
 * Validation script to ensure error handling compliance
 * Run in CI/CD to prevent regressions
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Validation results
const results = {
  totalRoutes: 0,
  routesWithWrappers: 0,
  routesWithoutWrappers: [],
  consoleViolations: [],
  responseFormatIssues: []
};

// Find all API route files
const apiRoutes = glob.sync('app/api/**/*.ts', {
  ignore: ['**/*.test.ts', '**/*.spec.ts']
});

results.totalRoutes = apiRoutes.length;

// Check each route
apiRoutes.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.relative(process.cwd(), filePath);

  // Check 1: Wrapper usage
  const hasWrapper = 
    content.includes('adminApiWrapper') ||
    content.includes('authenticatedApiWrapper') ||
    content.includes('publicApiWrapper') ||
    content.includes('withErrorHandler');

  if (hasWrapper) {
    results.routesWithWrappers++;
  } else {
    results.routesWithoutWrappers.push(fileName);
  }

  // Check 2: Console.* usage (violations)
  const consoleRegex = /console\.(log|error|warn|info|debug)\(/g;
  const consoleMatches = content.match(consoleRegex);
  
  if (consoleMatches && !fileName.includes('middleware.ts')) {
    results.consoleViolations.push({
      file: fileName,
      violations: consoleMatches.length
    });
  }

  // Check 3: Response format (should use createApiResponse or createErrorResponse)
  const hasProperResponse = 
    content.includes('createApiResponse') ||
    content.includes('createErrorResponse') ||
    content.includes('formatSuccess') ||
    content.includes('formatError');

  const hasNextResponse = content.includes('NextResponse.json');

  if (hasNextResponse && !hasProperResponse && hasWrapper) {
    results.responseFormatIssues.push(fileName);
  }
});

// Calculate compliance percentage
const wrapperCompliance = ((results.routesWithWrappers / results.totalRoutes) * 100).toFixed(1);
const consoleCompliance = (((results.totalRoutes - results.consoleViolations.length) / results.totalRoutes) * 100).toFixed(1);

// Print results
console.log('\n📊 Error Handling Compliance Report\n');
console.log('='.repeat(50));
console.log(`\n✅ API Routes: ${results.routesWithWrappers}/${results.totalRoutes} using wrappers (${wrapperCompliance}%)`);
console.log(`✅ Console Logging: ${consoleCompliance}% compliance (${results.consoleViolations.length} violations)`);
console.log(`✅ Response Format: ${results.totalRoutes - results.responseFormatIssues.length}/${results.totalRoutes} standardized`);

if (results.routesWithoutWrappers.length > 0) {
  console.log('\n⚠️  Routes without wrappers:');
  results.routesWithoutWrappers.forEach(file => console.log(`   - ${file}`));
}

if (results.consoleViolations.length > 0) {
  console.log('\n❌ Console.* violations found:');
  results.consoleViolations.forEach(({ file, violations }) => {
    console.log(`   - ${file} (${violations} violations)`);
  });
}

if (results.responseFormatIssues.length > 0) {
  console.log('\n⚠️  Response format issues:');
  results.responseFormatIssues.forEach(file => console.log(`   - ${file}`));
}

console.log('\n' + '='.repeat(50));

// Exit with error if compliance is below threshold
const complianceThreshold = 95; // 95% compliance required

if (parseFloat(wrapperCompliance) < complianceThreshold) {
  console.log(`\n❌ Error Handling Compliance: FAILED ❌`);
  console.log(`   Wrapper compliance (${wrapperCompliance}%) below threshold (${complianceThreshold}%)`);
  process.exit(1);
}

if (results.consoleViolations.length > 0) {
  console.log(`\n❌ Error Handling Compliance: FAILED ❌`);
  console.log(`   Console.* violations detected`);
  process.exit(1);
}

console.log(`\n✅ Error Handling Compliance: PASSED ✅\n`);
process.exit(0);
```

#### Step 4.7: Create GitHub Actions Workflow (if using GitHub)
**File:** `.github/workflows/error-handling-check.yml`

```yaml
name: Error Handling Compliance

on:
  pull_request:
    paths:
      - 'app/api/**'
      - 'lib/**'
  push:
    branches:
      - main

jobs:
  error-handling-check:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run TypeScript check
        run: npm run typecheck
      
      - name: Validate error handling patterns
        run: node scripts/validate-error-handling.js
      
      - name: Upload compliance report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: error-handling-report
          path: error-handling-report.json
```

---

## P3.3: Error Recovery Mechanisms

**Duration:** 3 days  
**Priority:** Medium  
**Goal:** Improve application resilience with circuit breakers, exponential backoff, and fallback strategies

### Day 1: Circuit Breaker Implementation

#### Step 5.1: Create Circuit Breaker Base Class
**File:** `lib/resilience/CircuitBreaker.ts`

```typescript
/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Service failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number;      // Failures before opening circuit
  successThreshold: number;      // Successes to close circuit from half-open
  timeout: number;               // Time before trying half-open (ms)
  monitoringWindow: number;      // Time window for failure count (ms)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;
  
  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < (this.nextAttemptTime || 0)) {
        throw new Error(`Circuit breaker [${this.options.name}] is OPEN`);
      }
      // Try half-open
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        console.log(`[CircuitBreaker] ${this.options.name} - Circuit CLOSED (recovered)`);
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.timeout;
      console.warn(`[CircuitBreaker] ${this.options.name} - Circuit OPEN (still failing)`);
      return;
    }

    // Check if we should open the circuit
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.timeout;
      console.warn(`[CircuitBreaker] ${this.options.name} - Circuit OPEN (failure threshold reached: ${this.failureCount})`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }
}
```

#### Step 5.2: Create Service-Specific Circuit Breakers
**File:** `lib/resilience/service-circuit-breakers.ts`

```typescript
import { CircuitBreaker } from './CircuitBreaker';

/**
 * Circuit breakers for external services
 * Prevents cascading failures when services are down
 */

export const ServiceCircuitBreakers = {
  // SeRanking API Circuit Breaker
  seranking: new CircuitBreaker({
    name: 'SeRanking API',
    failureThreshold: 5,      // Open after 5 failures
    successThreshold: 3,      // Close after 3 successes
    timeout: 30000,           // Try again after 30 seconds
    monitoringWindow: 60000   // 60 second window
  }),

  // Google API Circuit Breaker
  googleApi: new CircuitBreaker({
    name: 'Google API',
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000,
    monitoringWindow: 60000
  }),

  // Midtrans Payment Gateway Circuit Breaker
  midtrans: new CircuitBreaker({
    name: 'Midtrans API',
    failureThreshold: 3,      // More sensitive for payments
    successThreshold: 2,
    timeout: 60000,           // Wait longer before retry (60s)
    monitoringWindow: 120000  // 2 minute window
  }),

  // SendGrid Email Service Circuit Breaker
  sendgrid: new CircuitBreaker({
    name: 'SendGrid Email',
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000,
    monitoringWindow: 60000
  }),

  // Database Connection Circuit Breaker
  database: new CircuitBreaker({
    name: 'Database',
    failureThreshold: 10,     // Higher threshold for DB
    successThreshold: 5,
    timeout: 10000,           // Quick retry for DB
    monitoringWindow: 30000   // 30 second window
  })
};

// Export wrapped execute functions for convenience
export const executeWithCircuitBreaker = {
  seranking: <T>(operation: () => Promise<T>) => 
    ServiceCircuitBreakers.seranking.execute(operation),
    
  googleApi: <T>(operation: () => Promise<T>) => 
    ServiceCircuitBreakers.googleApi.execute(operation),
    
  midtrans: <T>(operation: () => Promise<T>) => 
    ServiceCircuitBreakers.midtrans.execute(operation),
    
  sendgrid: <T>(operation: () => Promise<T>) => 
    ServiceCircuitBreakers.sendgrid.execute(operation),
    
  database: <T>(operation: () => Promise<T>) => 
    ServiceCircuitBreakers.database.execute(operation)
};

// Metrics endpoint for monitoring
export function getCircuitBreakerMetrics() {
  return {
    seranking: ServiceCircuitBreakers.seranking.getMetrics(),
    googleApi: ServiceCircuitBreakers.googleApi.getMetrics(),
    midtrans: ServiceCircuitBreakers.midtrans.getMetrics(),
    sendgrid: ServiceCircuitBreakers.sendgrid.getMetrics(),
    database: ServiceCircuitBreakers.database.getMetrics()
  };
}
```

#### Step 5.3: Integrate Circuit Breaker with SeRanking Service
**File:** Update `lib/rank-tracking/seranking/services/KeywordEnrichmentService.ts`

```typescript
import { executeWithCircuitBreaker } from '@/lib/resilience/service-circuit-breakers';

// Find the enrichKeywordData method and wrap the API call
async enrichKeywordData(keyword: string, location: string) {
  try {
    // Use circuit breaker for SeRanking API calls
    const data = await executeWithCircuitBreaker.seranking(async () => {
      return await this.seRankingClient.getKeywordData({
        keyword,
        location
      });
    });

    return data;
  } catch (error) {
    // If circuit is open, use fallback
    if (error.message.includes('Circuit breaker')) {
      logger.warn({ keyword, location }, 'Circuit breaker open, using cached data');
      return this.getFallbackKeywordData(keyword, location);
    }
    throw error;
  }
}
```

### Day 2: Exponential Backoff Service

#### Step 5.4: Create Exponential Backoff Implementation
**File:** `lib/resilience/ExponentialBackoff.ts`

```typescript
/**
 * Exponential Backoff with Jitter
 * Retry failed operations with increasing delays
 */

export interface BackoffOptions {
  maxAttempts: number;       // Maximum retry attempts
  initialDelay: number;      // Initial delay in ms
  maxDelay: number;          // Maximum delay in ms
  backoffMultiplier: number; // Multiplier for each retry
  jitter: boolean;           // Add randomization to delay
}

export interface RetryContext {
  attempt: number;
  delay: number;
  error: Error;
}

export class ExponentialBackoff {
  constructor(private options: BackoffOptions) {}

  async retry<T>(
    operation: () => Promise<T>,
    callbacks?: {
      onRetry?: (context: RetryContext) => void;
      shouldRetry?: (error: Error) => boolean;
    }
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry this error
        if (callbacks?.shouldRetry && !callbacks.shouldRetry(lastError)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === this.options.maxAttempts) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);

        // Callback before retry
        if (callbacks?.onRetry) {
          callbacks.onRetry({ attempt, delay, error: lastError });
        }

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    // Base exponential delay
    let delay = this.options.initialDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);

    // Cap at max delay
    delay = Math.min(delay, this.options.maxDelay);

    // Add jitter (±20% randomization)
    if (this.options.jitter) {
      const jitterRange = delay * 0.2;
      const jitterOffset = (Math.random() * 2 - 1) * jitterRange;
      delay = delay + jitterOffset;
    }

    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Pre-configured backoff strategies for common scenarios
 */
export const BackoffStrategies = {
  // For database queries
  database: new ExponentialBackoff({
    maxAttempts: 3,
    initialDelay: 1000,      // 1s
    maxDelay: 4000,          // 4s
    backoffMultiplier: 2,
    jitter: true
  }),

  // For external API calls
  externalApi: new ExponentialBackoff({
    maxAttempts: 5,
    initialDelay: 1000,      // 1s
    maxDelay: 16000,         // 16s
    backoffMultiplier: 2,
    jitter: true
  }),

  // For payment processing (slower, more cautious)
  payment: new ExponentialBackoff({
    maxAttempts: 3,
    initialDelay: 2000,      // 2s
    maxDelay: 8000,          // 8s
    backoffMultiplier: 2,
    jitter: true
  }),

  // For quick retries (network blips)
  quick: new ExponentialBackoff({
    maxAttempts: 3,
    initialDelay: 500,       // 500ms
    maxDelay: 2000,          // 2s
    backoffMultiplier: 2,filter: true
  })
};
```

#### Step 5.5: Integrate Exponential Backoff with Database Operations
**File:** Update `lib/services/security/SecureServiceRoleWrapper.ts`

```typescript
import { BackoffStrategies } from '@/lib/resilience/ExponentialBackoff';
import logger from '@/lib/logging/logger';

// Find database operations and wrap with backoff
async executeSecureOperation<T>(
  operation: (supabase: SupabaseClient) => Promise<T>,
  context: SecurityContext
): Promise<T> {
  // ... existing validation code ...

  // Use exponential backoff for database operations
  return await BackoffStrategies.database.retry(
    async () => {
      return await operation(supabaseAdmin);
    },
    {
      onRetry: ({ attempt, delay, error }) => {
        logger.warn({
          attempt,
          delay,
          error: error.message,
          userId: context.userId,
          operation: context.operation
        }, 'Database operation retry');
      },
      shouldRetry: (error) => {
        // Only retry on transient errors
        const retriableErrors = [
          'ECONNREFUSED',
          'ETIMEDOUT',
          'ENOTFOUND',
          'EPIPE',
          'connection timeout'
        ];
        return retriableErrors.some(code => error.message.includes(code));
      }
    }
  );
}
```

### Day 3: Fallback Strategies

#### Step 5.6: Create Fallback Handler
**File:** `lib/resilience/FallbackHandler.ts`

```typescript
/**
 * Fallback Handler
 * Provides graceful degradation when primary operations fail
 */

import logger from '@/lib/logging/logger';

export interface FallbackOptions {
  cacheTTL?: number;          // Cache time-to-live in seconds
  cacheKey?: string;          // Unique cache key
  logFallback?: boolean;      // Log when fallback is used
}

export class FallbackHandler {
  private cache = new Map<string, { data: any; expiresAt: number }>();

  async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    options: FallbackOptions = {}
  ): Promise<T> {
    try {
      const result = await primary();
      
      // Cache successful result if TTL specified
      if (options.cacheTTL && options.cacheKey) {
        this.setCache(options.cacheKey, result, options.cacheTTL);
      }

      return result;
    } catch (error) {
      if (options.logFallback) {
        logger.warn({ error: (error as Error).message }, 'Primary operation failed, using fallback');
      }

      // Try cache first if available
      if (options.cacheKey) {
        const cached = this.getCache<T>(options.cacheKey);
        if (cached) {
          logger.info({ cacheKey: options.cacheKey }, 'Using cached fallback data');
          return cached;
        }
      }

      // Use fallback
      return await fallback();
    }
  }

  private setCache<T>(key: string, data: T, ttlSeconds: number) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiresAt });
  }

  private getCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  clearCache(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// Singleton instance
export const fallbackHandler = new FallbackHandler();
```

#### Step 5.7: Implement Fallback Strategies for Critical Features
**File:** `lib/resilience/critical-fallbacks.ts`

```typescript
import { fallbackHandler } from './FallbackHandler';
import { supabaseAdmin } from '@/lib/database';
import logger from '@/lib/logging/logger';

/**
 * Fallback strategies for critical features
 */

export const CriticalFallbacks = {
  /**
   * Keyword Data - SeRanking API fallback to cached data
   */
  async getKeywordData(keyword: string, location: string) {
    return await fallbackHandler.withFallback(
      // Primary: Fetch from SeRanking API
      async () => {
        const response = await fetch(`${process.env.SERANKING_API_URL}/keyword-data`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SERANKING_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ keyword, location })
        });

        if (!response.ok) throw new Error('SeRanking API failed');
        return await response.json();
      },
      
      // Fallback: Use cached data from database
      async () => {
        const { data } = await supabaseAdmin
          .from('indb_keyword_cache')
          .select('*')
          .eq('keyword', keyword)
          .eq('location', location)
          .order('cached_at', { ascending: false })
          .limit(1)
          .single();

        if (!data) {
          throw new Error('No cached keyword data available');
        }

        logger.info({ keyword, location }, 'Using cached keyword data as fallback');
        return data.data;
      },
      
      { 
        cacheTTL: 3600, // 1 hour cache
        cacheKey: `keyword:${keyword}:${location}`,
        logFallback: true
      }
    );
  },

  /**
   * Email Sending - SendGrid fallback to retry queue
   */
  async sendEmail(to: string, subject: string, html: string) {
    return await fallbackHandler.withFallback(
      // Primary: Send via SendGrid
      async () => {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        await sgMail.send({ to, subject, html });
        return { success: true };
      },
      
      // Fallback: Queue for retry
      async () => {
        await supabaseAdmin
          .from('indb_email_queue')
          .insert({
            to,
            subject,
            html,
            status: 'pending',
            retry_count: 0,
            created_at: new Date().toISOString()
          });

        logger.warn({ to, subject }, 'Email queued for retry - SendGrid unavailable');
        return { success: true, queued: true };
      },
      
      { logFallback: true }
    );
  },

  /**
   * Payment Processing - Midtrans fallback to manual instructions
   */
  async createPayment(orderId: string, amount: number, customerEmail: string) {
    return await fallbackHandler.withFallback(
      // Primary: Midtrans Snap
      async () => {
        const midtrans = require('midtrans-client');
        const snap = new midtrans.Snap({
          isProduction: process.env.NODE_ENV === 'production',
          serverKey: process.env.MIDTRANS_SERVER_KEY
        });

        const transaction = await snap.createTransaction({
          transaction_details: { order_id: orderId, gross_amount: amount },
          customer_details: { email: customerEmail }
        });

        return { token: transaction.token, redirect_url: transaction.redirect_url };
      },
      
      // Fallback: Manual payment instructions
      async () => {
        // Store pending payment with manual instructions
        await supabaseAdmin
          .from('indb_payment_manual')
          .insert({
            order_id: orderId,
            amount,
            customer_email: customerEmail,
            status: 'pending_manual',
            instructions: 'Bank Transfer: BCA 1234567890',
            created_at: new Date().toISOString()
          });

        logger.error({ orderId, amount }, 'Payment gateway unavailable - manual payment created');
        
        return { 
          manual: true,
          instructions: 'Bank Transfer: BCA 1234567890',
          order_id: orderId
        };
      },
      
      { logFallback: true }
    );
  },

  /**
   * Rank Tracking - Google API fallback to last known ranks
   */
  async getRankData(keyword: string, domain: string) {
    return await fallbackHandler.withFallback(
      // Primary: Google Search API
      async () => {
        const response = await fetch(`${process.env.GOOGLE_API_URL}/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ keyword, domain })
        });

        if (!response.ok) throw new Error('Google API failed');
        return await response.json();
      },
      
      // Fallback: Last known ranks from database
      async () => {
        const { data } = await supabaseAdmin
          .from('indb_rank_history')
          .select('*')
          .eq('keyword', keyword)
          .eq('domain', domain)
          .order('checked_at', { ascending: false })
          .limit(1)
          .single();

        if (!data) {
          throw new Error('No historical rank data available');
        }

        logger.info({ keyword, domain }, 'Using last known rank as fallback');
        return { ...data, fallback: true };
      },
      
      { 
        cacheTTL: 1800, // 30 minutes cache
        cacheKey: `rank:${keyword}:${domain}`,
        logFallback: true
      }
    );
  },

  /**
   * Location Detection - IP-API fallback to user's saved location
   */
  async detectLocation(ipAddress: string, userId?: string) {
    return await fallbackHandler.withFallback(
      // Primary: IP-API service
      async () => {
        const response = await fetch(`http://ip-api.com/json/${ipAddress}`);
        if (!response.ok) throw new Error('IP-API failed');
        return await response.json();
      },
      
      // Fallback: User's saved location or default
      async () => {
        if (userId) {
          const { data: userProfile } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select('default_location')
            .eq('user_id', userId)
            .single();

          if (userProfile?.default_location) {
            logger.info({ userId }, 'Using user saved location as fallback');
            return userProfile.default_location;
          }
        }

        // Default location
        logger.warn('Using default location fallback');
        return { country: 'US', city: 'New York', countryCode: 'US' };
      },
      
      { logFallback: true }
    );
  }
};
```

#### Step 5.8: Create Circuit Breaker + Fallback Integration
**File:** `lib/resilience/resilient-operation.ts`

```typescript
import { executeWithCircuitBreaker } from './service-circuit-breakers';
import { BackoffStrategies } from './ExponentialBackoff';
import { fallbackHandler } from './FallbackHandler';
import logger from '@/lib/logging/logger';

/**
 * Complete resilient operation combining:
 * - Circuit Breaker (prevents cascading failures)
 * - Exponential Backoff (retries with increasing delays)
 * - Fallback (graceful degradation)
 */

export async function resilientExternalApiCall<T>(
  serviceName: 'seranking' | 'googleApi' | 'midtrans' | 'sendgrid',
  operation: () => Promise<T>,
  fallback: () => Promise<T>,
  options?: {
    cacheKey?: string;
    cacheTTL?: number;
  }
): Promise<T> {
  try {
    // Step 1: Check circuit breaker
    const result = await executeWithCircuitBreaker[serviceName](async () => {
      // Step 2: Execute with exponential backoff
      return await BackoffStrategies.externalApi.retry(
        operation,
        {
          onRetry: ({ attempt, delay, error }) => {
            logger.warn({
              service: serviceName,
              attempt,
              delay,
              error: error.message
            }, 'External API retry');
          }
        }
      );
    });

    return result;
  } catch (error) {
    // Step 3: Use fallback if all retries and circuit breaker failed
    logger.error({
      service: serviceName,
      error: (error as Error).message
    }, 'External API completely failed, using fallback');

    return await fallbackHandler.withFallback(
      async () => { throw error; }, // Already failed, skip primary
      fallback,
      {
        cacheKey: options?.cacheKey,
        cacheTTL: options?.cacheTTL,
        logFallback: true
      }
    );
  }
}

/**
 * Usage example in service:
 * 
 * const keywordData = await resilientExternalApiCall(
 *   'seranking',
 *   async () => await seRankingApi.getKeywordData(keyword),
 *   async () => await getCachedKeywordData(keyword),
 *   { cacheKey: `keyword:${keyword}`, cacheTTL: 3600 }
 * );
 */
```

---

## Testing & Validation

### Testing P3.1: Error Dashboard

#### Test 1: API Endpoints
```bash
# Test error stats API
curl -X GET "http://localhost:5000/api/v1/admin/errors/stats?range=24h" \
  -H "Cookie: session=..." \
  -H "Authorization: Bearer ..."

# Test error list API with filters
curl -X GET "http://localhost:5000/api/v1/admin/errors?page=1&limit=100&severity=CRITICAL" \
  -H "Cookie: session=..." \
  -H "Authorization: Bearer ..."

# Test error details API
curl -X GET "http://localhost:5000/api/v1/admin/errors/{error-id}" \
  -H "Cookie: session=..." \
  -H "Authorization: Bearer ..."
```

#### Test 2: Frontend UI
1. Navigate to `/backend/admin/errors`
2. Verify stats cards display correctly
3. Test filters (severity, type, status, search)
4. Test pagination (next/previous)
5. Click on error to view details modal
6. Mark error as resolved
7. Verify real-time updates (if WebSocket enabled)

#### Test 3: Database Queries
```sql
-- Verify error logs exist
SELECT COUNT(*) FROM indb_system_error_logs WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Check error distribution
SELECT error_type, COUNT(*) as count 
FROM indb_system_error_logs 
GROUP BY error_type 
ORDER BY count DESC;

-- Find critical errors
SELECT * FROM indb_system_error_logs 
WHERE severity = 'CRITICAL' AND resolved_at IS NULL 
ORDER BY created_at DESC;
```

### Testing P3.2: Automated Error Detection

#### Test 1: ESLint Rule
```bash
# Create test file with console.log in API route
echo "console.error('test')" > app/api/test/route.ts

# Run ESLint - should fail
npm run lint

# Fix should auto-replace console with logger
npm run lint -- --fix
```

#### Test 2: Pre-commit Hook
```bash
# Stage file with console.log
git add app/api/test/route.ts

# Try to commit - should fail
git commit -m "test"

# Fix file and try again - should pass
```

#### Test 3: CI/CD Validation Script
```bash
# Run validation script manually
node scripts/validate-error-handling.js

# Should output compliance report
# Should exit with code 1 if violations found
```

### Testing P3.3: Error Recovery Mechanisms

#### Test 1: Circuit Breaker
```typescript
// Test circuit breaker opens after failures
import { ServiceCircuitBreakers } from '@/lib/resilience/service-circuit-breakers';

// Simulate failures
for (let i = 0; i < 6; i++) {
  try {
    await ServiceCircuitBreakers.seranking.execute(async () => {
      throw new Error('Service down');
    });
  } catch (e) {}
}

// Check state - should be OPEN
console.log(ServiceCircuitBreakers.seranking.getState()); // OPEN

// Next request should fail immediately without calling operation
```

#### Test 2: Exponential Backoff
```typescript
import { BackoffStrategies } from '@/lib/resilience/ExponentialBackoff';

let attempts = 0;
const result = await BackoffStrategies.externalApi.retry(
  async () => {
    attempts++;
    if (attempts < 3) throw new Error('Temporary failure');
    return 'success';
  },
  {
    onRetry: ({ attempt, delay }) => {
      console.log(`Retry ${attempt} after ${delay}ms`);
    }
  }
);

// Should retry 3 times with increasing delays
// Delays: 1000ms, 2000ms, 4000ms (approximately with jitter)
```

#### Test 3: Fallback Strategies
```typescript
import { CriticalFallbacks } from '@/lib/resilience/critical-fallbacks';

// Test keyword data fallback
const keywordData = await CriticalFallbacks.getKeywordData('test keyword', 'US');

// If primary fails, should return cached data
// Check logs for "Using cached keyword data as fallback"
```

#### Test 4: Complete Resilient Operation
```typescript
import { resilientExternalApiCall } from '@/lib/resilience/resilient-operation';

const result = await resilientExternalApiCall(
  'seranking',
  async () => {
    // Primary: Call SeRanking API
    return await fetch('https://api.seranking.com/keyword-data');
  },
  async () => {
    // Fallback: Return cached data
    return cachedData;
  },
  {
    cacheKey: 'test-keyword',
    cacheTTL: 3600
  }
);

// Test scenarios:
// 1. API succeeds - returns fresh data
// 2. API fails temporarily - retries with backoff
// 3. API fails 5 times - circuit opens, uses fallback
// 4. Circuit open - immediately uses fallback without calling API
```

---

## Timeline & Effort

### Phase 3 Implementation Schedule

**Total Duration: 8 days (approximately 64 hours)**

| Day | Task | Hours | Deliverable |
|-----|------|-------|-------------|
| **Day 1** | P3.1 - Backend API Endpoints | 4 hours | 4 API routes (stats, list, details, critical) |
| **Day 1-2** | P3.1 - Frontend Dashboard UI | 12 hours | 5 components (stats, filters, table, modal, page) |
| **Day 3** | P3.1 - Real-time & Sentry Integration | 8 hours | WebSocket notifications, Sentry widget |
| **Day 4** | P3.2 - ESLint Custom Rule | 4 hours | Custom rule + configuration |
| **Day 4-5** | P3.2 - Pre-commit Hooks | 4 hours | Husky + lint-staged setup |
| **Day 5** | P3.2 - CI/CD Pipeline Check | 8 hours | Validation script + GitHub Actions |
| **Day 6** | P3.3 - Circuit Breaker | 8 hours | Base class + service-specific breakers |
| **Day 7** | P3.3 - Exponential Backoff | 8 hours | Backoff service + integration |
| **Day 8** | P3.3 - Fallback Strategies | 8 hours | Fallback handler + critical fallbacks |

### Effort Breakdown by Priority

| Priority | Component | Effort | Impact |
|----------|-----------|--------|--------|
| **P3.1** | Error Logging Dashboard | 24 hours | 🔴 High - Admin visibility |
| **P3.2** | Automated Error Detection | 16 hours | 🟡 Medium - Prevents regressions |
| **P3.3** | Error Recovery Mechanisms | 24 hours | 🟡 Medium - Improves resilience |
| **TOTAL** | All Phase 3 Tasks | **64 hours** | **Production-ready monitoring** |

---

## Success Criteria & Metrics

### P3.1 Success Criteria
- ✅ Admins can view all errors from `indb_system_error_logs` table
- ✅ Filter by severity, type, user, endpoint, date range, status
- ✅ Sort by any column, paginate through results
- ✅ View detailed error information including stack trace, metadata, related errors
- ✅ Mark errors as resolved/acknowledged
- ✅ Real-time critical error notifications (if WebSocket available)
- ✅ Sentry dashboard integration for cross-platform monitoring

### P3.2 Success Criteria
- ✅ ESLint rule blocks console.* in API routes
- ✅ Pre-commit hooks prevent non-compliant code from being committed
- ✅ CI/CD pipeline validates error handling compliance (>95%)
- ✅ Auto-fix available for console.* → logger.* conversion
- ✅ TypeScript type checking enforced pre-commit

### P3.3 Success Criteria
- ✅ Circuit breakers active for 5 external services (SeRanking, Google, Midtrans, SendGrid, Database)
- ✅ Exponential backoff with jitter for all external API calls
- ✅ Fallback strategies for 5 critical features (keyword data, email, payment, rank tracking, location)
- ✅ Circuit breaker metrics available for monitoring
- ✅ Failed operations automatically retry with increasing delays
- ✅ Application continues functioning when external services are down

### Key Performance Indicators (KPIs)

**After Phase 3 Completion:**
- ✅ **Error Detection Rate**: 100% (all errors captured and logged)
- ✅ **Admin Error Visibility**: 100% (all errors visible in dashboard)
- ✅ **Error Handling Compliance**: >95% (automated checks enforced)
- ✅ **Service Resilience**: 5 services with circuit breakers + fallbacks
- ✅ **Developer Productivity**: 50% reduction in debugging time (structured logs + error IDs)
- ✅ **Mean Time to Detection (MTTD)**: <5 minutes (real-time alerts)
- ✅ **Mean Time to Resolution (MTTR)**: <24 hours for critical errors

---

## Notes & Recommendations

### Important Considerations

1. **Database Schema**
   - Verify `indb_system_error_logs` table has `resolved_at` and `resolved_by` columns
   - Add indexes on frequently filtered columns (severity, error_type, created_at)
   - Consider partitioning by date for performance

2. **WebSocket Integration**
   - WebSocket real-time updates are optional
   - Fallback to 30-second polling if WebSocket unavailable
   - Ensure proper authentication for WebSocket connections

3. **Sentry Integration**
   - Sentry DSN must be configured in environment variables
   - Error IDs should match between database and Sentry for correlation
   - Set up Sentry alerts for CRITICAL severity errors

4. **Circuit Breaker Tuning**
   - Monitor circuit breaker metrics in production
   - Adjust thresholds based on actual service SLAs
   - Consider service-specific timeout values

5. **Fallback Data Quality**
   - Ensure cached data has timestamps
   - Display "FALLBACK" indicator to users when using cached data
   - Regular cleanup of stale cached data

6. **Performance Considerations**
   - Error dashboard queries may be slow on large datasets
   - Implement database indexes on filter columns
   - Consider read replicas for error dashboard queries
   - Add query result caching for stats cards (30 seconds)

### Next Steps After Phase 3

1. **Phase 4: Performance Monitoring** (Optional)
   - Track error frequency by route
   - Monitor error resolution time
   - Set up alerting for error threshold breaches

2. **Documentation**
   - Document error types and user messages
   - Create error handling guide for developers
   - Add examples for common error scenarios

3. **Continuous Improvement**
   - Review circuit breaker metrics monthly
   - Optimize fallback strategies based on usage
   - Enhance error dashboard with advanced analytics

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]  
**Author:** [Your Name]  
**Status:** Ready for Implementation

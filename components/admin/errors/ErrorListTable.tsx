'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/core/queryClient';
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
import { formatDistanceToNow } from 'date-fns';

interface ErrorListTableProps {
  filters: Record<string, string | undefined>;
  onErrorClick: (errorId: string) => void;
}

export function ErrorListTable({ filters, onErrorClick }: ErrorListTableProps) {
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/v1/admin/errors', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      return apiRequest(`/api/v1/admin/errors?${params}`);
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="border rounded-lg" data-testid="table-loading">
        <div className="p-8 text-center text-muted-foreground">
          Loading errors...
        </div>
      </div>
    );
  }

  const errors = data?.errors || [];
  const pagination = data?.pagination;

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
      CRITICAL: 'destructive',
      HIGH: 'default',
      MEDIUM: 'secondary',
      LOW: 'outline'
    };
    return (
      <Badge variant={variants[severity] || 'outline'} data-testid={`badge-severity-${severity.toLowerCase()}`}>
        {severity}
      </Badge>
    );
  };

  const getStatusBadge = (error: any) => {
    if (error.resolved_at) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" data-testid="badge-status-resolved">Resolved</Badge>;
    }
    if (error.acknowledged_at) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" data-testid="badge-status-acknowledged">Acknowledged</Badge>;
    }
    return <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" data-testid="badge-status-new">New</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No errors found
                </TableCell>
              </TableRow>
            ) : (
              errors.map((error: any) => (
                <TableRow key={error.id} data-testid={`row-error-${error.id}`}>
                  <TableCell className="whitespace-nowrap" data-testid={`text-time-${error.id}`}>
                    {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded" data-testid={`text-type-${error.id}`}>
                      {error.error_type}
                    </code>
                  </TableCell>
                  <TableCell className="max-w-md truncate" data-testid={`text-message-${error.id}`}>
                    {error.user_message || error.message}
                  </TableCell>
                  <TableCell>{getSeverityBadge(error.severity)}</TableCell>
                  <TableCell>{getStatusBadge(error)}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground" data-testid={`text-endpoint-${error.id}`}>
                    {error.endpoint || 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onErrorClick(error.id)}
                      data-testid={`button-view-${error.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total errors)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={!pagination.hasPrevPage}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!pagination.hasNextPage}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

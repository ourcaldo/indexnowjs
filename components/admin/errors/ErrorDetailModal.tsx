'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/core/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, AlertCircle, Clock, User, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ErrorDetailModalProps {
  errorId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ErrorDetailModal({ errorId, open, onClose }: ErrorDetailModalProps) {
  const { addToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/v1/admin/errors', errorId],
    queryFn: async () => {
      return apiRequest(`/api/v1/admin/errors/${errorId}`);
    },
    enabled: !!errorId && open
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/v1/admin/errors/${errorId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'acknowledge' })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/errors'] });
      addToast({
        title: 'Error acknowledged',
        description: 'The error has been marked as acknowledged.',
        type: 'success'
      });
    },
    onError: () => {
      addToast({
        title: 'Failed to acknowledge error',
        description: 'Please try again.',
        type: 'error'
      });
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/v1/admin/errors/${errorId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'resolve' })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/errors'] });
      addToast({
        title: 'Error resolved',
        description: 'The error has been marked as resolved.',
        type: 'success'
      });
      onClose();
    },
    onError: () => {
      addToast({
        title: 'Failed to resolve error',
        description: 'Please try again.',
        type: 'error'
      });
    }
  });

  if (!errorId) return null;

  const error = data?.error;
  const userInfo = data?.userInfo;
  const relatedErrors = data?.relatedErrors || [];

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
      CRITICAL: 'destructive',
      HIGH: 'default',
      MEDIUM: 'secondary',
      LOW: 'outline'
    };
    return <Badge variant={variants[severity] || 'outline'}>{severity}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="modal-error-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Error Details
          </DialogTitle>
          <DialogDescription>
            View detailed information about this error and take action
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground" data-testid="detail-loading">
            Loading error details...
          </div>
        ) : error ? (
          <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-4">
            {/* Header Info */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(error.severity)}
                  <code className="text-xs bg-muted px-2 py-1 rounded" data-testid="text-error-type">
                    {error.error_type}
                  </code>
                </div>
              <div className="text-sm text-muted-foreground" data-testid="text-error-time">
                {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
              </div>
            </div>

            {/* Error Messages */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">User Message</h3>
              <p className="text-sm" data-testid="text-user-message">{error.user_message}</p>
              
              <h3 className="font-semibold text-sm mt-4">Technical Message</h3>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto" data-testid="text-technical-message">
                {error.message}
              </pre>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-sm mb-2">Error ID</h3>
                <code className="text-xs bg-muted px-2 py-1 rounded" data-testid="text-error-id">{error.id}</code>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">Status Code</h3>
                <span className="text-sm" data-testid="text-status-code">{error.status_code || 'N/A'}</span>
              </div>
              {error.endpoint && (
                <div className="col-span-2">
                  <h3 className="font-semibold text-sm mb-2">Endpoint</h3>
                  <code className="text-xs bg-muted px-2 py-1 rounded" data-testid="text-endpoint">{error.endpoint}</code>
                </div>
              )}
              {error.http_method && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">HTTP Method</h3>
                  <Badge variant="outline" data-testid="text-http-method">{error.http_method}</Badge>
                </div>
              )}
            </div>

            {/* User Info */}
            {userInfo && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Affected User
                  </h3>
                  <div className="text-sm space-y-1">
                    <p data-testid="text-user-email">{userInfo.email}</p>
                    {userInfo.full_name && <p className="text-muted-foreground">{userInfo.full_name}</p>}
                  </div>
                </div>
              </>
            )}

            {/* Stack Trace */}
            {error.stack_trace && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-2">Stack Trace</h3>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-48" data-testid="text-stack-trace">
                    {error.stack_trace}
                  </pre>
                </div>
              </>
            )}

            {/* Related Errors */}
            {relatedErrors.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-2">Related Errors (Last 24h)</h3>
                  <div className="space-y-2" data-testid="list-related-errors">
                    {relatedErrors.slice(0, 5).map((relError: any) => (
                      <div key={relError.id} className="text-xs bg-muted p-2 rounded flex justify-between items-center">
                        <span className="truncate flex-1">{relError.message}</span>
                        <span className="text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(relError.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Resolution Status */}
            <Separator />
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Resolution Status</h3>
              {error.resolved_at ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400" data-testid="status-resolved">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">
                    Resolved {formatDistanceToNow(new Date(error.resolved_at), { addSuffix: true })}
                  </span>
                </div>
              ) : error.acknowledged_at ? (
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400" data-testid="status-acknowledged">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    Acknowledged {formatDistanceToNow(new Date(error.acknowledged_at), { addSuffix: true })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400" data-testid="status-new">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Not yet acknowledged</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {!error.resolved_at && (
              <div className="flex gap-2">
                {!error.acknowledged_at && (
                  <Button
                    onClick={() => acknowledgeMutation.mutate()}
                    disabled={acknowledgeMutation.isPending}
                    data-testid="button-acknowledge"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Acknowledge
                  </Button>
                )}
                <Button
                  onClick={() => resolveMutation.mutate()}
                  disabled={resolveMutation.isPending}
                  variant="default"
                  data-testid="button-resolve"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Resolved
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Error not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

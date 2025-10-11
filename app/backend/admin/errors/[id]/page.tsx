'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User, 
  XCircle,
  Calendar,
  Code,
  Globe,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { supabaseBrowser } from '@/lib/database';

interface ErrorDetail {
  id: string;
  error_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  user_message: string;
  status_code?: number;
  endpoint?: string;
  http_method?: string;
  stack_trace?: string;
  user_id?: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

interface UserInfo {
  email: string;
  full_name?: string;
}

interface RelatedError {
  id: string;
  error_type: string;
  message: string;
  severity: string;
  created_at: string;
}

interface ErrorDetailData {
  error: ErrorDetail;
  userInfo?: UserInfo;
  relatedErrors: RelatedError[];
}

export default function AdminErrorDetailPage() {
  const [errorData, setErrorData] = useState<ErrorDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const errorId = params.id as string;

  useEffect(() => {
    if (errorId) {
      loadErrorDetail();
    }
  }, [errorId]);

  const loadErrorDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const session = await supabaseBrowser.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(ADMIN_ENDPOINTS.ERROR_BY_ID(errorId), {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Error not found');
        }
        throw new Error('Failed to fetch error details');
      }

      const data = await response.json();
      if (data.success) {
        setErrorData(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch error details');
      }

    } catch (error: any) {
      setError(error.message);
      addToast({
        type: 'error',
        title: 'Error',
        description: error.message || 'Failed to load error details'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'acknowledge' | 'resolve') => {
    try {
      setUpdating(true);

      const session = await supabaseBrowser.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(ADMIN_ENDPOINTS.ERROR_BY_ID(errorId), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} error`);
      }

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          description: `Error has been ${action}d successfully`
        });
        
        await loadErrorDetail();
      } else {
        throw new Error(data.error || `Failed to ${action} error`);
      }

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        description: error.message || `Failed to ${action} error`
      });
    } finally {
      setUpdating(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge className="bg-destructive text-destructive-foreground">Critical</Badge>;
      case 'HIGH':
        return <Badge className="bg-warning/80 text-warning-foreground">High</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-muted text-muted-foreground">Medium</Badge>;
      case 'LOW':
        return <Badge className="bg-muted/50 text-muted-foreground">Low</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">{severity}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading error details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Details</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="space-x-2">
            <Button onClick={() => router.back()} variant="outline" className="border-border">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={loadErrorDetail} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!errorData) return null;

  const { error: errorDetail, userInfo, relatedErrors } = errorData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => router.back()} 
            variant="outline" 
            size="sm"
            className="border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Error Details</h1>
            <p className="text-muted-foreground">View and manage error information</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getSeverityBadge(errorDetail.severity)}
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUMN 1 */}
        <div className="space-y-6">
          {/* Error Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <AlertCircle className="w-5 h-5 mr-2" />
                Error Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Error ID</label>
                <code className="block text-xs bg-muted px-2 py-1 rounded mt-1" data-testid="text-error-id">
                  {errorDetail.id}
                </code>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Error Type</label>
                <code className="block text-xs bg-muted px-2 py-1 rounded mt-1" data-testid="text-error-type">
                  {errorDetail.error_type}
                </code>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">User Message</label>
                <p className="text-sm text-foreground mt-1" data-testid="text-user-message">
                  {errorDetail.user_message}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Technical Message</label>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto mt-1" data-testid="text-technical-message">
                  {errorDetail.message}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {errorDetail.status_code && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status Code</label>
                    <p className="text-sm text-foreground mt-1" data-testid="text-status-code">
                      {errorDetail.status_code}
                    </p>
                  </div>
                )}
                {errorDetail.http_method && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">HTTP Method</label>
                    <Badge variant="outline" className="mt-1" data-testid="text-http-method">
                      {errorDetail.http_method}
                    </Badge>
                  </div>
                )}
              </div>

              {errorDetail.endpoint && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Endpoint</label>
                  <code className="block text-xs bg-muted px-2 py-1 rounded mt-1" data-testid="text-endpoint">
                    {errorDetail.endpoint}
                  </code>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-foreground" data-testid="text-created-at">
                    {formatDate(errorDetail.created_at)}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    ({formatRelativeTime(errorDetail.created_at)})
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Information */}
          {userInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-foreground">
                  <User className="w-5 h-5 mr-2" />
                  Affected User
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm text-foreground mt-1" data-testid="text-user-email">{userInfo.email}</p>
                </div>
                {userInfo.full_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-sm text-foreground mt-1">{userInfo.full_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stack Trace */}
          {errorDetail.stack_trace && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-foreground">
                  <Code className="w-5 h-5 mr-2" />
                  Stack Trace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-96" data-testid="text-stack-trace">
                  {errorDetail.stack_trace}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* COLUMN 2 */}
        <div className="space-y-6">
          {/* Resolution Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Activity className="w-5 h-5 mr-2" />
                Resolution Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorDetail.resolved_at ? (
                <div className="flex items-center gap-2 text-success" data-testid="status-resolved">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">Resolved</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(errorDetail.resolved_at)}
                    </p>
                  </div>
                </div>
              ) : errorDetail.acknowledged_at ? (
                <div className="flex items-center gap-2 text-warning" data-testid="status-acknowledged">
                  <Clock className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">Acknowledged</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(errorDetail.acknowledged_at)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive" data-testid="status-new">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">Not Acknowledged</p>
                    <p className="text-xs text-muted-foreground">
                      Requires attention
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!errorDetail.resolved_at && (
                <div className="flex flex-col gap-2 pt-4">
                  {!errorDetail.acknowledged_at && (
                    <Button
                      onClick={() => handleAction('acknowledge')}
                      disabled={updating}
                      className="w-full"
                      variant="outline"
                      data-testid="button-acknowledge"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      {updating ? 'Processing...' : 'Acknowledge Error'}
                    </Button>
                  )}
                  <Button
                    onClick={() => handleAction('resolve')}
                    disabled={updating}
                    className="w-full bg-success hover:bg-success/90 text-success-foreground"
                    data-testid="button-resolve"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {updating ? 'Processing...' : 'Mark as Resolved'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Errors */}
          {relatedErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-foreground">
                  <Globe className="w-5 h-5 mr-2" />
                  Related Errors (Last 24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" data-testid="list-related-errors">
                  {relatedErrors.slice(0, 10).map((relError) => (
                    <div 
                      key={relError.id} 
                      className="p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer"
                      onClick={() => router.push(`/backend/admin/errors/${relError.id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <code className="text-xs font-medium text-foreground">{relError.error_type}</code>
                        {getSeverityBadge(relError.severity)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{relError.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(relError.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

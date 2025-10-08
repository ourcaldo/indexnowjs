'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertCircle } from 'lucide-react';

export function SentryIntegration() {
  const sentryDashboardUrl = process.env.NEXT_PUBLIC_SENTRY_DASHBOARD_URL;

  if (!sentryDashboardUrl) {
    return (
      <Card data-testid="card-sentry-integration">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Sentry Error Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sentry dashboard URL not configured. Please set NEXT_PUBLIC_SENTRY_DASHBOARD_URL environment variable.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sentryProjectUrl = sentryDashboardUrl;

  return (
    <Card data-testid="card-sentry-integration">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Sentry Error Tracking
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            asChild
            data-testid="button-open-sentry"
          >
            <a 
              href={sentryProjectUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Sentry
            </a>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Real-time error tracking and performance monitoring powered by Sentry
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-1">Quick Links</h4>
                <div className="space-y-2 mt-2">
                  <a
                    href={`${sentryProjectUrl}/issues/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline block"
                    data-testid="link-sentry-issues"
                  >
                    View All Issues →
                  </a>
                  <a
                    href={`${sentryProjectUrl}/performance/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline block"
                    data-testid="link-sentry-performance"
                  >
                    Performance Monitoring →
                  </a>
                  <a
                    href={`${sentryProjectUrl}/releases/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline block"
                    data-testid="link-sentry-releases"
                  >
                    Release Tracking →
                  </a>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-1">Integration Status</h4>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm">Client-side tracking active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm">Server-side tracking active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm">Performance monitoring enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

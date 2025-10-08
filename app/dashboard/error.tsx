'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trackError } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorBoundaryProps) {
  const router = useRouter();

  useEffect(() => {
    trackError(error, {
      errorDigest: error.digest,
      errorType: 'boundary-caught',
      section: 'dashboard'
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" data-testid="icon-error" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold" data-testid="text-error-title">
            Dashboard Error
          </h2>
          <p className="text-muted-foreground" data-testid="text-error-description">
            Something went wrong with your dashboard. Please try again.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground" data-testid="text-error-id">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default" data-testid="button-retry">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={() => router.push('/')} variant="outline" data-testid="button-home">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

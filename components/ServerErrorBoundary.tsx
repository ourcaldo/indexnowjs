'use client';

import { useEffect } from 'react';
import { trackError } from '@/lib/analytics';
import { Button } from '@/components/ui/button';

/**
 * Server Error Boundary Component
 * Handles errors from Server Components and tracks them in analytics
 */
export default function ServerErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackError(error, {
      errorDigest: error.digest,
      errorType: 'server-component',
      errorName: error.name,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">Something went wrong!</h2>
          <p className="text-muted-foreground">
            We apologize for the inconvenience. Our team has been notified and is working to fix the issue.
          </p>
        </div>
        <Button
          onClick={reset}
          data-testid="button-error-retry"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}

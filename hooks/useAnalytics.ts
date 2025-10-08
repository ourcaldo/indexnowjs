'use client';

import { useCallback } from 'react';
import { trackEvent, identifyUser, resetUser, trackError } from '@/lib/analytics';

/**
 * Custom hook for using analytics in React components
 */
export function useAnalytics() {
  const track = useCallback((event: string, properties?: Record<string, any>) => {
    trackEvent(event, properties);
  }, []);

  const identify = useCallback((userId: string, traits?: Record<string, any>) => {
    identifyUser(userId, traits);
  }, []);

  const reset = useCallback(() => {
    resetUser();
  }, []);

  const error = useCallback((error: Error, context?: Record<string, any>) => {
    trackError(error, context);
  }, []);

  return {
    track,
    identify,
    reset,
    error,
  };
}

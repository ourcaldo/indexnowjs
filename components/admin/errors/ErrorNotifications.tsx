'use client';

import { useCallback } from 'react';
import { useErrorNotifications } from '@/hooks/useGlobalWebSocket';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ErrorNotifications() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  // Memoize callback with stable dependencies
  const handleErrorNotification = useCallback((message: any) => {
    if (message.type === 'critical_error') {
      const error = message.data;
      
      addToast({
        variant: 'destructive',
        title: (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>Critical Error Detected</span>
          </div>
        ),
        description: error.user_message || error.message,
        duration: 15000,
        action: (
          <button
            onClick={() => router.push(`/dashboard/admin/errors?errorId=${error.id}`)}
            className="text-sm font-medium underline underline-offset-4"
          >
            View Details
          </button>
        )
      });
    } else if (message.type === 'error_resolved') {
      const { errorId } = message.data;
      
      addToast({
        title: (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span>Error Resolved</span>
          </div>
        ),
        description: `Error ${errorId.slice(0, 8)}... has been resolved`,
        duration: 5000
      });
    }
  }, [addToast, router]);

  // Only subscribe if user is super_admin
  useErrorNotifications(user?.role === 'super_admin' ? handleErrorNotification : undefined);

  return null;
}

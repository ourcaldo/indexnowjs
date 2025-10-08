import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'
import { DASHBOARD_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export interface DashboardData {
  user: {
    profile: any;
    quota: any;
    settings: any;
    trial: any;
  };
  billing: any;
  indexing: {
    serviceAccounts: number;
  };
  rankTracking: {
    usage: any;
    domains: any[];
    recentKeywords: any[];
  };
  notifications: any[];
}

export const useDashboardData = () => {
  return useQuery({
    queryKey: [DASHBOARD_ENDPOINTS.MAIN],
    queryFn: async (): Promise<DashboardData> => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch(DASHBOARD_ENDPOINTS.MAIN, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        throw new Error(`Dashboard API failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      
      // API now returns: { success: true, data: {...}, timestamp: "..." }
      // Unwrap the data property to maintain compatibility
      if (result.success === true && result.data) {
        return result.data
      }
      
      // Fallback for old format (if any endpoints still use it)
      return result
    },
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}
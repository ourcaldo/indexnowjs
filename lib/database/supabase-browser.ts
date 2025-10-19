import { createBrowserClient } from '@supabase/ssr'

let isHandlingRefreshError = false

async function hardLogout(client: ReturnType<typeof createBrowserClient>) {
  if (isHandlingRefreshError) return
  
  isHandlingRefreshError = true
  
  try {
    // Step 1: Attempt to sign out through Supabase first (clears session server-side)
    try {
      await client.auth.signOut()
    } catch (err) {
      // Continue even if signOut fails
    }
    
    // Step 2: Clear localStorage
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      } catch (err) {
        // Ignore errors
      }
      
      // Step 3: Clear sessionStorage
      try {
        sessionStorage.clear()
      } catch (err) {
        // Ignore errors
      }
      
      // Step 4: Manually delete Supabase cookies
      try {
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const name = cookie.split('=')[0].trim()
          if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth')) {
            // Clear for current domain
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
            
            // Clear for all possible domain variations
            const hostname = window.location.hostname
            const domains = [
              hostname,
              `.${hostname}`,
              hostname.split('.').slice(-2).join('.'),
              `.${hostname.split('.').slice(-2).join('.')}`
            ]
            
            domains.forEach(domain => {
              document.cookie = `${name}=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`
            })
          }
        }
      } catch (err) {
        // Ignore errors
      }
      
      // Step 5: Redirect to appropriate login page
      const currentPath = window.location.pathname
      const isAdminRoute = currentPath.startsWith('/backend/admin')
      const loginPath = isAdminRoute ? '/backend/admin/login' : '/login'
      
      if (!currentPath.includes('/login')) {
        window.location.replace(loginPath)
      }
    }
  } finally {
    setTimeout(() => {
      isHandlingRefreshError = false
    }, 1000)
  }
}

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Listen for auth state changes to catch refresh token failures
  if (typeof window !== 'undefined') {
    client.auth.onAuthStateChange(async (event, session) => {
      // Handle TOKEN_REFRESH_FAILED event (type cast to avoid LSP error with outdated types)
      if (event === 'TOKEN_REFRESH_FAILED' as any) {
        await hardLogout(client)
        return
      }
      
      // Also check for specific error in session
      if (!session) {
        try {
          const { data, error } = await client.auth.getSession()
          
          // Check for "Already Used" error or refresh_token_already_used code
          if (error?.message?.toLowerCase().includes('already used') || 
              (error as any)?.code === 'refresh_token_already_used') {
            await hardLogout(client)
            return
          }
        } catch (err: any) {
          // Check if this is a refresh token error
          if (err?.message?.toLowerCase().includes('already used') || 
              err?.code === 'refresh_token_already_used' ||
              (err?.message?.toLowerCase().includes('refresh') && 
               err?.message?.toLowerCase().includes('token') &&
               (err?.message?.toLowerCase().includes('invalid') || 
                err?.message?.toLowerCase().includes('expired')))) {
            await hardLogout(client)
            return
          }
        }
      }
    })
  }
  
  return client
}

export const supabaseBrowser = createClient()

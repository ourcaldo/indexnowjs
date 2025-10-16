import { createBrowserClient } from '@supabase/ssr'
import { AuthError } from '@supabase/supabase-js'

let refreshErrorCount = 0
const MAX_REFRESH_ERRORS = 2
let isHandlingRefreshError = false

function isRefreshTokenError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error?.message?.toLowerCase() || ''
  const errorCode = error?.code?.toLowerCase() || ''
  
  return (
    errorMessage.includes('refresh') &&
    errorMessage.includes('token') &&
    (errorMessage.includes('invalid') ||
      errorMessage.includes('already used') ||
      errorMessage.includes('expired') ||
      errorMessage.includes('not found') ||
      errorCode.includes('invalid_grant'))
  )
}

async function clearAllAuthData() {
  if (typeof window === 'undefined') return
  
  try {
    // Clear localStorage
    const localStorageKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
        localStorageKeys.push(key)
      }
    }
    localStorageKeys.forEach(key => localStorage.removeItem(key))
    
    // Clear sessionStorage
    const sessionStorageKeys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
        sessionStorageKeys.push(key)
      }
    }
    sessionStorageKeys.forEach(key => sessionStorage.removeItem(key))
    
    // Clear cookies by setting them to expire
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
      
      // Clear any auth-related cookies
      if (name.includes('sb-') || name.includes('supabase') || name.includes('auth')) {
        // Clear for all possible domains
        const domains = [
          window.location.hostname,
          `.${window.location.hostname}`,
          window.location.hostname.split('.').slice(-2).join('.'),
          `.${window.location.hostname.split('.').slice(-2).join('.')}`
        ]
        
        for (const domain of domains) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

async function handleRefreshError() {
  if (isHandlingRefreshError) return
  
  isHandlingRefreshError = true
  
  try {
    await clearAllAuthData()
    
    // Redirect to login after a small delay to ensure cleanup completes
    setTimeout(() => {
      const currentPath = window.location.pathname
      const isAdminRoute = currentPath.startsWith('/backend/admin')
      const loginPath = isAdminRoute ? '/backend/admin/login' : '/login'
      
      if (!currentPath.includes('/login')) {
        window.location.href = loginPath
      }
      
      isHandlingRefreshError = false
    }, 100)
  } catch (e) {
    isHandlingRefreshError = false
  }
}

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Add auth state change listener to detect refresh token errors
  if (typeof window !== 'undefined') {
    client.auth.onAuthStateChange((event, session) => {
      // Reset error count on successful token refresh
      if (event === 'TOKEN_REFRESHED' && session) {
        refreshErrorCount = 0
      }
      
      // Handle sign out
      if (event === 'SIGNED_OUT') {
        refreshErrorCount = 0
      }
    })
    
    // Monitor for refresh token errors using error event
    const originalGetSession = client.auth.getSession.bind(client.auth)
    client.auth.getSession = async function(...args) {
      try {
        const result = await originalGetSession(...args)
        
        // Reset error count on successful session retrieval
        if (result.data.session) {
          refreshErrorCount = 0
        }
        
        return result
      } catch (error: any) {
        if (isRefreshTokenError(error)) {
          refreshErrorCount++
          
          if (refreshErrorCount >= MAX_REFRESH_ERRORS) {
            await handleRefreshError()
            
            // Return error result
            return { data: { session: null }, error: error as AuthError }
          }
        }
        
        throw error
      }
    }
  }
  
  return client
}

export const supabaseBrowser = createClient()

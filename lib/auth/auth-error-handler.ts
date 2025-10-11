import { supabase } from '@/lib/database'

export interface AuthErrorContext {
  error: any
  event?: string
  session?: any
}

export class AuthErrorHandler {
  private static readonly REFRESH_TOKEN_ERRORS = [
    'refresh_token_already_used',
    'invalid_refresh_token',
    'refresh_token_not_found'
  ]

  static isRefreshTokenError(error: any): boolean {
    if (!error) return false
    
    const errorCode = error?.code || error?.error_code || error?.error?.code
    const errorMessage = error?.message || error?.error?.message || ''
    
    return (
      this.REFRESH_TOKEN_ERRORS.includes(errorCode) ||
      this.REFRESH_TOKEN_ERRORS.some(code => errorMessage.toLowerCase().includes(code))
    )
  }

  static async clearAuthState(): Promise<void> {
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch (e) {
      // Ignore errors during signout
    }

    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      } catch (e) {
        // Ignore localStorage errors
      }

      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key))
      } catch (e) {
        // Ignore sessionStorage errors
      }
    }
  }

  static async handleRefreshTokenError(context: AuthErrorContext): Promise<void> {
    if (!this.isRefreshTokenError(context.error)) {
      return
    }

    await this.clearAuthState()

    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      const isAdminRoute = currentPath.startsWith('/backend/admin')
      const loginPath = isAdminRoute ? '/backend/admin/login' : '/login'
      
      if (!currentPath.includes('/login')) {
        window.location.href = loginPath
      }
    }
  }

  static createAuthStateChangeHandler(
    onSuccess?: (session: any) => void,
    onSignOut?: () => void
  ) {
    let refreshFailCount = 0
    const maxRefreshFails = 3

    return async (event: string, session: any) => {
      if (event === 'TOKEN_REFRESHED') {
        refreshFailCount = 0
        if (onSuccess && session) {
          onSuccess(session)
        }
        return
      }

      if (event === 'SIGNED_OUT') {
        refreshFailCount = 0
        await this.clearAuthState()
        if (onSignOut) {
          onSignOut()
        } else if (typeof window !== 'undefined') {
          window.location.reload()
        }
        return
      }

      if (event === 'USER_UPDATED' && !session) {
        refreshFailCount++
        if (refreshFailCount >= maxRefreshFails) {
          await this.handleRefreshTokenError({
            error: { code: 'refresh_token_already_used' },
            event,
            session
          })
        }
        return
      }
    }
  }
}

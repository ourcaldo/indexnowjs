import { supabase } from '../database/supabase'
import { User } from '@supabase/supabase-js'
import { AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export interface AuthUser {
  id: string
  email: string | undefined
  name?: string
  emailVerification?: boolean
}

export class AuthService {
  private isInitialized = false
  private userCache: { user: AuthUser | null; timestamp: number } | null = null
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  
  private isUserCacheValid(): boolean {
    if (!this.userCache) return false
    return Date.now() - this.userCache.timestamp < this.CACHE_DURATION
  }

  private setCacheUser(user: AuthUser | null): void {
    this.userCache = {
      user,
      timestamp: Date.now()
    }
  }

  private clearUserCache(): void {
    this.userCache = null
  }

  // Removed getCookieDomain() and getCookieSecurityAttributes() methods
  // All cookie management is now handled securely on the server-side

  async getUserRole(user: User): Promise<string> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.PROFILE, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const profile = await response.json()
        return profile.role || 'user'
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error)
    }
    
    return 'user' // Default role
  }

  getSubdomainRedirectUrl(role: string): string {
    if (typeof window === 'undefined') return '/dashboard'
    
    // Determine target URL based on role using environment variables
    const targetUrl = role === 'admin' || role === 'super_admin' 
      ? process.env.NEXT_PUBLIC_BACKEND_URL 
      : process.env.NEXT_PUBLIC_DASHBOARD_URL
    
    // Return environment URL if available, otherwise fallback to path
    return targetUrl || '/dashboard'
  }

  private async initializeAuth() {
    if (this.isInitialized || typeof window === 'undefined') {
      return
    }
    
    try {
      // Server-side cookies are handled automatically by Supabase SSR
      // No manual cookie manipulation needed
      
      // Check if we need to restore from localStorage for migration
      const supabaseToken = localStorage.getItem('sb-base-auth-token')
      if (supabaseToken) {
        try {
          const authData = JSON.parse(supabaseToken)
          const accessToken = authData?.access_token
          const refreshToken = authData?.refresh_token

          if (accessToken && refreshToken) {
            // Send tokens to server for secure cookie setting
            await fetch(AUTH_ENDPOINTS.SESSION, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken
              }),
              credentials: 'include'
            })
            
            // Clear localStorage after migration to cookies
            localStorage.removeItem('sb-base-auth-token')
          }
        } catch (e) {
          console.log('Failed to migrate auth token from localStorage')
        }
      }
      
      this.isInitialized = true
    } catch (error) {
      console.error('Auth initialization error:', error)
      this.isInitialized = true
    }
  }

  async getCurrentUser(useCache: boolean = true): Promise<AuthUser | null> {
    try {
      // Use cached user if valid and caching is enabled
      if (useCache && this.isUserCacheValid() && this.userCache) {
        return this.userCache.user
      }

      await this.initializeAuth()
      
      const { data: { user }, error } = await supabase.auth.getUser()
      
      let authUser: AuthUser | null = null
      
      if (!error && user) {
        authUser = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name,
          emailVerification: user.email_confirmed_at ? true : false,
        }
      }
      
      // Update cache with the result
      this.setCacheUser(authUser)
      
      return authUser
    } catch (error) {
      console.error('Get current user error:', error)
      this.clearUserCache()
      return null
    }
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    // Transfer session to server-side secure HttpOnly cookies only
    if (data.session) {
      // Send tokens to server for secure cookie setting
      await fetch(AUTH_ENDPOINTS.SESSION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        }),
        credentials: 'include'
      })
      
      // Force cache refresh after successful login
      this.clearUserCache()
    }

    return data
  }

  async signUp(email: string, password: string, fullName: string, phoneNumber?: string, country?: string) {
    const response = await fetch(AUTH_ENDPOINTS.REGISTER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        name: fullName,
        email,
        password,
        confirmPassword: password,
        phoneNumber: phoneNumber || '',
        country: country || ''
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Registration failed')
    }

    return result.data
  }

  async signOut() {
    // Clear user cache
    this.clearUserCache()
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }
    
    // Clear secure server-side session and cookies
    try {
      await fetch(AUTH_ENDPOINTS.SESSION, {
        method: 'DELETE',
        credentials: 'include'
      })
    } catch (e) {
      // Ignore fetch errors during signout
    }
  }

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      throw error
    }
  }

  async createMagicLink(email: string, redirectTo: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      throw error
    }
  }

  onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      // Clear cache on any auth state change
      this.clearUserCache()
      
      if (session?.user) {
        callback(session.user)
      } else {
        callback(null)
      }
    })
  }

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }

    return session
  }
}

export const authService = new AuthService()
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService, AuthUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'

// Global auth state to persist across route changes
let globalAuthState: {
  user: AuthUser | null
  isAuthenticated: boolean
  isInitialized: boolean
  promise: Promise<AuthUser | null> | null
} = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  promise: null
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  authChecked: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const signOut = async () => {
    try {
      await authService.signOut()
      setUser(null)
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const refreshAuth = async () => {
    // For the simple pattern, just refetch current user
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Refresh auth error:', error)
      setUser(null)
    }
  }

  useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    // Initial session load
    authService.getCurrentUser().then((currentUser) => {
      setUser(currentUser)
      setLoading(false)
      setAuthChecked(true)

      // Only redirect to login if we're not on a public route
      if (!currentUser && typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        
        // Define protected routes that require authentication
        const protectedRoutes = ['/dashboard']
        const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route))
        
        // Don't redirect if on admin routes (handled by admin middleware)
        const isAdminRoute = currentPath.startsWith('/backend/admin')
        
        if (isProtectedRoute && !isAdminRoute) {
          router.push('/login')
        }
      }
    });

    // Listen for login/logout
    const { data: { subscription } } = authService.onAuthStateChange(async (supabaseUser) => {
      if (!supabaseUser) {
        setUser(null)
        setLoading(false)
        setAuthChecked(true)
        
        // Only redirect if on protected route
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          
          // Define protected routes that require authentication
          const protectedRoutes = ['/dashboard']
          const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route))
          
          // Don't redirect if on admin routes (handled by admin middleware)
          const isAdminRoute = currentPath.startsWith('/backend/admin')
          
          if (isProtectedRoute && !isAdminRoute) {
            router.push('/login')
          }
        }
      } else {
        // Convert Supabase user to AuthUser format
        const authUser: AuthUser = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: (supabaseUser as any).user_metadata?.full_name,
          emailVerification: (supabaseUser as any).email_confirmed_at ? true : false,
        }
        
        setUser(authUser)
        setLoading(false)
        setAuthChecked(true)
      }
    })

    return () => subscription?.unsubscribe();
  }, [initialized])

  const isAuthenticated = authChecked && !loading && !!user

  const value: AuthContextType = {
    user,
    loading,
    authChecked,
    isAuthenticated,
    signOut,
    refreshAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
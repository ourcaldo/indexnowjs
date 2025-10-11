'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react'
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'
import { ADMIN_ENDPOINTS, AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(true) // Always use full logo for admin login
  useFavicon() // Automatically updates favicon

  useEffect(() => {
    let refreshFailCount = 0
    const maxRefreshFails = 3
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (event === 'TOKEN_REFRESHED') {
        refreshFailCount = 0
      }
      
      if (event === 'SIGNED_OUT') {
        await supabase.auth.signOut()
        window.location.reload()
      }
      
      if (event === 'USER_UPDATED' && !session) {
        refreshFailCount++
        if (refreshFailCount >= maxRefreshFails) {
          await supabase.auth.signOut()
          window.location.reload()
        }
      }
    })

    const checkExistingAuth = async () => {
      try {
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 1500)
        )

        const authCheck = supabase.auth.getSession()
        
        const result = await Promise.race([authCheck, timeout]) as any
        
        const session = result?.data?.session
        
        if (!session || !session.access_token) {
          return
        }

        const response = await fetch(ADMIN_ENDPOINTS.VERIFY_ROLE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ userId: session.user.id }),
          credentials: 'include'
        })

        const roleData = await response.json()

        if (response.ok && roleData.success && roleData.data?.isSuperAdmin) {
          window.location.href = '/'
          return
        }

        if (response.ok && roleData.success && !roleData.data?.isSuperAdmin) {
          setError('Access denied: Super Admin privileges required. This area is restricted to Super Admins only.')
          return
        }

      } catch (error) {
        // Silent fail - just show login form
      }
    }

    checkExistingAuth()
    
    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Step 1: Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Authentication failed')
      }

      // Step 2: Verify admin role using direct API call with Bearer token
      const response = await fetch(ADMIN_ENDPOINTS.VERIFY_ROLE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`
        },
        body: JSON.stringify({
          userId: authData.user.id
        }),
        credentials: 'include'
      })

      const roleData = await response.json()

      if (!response.ok || !roleData.success) {
        // Sign out if not admin
        await supabase.auth.signOut()
        throw new Error(roleData.error || 'Access denied: Admin privileges required')
      }

      // Step 3: Verify user is SUPER ADMIN (not just admin)
      if (!roleData.data?.isSuperAdmin) {
        await supabase.auth.signOut()
        throw new Error('Access denied: Super Admin privileges required. This area is restricted to Super Admins only.')
      }

      // Step 4: Set admin session
      await fetch(AUTH_ENDPOINTS.SESSION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token
        }),
        credentials: 'include'
      })

      window.location.href = '/'
      
    } catch (error: any) {
      setError(error.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-foreground rounded-full flex items-center justify-center">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Admin Logo"
                className="w-12 h-12 object-contain filter brightness-0 invert"
              />
            )}
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Admin Access
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in with admin credentials to access the dashboard
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="border-border focus:border-accent focus:ring-accent"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="border-border focus:border-accent focus:ring-accent pr-10"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In to Admin Dashboard'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Only users with admin privileges can access this area
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
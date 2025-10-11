'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { adminAuthService, AdminUser } from '@/lib/auth'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ToastContainer } from '@/components/ui/toast'

// Cookie utilities for sidebar state persistence
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

const setCookie = (name: string, value: string, days: number = 30) => {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasInsufficientRole, setHasInsufficientRole] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [cookiesLoaded, setCookiesLoaded] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Check if we're on the login page
  const isLoginPage = pathname === '/backend/admin/login'

  useEffect(() => {
    // Skip auth check for login page
    if (isLoginPage) {
      setIsLoading(false)
      return
    }
    checkAdminAccess()
  }, [router, isLoginPage])

  // Load sidebar state from cookies
  useEffect(() => {
    // Load sidebar state from cookies
    const savedCollapsedState = getCookie('admin-sidebar-collapsed')
    if (savedCollapsedState !== null) {
      setSidebarCollapsed(savedCollapsedState === 'true')
    }
    setCookiesLoaded(true)
  }, [])
  
  // Save sidebar state to cookies when it changes
  useEffect(() => {
    if (cookiesLoaded) {
      setCookie('admin-sidebar-collapsed', sidebarCollapsed.toString())
    }
  }, [sidebarCollapsed, cookiesLoaded])

  const checkAdminAccess = async () => {
    try {
      const user = await adminAuthService.getCurrentAdminUser()
      
      if (!user) {
        // No user authenticated - redirect to login
        router.push('/backend/admin/login')
        return
      }

      if (!user.isSuperAdmin) {
        // User is authenticated but NOT super admin - show error page
        setHasInsufficientRole(true)
        setIsLoading(false)
        return
      }

      setAdminUser(user)
    } catch (error) {
      console.error('Admin access check failed:', error)
      router.push('/backend/admin/login')
    } finally {
      setIsLoading(false)
    }
  }

  // For login page, render without sidebar
  if (isLoginPage) {
    return children
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Show error page for authenticated users without super_admin role
  if (hasInsufficientRole) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-background rounded-lg border border-border p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Access Denied
          </h1>
          <p className="text-muted-foreground mb-6">
            This area is restricted to Super Admin users only. Your account does not have sufficient privileges to access the backend administration panel.
          </p>
          <div className="space-y-3">
            <button
              onClick={async () => {
                await adminAuthService.signOut?.() || (window.location.href = '/login')
              }}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Sign Out
            </button>
            <button
              onClick={() => window.location.href = process.env.NEXT_PUBLIC_DASHBOARD_URL || '/dashboard'}
              className="w-full px-4 py-2 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!adminUser?.isSuperAdmin) {
    return null
  }

  return (
    <ToastContainer>
      <div className="min-h-screen bg-secondary">
        <AdminSidebar 
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          user={adminUser}
          isCollapsed={sidebarCollapsed}
        />
        
        <div className={`transition-all duration-200 ${
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        } ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <main className="p-6">
            {children}
          </main>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </ToastContainer>
  )
}
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
      
      if (!user?.isSuperAdmin) {
        // Redirect to admin login if not authenticated or not super admin
        router.push('/backend/admin/login')
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
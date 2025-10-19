'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import SkeletonSidebar from '@/components/SkeletonSidebar'
import { useAuth } from '@/lib/contexts/AuthContext'
import { ToastContainer } from '@/components/ui/toast'
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'
import QuotaNotification from '@/components/QuotaNotification'
import ServiceAccountQuotaNotification from '@/components/ServiceAccountQuotaNotification'
import QueryProvider from '@/components/QueryProvider'
import { DomainProvider, useDomain } from '@/lib/contexts/DomainContext'
import { SharedDomainSelector } from '@/components/shared/DomainSelector'

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


function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  // Use ONLY global auth context
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [cookiesLoaded, setCookiesLoaded] = useState(false)
  
  // Use domain context instead of local state
  const {
    domains,
    selectedDomainId,
    selectedDomainInfo,
    setSelectedDomainId,
    getDomainKeywordCount,
    isDomainSelectorOpen,
    setIsDomainSelectorOpen
  } = useDomain()
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(!sidebarCollapsed) // Use expanded logo when sidebar is not collapsed
  const iconUrl = useSiteLogo(false) // Always get icon for mobile header
  useFavicon() // Automatically updates favicon

  // Prevent hydration mismatch and load sidebar state from cookies
  useEffect(() => {
    setMounted(true)
    
    // Load sidebar state from cookies
    const savedCollapsedState = getCookie('sidebar-collapsed')
    if (savedCollapsedState !== null) {
      setSidebarCollapsed(savedCollapsedState === 'true')
    }
    setCookiesLoaded(true)
  }, [])
  
  // Save sidebar state to cookies when it changes
  useEffect(() => {
    if (cookiesLoaded) {
      setCookie('sidebar-collapsed', sidebarCollapsed.toString())
    }
  }, [sidebarCollapsed, cookiesLoaded])

  // Check if we're on pages that should be full-width (no sidebar)
  const isFullWidthPage = mounted && typeof window !== 'undefined' && (
    window.location.pathname === '/auth/login' ||
    window.location.pathname.includes('/dashboard/settings/plans-billing/checkout') ||
    window.location.pathname.includes('/dashboard/settings/plans-billing/orders')
  )
  

  // Check if we're on a full-width page
  if (isFullWidthPage) {
    return (
      <ToastContainer>
        <div className="min-h-screen bg-secondary">
          {children}
        </div>
      </ToastContainer>
    )
  }

  // Show loading only while auth is checking
  if (loading) {
    return (
      <ToastContainer>
          <div className="min-h-screen bg-secondary">
            {/* Skeleton Sidebar */}
            <SkeletonSidebar isCollapsed={sidebarCollapsed} />

            {/* Main content area */}
            <div className={`transition-all duration-300 ml-0 ${
              sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
            }`}>
              {/* Mobile header skeleton */}
              <div className="lg:hidden bg-background border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-6 h-6 bg-muted rounded animate-pulse flex-shrink-0"></div>
                  <div className="h-5 bg-muted rounded w-32 animate-pulse"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 bg-muted rounded-lg animate-pulse"></div>
                  <div className="w-9 h-9 bg-muted rounded-md animate-pulse"></div>
                </div>
              </div>
              
              {/* Page content skeleton */}
              <main className="p-6">
                <div className="space-y-8">
                  {/* Main content skeleton */}
                  <div className="bg-background rounded-xl border border-border p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-muted rounded-full animate-pulse"></div>
                        <div>
                          <div className="h-5 bg-muted rounded w-48 mb-2 animate-pulse"></div>
                          <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="w-20 h-8 bg-muted rounded-full animate-pulse"></div>
                    </div>
                    <div className="grid md:grid-cols-4 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-secondary rounded-lg p-4 border border-border">
                          <div className="h-3 bg-muted rounded w-20 mb-2 animate-pulse"></div>
                          <div className="h-6 bg-muted rounded w-12 animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Additional content skeleton */}
                  <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-background rounded-xl border border-border p-6">
                        <div className="h-6 bg-muted rounded w-48 mb-6 animate-pulse"></div>
                        <div className="space-y-3">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-border">
                              <div className="flex-1">
                                <div className="h-4 bg-muted rounded w-1/3 mb-2 animate-pulse"></div>
                                <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                              </div>
                              <div className="h-6 bg-muted rounded w-12 animate-pulse"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-background rounded-xl border border-border p-6">
                        <div className="h-5 bg-muted rounded w-24 mb-4 animate-pulse"></div>
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </ToastContainer>
    )
  }

  // Main dashboard layout
  return (
    <ToastContainer>
      <div className="min-h-screen bg-secondary">
        {/* Sidebar */}
        <Sidebar 
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onCollapse={() => {
              const newState = !sidebarCollapsed
              setSidebarCollapsed(newState)
              setCookie('sidebar-collapsed', newState.toString())
            }}
            user={user}
            isCollapsed={sidebarCollapsed}
            domains={domains}
            selectedDomainId={selectedDomainId}
            selectedDomainInfo={selectedDomainInfo}
            onDomainSelect={setSelectedDomainId}
            getDomainKeywordCount={getDomainKeywordCount}
            isDomainSelectorOpen={isDomainSelectorOpen}
            onDomainSelectorToggle={() => setIsDomainSelectorOpen(!isDomainSelectorOpen)}
          />

          {/* Main content area */}
          <div className={`transition-all duration-300 ml-0 ${
            sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
          }`}>
            {/* Desktop header (hidden on mobile) */}
            <div className="hidden lg:flex bg-background border-b border-border px-6 py-3 items-center justify-between">
              {/* Left side: Domain Selector */}
              <div className="flex-1">
                {domains.length > 0 && (
                  <SharedDomainSelector
                    domains={domains}
                    selectedDomainId={selectedDomainId}
                    selectedDomainInfo={selectedDomainInfo}
                    isOpen={isDomainSelectorOpen}
                    onToggle={() => setIsDomainSelectorOpen(!isDomainSelectorOpen)}
                    onDomainSelect={setSelectedDomainId}
                    getDomainKeywordCount={getDomainKeywordCount}
                    showKeywordCount={true}
                    className="w-[320px]"
                    addDomainRoute="/dashboard/indexnow/add"
                    placeholder="Select domain"
                  />
                )}
              </div>
              
              {/* Right side: Notification + Add Keywords Button */}
              <div className="flex items-center space-x-2">
                <button className="p-2 rounded-lg transition-colors duration-150 bg-secondary text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                <button
                  onClick={() => router.push('/dashboard/indexnow/add')}
                  className="inline-flex items-center px-4 py-2 rounded-lg transition-colors duration-150 bg-primary text-primary-foreground hover:bg-primary/90"
                  aria-label="Add Keywords"
                  data-testid="button-add-keywords-header-desktop"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Keywords
                </button>
              </div>
            </div>

            {/* Mobile header */}
            <div className="lg:hidden bg-background border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {iconUrl && (
                  <img 
                    src={iconUrl} 
                    alt="Icon"
                    className="w-6 h-6 rounded flex-shrink-0"
                  />
                )}
                <h1 className="text-lg font-semibold text-foreground truncate">{siteName}</h1>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 rounded-lg transition-colors duration-150 bg-secondary text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                <button
                  onClick={() => router.push('/dashboard/indexnow/add')}
                  className="p-2 rounded-lg transition-colors duration-150 bg-primary text-primary-foreground hover:bg-primary/90"
                  aria-label="Add Keywords"
                  data-testid="button-add-keywords-header"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-md text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-150 flex-shrink-0"
                  aria-label="Mobile Menu"
                  data-testid="button-toggle-sidebar"
                >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                </button>
              </div>
            </div>

            {/* Service Account Quota Notification */}
            <ServiceAccountQuotaNotification />
            
            {/* Page content */}
            <main className="p-6">
              {children}
            </main>
          </div>
          
          {/* Quota Notifications */}
          <QuotaNotification />
          
          {/* Error Notifications (Admin only) */}
        </div>
      </ToastContainer>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryProvider>
      <DomainProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </DomainProvider>
    </QueryProvider>
  )
}
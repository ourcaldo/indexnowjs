'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Zap,
  Plus,
  FileText,
  Settings,
  X,
  LogOut,
  User,
  Menu,
  Activity,
  TrendingUp,
  Search,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSiteName, useSiteLogo } from '@/hooks/use-site-settings'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'
import { SharedDomainSelector } from '@/components/shared/DomainSelector'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  onCollapse?: () => void
  user?: any
  isCollapsed?: boolean
  domains?: any[]
  selectedDomainId?: string | null
  selectedDomainInfo?: any
  onDomainSelect?: (id: string) => void
  getDomainKeywordCount?: (domainId: string) => number
  isDomainSelectorOpen?: boolean
  onDomainSelectorToggle?: () => void
}

const Sidebar = ({ 
  isOpen, 
  onToggle, 
  onCollapse, 
  user, 
  isCollapsed = false,
  domains = [],
  selectedDomainId = null,
  selectedDomainInfo,
  onDomainSelect,
  getDomainKeywordCount,
  isDomainSelectorOpen = false,
  onDomainSelectorToggle
}: SidebarProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(!isCollapsed) // Full logo when expanded, icon when collapsed  
  const iconUrl = useSiteLogo(false) // Always get icon for mobile header and collapsed state
  
  // Get all dashboard data from merged endpoint
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData()
  
  // Extract data from dashboard response
  const userProfile = dashboardData?.user?.profile
  const keywordUsage = dashboardData?.rankTracking?.usage
  const packagesData = dashboardData?.billing
  const detailedUserProfile = dashboardData?.user?.profile
  const keywordLoading = dashboardLoading

  const handleLogout = async () => {
    try {
      await authService.signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Navigation sections structured like admin sidebar
  const navigationSections = [
    {
      title: 'DASHBOARD',
      items: [
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          active: pathname === '/dashboard'
        }
      ]
    },
    {
      title: 'KEYWORD TRACKER',
      items: [
        {
          label: 'Overview',
          href: '/dashboard/indexnow/overview',
          icon: Activity,
          active: pathname === '/dashboard/indexnow/overview'
        },
        {
          label: 'Rank History',
          href: '/dashboard/indexnow/rank-history',
          icon: TrendingUp,
          active: pathname === '/dashboard/indexnow/rank-history'
        }
      ]
    },
    {
      title: 'TOOLS',
      items: [
        {
          label: 'New Index',
          href: '/dashboard/tools/fastindexing',
          icon: Plus,
          active: pathname === '/dashboard/tools/fastindexing'
        },
        {
          label: 'Manage Jobs',
          href: '/dashboard/tools/fastindexing/manage-jobs',
          icon: FileText,
          active: pathname === '/dashboard/tools/fastindexing/manage-jobs'
        }
      ]
    }
  ]

  // Dashboard sidebar should only show user-facing features
  // Admin functionality is now accessible via backend.domain.com subdomain
  const allSections = navigationSections

  // Filter navigation items based on search query
  const filteredSections = allSections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      searchQuery === '' || item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0)

  const renderMenuItem = (item: any) => {
    return (
      <div key={item.label} className="relative group">
        <a
          href={item.href}
          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            item.active
              ? isCollapsed 
                ? 'bg-primary/10 text-primary' 
                : 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-slate-50'
          }`}
        >
          <item.icon className={`${isCollapsed ? 'mr-0' : 'mr-3'} h-5 w-5 flex-shrink-0 ${
            item.active 
              ? isCollapsed 
                ? 'text-primary' 
                : 'text-primary-foreground' 
              : 'text-muted-foreground group-hover:text-primary'
          }`} />
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </a>
        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-foreground text-background text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-xl" style={{ zIndex: 99999 }}>
            {item.label}
            <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-foreground"></div>
          </div>
        )}
      </div>
    )
  }

  const renderSection = (section: any) => {
    if (isCollapsed) {
      return section.items.map((item: any) => renderMenuItem(item))
    }

    return (
      <div key={section.title} className="mb-6">
        <div className="px-3 mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {section.title}
          </p>
        </div>
        <div className="space-y-1">
          {section.items.map((item: any) => renderMenuItem(item))}
        </div>
      </div>
    )
  }

  // Render skeleton content until mounted to prevent hydration mismatch
  const isLoading = !mounted

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`fixed left-0 top-0 z-50 h-full bg-background border-r border-border transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      } hidden md:block`} style={isCollapsed ? { touchAction: 'none', userSelect: 'none' } : {}}>
        <div className="flex flex-col h-full">
          {/* Header with Logo/Brand */}
          <div className={`px-4 py-5 ${
            isCollapsed ? 'flex flex-col items-center space-y-4' : 'flex items-center justify-between'
          }`}>
            <div className="flex items-center">
              {isLoading ? (
                <div className={`bg-muted animate-pulse rounded ${
                  isCollapsed ? 'h-8 w-8' : 'h-12 w-24'
                }`}></div>
              ) : logoUrl && (
                <img 
                  src={logoUrl} 
                  alt={isCollapsed ? 'Icon' : 'Logo'}
                  className={isCollapsed ? "h-8 w-8 object-contain" : "object-contain"}
                  style={!isCollapsed ? { width: '106.664px', height: '60px' } : { width: '32px', height: '32px' }}
                />
              )}
            </div>
            <button 
              onClick={onCollapse}
              className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-muted-foreground transition-colors duration-150"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Search Bar */}
          {!isCollapsed && (
            <div className="px-4 mb-6">
              {isLoading ? (
                <div className="h-10 bg-muted animate-pulse rounded-lg"></div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <kbd className="px-2 py-0.5 text-xs bg-border text-muted-foreground rounded border">⌘K</kbd>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className={`flex-1 px-4 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
            {isLoading ? (
              // Skeleton navigation while loading
              <div className="space-y-6">
                <div className="space-y-1">
                  {!isCollapsed && <div className="px-3 mb-3"><div className="h-3 w-20 bg-muted animate-pulse rounded"></div></div>}
                  <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
                </div>
                <div className="space-y-1">
                  {!isCollapsed && <div className="px-3 mb-3"><div className="h-3 w-32 bg-muted animate-pulse rounded"></div></div>}
                  <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
                  <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
                </div>
                <div className="space-y-1">
                  {!isCollapsed && <div className="px-3 mb-3"><div className="h-3 w-16 bg-muted animate-pulse rounded"></div></div>}
                  <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
                  <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
                </div>
              </div>
            ) : (
              filteredSections.map(section => renderSection(section))
            )}
          </nav>

          {/* Upgrade Section */}
          {!isCollapsed && (
            <div className="px-4 py-4">
              {isLoading ? (
                <div className="bg-muted animate-pulse rounded-xl h-32"></div>
              ) : (
                <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-primary-foreground">
                {(() => {
                  const hasActivePackage = detailedUserProfile?.profile?.package || packagesData?.current_package_id
                  const isLoading = keywordLoading || !detailedUserProfile || !packagesData
                  
                  return (
                    <>
                      <div className="flex items-center mb-2">
                        <Zap className="h-5 w-5 mr-2" />
                        <span className="text-sm font-semibold">
                          {isLoading ? 'Loading...' : hasActivePackage ? 'Usage Limit' : 'No Active Package'}
                        </span>
                      </div>
                      <div className="mb-3">
                        {isLoading ? (
                          <div className="text-xs text-primary-foreground/80 mb-1">Loading...</div>
                        ) : !hasActivePackage ? (
                          <div className="text-xs text-primary-foreground/80 mb-1">No Active Package found</div>
                        ) : (
                          <>
                            <div className="text-xs text-primary-foreground/80 mb-1">
                              {keywordUsage?.is_unlimited 
                                ? `${keywordUsage.keywords_used?.toLocaleString() || 0} Keywords Used`
                                : `${keywordUsage?.keywords_used?.toLocaleString() || 0}/${keywordUsage?.keywords_limit?.toLocaleString() || 0} Keywords`
                              }
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-2">
                              <div 
                                className="bg-white rounded-full h-2 transition-all duration-300" 
                                style={{ 
                                  width: keywordUsage?.is_unlimited 
                                    ? '100%' 
                                    : `${Math.min(100, ((keywordUsage?.keywords_used || 0) / (keywordUsage?.keywords_limit || 1)) * 100)}%`
                                }}
                              ></div>
                            </div>
                          </>
                        )}
                      </div>
                      <a 
                        href="/dashboard/settings/plans-billing"
                        className="w-full bg-background text-primary text-sm font-semibold py-2 px-3 rounded-lg hover:bg-secondary transition-colors block text-center"
                      >
                        {!hasActivePackage ? 'Subscribe now →' : 'Upgrade plan →'}
                      </a>
                    </>
                  )
                })()}
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          <div className="px-4 pb-2">
            {isLoading ? (
              <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
            ) : (
              <div className="relative group">
                <a
                  href="/dashboard/settings"
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    pathname === '/dashboard/settings'
                      ? isCollapsed 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Settings className={`${isCollapsed ? 'mr-0' : 'mr-3'} h-5 w-5 flex-shrink-0 ${
                    pathname === '/dashboard/settings'
                      ? isCollapsed 
                        ? 'text-primary' 
                        : 'text-primary-foreground' 
                      : 'text-muted-foreground group-hover:text-primary'
                  }`} />
                  {!isCollapsed && <span className="truncate">Settings</span>}
                </a>
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-foreground text-background text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-xl" style={{ zIndex: 99999 }}>
                    Settings
                    <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-foreground"></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Section */}
          <div className="border-t border-border p-4">
            {isLoading ? (
              <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-2.5 text-sm font-medium text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
              >
                <LogOut className={`${isCollapsed ? 'mr-0' : 'mr-2'} h-4 w-4 flex-shrink-0`} />
                {!isCollapsed && <span>Sign out</span>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed left-0 top-0 z-50 h-full w-80 bg-background shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Mobile Header with Close Button */}
          <div className="flex items-center justify-between px-6 py-4 bg-secondary border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
            <button 
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Domain Selector (Mobile Only) */}
          {domains.length > 0 && onDomainSelect && (
            <div className="px-6 py-4 bg-secondary border-b border-border">
              {isLoading ? (
                <div className="h-12 bg-muted animate-pulse rounded-xl"></div>
              ) : (
                <SharedDomainSelector
                  domains={domains}
                  selectedDomainId={selectedDomainId}
                  selectedDomainInfo={selectedDomainInfo}
                  isOpen={isDomainSelectorOpen}
                  onToggle={onDomainSelectorToggle || (() => {})}
                  onDomainSelect={onDomainSelect}
                  getDomainKeywordCount={getDomainKeywordCount}
                  showKeywordCount={true}
                  addDomainRoute="/dashboard/indexnow/add"
                  placeholder="Select Domain"
                  className="w-full"
                />
              )}
            </div>
          )}

          {/* Search Bar */}
          <div className="px-6 py-4 bg-secondary">
            {isLoading ? (
              <div className="h-12 bg-muted animate-pulse rounded-xl"></div>
            ) : (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search navigation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors shadow-sm"
                />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 overflow-y-auto">
            {isLoading ? (
              // Skeleton navigation while loading
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="px-3 mb-3"><div className="h-3 w-20 bg-muted animate-pulse rounded"></div></div>
                  <div className="h-12 bg-muted animate-pulse rounded-xl"></div>
                </div>
                <div className="space-y-2">
                  <div className="px-3 mb-3"><div className="h-3 w-32 bg-muted animate-pulse rounded"></div></div>
                  <div className="h-12 bg-muted animate-pulse rounded-xl"></div>
                  <div className="h-12 bg-muted animate-pulse rounded-xl"></div>
                </div>
                <div className="space-y-2">
                  <div className="px-3 mb-3"><div className="h-3 w-16 bg-muted animate-pulse rounded"></div></div>
                  <div className="h-12 bg-muted animate-pulse rounded-xl"></div>
                  <div className="h-12 bg-muted animate-pulse rounded-xl"></div>
                </div>
              </div>
            ) : (
              filteredSections.map(section => renderSection(section))
            )}
          </nav>

          {/* Settings */}
          <div className="px-4 pb-2">
            {isLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded-lg"></div>
            ) : (
              <a
                href="/dashboard/settings"
                onClick={onToggle}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  pathname === '/dashboard/settings'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-slate-50'
                }`}
              >
                <Settings className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  pathname === '/dashboard/settings'
                    ? 'text-primary-foreground' 
                    : 'text-muted-foreground'
                }`} />
                <span className="truncate">Settings</span>
              </a>
            )}
          </div>

          {/* Upgrade Section */}
          <div className="px-4 py-4">
            {isLoading ? (
              <div className="bg-muted animate-pulse rounded-xl h-32"></div>
            ) : (
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-primary-foreground">
              {(() => {
                const hasActivePackage = detailedUserProfile?.profile?.package || packagesData?.current_package_id
                const isLoading = keywordLoading || !detailedUserProfile || !packagesData
                
                return (
                  <>
                    <div className="flex items-center mb-2">
                      <Zap className="h-5 w-5 mr-2" />
                      <span className="text-sm font-semibold">
                        {isLoading ? 'Loading...' : hasActivePackage ? 'Usage Limit' : 'No Active Package'}
                      </span>
                    </div>
                    <div className="mb-3">
                      {isLoading ? (
                        <div className="text-xs text-primary-foreground/80 mb-1">Loading...</div>
                      ) : !hasActivePackage ? (
                        <div className="text-xs text-primary-foreground/80 mb-1">No Active Package found</div>
                      ) : (
                        <>
                          <div className="text-xs text-primary-foreground/80 mb-1">
                            {keywordUsage?.is_unlimited 
                              ? `${keywordUsage.keywords_used?.toLocaleString() || 0} Keywords Used`
                              : `${keywordUsage?.keywords_used?.toLocaleString() || 0}/${keywordUsage?.keywords_limit?.toLocaleString() || 0} Keywords`
                            }
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-2">
                            <div 
                              className="bg-white rounded-full h-2 transition-all duration-300" 
                              style={{ 
                                width: keywordUsage?.is_unlimited 
                                  ? '100%' 
                                  : `${Math.min(100, ((keywordUsage?.keywords_used || 0) / (keywordUsage?.keywords_limit || 1)) * 100)}%`
                              }}
                            ></div>
                          </div>
                        </>
                      )}
                    </div>
                    <a 
                      href="/dashboard/settings/plans-billing"
                      onClick={onToggle}
                      className="w-full bg-background text-primary text-sm font-semibold py-2 px-3 rounded-lg hover:bg-secondary transition-colors block text-center"
                    >
                      {!hasActivePackage ? 'Subscribe now →' : 'Upgrade plan →'}
                    </a>
                  </>
                )
              })()}
              </div>
            )}
          </div>

          {/* Sign Out Section */}
          <div className="border-t border-border px-4 py-4">
            {isLoading ? (
              <div className="h-12 bg-muted animate-pulse rounded-xl"></div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-destructive rounded-xl hover:bg-destructive/10 transition-colors border border-destructive/20 shadow-sm"
              >
                <LogOut className="mr-2 h-5 w-5 flex-shrink-0" />
                <span>Sign out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

    </>
  )
}

export default Sidebar
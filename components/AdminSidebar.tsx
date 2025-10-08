'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  Settings, 
  Globe, 
  CreditCard, 
  Package,
  FileText,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Shield,
  Receipt,
  Search,
  BarChart3,
  TrendingUp,
  Moon,
  Sun
} from 'lucide-react'
import type { AdminUser } from '@/lib/auth'
import { authService } from '@/lib/auth'
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'

interface AdminSidebarProps {
  isOpen: boolean
  onToggle: () => void
  onCollapse?: () => void
  user?: AdminUser | null
  isCollapsed?: boolean
}

export const AdminSidebar = ({ isOpen, onToggle, onCollapse, user, isCollapsed = false }: AdminSidebarProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const [settingsExpanded, setSettingsExpanded] = useState(true)
  const [cmsExpanded, setCmsExpanded] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(!isCollapsed) // Full logo when expanded, icon when collapsed
  const iconUrl = useSiteLogo(false) // Always get icon for mobile header
  useFavicon() // Automatically updates favicon

  const handleLogout = async () => {
    try {
      await authService.signOut()
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Navigation sections as shown in reference design
  const navigationSections = [
    {
      title: 'NAVIGATION',
      items: [
        {
          label: 'Dashboard',
          href: '/backend/admin',
          icon: LayoutDashboard,
          active: pathname === '/backend/admin'
        },
        {
          label: 'Users',
          href: '/backend/admin/users',
          icon: Users,
          active: pathname?.startsWith('/backend/admin/users') || false
        },
        {
          label: 'Orders',
          href: '/backend/admin/orders',
          icon: Receipt,
          active: pathname?.startsWith('/backend/admin/orders') || false
        },
        {
          label: 'Activity',
          href: '/backend/admin/activity',
          icon: Activity,
          active: pathname?.startsWith('/backend/admin/activity') || false
        }
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        {
          label: 'Site Settings',
          href: '/backend/admin/settings/site',
          icon: Globe,
          active: pathname === '/backend/admin/settings/site'
        },
        {
          label: 'Payments',
          href: '/backend/admin/settings/payments',
          icon: CreditCard,
          active: pathname === '/backend/admin/settings/payments'
        },
        {
          label: 'Packages',
          href: '/backend/admin/settings/packages',
          icon: Package,
          active: pathname === '/backend/admin/settings/packages'
        },
        {
          label: 'Analytics',
          href: '/backend/admin/analytics',
          icon: BarChart3,
          active: pathname?.startsWith('/backend/admin/analytics') || false
        }
      ]
    },
    {
      title: 'CONTENT',
      items: [
        {
          label: 'Posts',
          href: '/backend/admin/cms/posts',
          icon: FileText,
          active: pathname?.startsWith('/backend/admin/cms/posts') || false
        },
        {
          label: 'Pages',
          href: '/backend/admin/cms/pages',
          icon: BookOpen,
          active: pathname?.startsWith('/backend/admin/cms/pages') || false
        }
      ]
    }
  ]

  // Filter navigation items based on search query
  const filteredSections = navigationSections.map(section => ({
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
                ? 'bg-brand-accent/10 text-brand-accent' 
                : 'bg-brand-accent text-white shadow-sm'
              : 'text-brand-text hover:text-brand-primary hover:bg-secondary'
          }`}
        >
          <item.icon className={`${isCollapsed ? 'mr-0' : 'mr-3'} h-5 w-5 flex-shrink-0 ${
            item.active 
              ? isCollapsed 
                ? 'text-brand-accent' 
                : 'text-white' 
              : 'text-brand-text group-hover:text-brand-accent'
          }`} />
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </a>
        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-brand-primary text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-xl" style={{ zIndex: 99999 }}>
            {item.label}
            <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-brand-primary"></div>
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
              {logoUrl && (
                <img 
                  src={logoUrl} 
                  alt="Admin Logo"
                  className={isCollapsed ? "h-8 w-8 object-contain" : ""}
                  style={!isCollapsed ? { width: '106.664px', height: '60px' } : {}}
                />
              )}
            </div>
            <button 
              onClick={onCollapse}
              className="p-1.5 rounded-lg hover:bg-slate-50 text-brand-text transition-colors duration-150"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Search Bar */}
          {!isCollapsed && (
            <div className="px-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-150"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <kbd className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded border">⌘K</kbd>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className={`flex-1 px-4 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
            {filteredSections.map(section => renderSection(section))}
          </nav>


          {/* Bottom Section */}
          <div className="border-t border-border p-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2.5 text-sm font-medium text-destructive rounded-lg hover:bg-slate-50 hover:text-destructive hover:border-destructive transition-colors duration-150"
            >
              <LogOut className={`${isCollapsed ? 'mr-0' : 'mr-2'} h-4 w-4 flex-shrink-0`} />
              {!isCollapsed && <span>Sign out</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`fixed left-0 top-0 z-50 h-full w-64 bg-background border-r border-border transform transition-transform duration-300 ease-in-out md:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-5">
            <div className="flex items-center">
              {logoUrl && (
                <img 
                  src={logoUrl} 
                  alt="Admin Logo"
                  style={{ width: '106.664px', height: '60px' }}
                />
              )}
            </div>
            <button 
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-slate-50 text-brand-text transition-colors duration-150"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-150"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 px-4 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
            {filteredSections.map(section => renderSection(section))}
          </nav>


          {/* Bottom Section */}
          <div className="border-t border-border p-4">
            {/* Theme Toggle & Settings */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="flex items-center space-x-2 text-sm text-brand-text hover:text-brand-primary transition-colors duration-150"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span>{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
              </button>
              <button 
                className="p-1.5 rounded-lg hover:bg-slate-50 text-brand-text transition-colors duration-150"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            {/* User Info & Logout */}
            {user && (
              <div className="mb-3">
                <p className="text-sm font-medium text-brand-primary truncate">{user.name}</p>
                <p className="text-xs text-brand-text truncate">{user.email}</p>
                <p className="text-xs text-brand-accent font-medium">{user.role}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2.5 text-sm font-medium text-destructive rounded-lg hover:bg-slate-50 hover:text-destructive hover:border-destructive transition-colors duration-150"
            >
              <LogOut className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header - Show when sidebar is closed */}
      <div className="md:hidden bg-background border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-slate-50 text-brand-text mr-3 transition-colors duration-150"
            >
              <Menu className="h-5 w-5" />
            </button>
            {iconUrl ? (
              <img 
                src={iconUrl} 
                alt={`${siteName} Admin Icon`}
                className="h-6 w-6"
              />
            ) : (
              <div className="h-6 w-6 bg-brand-accent rounded flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
            )}
            <h1 className="ml-2 text-lg font-bold text-brand-primary">IndexNow</h1>
          </div>
          {user && (
            <p className="text-sm text-brand-text truncate max-w-32">{user.email}</p>
          )}
        </div>
      </div>
    </>
  )
}
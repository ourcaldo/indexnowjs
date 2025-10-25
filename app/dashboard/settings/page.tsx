'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { usePageViewLogger } from '@/hooks/useActivityLogger'
import { 
  User, 
  Key,
  CreditCard,
  Search,
  Bell
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import GeneralSettingsPage from './general/page'
import ServiceAccountsSettingsPage from './service-accounts/page'
import PlansBillingSettingsPage from './plans-billing/page'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')
  const [searchQuery, setSearchQuery] = useState('')

  usePageViewLogger('/dashboard/settings', 'Settings', { section: 'user_settings' })

  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab && ['general', 'service-accounts', 'plans-billing'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    router.push(`/dashboard/settings?tab=${tabId}`, { scroll: false })
  }

  const tabs = [
    {
      id: 'general',
      label: 'Account',
      icon: User,
      description: 'Profile, password and preferences'
    },
    {
      id: 'service-accounts',
      label: 'Service Accounts',
      icon: Key,
      description: 'Google service accounts'
    },
    {
      id: 'plans-billing',
      label: 'Plans & Billing',
      icon: CreditCard,
      description: 'Subscription and payments'
    }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettingsPage />
      case 'service-accounts':
        return <ServiceAccountsSettingsPage />
      case 'plans-billing':
        return <PlansBillingSettingsPage />
      default:
        return <GeneralSettingsPage />
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
        <div className="flex-1 flex flex-col p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account preferences</p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50 border-border focus:bg-background transition-colors"
                data-testid="input-search-settings"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    w-full group flex items-start gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-200
                    ${isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-muted/60'
                    }
                  `}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium">{tab.label}</span>
                    <span className={`text-xs mt-0.5 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {tab.description}
                    </span>
                  </div>
                </button>
              )
            })}
          </nav>

          {/* Bottom Section */}
          <div className="pt-6 mt-6 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span>Need help? Contact support</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-card border-b border-border z-10">
        <div className="p-4">
          <h1 className="text-lg font-semibold text-foreground mb-3">Settings</h1>
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex flex-col items-center gap-1.5 p-3 rounded-lg text-xs transition-all duration-200
                    ${isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/40 text-foreground hover:bg-muted'
                    }
                  `}
                  data-testid={`tab-mobile-${tab.id}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium leading-tight text-center">
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="lg:pt-0 pt-32 pb-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {renderTabContent()}
          </div>
        </div>
      </main>
    </div>
  )
}

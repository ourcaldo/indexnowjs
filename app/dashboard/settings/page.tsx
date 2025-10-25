'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { usePageViewLogger } from '@/hooks/useActivityLogger'
import { 
  User, 
  Key,
  CreditCard,
  ChevronRight
} from 'lucide-react'
import GeneralSettingsPage from './general/page'
import ServiceAccountsSettingsPage from './service-accounts/page'
import PlansBillingSettingsPage from './plans-billing/page'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')

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
      description: 'Profile, password, and notifications'
    },
    {
      id: 'service-accounts',
      label: 'Service Accounts',
      icon: Key,
      description: 'Google service account management'
    },
    {
      id: 'plans-billing',
      label: 'Billing',
      icon: CreditCard,
      description: 'Plans, usage, and billing history'
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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:gap-8">
          {/* Sidebar Navigation - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-4">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your account and preferences
                </p>
              </div>
              
              <Separator className="mb-4" />
              
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                        w-full group flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                        ${isActive
                          ? 'bg-accent/10 text-accent-foreground border border-accent/20'
                          : 'text-muted-foreground hover:bg-accent/5 hover:text-foreground border border-transparent'
                        }
                      `}
                      data-testid={`tab-${tab.id}`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-accent' : ''}`} />
                      <div className="flex-1 text-left">
                        <div className={`font-medium ${isActive ? 'text-foreground' : ''}`}>
                          {tab.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                          {tab.description}
                        </div>
                      </div>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 text-accent mt-0.5" />
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Mobile Tab Navigation */}
          <div className="lg:hidden bg-card border-b border-border sticky top-0 z-10">
            <div className="p-4">
              <h1 className="text-xl font-semibold text-foreground mb-3">Settings</h1>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
                        ${isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-secondary text-muted-foreground hover:bg-accent/10'
                        }
                      `}
                      data-testid={`tab-mobile-${tab.id}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0 p-4 lg:p-6">
            <div className="max-w-5xl">
              {renderTabContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

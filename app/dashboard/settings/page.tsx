'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { usePageViewLogger } from '@/hooks/useActivityLogger'
import GeneralSettingsPage from './general/page'
import ServiceAccountsSettingsPage from './service-accounts/page'
import PlansBillingSettingsPage from './plans-billing/page'

const tabs = [
  {
    id: 'general',
    label: 'Account',
  },
  {
    id: 'service-accounts',
    label: 'Service Accounts',
  },
  {
    id: 'plans-billing',
    label: 'Billings',
  }
]

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
    <div className="min-h-screen bg-[hsl(var(--gray-50))]">
      {/* Header */}
      <div className="bg-white border-b border-[hsl(var(--gray-200))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-[hsl(var(--gray-900))]">Settings</h1>
            <p className="mt-1 text-sm text-[hsl(var(--gray-600))]">
              Manage your account settings and preferences
            </p>
          </div>
          
          {/* Tab Navigation */}
          <div className="mt-4">
            <nav className="flex space-x-8 border-b border-[hsl(var(--gray-200))]" data-testid="nav-settings-tabs">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      relative pb-4 px-1 text-sm font-medium transition-colors duration-200
                      ${isActive
                        ? 'text-[hsl(var(--gray-900))]'
                        : 'text-[hsl(var(--gray-600))] hover:text-[hsl(var(--gray-900))]'
                      }
                    `}
                    data-testid={`tab-${tab.id}`}
                  >
                    {tab.label}
                    {isActive && (
                      <span 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--gray-900))]"
                        data-testid="tab-active-indicator"
                      />
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>
    </div>
  )
}

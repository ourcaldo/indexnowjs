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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account, services, and billing preferences.</p>
      </header>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs" role="tablist" data-testid="nav-settings-tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  onClick={() => handleTabChange(tab.id)}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'text-gray-900 border-gray-900'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }`}
                  aria-selected={isActive}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content Panels */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  )
}

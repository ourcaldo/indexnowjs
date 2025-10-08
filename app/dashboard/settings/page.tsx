'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePageViewLogger } from '@/hooks/useActivityLogger'
import { Button } from '@/components/ui/button'
import { 
  Settings as SettingsIcon, 
  User, 
  Key,
  CreditCard
} from 'lucide-react'
import GeneralSettingsPage from './general/page'
import ServiceAccountsSettingsPage from './service-accounts/page'
import PlansBillingSettingsPage from './plans-billing/page'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('general')

  // Log page view
  usePageViewLogger('/dashboard/settings', 'Settings', { section: 'user_settings' })

  // Set active tab from URL parameter on load
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab && ['general', 'service-accounts', 'plans-billing'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const tabs = [
    {
      id: 'general',
      label: 'Account Setting',
      icon: User,
      description: 'Update your profile information, password and notifications'
    },
    {
      id: 'service-accounts',
      label: 'Service Accounts',
      icon: Key,
      description: 'Manage your Google service accounts for indexing'
    },
    {
      id: 'plans-billing',
      label: 'Plans & Billing',
      icon: CreditCard,
      description: 'Manage your subscription and billing information'
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
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings, service accounts, and billing preferences.
        </p>
      </div>

      {/* Mobile-First Tab Navigation */}
      <div className="mb-6">
        {/* Desktop Navigation */}
        <nav className="hidden sm:flex space-x-1 border-b border-border bg-muted/30 rounded-t-lg p-1">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                activeTab === tab.id ? '' : 'hover:bg-slate-50'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Button>
          ))}
        </nav>

        {/* Mobile Navigation */}
        <div className="sm:hidden">
          <div className="grid grid-cols-2 gap-2 p-2 bg-muted/30 rounded-lg">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 p-3 h-auto text-xs font-medium transition-colors duration-150 ${
                  activeTab === tab.id ? '' : 'hover:bg-slate-50'
                }`}
                data-testid={`tab-mobile-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-center leading-tight">
                  {tab.label.includes(' ') ? tab.label.split(' ')[0] : tab.label}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  )
}
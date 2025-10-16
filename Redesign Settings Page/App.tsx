import { useState } from 'react';
import { AccountSettings } from './components/AccountSettings';
import { ServiceAccounts } from './components/ServiceAccounts';
import { PlansAndBilling } from './components/PlansAndBilling';
import { Bell, User, Key, CreditCard } from 'lucide-react';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Button } from './components/ui/button';

export default function App() {
  const [activeTab, setActiveTab] = useState<'account' | 'service' | 'billing'>('account');

  const tabs = [
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'service' as const, label: 'API Keys', icon: Key },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">iN</span>
              </div>
              <span className="text-gray-900">IndexNow</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              </Button>
              
              <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                    AD
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-gray-900">Aldo Dwi Krisfen</p>
                  <p className="text-[10px] text-gray-500">Pro Plan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex max-w-[1400px] mx-auto">
        {/* Left Sidebar Navigation */}
        <aside className="w-56 bg-white border-r border-gray-200 min-h-[calc(100vh-53px)]">
          <nav className="p-4">
            <p className="text-xs text-gray-500 px-3 mb-2">Settings</p>
            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'account' && <AccountSettings />}
          {activeTab === 'service' && <ServiceAccounts />}
          {activeTab === 'billing' && <PlansAndBilling />}
        </main>
      </div>
    </div>
  );
}

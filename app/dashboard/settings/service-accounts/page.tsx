'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import { INDEXING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Plus, 
  Trash2, 
  Loader2,
  AlertCircle
} from 'lucide-react'

export default function ServiceAccountsSettingsPage() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  
  usePageViewLogger('/dashboard/settings/service-accounts', 'Service Accounts Settings', { section: 'service_accounts' })
  const { logServiceAccountActivity } = useActivityLogger()
  const [savingServiceAccount, setSavingServiceAccount] = useState(false)
  const [deletingServiceAccount, setDeletingServiceAccount] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [serviceAccountJson, setServiceAccountJson] = useState('')
  const [displayName, setDisplayName] = useState('')

  const [serviceAccounts, setServiceAccounts] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const serviceAccountsResponse = await fetch(INDEXING_ENDPOINTS.SERVICE_ACCOUNTS, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (serviceAccountsResponse.ok) {
        const serviceAccountsData = await serviceAccountsResponse.json()
        setServiceAccounts(serviceAccountsData.data.service_accounts || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddServiceAccount = async () => {
    if (!serviceAccountJson.trim()) {
      addToast({
        title: 'Validation Error',
        description: 'Please provide the service account JSON',
        type: 'error'
      })
      return
    }

    try {
      let credentials
      try {
        credentials = JSON.parse(serviceAccountJson)
      } catch (error) {
        addToast({
          title: 'Invalid JSON',
          description: 'Please provide valid JSON format for the service account',
          type: 'error'
        })
        return
      }

      const name = displayName.trim() || credentials.client_email?.split('@')[0] || 'Service Account'
      const email = credentials.client_email

      if (!email) {
        addToast({
          title: 'Invalid Service Account',
          description: 'Service account JSON must contain client_email field',
          type: 'error'
        })
        return
      }

      setSavingServiceAccount(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch(INDEXING_ENDPOINTS.SERVICE_ACCOUNTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name,
          email: email,
          credentials: credentials
        })
      })

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Service account added successfully',
          type: 'success'
        })
        await logServiceAccountActivity('service_account_add', 'Service account added')
        setShowAddModal(false)
        setServiceAccountJson('')
        setDisplayName('')
        loadData()
      } else {
        const error = await response.json()
        addToast({
          title: 'Failed to add service account',
          description: error.error || 'Something went wrong',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error adding service account:', error)
      addToast({
        title: 'Error',
        description: 'Failed to add service account',
        type: 'error'
      })
    } finally {
      setSavingServiceAccount(false)
    }
  }

  const handleDeleteServiceAccount = async (accountId: string) => {
    try {
      setDeletingServiceAccount(accountId)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch(INDEXING_ENDPOINTS.SERVICE_ACCOUNT_BY_ID(accountId), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        },
        credentials: 'include'
      })

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Service account deleted successfully',
          type: 'success'
        })
        loadData()
      } else {
        const error = await response.json()
        addToast({
          title: 'Failed to delete service account',
          description: error.error || 'Something went wrong',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting service account:', error)
      addToast({
        title: 'Error',
        description: 'Failed to delete service account',
        type: 'error'
      })
    } finally {
      setDeletingServiceAccount(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
        <span className="ml-2 text-gray-600">Loading service accounts...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Manage Google service accounts for indexing.</p>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <button 
              className="inline-flex items-center rounded-md border border-transparent bg-gray-900 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              data-testid="button-add-service-account"
            >
              <Plus className="w-5 h-5 -ml-1 mr-2" />
              New service account
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Service Account</DialogTitle>
              <DialogDescription>
                Add a Google service account to enable indexing requests. The service account must be added as an owner in Google Search Console.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="service-account-json" className="text-sm font-medium text-[hsl(var(--gray-900))]">
                  Service Account JSON
                </Label>
                <Textarea
                  id="service-account-json"
                  placeholder="Paste your Google service account JSON here..."
                  value={serviceAccountJson}
                  onChange={(e) => setServiceAccountJson(e.target.value)}
                  className="min-h-[200px] resize-none font-mono text-xs border-[hsl(var(--gray-300))] focus:ring-2 focus:ring-[hsl(var(--gray-900))] focus:border-transparent"
                  data-testid="textarea-service-account-json"
                />
                <p className="text-xs text-[hsl(var(--gray-600))]">
                  Download this JSON file from Google Cloud Console → IAM & Admin → Service Accounts
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display-name" className="text-sm font-medium text-[hsl(var(--gray-900))]">
                  Display Name (Optional)
                </Label>
                <Input
                  id="display-name"
                  placeholder="e.g., Production Account"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="border-[hsl(var(--gray-300))] focus:ring-2 focus:ring-[hsl(var(--gray-900))] focus:border-transparent"
                  data-testid="input-display-name"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowAddModal(false)} 
                className="flex-1 border-[hsl(var(--gray-300))] text-[hsl(var(--gray-700))] hover:bg-[hsl(var(--gray-50))]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddServiceAccount} 
                disabled={savingServiceAccount} 
                className="flex-1 bg-[hsl(var(--gray-900))] text-white hover:bg-[hsl(var(--gray-800))] disabled:opacity-50"
              >
                {savingServiceAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Service Account'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Warning */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4" data-testid="alert-warning">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            Service accounts must be added as owners in Google Search Console to submit indexing requests.
          </p>
        </div>
      </div>

      {/* Service Accounts List */}
      <div className="space-y-4">
        {serviceAccounts.length === 0 ? (
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No service accounts</h3>
            <p className="text-sm text-gray-600 mb-6">Add a Google service account to start indexing</p>
            <button 
              onClick={() => setShowAddModal(true)} 
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Service Account
            </button>
          </div>
        ) : (
          serviceAccounts.map((account: any) => {
            const usedRequests = account.quota_usage?.requests_made || 0
            const dailyLimit = account.daily_quota_limit || 200
            const usagePercentage = dailyLimit > 0 ? Math.round((usedRequests / dailyLimit) * 100) : 0
            const status = account.status || 'active'
            
            return (
              <div 
                key={account.id} 
                className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6"
                data-testid={`card-service-account-${account.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">{account.name || account.email}</h3>
                    {status === 'active' && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Active
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteServiceAccount(account.id)}
                    disabled={deletingServiceAccount === account.id}
                    className="text-gray-400 hover:text-red-600"
                    data-testid={`button-delete-${account.id}`}
                  >
                    {deletingServiceAccount === account.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">{account.email}</p>

                <div className="mt-4">
                  <div className="flex justify-between text-sm font-medium text-gray-600">
                    <span>Daily Quota Usage</span>
                    <span>{usedRequests.toLocaleString()} / {dailyLimit.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-900 h-2 rounded-full" 
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Summary Cards */}
      {serviceAccounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow-sm ring-1 ring-[hsl(var(--gray-900)/0.05)] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[hsl(var(--gray-900))] mb-1">Total Daily Quota</h3>
            <p className="text-sm text-[hsl(var(--gray-600))] mb-4">Combined from all service accounts</p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--gray-600))]">Total capacity</span>
                <span className="text-[hsl(var(--gray-900))] font-medium">
                  {serviceAccounts.reduce((total, account) => total + (account.daily_quota_limit || 200), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--gray-600))]">Used today</span>
                <span className="text-[hsl(var(--gray-900))] font-medium">
                  {serviceAccounts.reduce((total, account) => total + (account.quota_usage?.requests_made || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--gray-600))]">Active accounts</span>
                <span className="text-[hsl(var(--gray-900))] font-medium">{serviceAccounts.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-[hsl(var(--gray-900)/0.05)] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[hsl(var(--gray-900))] mb-1">Quick Tips</h3>
            <p className="text-sm text-[hsl(var(--gray-600))] mb-4">Best practices</p>
            <div className="space-y-2 text-sm text-[hsl(var(--gray-700))]">
              <p>• Add accounts as Search Console owners</p>
              <p>• Monitor daily quota usage</p>
              <p>• Rotate accounts for high volume</p>
              <p>• Keep credentials secure</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import { INDEXING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Trash2, 
  RefreshCw,
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
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading service accounts...</span>
      </div>
    )
  }

  const totalDailyQuota = serviceAccounts.reduce((total, account) => total + (account.daily_quota_limit || 200), 0)
  const totalUsedToday = serviceAccounts.reduce((total, account) => total + (account.quota_usage?.requests_made || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 text-xl font-semibold">Service Accounts</h2>
          <p className="text-sm text-gray-600">Manage Google service accounts for indexing</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-service-account">
              <Plus className="w-4 h-4 mr-2" />
              New service account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Service Account</DialogTitle>
              <DialogDescription>
                Add a Google service account to enable indexing requests. The service account must be added as an owner in Google Search Console.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service-account-json">Service Account JSON</Label>
                <Textarea
                  id="service-account-json"
                  placeholder="Paste your Google service account JSON here..."
                  value={serviceAccountJson}
                  onChange={(e) => setServiceAccountJson(e.target.value)}
                  className="min-h-[200px] resize-none font-mono text-xs"
                  data-testid="textarea-service-account-json"
                />
                <p className="text-xs text-gray-500">
                  Download this JSON file from Google Cloud Console → IAM & Admin → Service Accounts
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name (Optional)</Label>
                <Input
                  id="display-name"
                  placeholder="e.g., Production Account"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  data-testid="input-display-name"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddServiceAccount} disabled={savingServiceAccount} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {savingServiceAccount ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
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
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Service accounts must be added as owners in Google Search Console to submit indexing requests.
        </AlertDescription>
      </Alert>

      {/* Service Accounts List */}
      <div className="space-y-4">
        {serviceAccounts.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No service accounts</h3>
              <p className="text-sm text-gray-500 mb-6">Add a Google service account to start indexing</p>
              <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Service Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          serviceAccounts.map((account: any) => {
            const usedRequests = account.quota_usage?.requests_made || 0
            const dailyLimit = account.daily_quota_limit || 200
            const usagePercentage = dailyLimit > 0 ? Math.round((usedRequests / dailyLimit) * 100) : 0
            const status = account.status || 'active'
            
            return (
              <Card key={account.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-gray-900 font-medium">{account.name || account.email}</h3>
                        <Badge 
                          variant={status === 'active' ? 'default' : 'secondary'} 
                          className={status === 'active' ? 'bg-green-100 text-green-700 border-0 text-xs' : 'text-xs'}
                        >
                          {status}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>{account.email}</span>
                        <span>Created {new Date(account.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-gray-400 hover:text-red-600"
                      onClick={() => handleDeleteServiceAccount(account.id)}
                      disabled={deletingServiceAccount === account.id}
                      data-testid={`button-delete-${account.id}`}
                    >
                      {deletingServiceAccount === account.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Daily Quota Usage</span>
                      <span className="text-sm text-gray-900">
                        {usedRequests.toLocaleString()}/{dailyLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          usagePercentage >= 90 ? 'bg-red-500' : 
                          usagePercentage >= 70 ? 'bg-yellow-500' : 
                          'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{usagePercentage}% used</p>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Summary Cards */}
      {serviceAccounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Daily Quota</CardTitle>
              <CardDescription>Combined from all service accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total capacity</span>
                <span className="text-gray-900 font-medium">{totalDailyQuota.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Used today</span>
                <span className="text-gray-900 font-medium">{totalUsedToday.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active accounts</span>
                <span className="text-gray-900 font-medium">{serviceAccounts.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
              <CardDescription>Best practices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              <p>• Add accounts as Search Console owners</p>
              <p>• Monitor daily quota usage</p>
              <p>• Rotate accounts for high volume</p>
              <p>• Keep credentials secure</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

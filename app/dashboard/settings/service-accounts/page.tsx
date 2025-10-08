'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import { INDEXING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { SettingCard, SettingInput, StatusBadge } from '@/components/settings'
import { 
  Key,
  Trash2, 
  Plus,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

export default function ServiceAccountsSettingsPage() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  
  // Log page view and settings activities
  usePageViewLogger('/dashboard/settings/service-accounts', 'Service Accounts Settings', { section: 'service_accounts' })
  const { logServiceAccountActivity } = useActivityLogger()
  const [savingServiceAccount, setSavingServiceAccount] = useState(false)
  const [deletingServiceAccount, setDeletingServiceAccount] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [serviceAccountJson, setServiceAccountJson] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [validateAccount, setValidateAccount] = useState(true)

  // Real data states
  const [serviceAccounts, setServiceAccounts] = useState<any[]>([])

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Auth handled by AuthProvider - get session token directly
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      // Load service accounts
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
      // Parse and validate the JSON
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

      // Extract required fields from the credentials
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
        loadData() // Refresh service accounts
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
        loadData() // Refresh service accounts
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

  const getUsageStatus = (used: number, limit: number): 'success' | 'warning' | 'error' => {
    if (!limit || limit <= 0) return 'success'
    const percentage = (used / limit) * 100
    if (percentage >= 90) return 'error'
    if (percentage >= 70) return 'warning'
    return 'success'
  }

  const getUsagePercentage = (used: number, limit: number): number => {
    if (!limit || limit <= 0) return 0
    return Math.round((used / limit) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading service accounts...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Service Accounts List */}
        <div className="lg:col-span-2 space-y-4">
          {serviceAccounts.length === 0 ? (
            <SettingCard title="Service Accounts" description="No service accounts configured yet">
              <div className="text-center py-8">
                <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2 text-foreground">No service accounts configured</h3>
                <p className="text-sm mb-6 text-muted-foreground">Add a Google service account to start indexing</p>
                
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-service-account">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service Account
                    </Button>
                  </DialogTrigger>
                  <AddServiceAccountModal 
                    serviceAccountJson={serviceAccountJson}
                    setServiceAccountJson={setServiceAccountJson}
                    displayName={displayName}
                    setDisplayName={setDisplayName}
                    validateAccount={validateAccount}
                    setValidateAccount={setValidateAccount}
                    savingServiceAccount={savingServiceAccount}
                    onSave={handleAddServiceAccount}
                    onCancel={() => setShowAddModal(false)}
                  />
                </Dialog>
              </div>
            </SettingCard>
          ) : (
            <>
              {/* Add Service Account Button */}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/30">
                <Plus className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm mb-4 text-muted-foreground">Add a new service account</p>
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-add-service-account-existing">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service Account
                    </Button>
                  </DialogTrigger>
                  <AddServiceAccountModal 
                    serviceAccountJson={serviceAccountJson}
                    setServiceAccountJson={setServiceAccountJson}
                    displayName={displayName}
                    setDisplayName={setDisplayName}
                    validateAccount={validateAccount}
                    setValidateAccount={setValidateAccount}
                    savingServiceAccount={savingServiceAccount}
                    onSave={handleAddServiceAccount}
                    onCancel={() => setShowAddModal(false)}
                  />
                </Dialog>
              </div>
              
              {/* Service Accounts List */}
              {serviceAccounts.map((account: any) => {
                const usedRequests = account.quota_usage?.requests_made || 0
                const dailyLimit = account.daily_quota_limit || 200
                const usageStatus = getUsageStatus(usedRequests, dailyLimit)
                const usagePercentage = getUsagePercentage(usedRequests, dailyLimit)
                
                return (
                  <SettingCard key={account.id} className="hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="font-medium text-sm sm:text-base truncate text-foreground">
                            {account.email}
                          </h3>
                          <StatusBadge status="success">Active</StatusBadge>
                        </div>
                        <p className="text-sm mb-1 text-muted-foreground">{account.name}</p>
                        <p className="text-sm mb-2 text-muted-foreground">
                          Daily Limit: {dailyLimit.toLocaleString()} requests
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Added {new Date(account.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-secondary/50 self-start sm:self-auto transition-colors duration-150"
                        title="Delete Account"
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
                    
                    {/* Usage Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground">Daily Requests</span>
                        {dailyLimit > 0 ? (
                          <StatusBadge status={usageStatus}>
                            {usageStatus === 'error' ? 'Critical' : usageStatus === 'warning' ? 'High' : 'Normal'}
                          </StatusBadge>
                        ) : (
                          <StatusBadge status="success">N/A</StatusBadge>
                        )}
                      </div>
                      <Progress value={usagePercentage} className="h-2" data-testid={`progress-usage-${account.id}`} />
                      <p className="text-sm text-muted-foreground" data-testid={`text-usage-${account.id}`}>
                        {dailyLimit > 0 ? (
                          `${usedRequests.toLocaleString()}/${dailyLimit.toLocaleString()} (${usagePercentage}%)`
                        ) : (
                          'Limit not configured'
                        )}
                      </p>
                    </div>
                  </SettingCard>
                )
              })}
            </>
          )}
        </div>
        
        {/* Quota Summary */}
        <div className="lg:col-span-1">
          <SettingCard title="Total Daily Quota" description="Combined quota from all service accounts">
            <div className="text-center space-y-4">
              <div className="text-3xl font-bold text-foreground">
                {serviceAccounts.reduce((total, account) => total + (account.daily_quota_limit || 200), 0).toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Total requests per day</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-semibold text-foreground">
                    {serviceAccounts.reduce((total, account) => total + (account.quota_usage?.requests_made || 0), 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Used Today</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-semibold text-foreground">
                    {serviceAccounts.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Active Accounts</p>
                </div>
              </div>

              {serviceAccounts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">Usage Today</span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {Math.round((serviceAccounts.reduce((total, account) => total + (account.quota_usage?.requests_made || 0), 0) / serviceAccounts.reduce((total, account) => total + (account.daily_quota_limit || 200), 0)) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.round((serviceAccounts.reduce((total, account) => total + (account.quota_usage?.requests_made || 0), 0) / serviceAccounts.reduce((total, account) => total + (account.daily_quota_limit || 200), 0)) * 100)} 
                    className="h-3" 
                  />
                </div>
              )}
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  )
}

// Add Service Account Modal Component
interface AddServiceAccountModalProps {
  serviceAccountJson: string
  setServiceAccountJson: (value: string) => void
  displayName: string
  setDisplayName: (value: string) => void
  validateAccount: boolean
  setValidateAccount: (value: boolean) => void
  savingServiceAccount: boolean
  onSave: () => void
  onCancel: () => void
}

function AddServiceAccountModal({
  serviceAccountJson,
  setServiceAccountJson,
  displayName,
  setDisplayName,
  validateAccount,
  setValidateAccount,
  savingServiceAccount,
  onSave,
  onCancel
}: AddServiceAccountModalProps) {
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Service Account</DialogTitle>
        <DialogDescription>
          Add a Google service account to enable indexing requests. The service account must be added as an owner in Google Search Console.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="service-account-json" className="text-sm font-medium text-foreground">
            Service Account JSON
          </label>
          <Textarea
            id="service-account-json"
            placeholder={`Paste your Google service account JSON here...

Example format:
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "your-service@project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "...",
  "universe_domain": "googleapis.com"
}`}
            value={serviceAccountJson}
            onChange={(e) => setServiceAccountJson(e.target.value)}
            className="min-h-[200px] resize-none"
            data-testid="textarea-service-account-json"
          />
          <p className="text-xs text-muted-foreground">
            Download this JSON file from Google Cloud Console → IAM & Admin → Service Accounts
          </p>
        </div>

        <SettingInput
          id="display-name"
          label="Display Name (Optional)"
          placeholder="e.g., Production Account"
          value={displayName}
          onChange={setDisplayName}
        />

        <div className="flex items-center space-x-2">
          <Checkbox
            id="validate-account"
            checked={validateAccount}
            onCheckedChange={(checked) => setValidateAccount(!!checked)}
            data-testid="checkbox-validate-account"
          />
          <label htmlFor="validate-account" className="text-sm text-foreground">
            Validate account before saving
          </label>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={onSave} disabled={savingServiceAccount} className="flex-1">
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
  )
}


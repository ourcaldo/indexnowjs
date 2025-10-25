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
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Trash2, 
  RefreshCw,
  AlertCircle,
  Calendar,
  Activity,
  Database
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-accent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading service accounts...</p>
        </div>
      </div>
    )
  }

  const totalDailyQuota = serviceAccounts.reduce((total, account) => total + (account.daily_quota_limit || 200), 0)
  const totalUsedToday = serviceAccounts.reduce((total, account) => total + (account.quota_usage?.requests_made || 0), 0)
  const usagePercentage = totalDailyQuota > 0 ? Math.round((totalUsedToday / totalDailyQuota) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Service Accounts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage Google service accounts for indexing
          </p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" data-testid="button-add-service-account">
              <Plus className="w-3.5 h-3.5" />
              Add account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Service Account</DialogTitle>
              <DialogDescription className="text-sm">
                Add a Google service account to enable indexing. The account must be added as an owner in Google Search Console.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="service-account-json" className="text-sm">Service Account JSON</Label>
                <Textarea
                  id="service-account-json"
                  placeholder='{"type": "service_account", "project_id": "...", ...}'
                  value={serviceAccountJson}
                  onChange={(e) => setServiceAccountJson(e.target.value)}
                  className="min-h-[180px] resize-none font-mono text-xs"
                  data-testid="textarea-service-account-json"
                />
                <p className="text-xs text-muted-foreground">
                  Download from Google Cloud Console → IAM & Admin → Service Accounts
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="display-name" className="text-sm">Display Name <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input
                  id="display-name"
                  placeholder="e.g., Production Account"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-9"
                  data-testid="input-display-name"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1" size="sm">
                Cancel
              </Button>
              <Button onClick={handleAddServiceAccount} disabled={savingServiceAccount} className="flex-1" size="sm">
                {savingServiceAccount ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add account'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Alert */}
      <Alert className="border-accent/20 bg-accent/5">
        <AlertCircle className="h-4 w-4 text-accent" />
        <AlertDescription className="text-sm">
          Service accounts must be added as <strong>owners</strong> in Google Search Console to submit indexing requests.
        </AlertDescription>
      </Alert>

      {/* Summary Stats */}
      {serviceAccounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Accounts</p>
                  <p className="text-2xl font-semibold text-foreground mt-1">{serviceAccounts.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Daily Quota</p>
                  <p className="text-2xl font-semibold text-foreground mt-1">
                    {totalDailyQuota.toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--success) / 0.1)' }}>
                  <Activity className="w-5 h-5" style={{ color: 'hsl(var(--success))' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Used Today</p>
                  <p className="text-2xl font-semibold text-foreground mt-1">
                    {totalUsedToday.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Progress value={usagePercentage} className="h-1 flex-1" />
                    <span className="text-xs text-muted-foreground">{usagePercentage}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Accounts List */}
      <div className="space-y-3">
        {serviceAccounts.length === 0 ? (
          <Card className="border-border border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-1">No service accounts</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first Google service account to enable indexing
              </p>
              <Button onClick={() => setShowAddModal(true)} size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add service account
              </Button>
            </CardContent>
          </Card>
        ) : (
          serviceAccounts.map((account: any) => {
            const usedRequests = account.quota_usage?.requests_made || 0
            const dailyLimit = account.daily_quota_limit || 200
            const accountUsagePercentage = dailyLimit > 0 ? Math.round((usedRequests / dailyLimit) * 100) : 0
            const status = account.status || 'active'
            
            return (
              <Card key={account.id} className="border-border">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-foreground truncate">
                          {account.name || account.email}
                        </h3>
                        <Badge 
                          variant={status === 'active' ? 'default' : 'secondary'} 
                          className="text-xs flex-shrink-0"
                          style={status === 'active' ? {
                            backgroundColor: 'hsl(var(--success) / 0.1)',
                            color: 'hsl(var(--success))',
                            borderColor: 'hsl(var(--success) / 0.2)'
                          } : {}}
                        >
                          {status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="truncate">{account.email}</span>
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          {new Date(account.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={() => handleDeleteServiceAccount(account.id)}
                      disabled={deletingServiceAccount === account.id}
                      data-testid={`button-delete-${account.id}`}
                    >
                      {deletingServiceAccount === account.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>

                  <Separator className="mb-3" />

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Daily Quota Usage</span>
                      <span className="font-medium text-foreground">
                        {usedRequests.toLocaleString()} / {dailyLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={accountUsagePercentage} 
                        className="h-1.5 flex-1"
                      />
                      <span className={`text-xs font-medium ${
                        accountUsagePercentage >= 90 ? 'text-destructive' : 
                        accountUsagePercentage >= 70 ? 'text-warning' : 
                        'text-muted-foreground'
                      }`}>
                        {accountUsagePercentage}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

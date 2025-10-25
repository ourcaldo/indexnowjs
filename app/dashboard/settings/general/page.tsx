'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/contexts/AuthContext'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw,
  Eye,
  EyeOff,
  Upload,
  Shield,
  Bell,
  Trash2
} from 'lucide-react'
import { AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export default function GeneralSettingsPage() {
  const { addToast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  usePageViewLogger('/dashboard/settings/general', 'Account Settings', { section: 'account_settings' })
  const { logDashboardActivity } = useActivityLogger()

  const [notifications, setNotifications] = useState({
    jobCompletion: true,
    failures: true,
    dailyReports: true,
    criticalAlerts: true
  })

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone_number: '',
    email_notifications: false
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const profileResponse = await fetch(AUTH_ENDPOINTS.PROFILE, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      })
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfileForm({
          full_name: profileData.data.profile.full_name || '',
          phone_number: profileData.data.profile.phone_number || '',
          email_notifications: profileData.data.profile.email_notifications || false
        })
      } else if (profileResponse.status === 404) {
        setProfileForm({
          full_name: user?.email?.split('@')[0] || '',
          phone_number: '',
          email_notifications: false
        })
      }

      const settingsResponse = await fetch(AUTH_ENDPOINTS.SETTINGS, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      })
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        const settings = settingsData.data.settings
        setNotifications({
          jobCompletion: settings.email_job_completion || false,
          failures: settings.email_job_failure || false,
          dailyReports: settings.email_daily_report || false,
          criticalAlerts: settings.email_quota_alerts || false
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch(AUTH_ENDPOINTS.PROFILE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileForm),
        credentials: 'include'
      })

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Profile updated successfully',
          type: 'success'
        })
        await logDashboardActivity('profile_update', 'Profile information updated')
        loadData()
      } else {
        const error = await response.json()
        addToast({
          title: 'Failed to update profile',
          description: error.error || 'Something went wrong',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      addToast({
        title: 'Error',
        description: 'Failed to update profile',
        type: 'error'
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      addToast({
        title: 'Validation Error',
        description: 'Please fill in all password fields',
        type: 'error'
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast({
        title: 'Validation Error',
        description: 'New passwords do not match',
        type: 'error'
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      addToast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters long',
        type: 'error'
      })
      return
    }

    try {
      setSavingPassword(true)
      
      if (!user?.email) {
        addToast({
          title: 'Error',
          description: 'User email not found',
          type: 'error'
        })
        return
      }
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword
      })

      if (signInError) {
        addToast({
          title: 'Authentication Error',
          description: 'Current password is incorrect',
          type: 'error'
        })
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (updateError) {
        addToast({
          title: 'Update Error',
          description: updateError.message || 'Failed to update password',
          type: 'error'
        })
        return
      }

      addToast({
        title: 'Success',
        description: 'Password updated successfully',
        type: 'success'
      })

      await logDashboardActivity('password_change', 'Password updated successfully')
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      console.error('Error changing password:', error)
      addToast({
        title: 'Error',
        description: 'Failed to change password',
        type: 'error'
      })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSaveNotifications = async () => {
    try {
      setSavingNotifications(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch(AUTH_ENDPOINTS.SETTINGS, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email_job_completion: notifications.jobCompletion,
          email_job_failure: notifications.failures,
          email_daily_report: notifications.dailyReports,
          email_quota_alerts: notifications.criticalAlerts
        }),
        credentials: 'include'
      })

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Notification settings updated successfully',
          type: 'success'
        })
        await logDashboardActivity('settings_update', 'Notification settings updated', {
          section: 'notifications',
          changes: { notifications }
        })
      } else {
        const error = await response.json()
        addToast({
          title: 'Failed to update settings',
          description: error.error || 'Something went wrong',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      addToast({
        title: 'Error',
        description: 'Failed to update settings',
        type: 'error'
      })
    } finally {
      setSavingNotifications(false)
    }
  }

  const getInitials = () => {
    const name = profileForm.full_name || user?.email
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border">
            <CardHeader className="pb-3">
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted rounded animate-pulse mt-1.5" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Profile Section */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Profile Information</CardTitle>
              <CardDescription className="text-sm">
                Update your personal details and contact information
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: 'hsl(var(--success))' }} />
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-gradient-to-br from-accent/90 to-accent text-accent-foreground text-lg font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="w-3.5 h-3.5" />
                Upload photo
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">JPG or PNG, max 2MB</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm">Full name</Label>
              <Input 
                id="name" 
                value={profileForm.full_name} 
                onChange={(e) => setProfileForm(prev => ({...prev, full_name: e.target.value}))}
                className="h-9"
                data-testid="input-full-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                value={user?.email || ''} 
                readOnly
                className="h-9 bg-muted/50"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="phone" className="text-sm">Phone number</Label>
              <Input 
                id="phone" 
                type="tel"
                placeholder="Optional" 
                value={profileForm.phone_number}
                onChange={(e) => setProfileForm(prev => ({...prev, phone_number: e.target.value}))}
                className="h-9"
                data-testid="input-phone"
              />
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveProfile}
              disabled={savingProfile}
              size="sm"
              data-testid="button-save-profile"
            >
              {savingProfile ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            <div>
              <CardTitle className="text-lg">Security</CardTitle>
              <CardDescription className="text-sm">
                Manage your password and security settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="current" className="text-sm">Current password</Label>
              <div className="relative">
                <Input 
                  id="current" 
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, currentPassword: e.target.value}))}
                  className="h-9 pr-9"
                  data-testid="input-current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new" className="text-sm">New password</Label>
                <Input 
                  id="new" 
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))}
                  className="h-9"
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-sm">Confirm password</Label>
                <Input 
                  id="confirm" 
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, confirmPassword: e.target.value}))}
                  className="h-9"
                  data-testid="input-confirm-password"
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-end">
            <Button 
              variant="outline"
              onClick={handleChangePassword}
              disabled={savingPassword}
              size="sm"
              data-testid="button-update-password"
            >
              {savingPassword ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent" />
            <div>
              <CardTitle className="text-lg">Email Notifications</CardTitle>
              <CardDescription className="text-sm">
                Choose what updates you want to receive
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Indexing updates</Label>
              <p className="text-xs text-muted-foreground">Receive notifications when jobs complete</p>
            </div>
            <Switch 
              checked={notifications.jobCompletion}
              onCheckedChange={(checked) => setNotifications(prev => ({...prev, jobCompletion: checked}))}
              data-testid="switch-job-completion"
            />
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Failure alerts</Label>
              <p className="text-xs text-muted-foreground">Get notified when operations fail</p>
            </div>
            <Switch 
              checked={notifications.failures}
              onCheckedChange={(checked) => setNotifications(prev => ({...prev, failures: checked}))}
              data-testid="switch-failures"
            />
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Daily reports</Label>
              <p className="text-xs text-muted-foreground">Summary of daily activity and metrics</p>
            </div>
            <Switch 
              checked={notifications.dailyReports}
              onCheckedChange={(checked) => setNotifications(prev => ({...prev, dailyReports: checked}))}
              data-testid="switch-daily-reports"
            />
          </div>
          
          <div className="flex items-center justify-between py-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Critical alerts</Label>
              <p className="text-xs text-muted-foreground">Quota limits and security warnings</p>
            </div>
            <Switch 
              checked={notifications.criticalAlerts}
              onCheckedChange={(checked) => setNotifications(prev => ({...prev, criticalAlerts: checked}))}
              data-testid="switch-critical-alerts"
            />
          </div>
          
          <Separator className="my-3" />
          
          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleSaveNotifications}
              disabled={savingNotifications}
              size="sm"
              data-testid="button-save-notifications"
            >
              {savingNotifications ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save preferences'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
          <CardDescription className="text-sm">
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <div>
              <p className="text-sm font-medium text-foreground">Delete Account</p>
              <p className="text-xs text-muted-foreground mt-0.5">Permanently delete your account and all data</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

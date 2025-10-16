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
import { 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'
import { AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export default function GeneralSettingsPage() {
  const { addToast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
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
      setSavingProfile(true)
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
      setSavingProfile(false)
    }
  }

  const getInitials = () => {
    const name = profileForm.full_name || user?.email
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-10 w-full bg-muted rounded animate-pulse" />
                  <div className="h-10 w-full bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="h-5 w-24 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 mb-6">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-lg font-medium">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Button variant="outline" size="sm">Change photo</Button>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG. Max 2MB</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input 
                  id="name" 
                  value={profileForm.full_name} 
                  onChange={(e) => setProfileForm(prev => ({...prev, full_name: e.target.value}))}
                  data-testid="input-full-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={user?.email || ''} 
                  readOnly
                  className="bg-muted"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input 
                  id="phone" 
                  placeholder="Optional" 
                  value={profileForm.phone_number}
                  onChange={(e) => setProfileForm(prev => ({...prev, phone_number: e.target.value}))}
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                data-testid="button-save-profile"
              >
                {savingProfile ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="current">Current password</Label>
                <div className="relative">
                  <Input 
                    id="current" 
                    type={showPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({...prev, currentPassword: e.target.value}))}
                    className="pr-10"
                    data-testid="input-current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">New password</Label>
                <Input 
                  id="new" 
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))}
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input 
                  id="confirm" 
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, confirmPassword: e.target.value}))}
                  data-testid="input-confirm-password"
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button 
                variant="outline"
                onClick={handleChangePassword}
                disabled={savingPassword}
                data-testid="button-update-password"
              >
                {savingPassword ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage email preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="space-y-0.5">
                  <Label>Indexing updates</Label>
                  <p className="text-xs text-gray-500">Job completion notifications</p>
                </div>
                <Switch 
                  checked={notifications.jobCompletion}
                  onCheckedChange={(checked) => setNotifications(prev => ({...prev, jobCompletion: checked}))}
                  data-testid="switch-job-completion"
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="space-y-0.5">
                  <Label>Failure notifications</Label>
                  <p className="text-xs text-gray-500">Get notified when jobs fail</p>
                </div>
                <Switch 
                  checked={notifications.failures}
                  onCheckedChange={(checked) => setNotifications(prev => ({...prev, failures: checked}))}
                  data-testid="switch-failures"
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="space-y-0.5">
                  <Label>Daily reports</Label>
                  <p className="text-xs text-gray-500">Summary of account activity</p>
                </div>
                <Switch 
                  checked={notifications.dailyReports}
                  onCheckedChange={(checked) => setNotifications(prev => ({...prev, dailyReports: checked}))}
                  data-testid="switch-daily-reports"
                />
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="space-y-0.5">
                  <Label>Critical alerts</Label>
                  <p className="text-xs text-gray-500">Quota limit warnings</p>
                </div>
                <Switch 
                  checked={notifications.criticalAlerts}
                  onCheckedChange={(checked) => setNotifications(prev => ({...prev, criticalAlerts: checked}))}
                  data-testid="switch-critical-alerts"
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button 
                onClick={handleSaveNotifications}
                disabled={savingProfile}
                data-testid="button-save-notifications"
              >
                {savingProfile ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save preferences'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-900">Active</span>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-gray-500">Member since</p>
              <p className="text-sm text-gray-900 mt-1">Recently</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm text-gray-900 mt-1">{user?.email || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900">Two-factor auth</p>
                <p className="text-xs text-gray-500">Coming soon</p>
              </div>
              <Button variant="outline" size="sm" disabled>Manage</Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 mb-3">Permanently delete your account and data</p>
            <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50">
              Delete account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

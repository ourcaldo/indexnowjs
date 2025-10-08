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
import { 
  SettingCard, 
  SettingToggle, 
  SettingInput, 
  SettingSelect 
} from '@/components/settings'
import { 
  Bell,
  RefreshCw,
  Save,
  User,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react'
import { AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export default function GeneralSettingsPage() {
  const { addToast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Log page view and settings activities
  usePageViewLogger('/dashboard/settings/general', 'Account Settings', { section: 'account_settings' })
  const { logDashboardActivity } = useActivityLogger()

  // Form states
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

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      // Load user profile
      const profileResponse = await fetch(AUTH_ENDPOINTS.PROFILE, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include' // Essential for cross-subdomain authentication
      })
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfileForm({
          full_name: profileData.profile.full_name || '',
          phone_number: profileData.profile.phone_number || '',
          email_notifications: profileData.profile.email_notifications || false
        })
      } else if (profileResponse.status === 404) {
        // Profile doesn't exist, create default values
        setProfileForm({
          full_name: user?.email?.split('@')[0] || '',
          phone_number: '',
          email_notifications: false
        })
      }

      // Load user settings for notifications
      const settingsResponse = await fetch(AUTH_ENDPOINTS.SETTINGS, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include' // Essential for cross-subdomain authentication
      })
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        const settings = settingsData.settings
        setNotifications({
          jobCompletion: settings.email_job_completion || false,
          failures: settings.email_job_failure || false,
          dailyReports: settings.email_daily_report || false,
          criticalAlerts: settings.email_quota_alerts || false
        })
      } else if (settingsResponse.status === 404) {
        // Settings don't exist, keep defaults
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
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Profile updated successfully',
          type: 'success'
        })
        await logDashboardActivity('profile_update', 'Profile information updated')
        loadData() // Refresh data
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
      
      // First verify current password by attempting to sign in
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

      // Update password
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
      
      // Clear password form
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
      setSavingProfile(true) // Reuse this state for notifications
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
        credentials: 'include' // Essential for cross-subdomain authentication
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


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Profile Information Skeleton */}
          <div className="space-y-4 p-6 bg-card border rounded-lg">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
          
          {/* Security Skeleton */}
          <div className="space-y-4 p-6 bg-card border rounded-lg">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-36 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <SettingCard 
          title="Profile Information" 
          description="Update your personal details and contact information"
        >
          <div className="space-y-4">
            <SettingInput
              id="full-name"
              label="Full Name"
              placeholder="Enter your full name"
              value={profileForm.full_name}
              onChange={(value) => setProfileForm(prev => ({...prev, full_name: value}))}
            />

            <SettingInput
              id="email"
              label="Email Address"
              type="email"
              value={user?.email || ''}
              readOnly
              description="Email cannot be changed directly. Contact support if needed."
              className="bg-muted"
            />

            <SettingInput
              id="phone"
              label="Phone Number"
              type="tel"
              placeholder="Enter your phone number"
              value={profileForm.phone_number}
              onChange={(value) => setProfileForm(prev => ({...prev, phone_number: value}))}
              description="Optional - used for account recovery and notifications"
            />
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full sm:w-auto"
            >
              {savingProfile ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Profile
                </>
              )}
            </Button>
          </div>
        </SettingCard>

        {/* Security */}
        <SettingCard 
          title="Security" 
          description="Update your password to keep your account secure"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-sm font-medium">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, currentPassword: e.target.value}))}
                  className="pr-10"
                  data-testid="input-current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <SettingInput
              id="new-password"
              label="New Password"
              type="password"
              placeholder="Enter new password"
              value={passwordForm.newPassword}
              onChange={(value) => setPasswordForm(prev => ({...prev, newPassword: value}))}
              description="Must be at least 6 characters long"
            />

            <SettingInput
              id="confirm-password"
              label="Confirm New Password"
              type="password"
              placeholder="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={(value) => setPasswordForm(prev => ({...prev, confirmPassword: value}))}
            />
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleChangePassword}
              disabled={savingPassword}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {savingPassword ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </SettingCard>
      </div>

      {/* Email Notifications */}
      <SettingCard 
        title="Email Notifications" 
        description="Control when you receive email notifications about your indexing activities"
      >
        <div className="space-y-4">
          <SettingToggle
            id="job-completion"
            label="Job completion notifications"
            description="Get notified when indexing jobs complete successfully"
            checked={notifications.jobCompletion}
            onCheckedChange={(checked) => setNotifications(prev => ({...prev, jobCompletion: checked}))}
          />
          
          <SettingToggle
            id="job-failures"
            label="Failure notifications"
            description="Get notified when indexing jobs fail or encounter errors"
            checked={notifications.failures}
            onCheckedChange={(checked) => setNotifications(prev => ({...prev, failures: checked}))}
          />
          
          <SettingToggle
            id="daily-reports"
            label="Daily quota reports"
            description="Receive daily summaries of your quota usage and activities"
            checked={notifications.dailyReports}
            onCheckedChange={(checked) => setNotifications(prev => ({...prev, dailyReports: checked}))}
          />
          
          <SettingToggle
            id="critical-alerts"
            label="Critical quota alerts"
            description="Get notified when you're approaching quota limits"
            checked={notifications.criticalAlerts}
            onCheckedChange={(checked) => setNotifications(prev => ({...prev, criticalAlerts: checked}))}
          />
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleSaveNotifications}
            disabled={savingProfile}
            className="w-full sm:w-auto"
          >
            {savingProfile ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Save Notifications
              </>
            )}
          </Button>
        </div>
      </SettingCard>
    </div>
  )
}
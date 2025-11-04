'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/contexts/AuthContext'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { 
  Eye,
  EyeOff,
  Loader2,
  Save
} from 'lucide-react'

export default function GeneralSettingsPage() {
  const { addToast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
      addToast({
        title: 'Error',
        description: 'Failed to update settings',
        type: 'error'
      })
    } finally {
      setSavingNotifications(false)
    }
  }

  const CustomToggle = ({ checked, onChange, label, description, testId }: { checked: boolean, onChange: (checked: boolean) => void, label: string, description: string, testId: string }) => (
    <div className="flex items-center justify-between py-4 border-b border-[hsl(var(--gray-200))] last:border-0">
      <div className="flex-1">
        <label className="text-sm font-medium text-[hsl(var(--gray-900))]">{label}</label>
        <p className="text-sm text-[hsl(var(--gray-600))] mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-testid={testId}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gray-900))] focus:ring-offset-2 ${checked ? 'bg-[hsl(var(--gray-900))]' : 'bg-[hsl(var(--gray-200))]'}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-[hsl(var(--gray-900)/0.05)]">
            <div className="h-5 w-32 bg-[hsl(var(--gray-200))] rounded mb-4" />
            <div className="space-y-3">
              <div className="h-10 w-full bg-[hsl(var(--gray-200))] rounded" />
              <div className="h-10 w-full bg-[hsl(var(--gray-200))] rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="bg-white shadow-sm ring-1 ring-[hsl(var(--gray-900)/0.05)] rounded-xl p-6" data-testid="card-personal-info">
        <h2 className="text-lg font-semibold text-[hsl(var(--gray-900))] mb-1">Personal Information</h2>
        <p className="text-sm text-[hsl(var(--gray-600))] mb-6">Update your profile details and contact information</p>
        
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="full-name" className="block text-sm font-medium text-[hsl(var(--gray-900))] mb-1.5">
                Full name
              </Label>
              <Input
                id="full-name"
                type="text"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm(prev => ({...prev, full_name: e.target.value}))}
                className="w-full px-3 py-2 border border-[hsl(var(--gray-300))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gray-900))] focus:border-transparent"
                data-testid="input-full-name"
              />
            </div>
            
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-[hsl(var(--gray-900))] mb-1.5">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full px-3 py-2 border border-[hsl(var(--gray-300))] rounded-lg bg-[hsl(var(--gray-50))] text-[hsl(var(--gray-500))] cursor-not-allowed"
                data-testid="input-email"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="phone" className="block text-sm font-medium text-[hsl(var(--gray-900))] mb-1.5">
              Phone number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Optional - for account recovery"
              value={profileForm.phone_number}
              onChange={(e) => setProfileForm(prev => ({...prev, phone_number: e.target.value}))}
              className="w-full px-3 py-2 border border-[hsl(var(--gray-300))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gray-900))] focus:border-transparent"
              data-testid="input-phone"
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="inline-flex items-center px-4 py-2 bg-[hsl(var(--gray-900))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--gray-800))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--gray-900))] disabled:opacity-50"
            data-testid="button-save-profile"
          >
            {savingProfile ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Security & Password */}
      <div className="bg-white shadow-sm ring-1 ring-[hsl(var(--gray-900)/0.05)] rounded-xl p-6" data-testid="card-security">
        <h2 className="text-lg font-semibold text-[hsl(var(--gray-900))] mb-1">Security & Password</h2>
        <p className="text-sm text-[hsl(var(--gray-600))] mb-6">Update your password to keep your account secure</p>
        
        <div className="space-y-5">
          <div>
            <Label htmlFor="current-password" className="block text-sm font-medium text-[hsl(var(--gray-900))] mb-1.5">
              Current password
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({...prev, currentPassword: e.target.value}))}
                className="w-full px-3 py-2 border border-[hsl(var(--gray-300))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gray-900))] focus:border-transparent pr-10"
                data-testid="input-current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[hsl(var(--gray-600))] hover:text-[hsl(var(--gray-900))]"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="new-password" className="block text-sm font-medium text-[hsl(var(--gray-900))] mb-1.5">
                New password
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))}
                  className="w-full px-3 py-2 border border-[hsl(var(--gray-300))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gray-900))] focus:border-transparent pr-10"
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[hsl(var(--gray-600))] hover:text-[hsl(var(--gray-900))]"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="confirm-password" className="block text-sm font-medium text-[hsl(var(--gray-900))] mb-1.5">
                Confirm new password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, confirmPassword: e.target.value}))}
                  className="w-full px-3 py-2 border border-[hsl(var(--gray-300))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gray-900))] focus:border-transparent pr-10"
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[hsl(var(--gray-600))] hover:text-[hsl(var(--gray-900))]"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleChangePassword}
            disabled={savingPassword}
            className="inline-flex items-center px-4 py-2 bg-[hsl(var(--gray-900))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--gray-800))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--gray-900))] disabled:opacity-50"
            data-testid="button-update-password"
          >
            {savingPassword ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-white shadow-sm ring-1 ring-[hsl(var(--gray-900)/0.05)] rounded-xl p-6" data-testid="card-notifications">
        <h2 className="text-lg font-semibold text-[hsl(var(--gray-900))] mb-1">Email Notifications</h2>
        <p className="text-sm text-[hsl(var(--gray-600))] mb-6">Choose which notifications you want to receive</p>
        
        <div className="space-y-0">
          <CustomToggle 
            checked={notifications.jobCompletion}
            onChange={(checked) => setNotifications(prev => ({...prev, jobCompletion: checked}))}
            label="Indexing updates"
            description="Get notified when your indexing jobs complete"
            testId="switch-jobCompletion"
          />
          <CustomToggle 
            checked={notifications.failures}
            onChange={(checked) => setNotifications(prev => ({...prev, failures: checked}))}
            label="Failure alerts"
            description="Receive immediate notifications for failed jobs"
            testId="switch-failures"
          />
          <CustomToggle 
            checked={notifications.dailyReports}
            onChange={(checked) => setNotifications(prev => ({...prev, dailyReports: checked}))}
            label="Daily summaries"
            description="Get a daily digest of your account activity"
            testId="switch-dailyReports"
          />
          <CustomToggle 
            checked={notifications.criticalAlerts}
            onChange={(checked) => setNotifications(prev => ({...prev, criticalAlerts: checked}))}
            label="Critical alerts"
            description="Important quota and system notifications"
            testId="switch-criticalAlerts"
          />
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveNotifications}
            disabled={savingNotifications}
            className="inline-flex items-center px-4 py-2 bg-[hsl(var(--gray-900))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--gray-800))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--gray-900))] disabled:opacity-50"
            data-testid="button-save-notifications"
          >
            {savingNotifications ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

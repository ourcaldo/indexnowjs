'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/contexts/AuthContext'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { 
  Loader2
} from 'lucide-react'

export default function GeneralSettingsPage() {
  const { addToast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)

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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-gray-900/5">
            <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-10 w-full bg-gray-200 rounded" />
              <div className="h-10 w-full bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Personal Information */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
          <p className="mt-1 text-sm text-gray-500">Update your account details.</p>
        </div>
        <div className="border-t border-gray-200 px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="full-name" className="block text-sm font-medium text-gray-700">Full name</label>
              <input
                type="text"
                id="full-name"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm(prev => ({...prev, full_name: e.target.value}))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm"
                data-testid="input-full-name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                id="email"
                value={user?.email || ''}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed sm:text-sm"
                data-testid="input-email"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone number</label>
              <input
                type="tel"
                id="phone"
                placeholder="Optional - for account recovery"
                value={profileForm.phone_number}
                onChange={(e) => setProfileForm(prev => ({...prev, phone_number: e.target.value}))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm"
                data-testid="input-phone"
              />
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 text-right rounded-b-xl">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="inline-flex justify-center rounded-md border border-transparent bg-gray-900 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
            data-testid="button-save-profile"
          >
            {savingProfile ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {/* Security & Password */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">Security & Password</h2>
          <p className="mt-1 text-sm text-gray-500">Keep your account secure.</p>
        </div>
        <div className="border-t border-gray-200 px-6 py-6">
          <div className="max-w-md space-y-4">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">Current password</label>
              <input
                type="password"
                id="current-password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({...prev, currentPassword: e.target.value}))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm"
                data-testid="input-current-password"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">New password</label>
              <input
                type="password"
                id="new-password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm"
                data-testid="input-new-password"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm new password</label>
              <input
                type="password"
                id="confirm-password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({...prev, confirmPassword: e.target.value}))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm"
                data-testid="input-confirm-password"
              />
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 text-right rounded-b-xl">
          <button
            onClick={handleChangePassword}
            disabled={savingPassword}
            className="inline-flex justify-center rounded-md border border-transparent bg-gray-900 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
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
          </button>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">Email Notifications</h2>
          <p className="mt-1 text-sm text-gray-500">Choose what updates you want to receive.</p>
        </div>
        <ul className="divide-y divide-gray-200">
          <li className="flex items-center justify-between px-6 py-4">
            <div>
              <h3 className="font-medium text-gray-800">Indexing updates</h3>
              <p className="text-sm text-gray-500">Get notified when indexing jobs complete.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={notifications.jobCompletion}
                onChange={(e) => setNotifications(prev => ({...prev, jobCompletion: e.target.checked}))}
                data-testid="switch-jobCompletion"
              />
              <div className={`w-11 h-6 rounded-full border border-gray-200 transition-colors duration-200 ease-in-out ${notifications.jobCompletion ? 'bg-gray-900' : 'bg-gray-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${notifications.jobCompletion ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </label>
          </li>
          <li className="flex items-center justify-between px-6 py-4">
            <div>
              <h3 className="font-medium text-gray-800">Failure alerts</h3>
              <p className="text-sm text-gray-500">Immediate notifications for failed jobs.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={notifications.failures}
                onChange={(e) => setNotifications(prev => ({...prev, failures: e.target.checked}))}
                data-testid="switch-failures"
              />
              <div className={`w-11 h-6 rounded-full border border-gray-200 transition-colors duration-200 ease-in-out ${notifications.failures ? 'bg-gray-900' : 'bg-gray-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${notifications.failures ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </label>
          </li>
          <li className="flex items-center justify-between px-6 py-4">
            <div>
              <h3 className="font-medium text-gray-800">Daily summaries</h3>
              <p className="text-sm text-gray-500">Digest of your account activity.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={notifications.dailyReports}
                onChange={(e) => setNotifications(prev => ({...prev, dailyReports: e.target.checked}))}
                data-testid="switch-dailyReports"
              />
              <div className={`w-11 h-6 rounded-full border border-gray-200 transition-colors duration-200 ease-in-out ${notifications.dailyReports ? 'bg-gray-900' : 'bg-gray-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${notifications.dailyReports ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </label>
          </li>
        </ul>
        <div className="bg-gray-50 px-6 py-4 text-right rounded-b-xl">
          <button
            onClick={handleSaveNotifications}
            disabled={savingNotifications}
            className="inline-flex justify-center rounded-md border border-transparent bg-gray-900 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
            data-testid="button-save-notifications"
          >
            {savingNotifications ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
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
  CheckCircle2,
  Shield,
  Mail,
  Phone,
  User as UserIcon,
  AlertTriangle
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
      // Silent error handling
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

  const getInitials = () => {
    const name = profileForm.full_name || user?.email
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border">
            <CardHeader>
              <div className="h-5 w-32 bg-muted rounded" />
              <div className="h-4 w-48 bg-muted rounded mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-10 w-full bg-muted rounded" />
                <div className="h-10 w-full bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card className="border-border bg-gradient-to-br from-card to-muted/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-foreground mb-1">
                {profileForm.full_name || 'User'}
              </h2>
              <p className="text-sm text-muted-foreground mb-3">{user?.email}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Active Account
                </Badge>
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                  <Mail className="w-3 h-3 mr-1" />
                  Email Verified
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Update your account details and contact information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">Full name</Label>
                <Input 
                  id="name" 
                  value={profileForm.full_name} 
                  onChange={(e) => setProfileForm(prev => ({...prev, full_name: e.target.value}))}
                  className="bg-background border-border focus:border-primary"
                  data-testid="input-full-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={user?.email || ''} 
                  readOnly
                  className="bg-muted border-border"
                  data-testid="input-email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">Phone number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="phone" 
                  placeholder="Optional - for account recovery" 
                  value={profileForm.phone_number}
                  onChange={(e) => setProfileForm(prev => ({...prev, phone_number: e.target.value}))}
                  className="pl-10 bg-background border-border focus:border-primary"
                  data-testid="input-phone"
                />
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-save-profile"
            >
              {savingProfile ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security - Password */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Shield className="w-4 h-4 text-warning" />
            </div>
            <div>
              <CardTitle className="text-lg">Security & Password</CardTitle>
              <CardDescription>Keep your account secure with a strong password</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current" className="text-sm font-medium text-foreground">Current password</Label>
              <div className="relative">
                <Input 
                  id="current" 
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, currentPassword: e.target.value}))}
                  className="bg-background border-border pr-10 focus:border-warning"
                  data-testid="input-current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new" className="text-sm font-medium text-foreground">New password</Label>
                <Input 
                  id="new" 
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))}
                  className="bg-background border-border focus:border-warning"
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm font-medium text-foreground">Confirm new password</Label>
                <Input 
                  id="confirm" 
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, confirmPassword: e.target.value}))}
                  className="bg-background border-border focus:border-warning"
                  data-testid="input-confirm-password"
                />
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long. For better security, use a mix of letters, numbers, and symbols.
              </p>
            </div>
          </div>

          <Separator className="my-6" />
          
          <div className="flex justify-end">
            <Button 
              variant="outline"
              onClick={handleChangePassword}
              disabled={savingPassword}
              className="border-warning/40 text-warning hover:bg-warning/10"
              data-testid="button-update-password"
            >
              {savingPassword ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-info/10 rounded-lg">
              <Mail className="w-4 h-4 text-info" />
            </div>
            <div>
              <CardTitle className="text-lg">Email Notifications</CardTitle>
              <CardDescription>Choose what updates you want to receive</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { key: 'jobCompletion', label: 'Indexing updates', desc: 'Get notified when indexing jobs complete' },
              { key: 'failures', label: 'Failure alerts', desc: 'Immediate notifications for failed jobs' },
              { key: 'dailyReports', label: 'Daily summaries', desc: 'Daily digest of your account activity' },
              { key: 'criticalAlerts', label: 'Critical alerts', desc: 'Important quota and system notifications' }
            ].map((item, index) => (
              <div key={item.key}>
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch 
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) => setNotifications(prev => ({...prev, [item.key]: checked}))}
                    data-testid={`switch-${item.key}`}
                  />
                </div>
                {index < 3 && <Separator />}
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveNotifications}
              disabled={savingNotifications}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-save-notifications"
            >
              {savingNotifications ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

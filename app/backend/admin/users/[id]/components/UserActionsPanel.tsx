'use client'

import { 
  Ban, 
  Key, 
  Zap,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react'

interface UserActions {
  suspend: boolean
  resetPassword: boolean
  editData: boolean
  resetQuota: boolean
  changePackage: boolean
  extendSubscription: boolean
}

interface UserActionsPanel {
  actionLoading: UserActions
  newPassword: string | null
  showPassword: boolean
  onTogglePasswordVisibility: () => void
  onSuspendUser: () => void
  onResetPassword: () => void
  onResetQuota: () => void
  onChangePackage: () => void
  onExtendSubscription: () => void
}

export function UserActionsPanel({
  actionLoading,
  newPassword,
  showPassword,
  onTogglePasswordVisibility,
  onSuspendUser,
  onResetPassword,
  onResetQuota,
  onChangePackage,
  onExtendSubscription
}: UserActionsPanel) {
  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-warning/10">
          <Zap className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Admin Actions</h3>
          <p className="text-sm text-muted-foreground">Manage user account settings and permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Suspend/Unsuspend User */}
        <button
          onClick={onSuspendUser}
          disabled={actionLoading.suspend}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 border border-destructive/20"
        >
          <Ban className="h-4 w-4" />
          <span className="font-medium">
            {actionLoading.suspend ? 'Processing...' : 'Suspend User'}
          </span>
        </button>

        {/* Reset Password */}
        <button
          onClick={onResetPassword}
          disabled={actionLoading.resetPassword}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-warning/10 text-warning rounded-lg hover:bg-warning/20 transition-colors disabled:opacity-50 border border-warning/20"
        >
          <Key className="h-4 w-4" />
          <span className="font-medium">
            {actionLoading.resetPassword ? 'Resetting...' : 'Reset Password'}
          </span>
        </button>

        {/* Reset Daily Quota */}
        <button
          onClick={onResetQuota}
          disabled={actionLoading.resetQuota}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50 border border-accent/20"
        >
          <Zap className="h-4 w-4" />
          <span className="font-medium">
            {actionLoading.resetQuota ? 'Resetting...' : 'Reset Daily Quota'}
          </span>
        </button>

        {/* Change Package */}
        <button
          onClick={onChangePackage}
          disabled={actionLoading.changePackage}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors disabled:opacity-50 border border-success/20"
        >
          <Zap className="h-4 w-4" />
          <span className="font-medium">
            {actionLoading.changePackage ? 'Changing...' : 'Change Package'}
          </span>
        </button>

        {/* Extend Subscription */}
        <button
          onClick={onExtendSubscription}
          disabled={actionLoading.extendSubscription}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-muted/10 text-muted-foreground rounded-lg hover:bg-muted/20 transition-colors disabled:opacity-50 border border-muted/20"
        >
          <Clock className="h-4 w-4" />
          <span className="font-medium">
            {actionLoading.extendSubscription ? 'Extending...' : 'Extend Subscription (+30 days)'}
          </span>
        </button>
      </div>

      {/* New Password Display */}
      {newPassword && (
        <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-success mb-1">New Password Generated</h4>
              <p className="text-sm text-muted-foreground mb-2">Please share this password securely with the user.</p>
              <div className="flex items-center space-x-2">
                <code className="px-2 py-1 bg-white rounded border text-sm font-mono">
                  {showPassword ? newPassword : '••••••••••••'}
                </code>
                <button
                  onClick={onTogglePasswordVisibility}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface UserProfile {
  id: string
  user_id: string
  full_name: string | null
  role: string
  email_notifications: boolean
  created_at: string
  updated_at: string
  phone_number: string | null
  email?: string
  email_confirmed_at?: string
  last_sign_in_at?: string
}

interface UserProfileCardProps {
  user: UserProfile
  editMode: boolean
  editForm: {
    full_name: string
    role: string
    email_notifications: boolean
    phone_number: string
  }
  onEditFormChange: (updates: Partial<UserProfileCardProps['editForm']>) => void
}

export function UserProfileCard({ user, editMode, editForm, onEditFormChange }: UserProfileCardProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-error/10 text-error border-error/20'
      case 'admin':
        return 'bg-warning/10 text-warning border-warning/20'
      case 'user':
        return 'bg-success/10 text-success border-success/20'
      default:
        return 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20'
    }
  }

  const getStatusIcon = (user: UserProfile) => {
    if (user.email_confirmed_at) {
      return <CheckCircle className="h-5 w-5 text-success" />
    } else {
      return <AlertTriangle className="h-5 w-5 text-warning" />
    }
  }

  return (
    <div className="bg-background rounded-lg border border-border p-6">
      <div className="flex items-start space-x-6">
        {/* Avatar */}
        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
          <span className="text-2xl font-bold text-accent">
            {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
          </span>
        </div>

        {/* User Info */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              {!editMode ? (
                <>
                  <h2 className="text-xl font-bold text-foreground">
                    {user.full_name || 'No name set'}
                  </h2>
                  <p className="text-muted-foreground">{user.email}</p>
                </>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => onEditFormChange({ full_name: e.target.value })}
                    placeholder="Full name"
                    className="text-xl font-bold text-foreground border border-border rounded-lg px-3 py-1 focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {!editMode ? (
                <>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getRoleColor(user.role)}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(user)}
                    <span className="text-sm text-muted-foreground">
                      {user.email_confirmed_at ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </>
              ) : (
                <select
                  value={editForm.role}
                  onChange={(e) => onEditFormChange({ role: e.target.value })}
                  className="px-3 py-1 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              )}
            </div>
          </div>

          {/* User Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="flex items-center space-x-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">User ID</p>
                <p className="text-sm font-mono text-foreground">{user.user_id}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                {!editMode ? (
                  <p className="text-sm text-foreground">{user.phone_number || 'Not provided'}</p>
                ) : (
                  <input
                    type="text"
                    value={editForm.phone_number}
                    onChange={(e) => onEditFormChange({ phone_number: e.target.value })}
                    placeholder="Phone number"
                    className="text-sm text-foreground border border-border rounded px-2 py-1 focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Joined</p>
                <p className="text-sm text-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Active</p>
                <p className="text-sm text-foreground">
                  {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Email Notifications</p>
                {!editMode ? (
                  <p className="text-sm text-foreground">
                    {user.email_notifications ? 'Enabled' : 'Disabled'}
                  </p>
                ) : (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editForm.email_notifications}
                      onChange={(e) => onEditFormChange({ email_notifications: e.target.checked })}
                      className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                    />
                    <span className="text-sm text-foreground">Enable notifications</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
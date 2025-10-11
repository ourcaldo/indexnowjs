'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit3, 
  Ban, 
  Shield, 
  Mail,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye
} from 'lucide-react'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface UserProfile {
  id: string
  user_id: string
  full_name: string | null
  role: string
  email_notifications: boolean
  created_at: string
  updated_at: string
  phone_number: string | null
  package_id?: string
  subscribed_at?: string
  expires_at?: string
  daily_quota_used?: number
  daily_quota_reset_date?: string
  package?: {
    id: string
    name: string
    slug: string
    quota_limits: {
      service_accounts: number
      daily_urls: number
      concurrent_jobs: number
    }
  }
  email?: string
  email_confirmed_at?: string
  last_sign_in_at?: string
}

export default function UserManagement() {
  const router = useRouter()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch(ADMIN_ENDPOINTS.USERS, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data?.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(ADMIN_ENDPOINTS.USER_ROLE(userId), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        fetchUsers() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to update user role:', error)
    }
  }

  const handleSuspendUser = async (userId: string) => {
    try {
      const response = await fetch(ADMIN_ENDPOINTS.SUSPEND_USER(userId), {
        method: 'PATCH',
        credentials: 'include'
      })

      if (response.ok) {
        fetchUsers() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to suspend user:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'admin':
        return 'bg-warning/10 text-warning border-warning/20'
      case 'user':
        return 'bg-success/10 text-success border-success/20'
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

  const getStatusIcon = (user: UserProfile) => {
    if (user.email_confirmed_at) {
      return <CheckCircle className="h-4 w-4 text-success" />
    } else {
      return <AlertTriangle className="h-4 w-4 text-warning" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-border border-t-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts, roles, and permissions</p>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Shield className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
              </p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <CheckCircle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {users.filter(u => u.email_confirmed_at).length}
              </p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {users.filter(u => !u.email_confirmed_at).length}
              </p>
              <p className="text-xs text-muted-foreground">Unverified</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
              <option value="super_admin">Super Admins</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-foreground">User</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Role</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Package</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Joined</th>
                <th className="text-center py-3 px-4 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-secondary cursor-pointer transition-colors"
                  onClick={() => router.push(`/backend/admin/users/${user.user_id}`)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-accent">
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {user.full_name || 'No name'}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(user.role)}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                        user.package?.slug === 'free' ? 'bg-muted/10 text-muted-foreground border-muted/20' :
                        user.package?.slug === 'premium' ? 'bg-accent/10 text-accent border-accent/20' :
                        user.package?.slug === 'pro' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-muted/10 text-muted-foreground border-muted/20'
                      }`}>
                        {user.package?.name || 'No Package'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(user)}
                      <span className="text-sm text-muted-foreground">
                        {user.email_confirmed_at ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/backend/admin/users/${user.user_id}`)
                        }}
                        className="p-1 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/backend/admin/users/${user.user_id}`)
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                        title="Edit User"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          // Quick actions could be implemented here
                        }}
                        className="p-1 text-muted-foreground hover:text-warning hover:bg-warning/10 rounded transition-colors"
                        title="Reset Password"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          // Quick actions could be implemented here
                        }}
                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Suspend User"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No users found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}
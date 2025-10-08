'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/database'
import { AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export interface UserProfile {
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
}

export interface UserWithRole {
  id: string
  email: string | undefined
  name?: string
  role: string
  isAdmin: boolean
  isSuperAdmin: boolean
}

export function useUserProfile() {
  const [user, setUser] = useState<UserWithRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user from Supabase auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        setUser(null)
        return
      }

      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        // Create a basic user object without role information
        setUser({
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.full_name,
          role: 'user',
          isAdmin: false,
          isSuperAdmin: false
        })
        return
      }

      // Get user profile through API layer instead of direct database call
      const response = await fetch(AUTH_ENDPOINTS.PROFILE, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok || response.status === 404) {
        // Create a basic user object without role information
        setUser({
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.full_name,
          role: 'user',
          isAdmin: false,
          isSuperAdmin: false
        })
        return
      }

      const data = await response.json()
      const profile = data.profile

      // Create full user object with role information
      const userWithRole: UserWithRole = {
        id: authUser.id,
        email: authUser.email,
        name: profile.full_name || authUser.user_metadata?.full_name,
        role: profile.role || 'user',
        isAdmin: profile.role === 'admin' || profile.role === 'super_admin',
        isSuperAdmin: profile.role === 'super_admin'
      }

      setUser(userWithRole)
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile')
    } finally {
      setLoading(false)
    }
  }

  return { user, loading, error, refetch: fetchUserProfile }
}
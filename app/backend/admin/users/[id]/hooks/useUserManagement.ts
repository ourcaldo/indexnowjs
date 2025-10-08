'use client'

import { useState, useCallback } from 'react'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface UserActions {
  suspend: boolean
  resetPassword: boolean
  editData: boolean
  resetQuota: boolean
  changePackage: boolean
  extendSubscription: boolean
}

interface UseUserManagementReturn {
  actionLoading: UserActions
  newPassword: string
  showPassword: boolean
  editMode: boolean
  editForm: any
  showPackageModal: boolean
  selectedPackageId: string
  setEditMode: (value: boolean) => void
  setEditForm: (value: any) => void
  setShowPackageModal: (value: boolean) => void
  setSelectedPackageId: (value: string) => void
  handleSuspendUser: (userId: string, onSuccess: () => void) => Promise<void>
  handleResetPassword: (userId: string) => Promise<void>
  handleResetQuota: (userId: string, onSuccess: () => void) => Promise<void>
  handleChangePackage: () => void
  handleExtendSubscription: (userId: string, onSuccess: () => void) => Promise<void>
  handleSaveEdit: (userId: string, editForm: any, onSuccess: () => void) => Promise<void>
  handlePackageChangeSubmit: (userId: string, selectedPackageId: string, onSuccess: () => void) => Promise<void>
  handleEditFormChange: (updates: any) => void
  handleTogglePasswordVisibility: () => void
}

export function useUserManagement(): UseUserManagementReturn {
  const [actionLoading, setActionLoading] = useState<UserActions>({
    suspend: false,
    resetPassword: false,
    editData: false,
    resetQuota: false,
    changePackage: false,
    extendSubscription: false,
  })
  
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: '',
    email_notifications: false,
    phone_number: ''
  })
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState('')

  const handleSuspendUser = useCallback(async (userId: string, onSuccess: () => void) => {
    if (!confirm('Are you sure you want to suspend this user? They will lose access to their account.')) {
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, suspend: true }))
      
      const response = await fetch(ADMIN_ENDPOINTS.SUSPEND_USER(userId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        onSuccess()
        alert('User has been suspended successfully.')
      } else {
        alert('Failed to suspend user. Please try again.')
      }
    } catch (error) {
      console.error('Failed to suspend user:', error)
      alert('An error occurred while suspending user.')
    } finally {
      setActionLoading(prev => ({ ...prev, suspend: false }))
    }
  }, [])

  const handleResetPassword = useCallback(async (userId: string) => {
    if (!confirm('Are you sure you want to reset this user\'s password? They will receive a password reset email.')) {
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, resetPassword: true }))
      
      const response = await fetch(ADMIN_ENDPOINTS.RESET_USER_PASSWORD(userId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setNewPassword(data.temporaryPassword || '')
        alert('Password reset successfully. Temporary password generated.')
      } else {
        alert('Failed to reset password. Please try again.')
      }
    } catch (error) {
      console.error('Failed to reset password:', error)
      alert('An error occurred while resetting password.')
    } finally {
      setActionLoading(prev => ({ ...prev, resetPassword: false }))
    }
  }, [])

  const handleResetQuota = useCallback(async (userId: string, onSuccess: () => void) => {
    if (!confirm('Are you sure you want to reset this user\'s daily quota? This will reset their usage to 0.')) {
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, resetQuota: true }))
      
      const response = await fetch(ADMIN_ENDPOINTS.RESET_USER_QUOTA(userId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        onSuccess()
        alert('User quota has been successfully reset.')
      } else {
        alert('Failed to reset quota. Please try again.')
      }
    } catch (error) {
      console.error('Failed to reset quota:', error)
      alert('An error occurred while resetting quota.')
    } finally {
      setActionLoading(prev => ({ ...prev, resetQuota: false }))
    }
  }, [])

  const handleChangePackage = useCallback(() => {
    setShowPackageModal(true)
  }, [])

  const handleExtendSubscription = useCallback(async (userId: string, onSuccess: () => void) => {
    if (!confirm('Are you sure you want to extend this user\'s subscription by 30 days?')) {
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, extendSubscription: true }))
      
      const response = await fetch(ADMIN_ENDPOINTS.EXTEND_SUBSCRIPTION(userId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ days: 30 }),
      })

      if (response.ok) {
        onSuccess()
        alert('Subscription has been extended by 30 days.')
      } else {
        alert('Failed to extend subscription. Please try again.')
      }
    } catch (error) {
      console.error('Failed to extend subscription:', error)
      alert('An error occurred while extending subscription.')
    } finally {
      setActionLoading(prev => ({ ...prev, extendSubscription: false }))
    }
  }, [])

  const handleSaveEdit = useCallback(async (userId: string, editForm: any, onSuccess: () => void) => {
    try {
      setActionLoading(prev => ({ ...prev, editData: true }))

      const response = await fetch(ADMIN_ENDPOINTS.USER_BY_ID(userId), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        onSuccess()
        setEditMode(false)
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, editData: false }))
    }
  }, [])

  const handlePackageChangeSubmit = useCallback(async (userId: string, selectedPackageId: string, onSuccess: () => void) => {
    if (!selectedPackageId) {
      alert('Please select a package first.')
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, changePackage: true }))
      
      const response = await fetch(ADMIN_ENDPOINTS.CHANGE_PACKAGE(userId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ packageId: selectedPackageId }),
      })

      if (response.ok) {
        const data = await response.json()
        onSuccess()
        setShowPackageModal(false)
        alert(data.message || 'Package changed successfully!')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to change package. Please try again.')
      }
    } catch (error) {
      console.error('Failed to change package:', error)
      alert('An error occurred while changing package.')
    } finally {
      setActionLoading(prev => ({ ...prev, changePackage: false }))
    }
  }, [])

  const handleEditFormChange = useCallback((updates: any) => {
    setEditForm(prev => ({ ...prev, ...updates }))
  }, [])

  const handleTogglePasswordVisibility = useCallback(() => {
    setShowPassword(!showPassword)
  }, [showPassword])

  return {
    actionLoading,
    newPassword,
    showPassword,
    editMode,
    editForm,
    showPackageModal,
    selectedPackageId,
    setEditMode,
    setEditForm,
    setShowPackageModal,
    setSelectedPackageId,
    handleSuspendUser,
    handleResetPassword,
    handleResetQuota,
    handleChangePackage,
    handleExtendSubscription,
    handleSaveEdit,
    handlePackageChangeSubmit,
    handleEditFormChange,
    handleTogglePasswordVisibility
  }
}
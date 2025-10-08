'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit3,
  Save,
  X,
  XCircle
} from 'lucide-react'

// Import extracted components
import { UserProfileCard } from './components/UserProfileCard'
import { UserActionsPanel } from './components/UserActionsPanel'
import { PackageSubscriptionCard } from './components/PackageSubscriptionCard'
import { UserActivityCard } from './components/UserActivityCard'
import { UserSecurityCard } from './components/UserSecurityCard'
import { PackageChangeModal } from './components/PackageChangeModal'
import { SystemIntegration } from './components/SystemIntegration'

// Import custom hooks
import { useUserData } from './hooks/useUserData'
import { useUserManagement } from './hooks/useUserManagement'

export default function UserDetail() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  // Use custom hooks
  const {
    user,
    activityLogs,
    securityData,
    availablePackages,
    loading,
    activityLoading,
    securityLoading,
    fetchUser,
    fetchUserActivity,
    fetchUserSecurity
  } = useUserData(userId)

  const {
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
  } = useUserManagement()

  // Initialize edit form when user data is loaded
  useEffect(() => {
    if (user && !editMode) {
      setEditForm({
        full_name: user.full_name || '',
        role: user.role || '',
        email_notifications: user.email_notifications || false,
        phone_number: user.phone_number || ''
      })
    }
  }, [user, editMode, setEditForm])

  // Action handlers with callback functions
  const handleSuspendUserWithRefresh = () => handleSuspendUser(userId, fetchUser)
  const handleResetPasswordWithCallback = () => handleResetPassword(userId)
  const handleResetQuotaWithRefresh = () => handleResetQuota(userId, fetchUser)
  const handleExtendSubscriptionWithRefresh = () => handleExtendSubscription(userId, fetchUser)
  const handleSaveEditWithRefresh = () => handleSaveEdit(userId, editForm, () => {
    fetchUser()
    fetchUserActivity()
    fetchUserSecurity()
  })
  const handlePackageChangeSubmitWithRefresh = () => handlePackageChangeSubmit(userId, selectedPackageId, fetchUser)

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-border border-t-primary"></div>
      </div>
    )
  }

  // User not found state
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">User Not Found</h2>
        <p className="text-muted-foreground mb-4">The user you're looking for doesn't exist.</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Details</h1>
            <p className="text-muted-foreground mt-1">Manage user account and permissions</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit User</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-secondary transition-colors flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSaveEditWithRefresh}
                disabled={actionLoading.editData}
                className="px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{actionLoading.editData ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* User Profile Card */}
      <UserProfileCard
        user={user}
        editMode={editMode}
        editForm={editForm}
        onEditFormChange={handleEditFormChange}
      />

      {/* Package Subscription Card */}
      <PackageSubscriptionCard user={user} />

      {/* Admin Actions Panel */}
      <UserActionsPanel
        actionLoading={actionLoading}
        newPassword={newPassword}
        showPassword={showPassword}
        onTogglePasswordVisibility={handleTogglePasswordVisibility}
        onSuspendUser={handleSuspendUserWithRefresh}
        onResetPassword={handleResetPasswordWithCallback}
        onResetQuota={handleResetQuotaWithRefresh}
        onChangePackage={handleChangePackage}
        onExtendSubscription={handleExtendSubscriptionWithRefresh}
      />

      {/* Recent Activity Card */}
      <UserActivityCard
        activityLogs={activityLogs}
        activityLoading={activityLoading}
      />

      {/* Security Overview Card */}
      <UserSecurityCard
        securityData={securityData}
        securityLoading={securityLoading}
      />

      {/* System Integration Card */}
      <SystemIntegration
        userId={userId}
        systemLoading={loading}
      />

      {/* Package Change Modal */}
      <PackageChangeModal
        isOpen={showPackageModal}
        availablePackages={availablePackages}
        selectedPackageId={selectedPackageId}
        changePackageLoading={actionLoading.changePackage}
        onClose={() => setShowPackageModal(false)}
        onPackageSelect={setSelectedPackageId}
        onSubmit={handlePackageChangeSubmitWithRefresh}
      />
    </div>
  )
}
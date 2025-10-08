// Enhanced Hook System - P3.1 Implementation
// Centralized exports for all custom hooks

// Data Hooks - Core data fetching and management
export { useJobManagement } from './data/useJobManagement'
export { useEnhancedUserProfile } from './data/useEnhancedUserProfile'
export { usePaymentHistory } from './data/usePaymentHistory'
export { useRankTracking } from './data/useRankTracking'

// Business Logic Hooks - Complex business operations
export { useTrialManager } from './business/useTrialManager'
export { useQuotaManager } from './business/useQuotaManager'
export { useServiceAccounts } from './business/useServiceAccounts'

// UI/UX Hooks - User interface state and interactions
export { useModal } from './ui/useModal'
export { useNotification } from './ui/useNotification'

// Legacy Hooks - Existing hooks maintained for compatibility
export { useUserProfile } from './useUserProfile'
export { useGlobalQuotaManager } from './useGlobalQuotaManager'
export { useSocketIO } from './useSocketIO'
export { usePaymentProcessor } from './usePaymentProcessor'
export { useKeywordUsage } from './useKeywordUsage'
export { useQuotaValidation } from './useQuotaValidation'
export { useActivityLogger } from './useActivityLogger'
export { useSiteSettings } from './use-site-settings'
export { useToast } from './use-toast'

// Admin Hooks - Admin panel specific functionality
export { useAdminActivityLogger, useAdminPageViewLogger } from './use-admin-activity-logger'

// Type exports for TypeScript support
export type { NotificationType } from './ui/useNotification'
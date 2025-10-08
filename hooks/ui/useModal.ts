'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface ModalState {
  isOpen: boolean
  title?: string
  content?: any
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  type?: 'default' | 'success' | 'warning' | 'error' | 'info'
  showClose?: boolean
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  persistent?: boolean
  data?: any
}

interface ModalActions {
  onConfirm?: (data?: any) => void | Promise<void>
  onCancel?: () => void
  onClose?: () => void
  confirmText?: string
  cancelText?: string
  confirmLoading?: boolean
}

interface UseModalReturn {
  // State
  modal: ModalState
  isOpen: boolean
  
  // Actions
  openModal: (config: Partial<ModalState & ModalActions>) => void
  closeModal: () => void
  updateModal: (updates: Partial<ModalState>) => void
  
  // Confirmation modal specific
  openConfirmModal: (config: {
    title: string
    message: string
    onConfirm: () => void | Promise<void>
    onCancel?: () => void
    confirmText?: string
    cancelText?: string
    type?: ModalState['type']
  }) => void
  
  // Loading modal specific
  openLoadingModal: (config: {
    title?: string
    message?: string
  }) => void
  
  // Success/Error modal specific
  openResultModal: (config: {
    type: 'success' | 'error'
    title: string
    message: string
    onClose?: () => void
  }) => void
}

export function useModal(): UseModalReturn {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    size: 'md',
    type: 'default',
    showClose: true,
    closeOnOverlay: true,
    closeOnEscape: true,
    persistent: false
  })
  
  const [modalActions, setModalActions] = useState<ModalActions>({})
  const modalRef = useRef<HTMLDivElement>(null)

  // Open modal with configuration
  const openModal = useCallback((config: Partial<ModalState & ModalActions>) => {
    const { onConfirm, onCancel, onClose, confirmText, cancelText, confirmLoading, ...modalConfig } = config
    
    setModal(prev => ({
      ...prev,
      ...modalConfig,
      isOpen: true
    }))
    
    setModalActions({
      onConfirm,
      onCancel,
      onClose,
      confirmText,
      cancelText,
      confirmLoading
    })
  }, [])

  // Close modal
  const closeModal = useCallback(() => {
    setModal(prev => ({
      ...prev,
      isOpen: false
    }))
    
    // Call onClose callback if provided
    if (modalActions.onClose) {
      modalActions.onClose()
    }
    
    // Clear actions
    setModalActions({})
  }, [modalActions.onClose])

  // Update modal state
  const updateModal = useCallback((updates: Partial<ModalState>) => {
    setModal(prev => ({
      ...prev,
      ...updates
    }))
  }, [])

  // Open confirmation modal
  const openConfirmModal = useCallback((config: {
    title: string
    message: string
    onConfirm: () => void | Promise<void>
    onCancel?: () => void
    confirmText?: string
    cancelText?: string
    type?: ModalState['type']
  }) => {
    openModal({
      title: config.title,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">{config.message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                if (config.onCancel) config.onCancel()
                closeModal()
              }}
              className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-secondary transition-colors"
            >
              {config.cancelText || 'Cancel'}
            </button>
            <button
              onClick={async () => {
                try {
                  await config.onConfirm()
                  closeModal()
                } catch (err) {
                  console.error('Confirm action failed:', err)
                }
              }}
              className={`px-4 py-2 rounded-lg text-white transition-colors ${
                config.type === 'error' 
                  ? 'bg-destructive hover:bg-destructive/90' 
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {config.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      ),
      type: config.type || 'default',
      size: 'md',
      showClose: false,
      closeOnOverlay: false,
      closeOnEscape: true
    })
  }, [openModal, closeModal])

  // Open loading modal
  const openLoadingModal = useCallback((config: {
    title?: string
    message?: string
  }) => {
    openModal({
      title: config.title || 'Loading...',
      content: (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
          {config.message && (
            <span className="ml-3 text-muted-foreground">{config.message}</span>
          )}
        </div>
      ),
      size: 'sm',
      showClose: false,
      closeOnOverlay: false,
      closeOnEscape: false,
      persistent: true
    })
  }, [openModal])

  // Open success/error result modal
  const openResultModal = useCallback((config: {
    type: 'success' | 'error'
    title: string
    message: string
    onClose?: () => void
  }) => {
    const IconComponent = config.type === 'success' 
      ? () => (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-success/10 mb-4">
            <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      : () => (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-4">
            <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )

    openModal({
      title: config.title,
      content: (
        <div className="text-center">
          <IconComponent />
          <p className="text-muted-foreground mb-6">{config.message}</p>
          <button
            onClick={() => {
              if (config.onClose) config.onClose()
              closeModal()
            }}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            OK
          </button>
        </div>
      ),
      type: config.type,
      size: 'sm',
      showClose: false,
      closeOnOverlay: true,
      closeOnEscape: true
    })
  }, [openModal, closeModal])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modal.isOpen && modal.closeOnEscape && !modal.persistent) {
        closeModal()
      }
    }

    if (modal.isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [modal.isOpen, modal.closeOnEscape, modal.persistent, closeModal])

  return {
    modal: {
      ...modal,
      ...modalActions
    },
    isOpen: modal.isOpen,
    openModal,
    closeModal,
    updateModal,
    openConfirmModal,
    openLoadingModal,
    openResultModal
  }
}
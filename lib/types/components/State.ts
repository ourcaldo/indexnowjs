/**
 * Component state types for IndexNow Studio
 */

import type { ThemeMode } from '../global/Application';

// Modal state types
export interface ModalState {
  isOpen: boolean;
  title?: string;
  description?: string;
  content?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  type?: 'default' | 'alert' | 'confirm' | 'custom';
  data?: any;
  onConfirm?: (data?: any) => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export interface ModalActions {
  openModal: (modal: Partial<ModalState>) => void;
  closeModal: () => void;
  updateModal: (updates: Partial<ModalState>) => void;
  setLoading: (isLoading: boolean) => void;
}

// Notification state types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: number;
}

export interface NotificationState {
  notifications: Notification[];
}

export interface NotificationActions {
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  clearNotificationsByType: (type: NotificationType) => void;
}

// Form state types
export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  touchedFields: Record<string, boolean>;
}

export interface FormActions<T = any> {
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  clearFieldError: (field: keyof T) => void;
  setTouched: (field: keyof T, touched?: boolean) => void;
  reset: (data?: T) => void;
  submit: () => Promise<void>;
}

// Table state types
export interface TableState<T = any> {
  data: T[];
  filteredData: T[];
  selectedRows: T[];
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  sortBy?: keyof T;
  sortOrder: 'asc' | 'desc';
  searchTerm: string;
  filters: Record<string, any>;
  isLoading: boolean;
}

export interface TableActions<T = any> {
  setData: (data: T[]) => void;
  setSelectedRows: (rows: T[]) => void;
  selectRow: (row: T) => void;
  deselectRow: (row: T) => void;
  selectAllRows: () => void;
  deselectAllRows: () => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;
  setSorting: (column: keyof T, order?: 'asc' | 'desc') => void;
  setSearchTerm: (term: string) => void;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  setLoading: (isLoading: boolean) => void;
}

// Sidebar state types
export interface SidebarState {
  isCollapsed: boolean;
  isMobile: boolean;
  activePath: string;
  openSubmenus: string[];
}

export interface SidebarActions {
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  setActivePath: (path: string) => void;
  toggleSubmenu: (menuId: string) => void;
  setMobileMode: (isMobile: boolean) => void;
}

// Theme state types

export interface ThemeState {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  isSystemMode: boolean;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
}

export interface ThemeActions {
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setCustomColors: (colors: Partial<ThemeState['colors']>) => void;
  resetColors: () => void;
}

// Loading state types
export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
  progress?: number;
  error?: string;
}

export interface LoadingActions {
  setLoading: (isLoading: boolean, text?: string) => void;
  setProgress: (progress: number) => void;
  setError: (error: string) => void;
  clearError: () => void;
}

// Search state types
export interface SearchState {
  query: string;
  results: any[];
  isSearching: boolean;
  hasSearched: boolean;
  totalResults: number;
  filters: Record<string, any>;
  sort: {
    field: string;
    order: 'asc' | 'desc';
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
}

export interface SearchActions {
  setQuery: (query: string) => void;
  search: (query?: string) => Promise<void>;
  clearSearch: () => void;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  setSort: (field: string, order?: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
}

// Upload state types
export interface UploadState {
  files: File[];
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  progress: Record<string, number>;
  errors: Record<string, string>;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
}

export interface UploadActions {
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  uploadFiles: () => Promise<void>;
  setProgress: (fileIndex: number, progress: number) => void;
  setError: (fileIndex: number, error: string) => void;
}

// Validation state types
export interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  isValidating: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning';
  value?: any;
}

export interface ValidationActions {
  validateField: (field: string, value: any) => Promise<void>;
  validateAll: () => Promise<void>;
  clearErrors: () => void;
  clearFieldErrors: (field: string) => void;
  addError: (error: ValidationError) => void;
  removeError: (field: string) => void;
}

// Wizard/Steps state types
export interface WizardState {
  currentStep: number;
  totalSteps: number;
  steps: WizardStep[];
  isCompleted: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  data: Record<string, any>;
}

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  isValid: boolean;
  isOptional: boolean;
  component?: React.ComponentType<any>;
}

export interface WizardActions {
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  setStepData: (stepId: string, data: any) => void;
  setStepValid: (stepId: string, isValid: boolean) => void;
  completeStep: (stepId: string) => void;
  reset: () => void;
}

// Dashboard state types - specific to IndexNow Studio
export interface DashboardState {
  stats: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalUrls: number;
    successfulUrls: number;
    quotaUsage: Record<string, number>;
  };
  recentActivity: any[];
  charts: {
    jobsOverTime: any[];
    urlsOverTime: any[];
    successRate: any[];
    quotaUsage: any[];
  };
  isLoading: boolean;
  lastUpdated?: Date;
}

// Payment-specific state types
export interface PaymentState {
  selectedPackage?: {
    id: string;
    name: string;
    price: number;
    currency: string;
  };
  billingPeriod: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
    };
  };
  paymentMethod: string;
  promoCode?: string;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
  };
  total: number;
  isProcessing: boolean;
  error?: string;
}

// Indexing-specific state types
export interface IndexingJobState {
  jobs: any[];
  selectedJobs: string[];
  filters: {
    status: string[];
    type: string[];
    tags: string[];
    dateRange?: {
      from: Date;
      to: Date;
    };
  };
  sort: {
    field: string;
    order: 'asc' | 'desc';
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    totalItems: number;
  };
  isLoading: boolean;
}

// Rank tracking state types
export interface RankTrackingState {
  keywords: any[];
  domains: any[];
  selectedKeywords: string[];
  selectedDomain: string;
  selectedDevice: string;
  selectedCountry: string;
  selectedTags: string[];
  searchTerm: string;
  isLoading: boolean;
  showActionsMenu: boolean;
  showDeleteConfirm: boolean;
  showTagModal: boolean;
  newTag: string;
  isDeleting: boolean;
  isAddingTag: boolean;
}
/**
 * Component prop types for IndexNow Studio
 */

import React from 'react';
import type { NavigationItem as GlobalNavigationItem } from '../global/Application';

// Common component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

export interface LoadingProps extends BaseComponentProps {
  isLoading: boolean;
  fallback?: React.ReactNode;
  error?: string | null;
}

// Layout component props
export interface LayoutProps extends BaseComponentProps {
  title?: string;
  description?: string;
  hideNavigation?: boolean;
  fullWidth?: boolean;
}

export interface SidebarProps extends BaseComponentProps {
  isCollapsed: boolean;
  onToggle: () => void;
  navigationItems: ComponentNavigationItem[];
  currentPath: string;
}

// Component-specific NavigationItem with React icon support
export interface ComponentNavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: ComponentNavigationItem[];
  isActive?: boolean;
  isDisabled?: boolean;
  badge?: string | number;
  requiredRole?: string[];
}

export interface HeaderProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

// Dashboard component props
export interface DashboardPreviewProps extends BaseComponentProps {
  title: string;
  subtitle: string;
  variant?: 'login' | 'register' | 'forgot';
}

export interface StatsCardProps extends BaseComponentProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon?: React.ComponentType<{ className?: string }>;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  isLoading?: boolean;
}

export interface ChartProps extends BaseComponentProps {
  data: any[];
  type: 'line' | 'bar' | 'area' | 'pie' | 'donut';
  xAxis?: string;
  yAxis?: string;
  title?: string;
  height?: number;
  colors?: string[];
  isLoading?: boolean;
}

// Table component props
export interface TableProps<T = any> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selection?: {
    selectedRows: T[];
    onSelectionChange: (rows: T[]) => void;
    selectionKey: keyof T;
  };
  sorting?: {
    sortBy?: keyof T;
    sortOrder?: 'asc' | 'desc';
    onSort: (column: keyof T) => void;
  };
  pagination?: PaginationProps;
}

export interface TableColumn<T = any> {
  key: keyof T;
  title: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface PaginationProps extends BaseComponentProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  showPageSize?: boolean;
  pageSizeOptions?: number[];
}

// Form component props
export interface FormProps extends BaseComponentProps {
  onSubmit: (data: any) => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  resetOnSubmit?: boolean;
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  autoComplete?: string;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
}

export interface SelectProps extends BaseComponentProps {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  clearable?: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface TextareaProps extends BaseComponentProps {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export interface CheckboxProps extends BaseComponentProps {
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  description?: string;
}

export interface RadioGroupProps extends BaseComponentProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
  required?: boolean;
  error?: string;
  orientation?: 'horizontal' | 'vertical';
}

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

// Button component props
export interface ButtonProps extends BaseComponentProps {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void | Promise<void>;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

export interface IconButtonProps extends BaseComponentProps {
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  isLoading?: boolean;
  onClick?: () => void | Promise<void>;
  tooltip?: string;
  'aria-label': string;
}

// Modal and dialog props
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
}

export interface AlertDialogProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
}

export interface DrawerProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  side?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

// Feedback component props
export interface ToastProps extends BaseComponentProps {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose: () => void;
}

export interface AlertProps extends BaseComponentProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'primary' | 'outline';
  }>;
}

export interface ProgressProps extends BaseComponentProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showValue?: boolean;
  label?: string;
  isIndeterminate?: boolean;
}

// Advanced component props
export interface AdvancedNeonCardProps extends BaseComponentProps {
  intensity?: 'low' | 'medium' | 'high';
  mousePosition: { x: number; y: number };
  isTracking: boolean;
}

export interface ClientOnlyWrapperProps extends BaseComponentProps {
  fallback?: React.ReactNode;
}

export interface FileUploadProps extends BaseComponentProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  dragAndDrop?: boolean;
  showPreview?: boolean;
  error?: string;
}

export interface DatePickerProps extends BaseComponentProps {
  label?: string;
  value?: Date;
  defaultValue?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  format?: string;
}

export interface ColorPickerProps extends BaseComponentProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (color: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  format?: 'hex' | 'rgb' | 'hsl';
  showInput?: boolean;
  presets?: string[];
}

// Navigation component props
export interface TabsProps extends BaseComponentProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'pills' | 'underline';
}

export interface TabProps extends BaseComponentProps {
  value: string;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface StepsProps extends BaseComponentProps {
  current: number;
  steps: StepItem[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
}

export interface StepItem {
  title: string;
  description?: string;
  status?: 'pending' | 'current' | 'completed' | 'error';
  icon?: React.ComponentType<{ className?: string }>;
}
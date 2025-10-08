// Page type definitions for CMS Pages system

export interface CMSPage {
  id: string
  title: string
  slug: string
  content: string | null
  template: string
  featured_image_url: string | null
  author_id: string
  status: 'draft' | 'published' | 'archived'
  // Removed is_homepage field
  meta_title: string | null
  meta_description: string | null
  custom_css: string | null
  custom_js: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  // Extended fields added by API
  author_name?: string
  author_email?: string
}

export interface PageTemplate {
  id: string
  name: string
  description: string
  preview_image?: string
}

export interface PageListResponse {
  pages: CMSPage[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PageResponse {
  page: CMSPage
}

export interface PageCreateRequest {
  title: string
  slug: string
  content?: string
  template?: 'default' | 'landing' | 'about' | 'contact' | 'services'
  featured_image_url?: string
  status?: 'draft' | 'published' | 'archived'
  // Removed is_homepage field
  meta_title?: string
  meta_description?: string
  custom_css?: string
  custom_js?: string
}

export interface PageUpdateRequest {
  title?: string
  slug?: string
  content?: string
  template?: 'default' | 'landing' | 'about' | 'contact' | 'services'
  featured_image_url?: string
  status?: 'draft' | 'published' | 'archived'
  // Removed is_homepage field
  meta_title?: string
  meta_description?: string
  custom_css?: string
  custom_js?: string
}

export interface PageStatusUpdateRequest {
  status: 'draft' | 'published' | 'archived'
}

// Removed HomepageSettings and HomepageUpdateRequest interfaces

export interface SlugValidationResponse {
  isUnique: boolean
  slug: string
}

export interface PublicPageResponse {
  page: {
    id: string
    title: string
    slug: string
    content: string
    template: string
    featured_image_url: string | null
    meta_title: string | null
    meta_description: string | null
    custom_css: string | null
    custom_js: string | null
    published_at: string
    author_name: string
  }
}

export interface PublicPagesListResponse {
  pages: {
    id: string
    title: string
    slug: string
    template: string
    featured_image_url: string | null
    meta_title: string | null
    meta_description: string | null
    published_at: string
  }[]
  total: number
}

// Template definitions
export const PAGE_TEMPLATES = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Standard page layout with header and content area'
  },
  landing: {
    id: 'landing',
    name: 'Landing Page',
    description: 'Hero section with call-to-action and features'
  },
  about: {
    id: 'about',
    name: 'About Page',
    description: 'Company information and team presentation'
  },
  contact: {
    id: 'contact',
    name: 'Contact Page',
    description: 'Contact form and business information'
  },
  services: {
    id: 'services',
    name: 'Services Page',
    description: 'Service listings with descriptions and pricing'
  }
} as const

export type PageTemplateId = keyof typeof PAGE_TEMPLATES
export type PageStatus = 'draft' | 'published' | 'archived'

// API response types
export interface APIResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface APIError {
  error: string
  message?: string
  details?: any
}

// Search and filter types
export interface PageFilters {
  status?: PageStatus | 'all'
  template?: PageTemplateId | 'all'
  search?: string
  // Removed is_homepage field
}

export interface PageSortOptions {
  field: 'title' | 'created_at' | 'updated_at' | 'published_at'
  direction: 'asc' | 'desc'
}

export interface PaginationOptions {
  page: number
  limit: number
}
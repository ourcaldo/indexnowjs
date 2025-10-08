/**
 * Main library barrel export for IndexNow Studio
 * Provides access to all core functionality, services, and types
 */

// Core exports
export * from './core';

// Services exports
export * from './services';

// Types exports
export * from './types';

// Re-export specific items to avoid conflicts
export { getCacheService } from './services/infrastructure/CacheService';
export { getSupabaseService } from './services/external/SupabaseService';
export { createEmailServiceFromEnv } from './services/external/EmailService';
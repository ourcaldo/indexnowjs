/**
 * Core module barrel exports for IndexNow Studio
 * Exports all core functionality including API, config, and constants
 */

// API exports
export * from './api/ApiClient';
export * from './api/ApiMiddleware';
export * from './api/ApiErrorHandler';

// Configuration exports
export * from './config/AppConfig';
export * from './config/DatabaseConfig';
export * from './config/PaymentConfig';

// Constants exports
export * from './constants/AppConstants';
export * from './constants/ApiEndpoints';
export * from './constants/ValidationRules';

// Legacy exports for backward compatibility
export { queryClient } from './queryClient';
export { authenticateRequest } from './api-middleware';
export type { AuthenticatedRequest } from './api-middleware';
export { SocketIOBroadcaster } from './socketio-broadcaster';
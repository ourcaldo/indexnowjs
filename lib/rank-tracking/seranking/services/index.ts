/**
 * SeRanking Services Module
 * Central export file for all SeRanking integration services
 */

// Main Service Facade (PRIMARY ENTRY POINT)
export { SeRankingService, createSeRankingService, seRankingService } from './SeRankingService';
export type { 
  SeRankingServiceConfig,
  SystemStatus,
  KeywordIntelligenceResult,
  BulkEnrichmentResult
} from './SeRankingService';

// Core services
export { KeywordEnrichmentService } from './KeywordEnrichmentService';
export type { KeywordEnrichmentConfig, BatchKeywordRequest } from './KeywordEnrichmentService';

export { KeywordBankService } from './KeywordBankService';

export { IntegrationService } from './IntegrationService';
export type { 
  IntegrationServiceConfig,
  UsageReport
} from './IntegrationService';

export { ErrorHandlingService } from './ErrorHandlingService';
export type { ErrorHandlingConfig, ErrorContext, RecoveryResult } from './ErrorHandlingService';

export { ValidationService } from './ValidationService';
export type { ValidationResult, ValidationError, ValidationWarning } from './ValidationService';

// Queue and processing services
export { EnrichmentQueue } from './EnrichmentQueue';
export type { QueueConfig } from './EnrichmentQueue';

export { JobProcessor } from './JobProcessor';
export type { ProcessorConfig } from './JobProcessor';

export { EnrichmentOrchestrator } from './EnrichmentOrchestrator';

// Monitoring Services
export { ApiMetricsCollector } from './ApiMetricsCollector';
export type { ApiMetricsConfig } from './ApiMetricsCollector';

export { QuotaMonitor } from './QuotaMonitor';
export type { QuotaMonitorConfig } from './QuotaMonitor';

export { HealthChecker } from './HealthChecker';
export type { HealthCheckConfig } from './HealthChecker';

// Export types
export * from '../types/SeRankingTypes';
export * from '../types/KeywordBankTypes';
export * from '../types/ServiceTypes';
export * from '../types/EnrichmentJobTypes';

// Re-export client
export { SeRankingApiClient } from '../client/SeRankingApiClient';

// Default configurations
export {
  DEFAULT_JOB_CONFIG,
  JobPriority,
  EnrichmentJobType,
  EnrichmentJobStatus,
  JobEventType
} from '../types/EnrichmentJobTypes';

// SIMPLIFIED FACTORY FUNCTIONS

/**
 * Create main SeRanking service with default configuration
 * This is the recommended way to use the SeRanking integration
 */
export function createSeRankingServiceWithDefaults(apiKey: string) {
  return createSeRankingService({
    apiKey,
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerHour: 3000,
      requestsPerDay: 50000
    },
    monitoring: {
      enableMetrics: true,
      enableAlerts: true,
      quotaWarningThreshold: 0.8,
      quotaCriticalThreshold: 0.95,
      metricsRetentionDays: 30
    },
    queue: {
      maxQueueSize: 10000,
      batchSize: 25,
      maxConcurrentJobs: 3,
      processingTimeout: 300000
    },
    logging: {
      level: 'info',
      enableDetailedLogging: false
    }
  });
}

// Legacy utility functions for backward compatibility
export function createEnrichmentOrchestrator(config: Partial<import('./EnrichmentOrchestrator').OrchestratorConfig> = {}) {
  return new EnrichmentOrchestrator(config);
}

export function createEnrichmentQueue(config: Partial<import('./EnrichmentQueue').QueueConfig> = {}) {
  return new EnrichmentQueue(config);
}

export function createJobProcessor(
  queue: EnrichmentQueue,
  enrichmentService: KeywordEnrichmentService,
  errorHandler: ErrorHandlingService,
  config: Partial<import('./JobProcessor').ProcessorConfig> = {}
) {
  return new JobProcessor(config, queue, enrichmentService, errorHandler);
}
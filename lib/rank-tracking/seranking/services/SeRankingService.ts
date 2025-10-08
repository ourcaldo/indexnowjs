/**
 * SeRanking Service - Main Facade
 * Primary entry point for the SeRanking integration system
 * Orchestrates all services and provides a unified, simplified API
 */

import { EventEmitter } from 'events';
import {
  ServiceResponse,
  SeRankingKeywordData,
  QuotaStatus,
  ApiMetrics,
  HealthCheckResult,
  BulkProcessingJob,
  SeRankingError,
  SeRankingErrorType
} from '../types/SeRankingTypes';
import {
  KeywordBankEntity,
  KeywordBankQueryResult,
  CacheStats
} from '../types/KeywordBankTypes';
import {
  ISeRankingService,
  IKeywordEnrichmentService,
  IKeywordBankService,
  IIntegrationService,
  IApiMetricsCollector,
  IQuotaMonitor,
  IHealthChecker,
  ISeRankingApiClient
} from '../types/ServiceTypes';

// Service imports
import { KeywordEnrichmentService } from './KeywordEnrichmentService';
import { IntegrationService } from './IntegrationService';
import { EnrichmentQueue } from './EnrichmentQueue';
import { JobProcessor } from './JobProcessor';
import { ApiMetricsCollector } from './ApiMetricsCollector';
import { QuotaMonitor } from './QuotaMonitor';
import { HealthChecker } from './HealthChecker';
import { ErrorHandlingService } from './ErrorHandlingService';
import { ValidationService } from './ValidationService';
import { KeywordBankService } from './KeywordBankService';
import { SeRankingApiClient } from '../client/SeRankingApiClient';
import { logger } from '@/lib/monitoring/error-handling';

// Configuration interfaces
export interface SeRankingServiceConfig {
  // API Configuration
  apiUrl: string;
  apiKey: string;
  
  // Rate Limiting
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  
  // Cache and Processing
  cache: {
    defaultExpiryDays: number;
    enablePreloading: boolean;
    maxCacheSize: number;
  };
  
  // Queue and Processing
  queue: {
    maxQueueSize: number;
    batchSize: number;
    maxConcurrentJobs: number;
    processingTimeout: number;
  };
  
  // Monitoring and Alerts
  monitoring: {
    enableMetrics: boolean;
    metricsRetentionDays: number;
    quotaWarningThreshold: number;
    quotaCriticalThreshold: number;
    enableAlerts: boolean;
  };
  
  // Error Handling
  errorHandling: {
    maxRetryAttempts: number;
    baseRetryDelay: number;
    enableCircuitBreaker: boolean;
    enableGracefulDegradation: boolean;
  };
  
  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableDetailedLogging: boolean;
  };
}

// System status interface
export interface SystemStatus {
  isInitialized: boolean;
  isHealthy: boolean;
  overallScore: number;
  services: {
    api: boolean;
    keywordBank: boolean;
    queue: boolean;
    monitoring: boolean;
    integration: boolean;
  };
  lastHealthCheck: Date;
  quotaStatus: QuotaStatus;
  metrics: ApiMetrics;
  activeJobs: number;
  systemUptime: number;
}

// Simplified API responses
export interface KeywordIntelligenceResult {
  keyword: string;
  countryCode: string;
  data: KeywordBankEntity | null;
  source: 'cache' | 'api' | 'fallback';
  fromCache: boolean;
  processingTime: number;
  warnings: string[];
}

export interface BulkEnrichmentResult {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  totalKeywords: number;
  processedKeywords: number;
  successfulKeywords: number;
  failedKeywords: number;
  estimatedCompletion?: Date;
  results: KeywordIntelligenceResult[];
}

// Default configuration
const DEFAULT_CONFIG: SeRankingServiceConfig = {
  apiUrl: 'https://api4.seranking.com/research/keywords',
  apiKey: process.env.SERANKING_API_KEY || '',
  rateLimits: {
    requestsPerMinute: 60,
    requestsPerHour: 3000,
    requestsPerDay: 50000
  },
  cache: {
    defaultExpiryDays: 7,
    enablePreloading: false,
    maxCacheSize: 100000
  },
  queue: {
    maxQueueSize: 10000,
    batchSize: 25,
    maxConcurrentJobs: 3,
    processingTimeout: 300000
  },
  monitoring: {
    enableMetrics: true,
    metricsRetentionDays: 30,
    quotaWarningThreshold: 0.8,
    quotaCriticalThreshold: 0.95,
    enableAlerts: true
  },
  errorHandling: {
    maxRetryAttempts: 3,
    baseRetryDelay: 1000,
    enableCircuitBreaker: true,
    enableGracefulDegradation: true
  },
  logging: {
    level: 'info',
    enableDetailedLogging: false
  }
};

export class SeRankingService extends EventEmitter implements ISeRankingService {
  private config: SeRankingServiceConfig;
  private isInitialized: boolean = false;
  private initializationPromise?: Promise<void>;
  private shutdownPromise?: Promise<void>;
  private startedAt: Date = new Date();
  
  // Core Services
  private apiClient!: ISeRankingApiClient;
  private keywordBankService!: IKeywordBankService;
  private enrichmentService!: IKeywordEnrichmentService;
  private integrationService!: IIntegrationService;
  
  // Queue Services
  private enrichmentQueue!: EnrichmentQueue;
  private jobProcessor!: JobProcessor;
  
  // Monitoring Services
  private metricsCollector!: IApiMetricsCollector;
  private quotaMonitor!: IQuotaMonitor;
  private healthChecker!: IHealthChecker;
  
  // Support Services
  private errorHandler!: ErrorHandlingService;
  private validationService = ValidationService;
  
  // Facade interface properties (required by ISeRankingService)
  public enrichment!: IKeywordEnrichmentService;
  public keywordBank!: IKeywordBankService;
  public integration!: IIntegrationService;
  public validation!: {
    keyword: any;
    response: any;
    quota: any;
  };
  public monitoring!: {
    metrics: IApiMetricsCollector;
    quota: IQuotaMonitor;
    health: IHealthChecker;
  };
  public queue!: {
    enrichment: EnrichmentQueue;
    processor: JobProcessor;
  };

  constructor(config: Partial<SeRankingServiceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validateConfig();
  }

  /**
   * Initialize the SeRanking service and all sub-services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.log('warn', 'SeRankingService is already initialized');
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform the actual service initialization
   */
  private async performInitialization(): Promise<void> {
    try {
      this.log('info', 'Initializing SeRankingService...');

      // Initialize core services
      await this.initializeCoreServices();
      
      // Initialize queue services
      await this.initializeQueueServices();
      
      // Initialize monitoring services
      await this.initializeMonitoringServices();
      
      // Setup facade properties
      this.setupFacadeProperties();
      
      // Perform initial health check
      await this.performInitialHealthCheck();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      this.log('info', 'SeRankingService initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize SeRankingService:', error);
      this.emit('initialization_error', error);
      throw error;
    }
  }

  /**
   * Initialize core services
   */
  private async initializeCoreServices(): Promise<void> {
    this.log('debug', 'Initializing core services...');
    
    // Initialize support services first
    this.errorHandler = new ErrorHandlingService({
      maxRetryAttempts: this.config.errorHandling.maxRetryAttempts,
      baseRetryDelay: this.config.errorHandling.baseRetryDelay,
      enableGracefulDegradation: this.config.errorHandling.enableGracefulDegradation,
      logLevel: this.config.logging.level
    });

    // ValidationService is static, no need to instantiate
    
    // Initialize API client
    this.apiClient = new SeRankingApiClient({
      baseUrl: this.config.apiUrl,
      apiKey: this.config.apiKey,
      timeout: 30000,
      retryAttempts: this.config.errorHandling.maxRetryAttempts,
      retryDelay: this.config.errorHandling.baseRetryDelay
    });

    // Initialize keyword bank service
    this.keywordBankService = new KeywordBankService();
    
    // Initialize integration service
    this.integrationService = new IntegrationService({
      defaultQuotaLimit: this.config.rateLimits.requestsPerDay,
      quotaWarningThreshold: this.config.monitoring.quotaWarningThreshold,
      quotaCriticalThreshold: this.config.monitoring.quotaCriticalThreshold,
      enableUsageAlerts: this.config.monitoring.enableAlerts,
      logLevel: this.config.logging.level
    }, this.apiClient);

    // Initialize enrichment service
    this.enrichmentService = new KeywordEnrichmentService(
      this.keywordBankService,
      this.apiClient,
      this.errorHandler,
      {
        cacheExpiryDays: this.config.cache.defaultExpiryDays,
        batchSize: this.config.queue.batchSize,
        maxConcurrentRequests: this.config.queue.maxConcurrentJobs,
        enableMetrics: this.config.monitoring.enableMetrics,
        enableCachePreloading: this.config.cache.enablePreloading,
        enableGracefulDegradation: this.config.errorHandling.enableGracefulDegradation,
        logLevel: this.config.logging.level
      }
    );
  }

  /**
   * Initialize queue services
   */
  private async initializeQueueServices(): Promise<void> {
    this.log('debug', 'Initializing queue services...');
    
    this.enrichmentQueue = new EnrichmentQueue({
      maxQueueSize: this.config.queue.maxQueueSize,
      defaultBatchSize: this.config.queue.batchSize,
      jobTimeout: this.config.queue.processingTimeout,
      enableMetrics: this.config.monitoring.enableMetrics,
      enableEvents: true
    });

    this.jobProcessor = new JobProcessor({
      maxWorkers: this.config.queue.maxConcurrentJobs,
      maxConcurrentJobsPerWorker: 2,
      jobProcessingTimeout: this.config.queue.processingTimeout,
      enableAutoScaling: true,
      enableMetrics: this.config.monitoring.enableMetrics,
      enableDetailedLogging: this.config.logging.enableDetailedLogging
    }, this.enrichmentQueue, this.enrichmentService, this.errorHandler);
  }

  /**
   * Initialize monitoring services
   */
  private async initializeMonitoringServices(): Promise<void> {
    this.log('debug', 'Initializing monitoring services...');
    
    this.metricsCollector = new ApiMetricsCollector({
      retentionDays: this.config.monitoring.metricsRetentionDays,
      enableDetailedLogging: this.config.logging.enableDetailedLogging,
      logLevel: this.config.logging.level
    });

    this.quotaMonitor = new QuotaMonitor({
      alertThresholds: {
        warning: this.config.monitoring.quotaWarningThreshold,
        critical: this.config.monitoring.quotaCriticalThreshold,
        emergency: 0.99
      },
      predictionWindow: {
        enabled: true,
        lookAheadHours: 24,
        minimumDataPoints: 10,
        accuracyThreshold: 0.8
      },
      notifications: {
        channels: ['email', 'webhook'],
        escalationLevels: {
          level1: ['user'],
          level2: ['admin'],
          level3: ['emergency']
        }
      },
      retentionDays: this.config.monitoring.metricsRetentionDays,
      logLevel: this.config.logging.level
    }, this.integrationService);

    this.healthChecker = new HealthChecker({
      intervals: {
        quickCheck: 60000, // 1 minute
        fullCheck: 300000, // 5 minutes
        deepDiagnostics: 1800000 // 30 minutes
      },
      thresholds: {
        responseTime: {
          good: 1000,
          degraded: 5000,
          unhealthy: 10000
        },
        errorRate: {
          good: 1,
          degraded: 5,
          unhealthy: 10
        },
        availability: {
          good: 99,
          degraded: 95,
          unhealthy: 90
        }
      },
      recovery: {
        enableAutoRecovery: true,
        maxRetryAttempts: 3,
        retryBackoffMs: 5000,
        escalationTimeoutMinutes: 15
      },
      logLevel: this.config.logging.level
    }, this.apiClient, this.keywordBankService, this.integrationService);
  }

  /**
   * Setup facade properties for interface compliance
   */
  private setupFacadeProperties(): void {
    this.enrichment = this.enrichmentService;
    this.keywordBank = this.keywordBankService;
    this.integration = this.integrationService;
    
    this.validation = {
      keyword: ValidationService,
      response: ValidationService,
      quota: this.integrationService
    };
    
    this.monitoring = {
      metrics: this.metricsCollector,
      quota: this.quotaMonitor,
      health: this.healthChecker
    };
    
    this.queue = {
      enrichment: this.enrichmentQueue,
      processor: this.jobProcessor
    };
  }

  /**
   * Perform initial health check
   */
  private async performInitialHealthCheck(): Promise<void> {
    try {
      this.log('debug', 'Performing initial health check...');
      const healthResult = await this.healthChecker.performHealthCheck();
      
      if (healthResult.status !== 'healthy') {
        this.log('warn', `Initial health check shows ${healthResult.status} status: ${healthResult.error_message}`);
      }
    } catch (error) {
      this.log('warn', 'Initial health check failed:', error);
    }
  }

  /**
   * Get keyword intelligence with automatic caching and fallback
   */
  async getKeywordIntelligence(
    keyword: string, 
    countryCode: string, 
    options: {
      forceRefresh?: boolean;
      useCache?: boolean;
      timeout?: number;
    } = {}
  ): Promise<ServiceResponse<KeywordIntelligenceResult>> {
    const startTime = Date.now();
    
    try {
      await this.ensureInitialized();
      
      // Validate input
      const keywordValidation = ValidationService.validateKeywordsBatch([keyword]);
      const countryValidation = ValidationService.validateCountryCode(countryCode);
      
      if (!keywordValidation.isValid || !countryValidation.isValid) {
        const errors = [...(keywordValidation.errors || []), ...(countryValidation.errors || [])];
        return {
          success: false,
          error: {
            message: `Validation failed: ${errors.map(e => e.message).join(', ')}`,
            type: SeRankingErrorType.INVALID_REQUEST_ERROR
          }
        };
      }

      // Use enrichment service
      const enrichResult = await this.enrichmentService.enrichKeyword(
        keyword, 
        countryCode, 
        options.forceRefresh
      );

      if (!enrichResult.success) {
        return enrichResult as ServiceResponse<KeywordIntelligenceResult>;
      }

      const processingTime = Date.now() - startTime;
      const result: KeywordIntelligenceResult = {
        keyword,
        countryCode,
        data: enrichResult.data!,
        source: enrichResult.data ? 'cache' : 'api',
        fromCache: !options.forceRefresh,
        processingTime,
        warnings: []
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return await this.errorHandler.handleError(error as Error, {
        operation: 'getKeywordIntelligence',
        timestamp: new Date(),
        keywords: [keyword],
        countryCode
      }) as ServiceResponse<KeywordIntelligenceResult>;
    }
  }

  /**
   * Bulk enrich keywords with queue-based processing
   */
  async bulkEnrichKeywords(
    keywords: Array<{keyword: string; countryCode: string}>,
    options: {
      priority?: 'high' | 'normal' | 'low';
      batchSize?: number;
      scheduledFor?: Date;
    } = {}
  ): Promise<ServiceResponse<BulkEnrichmentResult>> {
    try {
      await this.ensureInitialized();
      
      // Validate input
      const keywordList = keywords.map(k => k.keyword);
      const validation = ValidationService.validateKeywordsBatch(keywordList);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            message: `Validation failed: ${validation.errors.join(', ')}`,
            type: SeRankingErrorType.INVALID_REQUEST_ERROR
          }
        };
      }

      // Use enrichment service for bulk processing
      const bulkResult = await this.enrichmentService.enrichKeywordsBulk(keywords);
      
      if (!bulkResult.success || !bulkResult.data) {
        return bulkResult as ServiceResponse<BulkEnrichmentResult>;
      }

      const job = bulkResult.data;
      const result: BulkEnrichmentResult = {
        jobId: job.job_id,
        status: job.status,
        totalKeywords: job.total_keywords,
        processedKeywords: job.processed_keywords,
        successfulKeywords: job.successful_keywords,
        failedKeywords: job.failed_keywords,
        estimatedCompletion: job.estimated_completion,
        results: [] // Would be populated from job results
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return await this.errorHandler.handleError(error, {
        operation: 'bulkEnrichKeywords',
        timestamp: new Date(),
        keywords: keywords.map(k => k.keyword),
        batchSize: keywords.length
      }) as ServiceResponse<BulkEnrichmentResult>;
    }
  }

  /**
   * Get comprehensive system status
   */
  async getStatus(): Promise<SystemStatus> {
    try {
      const [healthResult, quotaStatus, metrics] = await Promise.all([
        this.healthChecker?.performHealthCheck().catch(() => ({ status: 'unknown' as const })),
        this.integrationService?.getQuotaStatus().catch(() => ({ success: false })),
        this.metricsCollector?.getMetrics().catch(() => ({}))
      ]);

      const queueStatus = await this.enrichmentQueue?.getQueueStatus().catch(() => ({ processing: 0 }));
      
      return {
        isInitialized: this.isInitialized,
        isHealthy: healthResult?.status === 'healthy',
        overallScore: this.calculateOverallScore(healthResult, quotaStatus),
        services: {
          api: this.apiClient ? await this.apiClient.isHealthy().catch(() => false) : false,
          keywordBank: !!this.keywordBankService,
          queue: !!this.enrichmentQueue,
          monitoring: !!this.healthChecker,
          integration: !!this.integrationService
        },
        lastHealthCheck: new Date(),
        quotaStatus: quotaStatus?.success ? quotaStatus.data! : {
          current_usage: 0,
          quota_limit: 0,
          remaining_quota: 0,
          usage_percentage: 0,
          reset_date: new Date(),
          reset_interval: 'monthly'
        },
        metrics: metrics as ApiMetrics || {
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          average_response_time: 0,
          cache_hits: 0,
          cache_misses: 0
        },
        activeJobs: queueStatus?.processing || 0,
        systemUptime: Date.now() - this.startedAt.getTime()
      };
    } catch (error) {
      this.log('error', 'Failed to get system status:', error);
      return {
        isInitialized: this.isInitialized,
        isHealthy: false,
        overallScore: 0,
        services: {
          api: false,
          keywordBank: false,
          queue: false,
          monitoring: false,
          integration: false
        },
        lastHealthCheck: new Date(),
        quotaStatus: {
          current_usage: 0,
          quota_limit: 0,
          remaining_quota: 0,
          usage_percentage: 0,
          reset_date: new Date(),
          reset_interval: 'monthly'
        },
        metrics: {
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          average_response_time: 0,
          cache_hits: 0,
          cache_misses: 0
        },
        activeJobs: 0,
        systemUptime: Date.now() - this.startedAt.getTime()
      };
    }
  }

  /**
   * Get system metrics and analytics
   */
  async getSystemMetrics(): Promise<ServiceResponse<{
    metrics: ApiMetrics;
    cacheStats: CacheStats;
    queueStats: any;
    quotaStatus: QuotaStatus;
  }>> {
    try {
      await this.ensureInitialized();
      
      const [metrics, cacheStats, queueStats, quotaResult] = await Promise.all([
        this.metricsCollector.getMetrics(),
        this.keywordBankService.getCacheStats(),
        this.enrichmentQueue.getQueueStats(),
        this.integrationService.getQuotaStatus()
      ]);

      return {
        success: true,
        data: {
          metrics,
          cacheStats,
          queueStats,
          quotaStatus: quotaResult.success ? quotaResult.data! : {
            current_usage: 0,
            quota_limit: 0,
            remaining_quota: 0,
            usage_percentage: 0,
            reset_date: new Date(),
            reset_interval: 'monthly'
          }
        }
      };
    } catch (error) {
      return await this.errorHandler.handleError(error, {
        operation: 'getSystemMetrics',
        timestamp: new Date()
      });
    }
  }

  /**
   * Configure bulk processing settings
   */
  async configureBulkProcessing(settings: {
    batchSize?: number;
    maxConcurrentJobs?: number;
    queueTimeout?: number;
  }): Promise<ServiceResponse<boolean>> {
    try {
      await this.ensureInitialized();
      
      // Update configuration
      if (settings.batchSize) {
        this.config.queue.batchSize = settings.batchSize;
      }
      if (settings.maxConcurrentJobs) {
        this.config.queue.maxConcurrentJobs = settings.maxConcurrentJobs;
      }
      if (settings.queueTimeout) {
        this.config.queue.processingTimeout = settings.queueTimeout;
      }

      this.emit('configuration_updated', { bulkProcessing: settings });
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      return await this.errorHandler.handleError(error, {
        operation: 'configureBulkProcessing',
        timestamp: new Date()
      });
    }
  }

  /**
   * Enable monitoring and alerting
   */
  async enableMonitoring(config: {
    enableMetrics?: boolean;
    quotaThresholds?: { warning: number; critical: number };
    alertChannels?: string[];
  }): Promise<ServiceResponse<boolean>> {
    try {
      await this.ensureInitialized();
      
      // Update monitoring configuration
      if (config.enableMetrics !== undefined) {
        this.config.monitoring.enableMetrics = config.enableMetrics;
      }
      if (config.quotaThresholds) {
        this.config.monitoring.quotaWarningThreshold = config.quotaThresholds.warning;
        this.config.monitoring.quotaCriticalThreshold = config.quotaThresholds.critical;
      }

      this.emit('monitoring_configured', config);
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      return await this.errorHandler.handleError(error, {
        operation: 'enableMonitoring',
        timestamp: new Date()
      });
    }
  }

  /**
   * Graceful shutdown of all services
   */
  async shutdown(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }

  /**
   * Perform the actual shutdown process
   */
  private async performShutdown(): Promise<void> {
    try {
      this.log('info', 'Shutting down SeRankingService...');
      
      // Stop accepting new requests
      this.emit('shutdown_started');
      
      // Shutdown services in reverse order
      if (this.jobProcessor) {
        await this.jobProcessor.shutdown?.();
      }
      
      if (this.enrichmentQueue) {
        await this.enrichmentQueue.shutdown?.();
      }
      
      // Stop monitoring services
      if (this.quotaMonitor) {
        await this.quotaMonitor.shutdown?.();
      }
      
      if (this.healthChecker) {
        await this.healthChecker.shutdown?.();
      }

      this.isInitialized = false;
      this.emit('shutdown_complete');
      
      this.log('info', 'SeRankingService shutdown complete');
    } catch (error) {
      this.log('error', 'Error during shutdown:', error);
      this.emit('shutdown_error', error);
      throw error;
    }
  }

  /**
   * Ensure the service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized && !this.initializationPromise) {
      await this.initialize();
    }
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    if (!this.isInitialized) {
      throw new Error('SeRankingService failed to initialize');
    }
  }

  /**
   * Validate service configuration
   */
  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('SeRanking API key is required');
    }
    if (!this.config.apiUrl) {
      throw new Error('SeRanking API URL is required');
    }
    if (this.config.queue.batchSize <= 0 || this.config.queue.batchSize > 1000) {
      throw new Error('Invalid batch size: must be between 1 and 1000');
    }
  }

  /**
   * Calculate overall system health score
   */
  private calculateOverallScore(healthResult: any, quotaStatus: any): number {
    let score = 0;
    
    // Health status (40% weight)
    if (healthResult?.status === 'healthy') score += 40;
    else if (healthResult?.status === 'degraded') score += 20;
    
    // Quota status (30% weight)
    if (quotaStatus?.success && quotaStatus.data) {
      const usagePercent = quotaStatus.data.usage_percentage;
      if (usagePercent < 0.8) score += 30;
      else if (usagePercent < 0.95) score += 20;
      else score += 10;
    }
    
    // Service availability (30% weight)
    const servicesUp = [
      this.apiClient,
      this.keywordBankService,
      this.enrichmentQueue,
      this.integrationService
    ].filter(Boolean).length;
    score += (servicesUp / 4) * 30;
    
    return Math.round(score);
  }

  /**
   * Log messages with appropriate level
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const logLevel = this.config.logging.level;
    
    // Simple level filtering
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] >= levels[logLevel]) {
      const metadata = args.length > 0 ? { details: args } : {};
      const logMessage = `[SeRankingService] ${message}`;
      
      logger[level](metadata, logMessage);
    }
  }
}

// Export singleton instance creator
export function createSeRankingService(config?: Partial<SeRankingServiceConfig>): SeRankingService {
  return new SeRankingService(config);
}

// Export default instance
export const seRankingService = createSeRankingService();
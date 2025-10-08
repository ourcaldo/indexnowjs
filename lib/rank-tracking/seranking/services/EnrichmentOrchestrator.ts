/**
 * Enrichment Orchestrator Service
 * High-level service that orchestrates queue and processor operations
 * Provides unified interface for keyword enrichment job management
 */

import { EventEmitter } from 'events';
import { EnrichmentQueue } from './EnrichmentQueue';
import { JobProcessor } from './JobProcessor';
import { KeywordEnrichmentService } from './KeywordEnrichmentService';
import { ErrorHandlingService } from './ErrorHandlingService';
import { KeywordBankService } from './KeywordBankService';
import { SeRankingApiClient } from '../client/SeRankingApiClient';
import { logger } from '@/lib/monitoring/error-handling';
import {
  EnrichmentJob,
  EnrichmentJobType,
  EnrichmentJobStatus,
  JobPriority,
  EnqueueJobRequest,
  BatchEnqueueRequest,
  CreateJobResponse,
  JobStatusResponse,
  QueueOperationResponse,
  QueueStats,
  JobEventType,
  JobEvent,
  SingleKeywordJobData,
  BulkEnrichmentJobData,
  CacheRefreshJobData
} from '../types/EnrichmentJobTypes';

// Orchestrator configuration
export interface OrchestratorConfig {
  maxWorkers: number;
  defaultBatchSize: number;
  enableAutoScaling: boolean;
  enableMetrics: boolean;
  enableEvents: boolean;
  heartbeatInterval: number;
  quotaMonitoringInterval: number;
  cleanupInterval: number;
  startProcessorOnInit: boolean;
}

const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  maxWorkers: 3,
  defaultBatchSize: 25,
  enableAutoScaling: true,
  enableMetrics: true,
  enableEvents: true,
  heartbeatInterval: 30000,
  quotaMonitoringInterval: 60000,
  cleanupInterval: 3600000, // 1 hour
  startProcessorOnInit: true
};

export class EnrichmentOrchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private queue!: EnrichmentQueue;
  private processor!: JobProcessor;
  private enrichmentService!: KeywordEnrichmentService;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private eventHandlers: Map<string, Function> = new Map();

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
    
    // Initialize services
    this.initializeServices();
    
    // Set up event handling
    this.setupEventHandling();
  }

  /**
   * Initialize all required services
   */
  private initializeServices(): void {
    try {
      // Initialize core services
      const keywordBankService = new KeywordBankService();
      const apiClient = new SeRankingApiClient({
        apiKey: process.env.SERANKING_API_KEY || '',
        baseUrl: process.env.SERANKING_API_URL || 'https://api.seranking.com',
        timeout: 30000
      });
      const errorHandler = new ErrorHandlingService();
      
      // Initialize enrichment service
      this.enrichmentService = new KeywordEnrichmentService(
        keywordBankService,
        apiClient,
        errorHandler,
        {
          cacheExpiryDays: 7,
          batchSize: this.config.defaultBatchSize,
          maxConcurrentRequests: 3,
          enableMetrics: this.config.enableMetrics
        }
      );

      // Initialize queue
      this.queue = new EnrichmentQueue({
        maxQueueSize: 10000,
        defaultBatchSize: this.config.defaultBatchSize,
        enableMetrics: this.config.enableMetrics,
        enableEvents: this.config.enableEvents,
        heartbeatInterval: this.config.heartbeatInterval
      });

      // Initialize processor
      this.processor = new JobProcessor(
        this.queue,
        this.enrichmentService,
        errorHandler,
        {
          maxWorkers: this.config.maxWorkers,
          enableAutoScaling: this.config.enableAutoScaling,
          enableMetrics: this.config.enableMetrics,
          heartbeatInterval: this.config.heartbeatInterval
        }
      );

      this.isInitialized = true;
      logger.info({}, 'EnrichmentOrchestrator services initialized successfully');
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to initialize EnrichmentOrchestrator services');
      throw error;
    }
  }

  /**
   * Set up event handling between services
   */
  private setupEventHandling(): void {
    if (!this.config.enableEvents) return;

    // Queue events
    this.queue.on('job:event', (event: JobEvent) => {
      this.emit('job:event', event);
      this.handleJobEvent(event);
    });

    this.queue.on('queue:heartbeat', (data) => {
      this.emit('queue:heartbeat', data);
    });

    this.queue.on('queue:paused', () => {
      this.emit('queue:paused');
    });

    this.queue.on('queue:resumed', () => {
      this.emit('queue:resumed');
    });

    // Processor events
    this.processor.on('processor:started', () => {
      this.emit('processor:started');
    });

    this.processor.on('processor:stopped', () => {
      this.emit('processor:stopped');
    });

    this.processor.on('worker:started', (data) => {
      this.emit('worker:started', data);
    });

    this.processor.on('worker:stopped', (data) => {
      this.emit('worker:stopped', data);
    });

    this.processor.on('worker:heartbeat', (status) => {
      this.emit('worker:heartbeat', status);
    });

    this.processor.on('processor:emergency-stop', (data) => {
      this.emit('processor:emergency-stop', data);
      this.handleEmergencyStop(data);
    });
  }

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Orchestrator not initialized');
    }

    if (this.isRunning) {
      logger.warn({}, 'Orchestrator is already running');
      return;
    }

    try {
      // Start processor if configured to do so
      if (this.config.startProcessorOnInit) {
        await this.processor.start();
      }

      this.isRunning = true;
      this.emit('orchestrator:started');
      
      logger.info({}, 'EnrichmentOrchestrator started successfully');
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to start EnrichmentOrchestrator');
      throw error;
    }
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn({}, 'Orchestrator is not running');
      return;
    }

    try {
      // Stop processor
      await this.processor.stop();
      
      // Shutdown queue
      await this.queue.shutdown();

      this.isRunning = false;
      this.removeAllListeners();
      
      this.emit('orchestrator:stopped');
      logger.info({}, 'EnrichmentOrchestrator stopped successfully');
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error stopping EnrichmentOrchestrator');
      throw error;
    }
  }

  /**
   * Enqueue a single keyword enrichment job
   */
  async enrichSingleKeyword(
    userId: string,
    keyword: string,
    countryCode: string,
    options: {
      languageCode?: string;
      forceRefresh?: boolean;
      priority?: JobPriority;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<CreateJobResponse> {
    const jobData: SingleKeywordJobData = {
      keyword,
      countryCode,
      languageCode: options.languageCode || 'en',
      forceRefresh: options.forceRefresh || false,
      metadata: options.metadata
    };

    const jobRequest: EnqueueJobRequest = {
      type: EnrichmentJobType.SINGLE_KEYWORD,
      data: jobData,
      priority: options.priority || JobPriority.NORMAL,
      metadata: options.metadata
    };

    return await this.queue.enqueueJob(userId, jobRequest);
  }

  /**
   * Enqueue a bulk keyword enrichment job
   */
  async enrichBulkKeywords(
    userId: string,
    keywords: Array<{
      keyword: string;
      countryCode: string;
      languageCode?: string;
    }>,
    options: {
      forceRefresh?: boolean;
      priority?: JobPriority;
      batchSize?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<CreateJobResponse> {
    const jobData: BulkEnrichmentJobData = {
      keywords,
      forceRefresh: options.forceRefresh || false,
      metadata: options.metadata
    };

    const jobRequest: EnqueueJobRequest = {
      type: EnrichmentJobType.BULK_ENRICHMENT,
      data: jobData,
      priority: options.priority || JobPriority.NORMAL,
      config: {
        batchSize: options.batchSize || this.config.defaultBatchSize
      },
      metadata: options.metadata
    };

    return await this.queue.enqueueJob(userId, jobRequest);
  }

  /**
   * Schedule cache refresh job
   */
  async scheduleReachRefresh(
    userId: string,
    filterCriteria: {
      countryCode?: string;
      languageCode?: string;
      olderThanDays?: number;
      keywords?: string[];
    },
    options: {
      priority?: JobPriority;
      scheduledFor?: Date;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<CreateJobResponse> {
    const jobData: CacheRefreshJobData = {
      filterCriteria,
      metadata: options.metadata
    };

    const jobRequest: EnqueueJobRequest = {
      type: EnrichmentJobType.CACHE_REFRESH,
      data: jobData,
      priority: options.priority || JobPriority.LOW,
      scheduledFor: options.scheduledFor,
      metadata: options.metadata
    };

    return await this.queue.enqueueJob(userId, jobRequest, options.scheduledFor);
  }

  /**
   * Enqueue multiple jobs in batch
   */
  async enqueueBatch(
    userId: string,
    jobs: Array<{
      type: EnrichmentJobType;
      data: any;
      priority?: JobPriority;
      metadata?: Record<string, any>;
    }>,
    globalOptions: {
      batchSize?: number;
      priority?: JobPriority;
    } = {}
  ): Promise<CreateJobResponse[]> {
    const batchRequest: BatchEnqueueRequest = {
      jobs: jobs.map(job => ({
        type: job.type,
        data: job.data,
        priority: job.priority || globalOptions.priority || JobPriority.NORMAL,
        metadata: job.metadata
      })),
      globalConfig: {
        batchSize: globalOptions.batchSize || this.config.defaultBatchSize
      }
    };

    return await this.queue.enqueueBatch(userId, batchRequest);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string, userId?: string): Promise<JobStatusResponse> {
    return await this.queue.getJobStatus(jobId, userId);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, userId?: string): Promise<QueueOperationResponse> {
    return await this.queue.cancelJob(jobId, userId);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const queueStats = await this.queue.getQueueStats();
    const processorStats = this.processor.getStats();

    // Merge worker status from processor
    queueStats.workerStatus = {
      activeWorkers: processorStats.workerStatuses.filter(w => w.status === 'processing').length,
      idleWorkers: processorStats.workerStatuses.filter(w => w.status === 'idle').length,
      totalWorkers: processorStats.workerCount
    };

    return queueStats;
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<QueueOperationResponse> {
    return await this.queue.pauseQueue();
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<QueueOperationResponse> {
    return await this.queue.resumeQueue();
  }

  /**
   * Start job processing
   */
  async startProcessing(): Promise<void> {
    if (!this.processor) {
      throw new Error('Processor not initialized');
    }
    await this.processor.start();
  }

  /**
   * Stop job processing
   */
  async stopProcessing(): Promise<void> {
    if (!this.processor) {
      throw new Error('Processor not initialized');
    }
    await this.processor.stop();
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupCompletedJobs(olderThanDays: number = 30): Promise<QueueOperationResponse> {
    return await this.queue.cleanupCompletedJobs(olderThanDays);
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<{
    orchestrator: {
      isInitialized: boolean;
      isRunning: boolean;
      config: OrchestratorConfig;
    };
    queue: QueueStats;
    processor: ReturnType<JobProcessor['getStats']>;
    enrichmentService: {
      isHealthy: boolean;
      cacheStats?: any;
    };
  }> {
    const queueStats = await this.getQueueStats();
    const processorStats = this.processor.getStats();

    return {
      orchestrator: {
        isInitialized: this.isInitialized,
        isRunning: this.isRunning,
        config: this.config
      },
      queue: queueStats,
      processor: processorStats,
      enrichmentService: {
        isHealthy: true, // This would check actual service health
        cacheStats: {} // This would get actual cache stats
      }
    };
  }

  /**
   * Handle job events
   */
  private handleJobEvent(event: JobEvent): void {
    switch (event.type) {
      case JobEventType.JOB_COMPLETED:
        logger.info({ jobId: event.jobId }, `Job ${event.jobId} completed successfully`);
        break;
        
      case JobEventType.JOB_FAILED:
        logger.error({ jobId: event.jobId, error: event.data?.error }, `Job ${event.jobId} failed`);
        break;
        
      case JobEventType.JOB_RETRYING:
        logger.warn({ jobId: event.jobId, retryCount: event.data?.retryCount }, `Job ${event.jobId} being retried (attempt ${event.data?.retryCount})`);
        break;
        
      default:
        if (this.config.enableMetrics) {
          logger.info({ jobId: event.jobId, eventType: event.type }, `Job event: ${event.type} for job ${event.jobId}`);
        }
    }
  }

  /**
   * Handle emergency stop scenario
   */
  private async handleEmergencyStop(data: { quotaUsage: number }): Promise<void> {
    logger.error({ quotaUsage: `${(data.quotaUsage * 100).toFixed(1)}%` }, `Emergency stop triggered - quota usage: ${(data.quotaUsage * 100).toFixed(1)}%`);
    
    try {
      // Pause the queue to prevent new jobs from starting
      await this.pauseQueue();
      
      // Emit emergency event for external handling
      this.emit('orchestrator:emergency-stop', data);
      
      // Could also implement additional emergency procedures here
      // such as notifying administrators, creating alerts, etc.
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error handling emergency stop');
    }
  }

  /**
   * Graceful restart of the orchestrator
   */
  async restart(): Promise<void> {
    logger.info({}, 'Restarting EnrichmentOrchestrator...');
    
    try {
      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      await this.start();
      
      logger.info({}, 'EnrichmentOrchestrator restarted successfully');
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error restarting EnrichmentOrchestrator');
      throw error;
    }
  }

  /**
   * Health check for the entire system
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    status: string;
    checks: {
      orchestrator: boolean;
      queue: boolean;
      processor: boolean;
      enrichmentService: boolean;
    };
    details?: any;
  }> {
    const checks = {
      orchestrator: this.isInitialized && this.isRunning,
      queue: true, // Would implement actual queue health check
      processor: true, // Would implement actual processor health check
      enrichmentService: true // Would implement actual service health check
    };

    const allHealthy = Object.values(checks).every(check => check);

    return {
      healthy: allHealthy,
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      details: {
        uptime: this.isRunning ? Date.now() - Date.now() : 0, // Would track actual uptime
        lastActivity: new Date()
      }
    };
  }

  /**
   * Export orchestrator metrics
   */
  exportMetrics(): {
    queue: any;
    processor: any;
    orchestrator: {
      isRunning: boolean;
      uptime: number;
      eventListeners: number;
    };
  } {
    return {
      queue: {}, // Would export actual queue metrics
      processor: this.processor.getStats(),
      orchestrator: {
        isRunning: this.isRunning,
        uptime: Date.now() - Date.now(), // Would track actual uptime
        eventListeners: this.listenerCount('job:event')
      }
    };
  }
}
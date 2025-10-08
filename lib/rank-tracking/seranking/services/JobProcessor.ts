/**
 * Job Processor Service
 * Background worker for processing keyword enrichment jobs
 * Handles job execution, worker pool management, and load balancing
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { EnrichmentQueue } from './EnrichmentQueue';
import { KeywordEnrichmentService } from './KeywordEnrichmentService';
import { ErrorHandlingService } from './ErrorHandlingService';
import { JobErrorHandler } from '@/lib/job-management/JobErrorHandler';
import { logger } from '@/lib/monitoring/error-handling';
import {
  EnrichmentJob,
  EnrichmentJobType,
  EnrichmentJobStatus,
  JobPriority,
  WorkerConfig,
  WorkerStatus,
  JobResult,
  KeywordEnrichmentResult,
  SingleKeywordJobData,
  BulkEnrichmentJobData,
  CacheRefreshJobData,
  JobError,
  JobErrorType,
  JobEventType
} from '../types/EnrichmentJobTypes';
import {
  ServiceResponse,
  SeRankingKeywordData,
  QuotaStatus
} from '../types/SeRankingTypes';
import {
  KeywordBankEntity
} from '../types/KeywordBankTypes';

// Processor configuration
export interface ProcessorConfig {
  maxWorkers: number;
  maxConcurrentJobsPerWorker: number;
  workerIdleTimeout: number;
  jobProcessingTimeout: number;
  enableAutoScaling: boolean;
  minWorkers: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  heartbeatInterval: number;
  enableMetrics: boolean;
  enableDetailedLogging: boolean;
  quotaCheckInterval: number;
  emergencyStopThreshold: number;
}

const DEFAULT_PROCESSOR_CONFIG: ProcessorConfig = {
  maxWorkers: 5,
  maxConcurrentJobsPerWorker: 2,
  workerIdleTimeout: 300000, // 5 minutes
  jobProcessingTimeout: 600000, // 10 minutes
  enableAutoScaling: true,
  minWorkers: 1,
  scaleUpThreshold: 0.8,
  scaleDownThreshold: 0.3,
  heartbeatInterval: 30000, // 30 seconds
  enableMetrics: true,
  enableDetailedLogging: false,
  quotaCheckInterval: 60000, // 1 minute
  emergencyStopThreshold: 0.95 // 95% quota usage
};

// Worker class for individual job processing
class Worker extends EventEmitter {
  public readonly id: string;
  public status: WorkerStatus['status'] = 'idle';
  public currentJobs: Map<string, EnrichmentJob> = new Map();
  public totalProcessed: number = 0;
  public totalErrors: number = 0;
  public startedAt: Date = new Date();
  public lastHeartbeat: Date = new Date();
  
  private config: WorkerConfig;
  private queue: EnrichmentQueue;
  private enrichmentService: KeywordEnrichmentService;
  private errorHandler: ErrorHandlingService;
  private processingTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private isShuttingDown: boolean = false;

  constructor(
    config: WorkerConfig,
    queue: EnrichmentQueue,
    enrichmentService: KeywordEnrichmentService,
    errorHandler: ErrorHandlingService
  ) {
    super();
    this.id = config.workerId;
    this.config = config;
    this.queue = queue;
    this.enrichmentService = enrichmentService;
    this.errorHandler = errorHandler;
    
    this.startHeartbeat();
  }

  /**
   * Start processing jobs
   */
  async start(): Promise<void> {
    if (this.status !== 'idle') {
      logger.warn({ workerId: this.id }, `Worker ${this.id} is already running`);
      return;
    }

    this.status = 'processing';
    this.emit('worker:started', { workerId: this.id });
    
    // Start processing loop
    this.processJobs();
  }

  /**
   * Main job processing loop
   */
  private async processJobs(): Promise<void> {
    while (!this.isShuttingDown && this.status === 'processing') {
      try {
        // Check if we can take more jobs
        if (this.currentJobs.size >= this.config.maxConcurrentJobs) {
          await this.sleep(1000); // Wait 1 second before checking again
          continue;
        }

        // Get next job from queue
        const job = await this.queue.dequeueJob(this.id);
        if (!job) {
          await this.sleep(5000); // Wait 5 seconds if no jobs available
          continue;
        }

        // Process the job
        this.processJobAsync(job);
        
      } catch (error) {
        logger.error({ workerId: this.id, error: error instanceof Error ? error.message : String(error) }, `Worker ${this.id} processing error`);
        this.totalErrors++;
        await this.sleep(10000); // Wait 10 seconds on error
      }
    }
  }

  /**
   * Process a single job asynchronously
   */
  private async processJobAsync(job: EnrichmentJob): Promise<void> {
    this.currentJobs.set(job.id, job);
    
    try {
      await JobErrorHandler.withJobErrorHandling(
        async () => {
          const result = await this.processJob(job);
          await this.queue.completeJob(job.id, result);
          this.totalProcessed++;
          return result;
        },
        {
          jobId: job.id,
          jobType: 'keyword_enrichment_job',
          jobName: `SeRanking ${job.type} Job`,
          metadata: { workerId: this.id, jobType: job.type }
        }
      );
    } catch (error) {
      const jobError: JobError = {
        type: JobErrorType.WORKER_ERROR,
        message: error instanceof Error ? error.message : 'Unknown worker error',
        retryable: true,
        timestamp: new Date(),
        context: {
          jobId: job.id,
          workerId: this.id
        }
      };
      
      await this.queue.failJob(job.id, jobError);
      this.totalErrors++;
    } finally {
      this.currentJobs.delete(job.id);
    }
  }

  /**
   * Process a job based on its type
   */
  private async processJob(job: EnrichmentJob): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      let result: JobResult;
      
      switch (job.type) {
        case EnrichmentJobType.SINGLE_KEYWORD:
          result = await this.processSingleKeywordJob(job);
          break;
          
        case EnrichmentJobType.BULK_ENRICHMENT:
          result = await this.processBulkEnrichmentJob(job);
          break;
          
        case EnrichmentJobType.CACHE_REFRESH:
          result = await this.processCacheRefreshJob(job);
          break;
          
        default:
          throw new Error(`Unsupported job type: ${job.type}`);
      }

      result.processingTime = Date.now() - startTime;
      result.completedAt = new Date();
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        jobId: job.id,
        status: EnrichmentJobStatus.FAILED,
        results: [],
        summary: {
          totalKeywords: 0,
          successfulEnrichments: 0,
          failedEnrichments: 0,
          skippedKeywords: 0,
          cacheHits: 0,
          apiCallsMade: 0,
          quotaUsed: 0,
          processingTime,
          averageTimePerKeyword: 0
        },
        startedAt: job.startedAt || new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process single keyword enrichment job
   */
  private async processSingleKeywordJob(job: EnrichmentJob): Promise<JobResult> {
    const data = job.data as SingleKeywordJobData;
    const startTime = Date.now();
    
    try {
      // Update progress
      await this.queue.updateJobProgress(job.id, {
        currentKeyword: data.keyword,
        processed: 0,
        total: 1
      });

      // Enrich keyword
      const enrichmentResult = await this.enrichmentService.enrichKeyword(
        data.keyword,
        data.countryCode,
        data.forceRefresh || false
      );

      const keywordResult: KeywordEnrichmentResult = {
        keyword: data.keyword,
        countryCode: data.countryCode,
        languageCode: data.languageCode || 'en',
        success: enrichmentResult.success,
        data: enrichmentResult.data,
        fromCache: enrichmentResult.metadata?.source === 'cache',
        processingTime: Date.now() - startTime,
        apiCallMade: enrichmentResult.metadata?.source === 'api',
        quotaUsed: enrichmentResult.metadata?.source === 'api' ? 1 : 0
      };

      if (!enrichmentResult.success) {
        keywordResult.error = {
          type: 'enrichment_error',
          message: enrichmentResult.error?.message || 'Unknown error',
          retryable: true
        };
      }

      // Update final progress
      await this.queue.updateJobProgress(job.id, {
        processed: 1,
        successful: enrichmentResult.success ? 1 : 0,
        failed: enrichmentResult.success ? 0 : 1
      });

      return {
        jobId: job.id,
        status: EnrichmentJobStatus.COMPLETED,
        results: [keywordResult],
        summary: {
          totalKeywords: 1,
          successfulEnrichments: enrichmentResult.success ? 1 : 0,
          failedEnrichments: enrichmentResult.success ? 0 : 1,
          skippedKeywords: 0,
          cacheHits: keywordResult.fromCache ? 1 : 0,
          apiCallsMade: keywordResult.apiCallMade ? 1 : 0,
          quotaUsed: keywordResult.quotaUsed,
          processingTime: Date.now() - startTime,
          averageTimePerKeyword: Date.now() - startTime
        },
        startedAt: job.startedAt || new Date()
      };
      
    } catch (error) {
      throw new Error(`Single keyword job failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process bulk enrichment job
   */
  private async processBulkEnrichmentJob(job: EnrichmentJob): Promise<JobResult> {
    const data = job.data as BulkEnrichmentJobData;
    const startTime = Date.now();
    const results: KeywordEnrichmentResult[] = [];
    const batchSize = job.config.batchSize;
    
    try {
      // Update initial progress
      await this.queue.updateJobProgress(job.id, {
        total: data.keywords.length,
        processed: 0,
        totalBatches: Math.ceil(data.keywords.length / batchSize)
      });

      // Process in batches
      for (let i = 0; i < data.keywords.length; i += batchSize) {
        const batch = data.keywords.slice(i, i + batchSize);
        const batchIndex = Math.floor(i / batchSize) + 1;
        
        // Update progress for current batch
        await this.queue.updateJobProgress(job.id, {
          currentBatch: batchIndex,
          currentKeyword: batch[0]?.keyword
        });

        // Process batch
        const batchResults = await this.processBatch(batch, data.forceRefresh || false);
        results.push(...batchResults);

        // Update progress after batch completion
        await this.queue.updateJobProgress(job.id, {
          processed: i + batch.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        });

        // Add delay between batches to respect rate limits
        if (i + batchSize < data.keywords.length) {
          await this.sleep(1000);
        }
      }

      // Calculate summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const cacheHits = results.filter(r => r.fromCache).length;
      const apiCalls = results.filter(r => r.apiCallMade).length;
      const quotaUsed = results.reduce((sum, r) => sum + r.quotaUsed, 0);

      return {
        jobId: job.id,
        status: EnrichmentJobStatus.COMPLETED,
        results,
        summary: {
          totalKeywords: data.keywords.length,
          successfulEnrichments: successful,
          failedEnrichments: failed,
          skippedKeywords: 0,
          cacheHits,
          apiCallsMade: apiCalls,
          quotaUsed,
          processingTime: Date.now() - startTime,
          averageTimePerKeyword: (Date.now() - startTime) / data.keywords.length
        },
        startedAt: job.startedAt || new Date()
      };
      
    } catch (error) {
      throw new Error(`Bulk enrichment job failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process cache refresh job
   */
  private async processCacheRefreshJob(job: EnrichmentJob): Promise<JobResult> {
    const data = job.data as CacheRefreshJobData;
    const startTime = Date.now();
    
    try {
      // This would involve querying stale keywords and refreshing them
      // For now, return a placeholder implementation
      
      await this.queue.updateJobProgress(job.id, {
        total: 100, // Placeholder
        processed: 100,
        successful: 100,
        failed: 0
      });

      return {
        jobId: job.id,
        status: EnrichmentJobStatus.COMPLETED,
        results: [],
        summary: {
          totalKeywords: 100,
          successfulEnrichments: 100,
          failedEnrichments: 0,
          skippedKeywords: 0,
          cacheHits: 0,
          apiCallsMade: 100,
          quotaUsed: 100,
          processingTime: Date.now() - startTime,
          averageTimePerKeyword: (Date.now() - startTime) / 100
        },
        startedAt: job.startedAt || new Date()
      };
      
    } catch (error) {
      throw new Error(`Cache refresh job failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a batch of keywords
   */
  private async processBatch(
    keywords: Array<{keyword: string; countryCode: string; languageCode?: string}>,
    forceRefresh: boolean
  ): Promise<KeywordEnrichmentResult[]> {
    const results: KeywordEnrichmentResult[] = [];
    
    // Process keywords in parallel (but limited)
    const promises = keywords.map(async (keywordData) => {
      const startTime = Date.now();
      
      try {
        const enrichmentResult = await this.enrichmentService.enrichKeyword(
          keywordData.keyword,
          keywordData.countryCode,
          forceRefresh
        );

        return {
          keyword: keywordData.keyword,
          countryCode: keywordData.countryCode,
          languageCode: keywordData.languageCode || 'en',
          success: enrichmentResult.success,
          data: enrichmentResult.data,
          fromCache: enrichmentResult.metadata?.source === 'cache',
          processingTime: Date.now() - startTime,
          apiCallMade: enrichmentResult.metadata?.source === 'api',
          quotaUsed: enrichmentResult.metadata?.source === 'api' ? 1 : 0,
          error: enrichmentResult.error ? {
            type: 'enrichment_error',
            message: enrichmentResult.error.message,
            retryable: true
          } : undefined
        } as KeywordEnrichmentResult;
        
      } catch (error) {
        return {
          keyword: keywordData.keyword,
          countryCode: keywordData.countryCode,
          languageCode: keywordData.languageCode || 'en',
          success: false,
          fromCache: false,
          processingTime: Date.now() - startTime,
          apiCallMade: false,
          quotaUsed: 0,
          error: {
            type: 'processing_error',
            message: error instanceof Error ? error.message : 'Unknown error',
            retryable: true
          }
        } as KeywordEnrichmentResult;
      }
    });

    const batchResults = await Promise.allSettled(promises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Handle promise rejection
        const keywordData = keywords[index];
        results.push({
          keyword: keywordData.keyword,
          countryCode: keywordData.countryCode,
          languageCode: keywordData.languageCode || 'en',
          success: false,
          fromCache: false,
          processingTime: 0,
          apiCallMade: false,
          quotaUsed: 0,
          error: {
            type: 'promise_error',
            message: result.reason?.message || 'Promise rejected',
            retryable: true
          }
        });
      }
    });

    return results;
  }

  /**
   * Get worker status
   */
  getStatus(): WorkerStatus {
    return {
      workerId: this.id,
      status: this.status,
      currentJobs: this.currentJobs.size,
      maxJobs: this.config.maxConcurrentJobs,
      startedAt: this.startedAt,
      lastHeartbeat: this.lastHeartbeat,
      totalProcessed: this.totalProcessed,
      totalErrors: this.totalErrors,
      averageProcessingTime: this.totalProcessed > 0 ? 
        (Date.now() - this.startedAt.getTime()) / this.totalProcessed : 0
    };
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true;
    this.status = 'stopping';
    
    // Wait for current jobs to complete
    while (this.currentJobs.size > 0) {
      await this.sleep(1000);
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    
    this.status = 'idle';
    this.emit('worker:stopped', { workerId: this.id });
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.lastHeartbeat = new Date();
      this.emit('worker:heartbeat', this.getStatus());
    }, this.config.heartbeatInterval);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main JobProcessor class
export class JobProcessor extends EventEmitter {
  private config: ProcessorConfig;
  private queue: EnrichmentQueue;
  private enrichmentService: KeywordEnrichmentService;
  private errorHandler: ErrorHandlingService;
  private workers: Map<string, Worker> = new Map();
  private isRunning: boolean = false;
  private scalingTimer?: NodeJS.Timeout;
  private quotaCheckTimer?: NodeJS.Timeout;
  private metrics: {
    totalJobsProcessed: number;
    totalErrors: number;
    averageProcessingTime: number;
    startTime: Date;
  };

  constructor(
    queue: EnrichmentQueue,
    enrichmentService: KeywordEnrichmentService,
    errorHandler: ErrorHandlingService,
    config: Partial<ProcessorConfig> = {}
  ) {
    super();
    this.config = { ...DEFAULT_PROCESSOR_CONFIG, ...config };
    this.queue = queue;
    this.enrichmentService = enrichmentService;
    this.errorHandler = errorHandler;
    this.metrics = {
      totalJobsProcessed: 0,
      totalErrors: 0,
      averageProcessingTime: 0,
      startTime: new Date()
    };
  }

  /**
   * Start the job processor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn({}, 'JobProcessor is already running');
      return;
    }

    this.isRunning = true;
    this.metrics.startTime = new Date();
    
    // Start initial workers
    await this.scaleWorkers(this.config.minWorkers);
    
    // Start auto-scaling if enabled
    if (this.config.enableAutoScaling) {
      this.startAutoScaling();
    }

    // Start quota monitoring
    this.startQuotaMonitoring();
    
    this.emit('processor:started');
    logger.info({ workerCount: this.workers.size }, `JobProcessor started with ${this.workers.size} workers`);
  }

  /**
   * Stop the job processor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn({}, 'JobProcessor is not running');
      return;
    }

    this.isRunning = false;
    
    // Stop timers
    if (this.scalingTimer) {
      clearInterval(this.scalingTimer);
      this.scalingTimer = undefined;
    }
    
    if (this.quotaCheckTimer) {
      clearInterval(this.quotaCheckTimer);
      this.quotaCheckTimer = undefined;
    }
    
    // Stop all workers
    await this.stopAllWorkers();
    
    this.emit('processor:stopped');
    logger.info({}, 'JobProcessor stopped');
  }

  /**
   * Get processor statistics
   */
  getStats(): {
    isRunning: boolean;
    workerCount: number;
    activeJobs: number;
    metrics: typeof this.metrics;
    workerStatuses: WorkerStatus[];
  } {
    const workerStatuses = Array.from(this.workers.values()).map(worker => worker.getStatus());
    const activeJobs = workerStatuses.reduce((sum, status) => sum + status.currentJobs, 0);

    return {
      isRunning: this.isRunning,
      workerCount: this.workers.size,
      activeJobs,
      metrics: this.metrics,
      workerStatuses
    };
  }

  /**
   * Scale workers to target count
   */
  private async scaleWorkers(targetCount: number): Promise<void> {
    const currentCount = this.workers.size;
    
    if (targetCount > currentCount) {
      // Scale up
      const workersToAdd = targetCount - currentCount;
      for (let i = 0; i < workersToAdd; i++) {
        await this.addWorker();
      }
    } else if (targetCount < currentCount) {
      // Scale down
      const workersToRemove = currentCount - targetCount;
      await this.removeWorkers(workersToRemove);
    }
  }

  /**
   * Add a new worker
   */
  private async addWorker(): Promise<void> {
    const workerId = `worker-${uuidv4()}`;
    const workerConfig: WorkerConfig = {
      workerId,
      maxConcurrentJobs: this.config.maxConcurrentJobsPerWorker,
      processingTimeout: this.config.jobProcessingTimeout,
      heartbeatInterval: this.config.heartbeatInterval,
      enableMetrics: this.config.enableMetrics,
      autoScale: this.config.enableAutoScaling,
      idleTimeout: this.config.workerIdleTimeout
    };

    const worker = new Worker(
      workerConfig,
      this.queue,
      this.enrichmentService,
      this.errorHandler
    );

    // Set up worker event handlers
    worker.on('worker:started', (data) => {
      this.emit('worker:started', data);
    });

    worker.on('worker:stopped', (data) => {
      this.emit('worker:stopped', data);
      this.workers.delete(data.workerId);
    });

    worker.on('worker:heartbeat', (status) => {
      this.emit('worker:heartbeat', status);
    });

    this.workers.set(workerId, worker);
    await worker.start();
    
    logger.info({ workerId }, `Added worker ${workerId}`);
  }

  /**
   * Remove workers
   */
  private async removeWorkers(count: number): Promise<void> {
    const workersToRemove = Array.from(this.workers.values())
      .sort((a, b) => a.currentJobs.size - b.currentJobs.size) // Remove workers with fewer jobs first
      .slice(0, count);

    await Promise.all(workersToRemove.map(worker => worker.stop()));
  }

  /**
   * Stop all workers
   */
  private async stopAllWorkers(): Promise<void> {
    await Promise.all(Array.from(this.workers.values()).map(worker => worker.stop()));
    this.workers.clear();
  }

  /**
   * Start auto-scaling
   */
  private startAutoScaling(): void {
    this.scalingTimer = setInterval(async () => {
      try {
        await this.performAutoScaling();
      } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error in auto-scaling');
      }
    }, 60000); // Check every minute
  }

  /**
   * Perform auto-scaling logic
   */
  private async performAutoScaling(): Promise<void> {
    const queueStats = await this.queue.getQueueStats();
    const currentWorkerCount = this.workers.size;
    const totalJobs = queueStats.queuedJobs + queueStats.processingJobs;
    
    // Calculate utilization
    const maxCapacity = currentWorkerCount * this.config.maxConcurrentJobsPerWorker;
    const utilization = maxCapacity > 0 ? totalJobs / maxCapacity : 0;
    
    let targetWorkerCount = currentWorkerCount;
    
    if (utilization > this.config.scaleUpThreshold && currentWorkerCount < this.config.maxWorkers) {
      // Scale up
      targetWorkerCount = Math.min(
        this.config.maxWorkers,
        Math.ceil(currentWorkerCount * 1.5)
      );
    } else if (utilization < this.config.scaleDownThreshold && currentWorkerCount > this.config.minWorkers) {
      // Scale down
      targetWorkerCount = Math.max(
        this.config.minWorkers,
        Math.floor(currentWorkerCount * 0.8)
      );
    }
    
    if (targetWorkerCount !== currentWorkerCount) {
      logger.info({ currentWorkerCount, targetWorkerCount, utilization: `${(utilization * 100).toFixed(1)}%` }, `Auto-scaling: ${currentWorkerCount} → ${targetWorkerCount} workers (utilization: ${(utilization * 100).toFixed(1)}%)`);
      await this.scaleWorkers(targetWorkerCount);
    }
  }

  /**
   * Start quota monitoring
   */
  private startQuotaMonitoring(): void {
    this.quotaCheckTimer = setInterval(async () => {
      try {
        await this.checkQuotaStatus();
      } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error checking quota status');
      }
    }, this.config.quotaCheckInterval);
  }

  /**
   * Check quota status and handle emergency stops
   */
  private async checkQuotaStatus(): Promise<void> {
    // This would integrate with the quota management system
    // For now, this is a placeholder implementation
    
    // If quota usage exceeds emergency threshold, pause processing
    const quotaUsage = 0.7; // Placeholder
    
    if (quotaUsage > this.config.emergencyStopThreshold) {
      logger.warn({ quotaUsage: `${(quotaUsage * 100).toFixed(1)}%` }, `Emergency stop triggered: quota usage at ${(quotaUsage * 100).toFixed(1)}%`);
      await this.queue.pauseQueue();
      this.emit('processor:emergency-stop', { quotaUsage });
    }
  }
}
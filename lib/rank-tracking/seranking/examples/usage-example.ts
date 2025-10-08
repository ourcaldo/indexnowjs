/**
 * Usage Examples for EnrichmentQueue Services
 * Demonstrates how to use the queue and processing services
 */

import {
  EnrichmentOrchestrator,
  EnrichmentQueue,
  JobProcessor,
  KeywordEnrichmentService,
  KeywordBankService,
  ErrorHandlingService,
  SeRankingApiClient,
  EnrichmentJobType,
  JobPriority,
  createEnrichmentOrchestrator
} from '../services/index';
import { logger } from '@/lib/monitoring/error-handling';

// Example 1: Simple orchestrator usage
async function simpleExample() {
  // Create orchestrator with default configuration
  const orchestrator = createEnrichmentOrchestrator({
    maxWorkers: 3,
    enableAutoScaling: true,
    enableMetrics: true
  });

  try {
    // Start the orchestrator
    await orchestrator.start();

    // Enrich a single keyword
    const singleJobResult = await orchestrator.enrichSingleKeyword(
      'user123',
      'typescript tutorial',
      'US',
      {
        priority: JobPriority.HIGH,
        forceRefresh: false
      }
    );

    console.log('Single keyword job:', singleJobResult);

    // Enrich multiple keywords in bulk
    const bulkJobResult = await orchestrator.enrichBulkKeywords(
      'user123',
      [
        { keyword: 'react hooks', countryCode: 'US' },
        { keyword: 'vue composition api', countryCode: 'US' },
        { keyword: 'angular components', countryCode: 'US' }
      ],
      {
        priority: JobPriority.NORMAL,
        batchSize: 10,
        forceRefresh: false
      }
    );

    console.log('Bulk enrichment job:', bulkJobResult);

    // Check job status
    if (bulkJobResult.success && bulkJobResult.jobId) {
      const status = await orchestrator.getJobStatus(bulkJobResult.jobId);
      console.log('Job status:', status);
    }

    // Get queue statistics
    const stats = await orchestrator.getQueueStats();
    console.log('Queue stats:', stats);

  } finally {
    // Always stop the orchestrator when done
    await orchestrator.stop();
  }
}

// Example 2: Advanced queue management
async function advancedQueueExample() {
  // Create individual components for fine-grained control
  const keywordBankService = new KeywordBankService();
  const apiClient = new SeRankingApiClient({
    apiKey: process.env.SERANKING_API_KEY || '',
    baseUrl: 'https://api.seranking.com',
    timeout: 30000
  });
  const errorHandler = new ErrorHandlingService();
  
  const enrichmentService = new KeywordEnrichmentService(
    keywordBankService,
    apiClient,
    errorHandler
  );

  const queue = new EnrichmentQueue({
    maxQueueSize: 5000,
    defaultBatchSize: 20,
    enableMetrics: true,
    enableEvents: true
  });

  const processor = new JobProcessor(
    queue,
    enrichmentService,
    errorHandler,
    {
      maxWorkers: 5,
      enableAutoScaling: true,
      maxConcurrentJobsPerWorker: 2
    }
  );

  try {
    // Start processor
    await processor.start();

    // Set up event listeners
    queue.on('job:event', (event) => {
      console.log(`Job event: ${event.type} for job ${event.jobId}`);
    });

    processor.on('worker:started', (data) => {
      console.log(`Worker started: ${data.workerId}`);
    });

    // Enqueue different types of jobs
    
    // 1. Single keyword job
    await queue.enqueueJob('user123', {
      type: EnrichmentJobType.SINGLE_KEYWORD,
      data: {
        keyword: 'machine learning',
        countryCode: 'US',
        languageCode: 'en',
        forceRefresh: true
      },
      priority: JobPriority.HIGH
    });

    // 2. Bulk enrichment job
    await queue.enqueueJob('user123', {
      type: EnrichmentJobType.BULK_ENRICHMENT,
      data: {
        keywords: [
          { keyword: 'artificial intelligence', countryCode: 'US' },
          { keyword: 'deep learning', countryCode: 'US' },
          { keyword: 'neural networks', countryCode: 'US' },
          { keyword: 'computer vision', countryCode: 'US' },
          { keyword: 'natural language processing', countryCode: 'US' }
        ],
        forceRefresh: false
      },
      priority: JobPriority.NORMAL,
      config: {
        batchSize: 2, // Process 2 keywords at a time
        maxRetries: 3
      }
    });

    // 3. Cache refresh job
    await queue.enqueueJob('user123', {
      type: EnrichmentJobType.CACHE_REFRESH,
      data: {
        filterCriteria: {
          countryCode: 'US',
          olderThanDays: 30
        }
      },
      priority: JobPriority.LOW
    });

    // Monitor queue stats
    setInterval(async () => {
      const stats = await queue.getQueueStats();
      console.log(`Queue: ${stats.queuedJobs} queued, ${stats.processingJobs} processing`);
    }, 10000);

    // Wait for jobs to complete (in real usage, you'd handle this differently)
    await new Promise(resolve => setTimeout(resolve, 60000));

  } finally {
    await processor.stop();
    await queue.shutdown();
  }
}

// Example 3: Batch enqueue with error handling
async function batchEnqueueExample() {
  const orchestrator = createEnrichmentOrchestrator();

  try {
    await orchestrator.start();

    // Prepare batch jobs
    const batchJobs = [
      {
        type: EnrichmentJobType.SINGLE_KEYWORD,
        data: {
          keyword: 'react 18',
          countryCode: 'US'
        },
        priority: JobPriority.HIGH
      },
      {
        type: EnrichmentJobType.SINGLE_KEYWORD,
        data: {
          keyword: 'next.js 13',
          countryCode: 'US'
        },
        priority: JobPriority.NORMAL
      },
      {
        type: EnrichmentJobType.BULK_ENRICHMENT,
        data: {
          keywords: [
            { keyword: 'tailwind css', countryCode: 'US' },
            { keyword: 'styled components', countryCode: 'US' }
          ]
        },
        priority: JobPriority.NORMAL
      }
    ];

    // Enqueue batch
    const results = await orchestrator.enqueueBatch('user123', batchJobs, {
      batchSize: 5,
      priority: JobPriority.NORMAL
    });

    // Check results
    results.forEach((result, index) => {
      if (result.success) {
        console.log(`Job ${index + 1} enqueued successfully: ${result.jobId}`);
      } else {
        logger.error({ error: result.error }, `Job ${index + 1} failed to enqueue`);
      }
    });

    // Monitor all jobs
    const jobIds = results
      .filter(r => r.success)
      .map(r => r.jobId!)
      .filter(Boolean);

    for (const jobId of jobIds) {
      const status = await orchestrator.getJobStatus(jobId);
      console.log(`Job ${jobId} status:`, status.job?.status);
    }

  } finally {
    await orchestrator.stop();
  }
}

// Example 4: Error handling and job cancellation
async function errorHandlingExample() {
  const orchestrator = createEnrichmentOrchestrator({
    maxWorkers: 2,
    enableAutoScaling: false
  });

  try {
    await orchestrator.start();

    // Enqueue a job that might fail
    const jobResult = await orchestrator.enrichBulkKeywords(
      'user123',
      [
        { keyword: 'valid keyword', countryCode: 'US' },
        { keyword: '', countryCode: 'INVALID' }, // This will fail
        { keyword: 'another valid keyword', countryCode: 'US' }
      ],
      {
        priority: JobPriority.NORMAL
      }
    );

    if (jobResult.success && jobResult.jobId) {
      console.log(`Job ${jobResult.jobId} enqueued`);

      // Monitor job progress
      const checkProgress = setInterval(async () => {
        const status = await orchestrator.getJobStatus(jobResult.jobId!);
        
        if (status.success && status.job) {
          console.log(`Job status: ${status.job.status}`);
          console.log(`Progress: ${status.progress?.processed}/${status.progress?.total}`);

          if (status.job.status === 'completed' || status.job.status === 'failed') {
            clearInterval(checkProgress);
            
            if (status.result) {
              console.log('Job completed with result:', {
                successful: status.result.summary.successfulEnrichments,
                failed: status.result.summary.failedEnrichments,
                quotaUsed: status.result.summary.quotaUsed
              });
            }
          }
        }
      }, 5000);

      // Optionally cancel the job after some time
      setTimeout(async () => {
        const cancelResult = await orchestrator.cancelJob(jobResult.jobId!);
        if (cancelResult.success) {
          console.log('Job cancelled successfully');
          clearInterval(checkProgress);
        }
      }, 30000);
    }

  } finally {
    await orchestrator.stop();
  }
}

// Example 5: System monitoring and health checks
async function monitoringExample() {
  const orchestrator = createEnrichmentOrchestrator({
    enableMetrics: true,
    enableEvents: true
  });

  try {
    await orchestrator.start();

    // Set up comprehensive monitoring
    orchestrator.on('job:event', (event) => {
      console.log(`📊 Job Event: ${event.type} - Job: ${event.jobId}`);
    });

    orchestrator.on('worker:started', (data) => {
      console.log(`👷 Worker started: ${data.workerId}`);
    });

    orchestrator.on('worker:stopped', (data) => {
      console.log(`👷 Worker stopped: ${data.workerId}`);
    });

    orchestrator.on('processor:emergency-stop', (data) => {
      logger.error({ quotaUsage: `${data.quotaUsage * 100}%` }, `🚨 Emergency stop! Quota usage: ${data.quotaUsage * 100}%`);
    });

    // Regular system status checks
    const statusInterval = setInterval(async () => {
      const systemStatus = await orchestrator.getSystemStatus();
      
      console.log('🔍 System Status:', {
        orchestrator: systemStatus.orchestrator.isRunning ? '✅ Running' : '❌ Stopped',
        queueHealth: systemStatus.queue.queueHealth,
        activeWorkers: systemStatus.processor.workerStatuses.filter(w => w.status === 'processing').length,
        queuedJobs: systemStatus.queue.queuedJobs,
        processingJobs: systemStatus.queue.processingJobs
      });

      // Health check
      const health = await orchestrator.healthCheck();
      if (!health.healthy) {
        logger.warn({ checks: health.checks }, '⚠️ System health degraded');
      }
    }, 30000);

    // Add some test jobs
    await orchestrator.enrichBulkKeywords('user123', [
      { keyword: 'monitoring', countryCode: 'US' },
      { keyword: 'observability', countryCode: 'US' },
      { keyword: 'metrics', countryCode: 'US' }
    ]);

    // Run monitoring for 2 minutes
    await new Promise(resolve => setTimeout(resolve, 120000));
    clearInterval(statusInterval);

  } finally {
    await orchestrator.stop();
  }
}

// Export examples for testing
export {
  simpleExample,
  advancedQueueExample,
  batchEnqueueExample,
  errorHandlingExample,
  monitoringExample
};

// Run examples (uncomment to test)
if (require.main === module) {
  console.log('🚀 Running SeRanking Queue Services Examples...\n');
  
  // Run one example at a time
  simpleExample()
    .then(() => console.log('✅ Simple example completed'))
    .catch(error => logger.error({ error: error instanceof Error ? error.message : String(error) }, '❌ Simple example failed'));
}
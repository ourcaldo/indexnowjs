// LEGACY FILE - REFACTORED INTO SERVICE LAYER
// This file is kept for backward compatibility
// New implementations should use the services in lib/services/indexing/

import { IndexingService } from '../services/indexing/IndexingService';

// Types are now exported from the service layer
import type { IndexingJob, UrlSubmission } from '../services/indexing';

/**
 * Google Indexing Processor - LEGACY WRAPPER
 * 
 * This class now serves as a compatibility wrapper around the new service layer.
 * For new implementations, use IndexingService directly from lib/services/indexing/
 * 
 * @deprecated Use IndexingService from lib/services/indexing/ instead
 */
export class GoogleIndexingProcessor {
  private static instance: GoogleIndexingProcessor;
  private indexingService: IndexingService;

  constructor() {
    this.indexingService = IndexingService.getInstance();
  }

  static getInstance(): GoogleIndexingProcessor {
    if (!GoogleIndexingProcessor.instance) {
      GoogleIndexingProcessor.instance = new GoogleIndexingProcessor();
    }
    return GoogleIndexingProcessor.instance;
  }

  /**
   * Process a complete indexing job
   * LEGACY METHOD - Delegates to new IndexingService
   * @deprecated Use IndexingService.processIndexingJob() instead
   */
  async processIndexingJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    console.log('🔄 LEGACY: GoogleIndexingProcessor.processIndexingJob() called - delegating to IndexingService');
    return this.indexingService.processIndexingJob(jobId);
  }

  // All other methods are deprecated and removed
  // Use the individual services from lib/services/indexing/ for specific functionality
}
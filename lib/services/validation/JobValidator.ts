import { UrlValidator } from './UrlValidator';

interface JobValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Job Validation Service
 * Handles validation of indexing job data and configuration
 */
export class JobValidator {
  private static instance: JobValidator;
  private urlValidator: UrlValidator;

  constructor() {
    this.urlValidator = UrlValidator.getInstance();
  }

  static getInstance(): JobValidator {
    if (!JobValidator.instance) {
      JobValidator.instance = new JobValidator();
    }
    return JobValidator.instance;
  }

  /**
   * Validate job creation data
   */
  validateJobCreation(jobData: {
    name: string;
    type: 'manual' | 'sitemap';
    source_data: any;
    user_id: string;
  }): JobValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate job name
    if (!jobData.name || jobData.name.trim().length === 0) {
      errors.push('Job name is required');
    } else if (jobData.name.trim().length > 100) {
      errors.push('Job name cannot exceed 100 characters');
    }

    // Validate job type
    if (!['manual', 'sitemap'].includes(jobData.type)) {
      errors.push('Job type must be either "manual" or "sitemap"');
    }

    // Validate user_id
    if (!jobData.user_id) {
      errors.push('User ID is required');
    }

    // Validate source_data based on type
    if (jobData.type === 'manual') {
      const manualValidation = this.validateManualJobData(jobData.source_data);
      errors.push(...manualValidation.errors);
      warnings.push(...manualValidation.warnings);
    } else if (jobData.type === 'sitemap') {
      const sitemapValidation = this.validateSitemapJobData(jobData.source_data);
      errors.push(...sitemapValidation.errors);
      warnings.push(...sitemapValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate manual job source data
   */
  private validateManualJobData(sourceData: any): JobValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!sourceData || typeof sourceData !== 'object') {
      errors.push('Manual job source data is required');
      return { isValid: false, errors, warnings };
    }

    // Validate URLs array
    if (!sourceData.urls || !Array.isArray(sourceData.urls)) {
      errors.push('Manual job must contain an array of URLs');
      return { isValid: false, errors, warnings };
    }

    if (sourceData.urls.length === 0) {
      errors.push('Manual job must contain at least one URL');
      return { isValid: false, errors, warnings };
    }

    if (sourceData.urls.length > 1000) {
      errors.push('Manual job cannot contain more than 1000 URLs');
      return { isValid: false, errors, warnings };
    }

    // Validate individual URLs
    const urlValidation = this.urlValidator.validateUrls(sourceData.urls);
    
    if (urlValidation.invalidUrls.length > 0) {
      errors.push(`${urlValidation.invalidUrls.length} invalid URLs found`);
      
      // Add specific URL errors (limit to first 5 for readability)
      const firstFiveErrors = urlValidation.invalidUrls.slice(0, 5);
      firstFiveErrors.forEach(({ url, error }) => {
        errors.push(`Invalid URL "${url}": ${error}`);
      });
      
      if (urlValidation.invalidUrls.length > 5) {
        errors.push(`... and ${urlValidation.invalidUrls.length - 5} more invalid URLs`);
      }
    }

    // Check for duplicate URLs
    const originalCount = sourceData.urls.length;
    const deduplicatedUrls = this.urlValidator.deduplicateUrls(sourceData.urls);
    const duplicateCount = originalCount - deduplicatedUrls.length;
    
    if (duplicateCount > 0) {
      warnings.push(`Found ${duplicateCount} duplicate URLs that will be removed`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate sitemap job source data
   */
  private validateSitemapJobData(sourceData: any): JobValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!sourceData || typeof sourceData !== 'object') {
      errors.push('Sitemap job source data is required');
      return { isValid: false, errors, warnings };
    }

    // Validate sitemap URL
    if (!sourceData.sitemap_url) {
      errors.push('Sitemap URL is required for sitemap jobs');
      return { isValid: false, errors, warnings };
    }

    const sitemapUrlValidation = this.urlValidator.validateUrl(sourceData.sitemap_url);
    if (!sitemapUrlValidation.isValid) {
      errors.push(`Invalid sitemap URL: ${sitemapUrlValidation.error}`);
    } else {
      // Additional validation for sitemap URLs
      const url = sourceData.sitemap_url.toLowerCase();
      if (!url.includes('sitemap') && !url.endsWith('.xml')) {
        warnings.push('Sitemap URL should typically contain "sitemap" or end with ".xml"');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate job schedule configuration
   */
  validateJobSchedule(schedule: {
    type: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
    cron_expression?: string;
    next_run_at?: string;
  }): JobValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate schedule type
    const validTypes = ['one-time', 'hourly', 'daily', 'weekly', 'monthly'];
    if (!validTypes.includes(schedule.type)) {
      errors.push(`Invalid schedule type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate cron expression for scheduled jobs
    if (schedule.type !== 'one-time') {
      if (!schedule.cron_expression) {
        errors.push('Cron expression is required for scheduled jobs');
      } else {
        const cronValidation = this.validateCronExpression(schedule.cron_expression);
        if (!cronValidation.isValid) {
          errors.push(`Invalid cron expression: ${cronValidation.error}`);
        }
      }

      if (!schedule.next_run_at) {
        errors.push('Next run time is required for scheduled jobs');
      } else {
        // Validate that next_run_at is in the future
        const nextRunTime = new Date(schedule.next_run_at);
        if (isNaN(nextRunTime.getTime())) {
          errors.push('Invalid next run time format');
        } else if (nextRunTime <= new Date()) {
          errors.push('Next run time must be in the future');
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Basic cron expression validation
   */
  private validateCronExpression(cronExpression: string): { isValid: boolean; error?: string } {
    try {
      // Basic validation - cron should have 5 or 6 parts
      const parts = cronExpression.trim().split(/\s+/);
      
      if (parts.length !== 5 && parts.length !== 6) {
        return { 
          isValid: false, 
          error: 'Cron expression must have 5 or 6 parts (seconds optional)' 
        };
      }

      // Validate each part contains valid characters
      const validChars = /^[0-9\*\/\-\,\?LW#]+$/;
      for (const part of parts) {
        if (!validChars.test(part)) {
          return { 
            isValid: false, 
            error: `Invalid characters in cron expression part: ${part}` 
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Cron expression validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}
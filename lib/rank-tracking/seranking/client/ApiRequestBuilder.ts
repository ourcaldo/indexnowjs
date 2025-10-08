/**
 * API Request Builder
 * Formats and validates requests for SeRanking API
 */

import {
  SeRankingKeywordExportRequest,
  ApiRequestConfig
} from '../types/SeRankingTypes';
import { logger } from '@/lib/monitoring/error-handling';

export class ApiRequestBuilder {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  /**
   * Build keyword export request configuration
   */
  buildKeywordExportRequest(
    keywords: string[], 
    countryCode: string,
    options?: {
      sort?: 'cpc' | 'volume' | 'competition' | 'difficulty';
      sortOrder?: 'asc' | 'desc';
      columns?: Array<'keyword' | 'volume' | 'cpc' | 'competition' | 'difficulty' | 'history_trend'>;
    }
  ): ApiRequestConfig {
    // Validate inputs
    this.validateKeywords(keywords);
    this.validateCountryCode(countryCode);

    // Build request payload
    const requestData: SeRankingKeywordExportRequest = {
      keywords,
      source: countryCode,
      sort: options?.sort || 'cpc',
      sort_order: options?.sortOrder || 'desc',
      cols: this.buildColumnsString(options?.columns)
    };

    // Build form data
    const formData = this.buildFormData(requestData);

    // Build request configuration
    return {
      endpoint: `${this.baseUrl}/v1/keywords/export?source=${countryCode}`,
      method: 'POST',
      headers: this.buildHeaders(),
      body: formData,
      timeout: 30000 // 30 seconds default
    };
  }

  /**
   * Build health check request configuration
   */
  buildHealthCheckRequest(countryCode: string = 'us'): ApiRequestConfig {
    const testKeywords = ['test'];
    
    return this.buildKeywordExportRequest(testKeywords, countryCode);
  }

  /**
   * Build request headers with authentication
   */
  private buildHeaders(): Record<string, string> {
    return {
      'Authorization': `Token ${this.apiKey}`,
      'User-Agent': 'IndexNow-Studio/1.0',
      'Accept': 'application/json'
    };
  }

  /**
   * Build FormData from request object
   */
  private buildFormData(request: SeRankingKeywordExportRequest): FormData {
    const formData = new FormData();
    
    // Add keywords as separate form fields (required by SeRanking API)
    request.keywords.forEach(keyword => {
      formData.append('keywords[]', keyword.trim());
    });
    
    // Add optional parameters
    if (request.sort) {
      formData.append('sort', request.sort);
    }
    if (request.sort_order) {
      formData.append('sort_order', request.sort_order);
    }
    if (request.cols) {
      formData.append('cols', request.cols);
    }
    
    return formData;
  }

  /**
   * Build columns string from array
   */
  private buildColumnsString(
    columns?: Array<'keyword' | 'volume' | 'cpc' | 'competition' | 'difficulty' | 'history_trend'>
  ): string {
    const defaultColumns = ['keyword', 'volume', 'cpc', 'competition', 'difficulty', 'history_trend'];
    const selectedColumns = columns || defaultColumns;
    return selectedColumns.join(',');
  }

  /**
   * Validate keywords input
   */
  private validateKeywords(keywords: string[]): void {
    if (!Array.isArray(keywords)) {
      throw new Error('Keywords must be an array');
    }

    if (keywords.length === 0) {
      throw new Error('At least one keyword is required');
    }

    if (keywords.length > 100) {
      throw new Error('Maximum 100 keywords allowed per request');
    }

    // Validate individual keywords
    keywords.forEach((keyword, index) => {
      if (typeof keyword !== 'string') {
        throw new Error(`Keyword at index ${index} must be a string`);
      }

      const trimmedKeyword = keyword.trim();
      if (trimmedKeyword.length === 0) {
        throw new Error(`Keyword at index ${index} cannot be empty`);
      }

      if (trimmedKeyword.length > 100) {
        throw new Error(`Keyword at index ${index} exceeds maximum length of 100 characters`);
      }

      // Check for invalid characters (basic validation)
      if (!/^[\w\s\-.,!?'"()&+%$#@]+$/.test(trimmedKeyword)) {
        throw new Error(`Keyword at index ${index} contains invalid characters: "${trimmedKeyword}"`);
      }
    });
  }

  /**
   * Validate country code input
   */
  private validateCountryCode(countryCode: string): void {
    if (typeof countryCode !== 'string') {
      throw new Error('Country code must be a string');
    }

    const trimmedCode = countryCode.trim().toLowerCase();
    if (trimmedCode.length === 0) {
      throw new Error('Country code cannot be empty');
    }

    // Basic country code validation (2-3 characters, common codes)
    if (!/^[a-z]{2,3}$/.test(trimmedCode)) {
      throw new Error('Country code must be 2-3 lowercase letters');
    }

    // List of commonly supported country codes by SeRanking
    const supportedCountries = [
      'us', 'uk', 'ca', 'au', 'de', 'fr', 'es', 'it', 'nl', 'br', 'mx', 'ar',
      'jp', 'kr', 'in', 'cn', 'sg', 'hk', 'th', 'id', 'my', 'ph', 'vn',
      'ru', 'ua', 'pl', 'cz', 'hu', 'ro', 'bg', 'hr', 'si', 'sk', 'ee', 'lv', 'lt',
      'se', 'no', 'dk', 'fi', 'is', 'ie', 'pt', 'gr', 'tr', 'il', 'ae', 'sa',
      'eg', 'ma', 'ng', 'ke', 'za', 'gh', 'tz', 'ug', 'ao', 'mz'
    ];

    if (!supportedCountries.includes(trimmedCode)) {
      logger.warn({ countryCode: trimmedCode }, `Country code '${trimmedCode}' may not be supported by SeRanking API`);
    }
  }

  /**
   * Validate API request configuration
   */
  static validateRequestConfig(config: ApiRequestConfig): void {
    if (!config.endpoint || typeof config.endpoint !== 'string') {
      throw new Error('Request endpoint is required and must be a string');
    }

    if (!config.method || !['GET', 'POST', 'PUT', 'DELETE'].includes(config.method)) {
      throw new Error('Request method must be GET, POST, PUT, or DELETE');
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new Error('Timeout must be a positive number');
    }

    if (config.headers && typeof config.headers !== 'object') {
      throw new Error('Headers must be an object');
    }
  }

  /**
   * Sanitize keywords by removing extra spaces and normalizing
   */
  static sanitizeKeywords(keywords: string[]): string[] {
    return keywords
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0)
      .map(keyword => keyword.replace(/\s+/g, ' ')) // Replace multiple spaces with single space
      .filter((keyword, index, array) => array.indexOf(keyword) === index); // Remove duplicates
  }

  /**
   * Normalize country code to lowercase
   */
  static normalizeCountryCode(countryCode: string): string {
    return countryCode.trim().toLowerCase();
  }

  /**
   * Estimate request size for quota calculation
   */
  static estimateRequestCost(keywords: string[]): number {
    // SeRanking typically charges 1 credit per keyword
    return keywords.length;
  }

  /**
   * Split large keyword lists into smaller batches
   */
  static batchKeywords(keywords: string[], batchSize: number = 50): string[][] {
    const batches: string[][] = [];
    
    for (let i = 0; i < keywords.length; i += batchSize) {
      batches.push(keywords.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Build URL search parameters for GET requests (if needed)
   */
  static buildUrlParams(params: Record<string, string | number | boolean>): URLSearchParams {
    const urlParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        urlParams.append(key, String(value));
      }
    });
    
    return urlParams;
  }
}
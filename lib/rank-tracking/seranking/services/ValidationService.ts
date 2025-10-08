/**
 * Validation Service
 * Comprehensive validation for API responses, inputs, and data transformations
 */

import { z } from 'zod';
import {
  SeRankingKeywordData,
  SeRankingApiResponse,
  SeRankingKeywordExportRequest,
  SeRankingErrorType
} from '../types/SeRankingTypes';
import {
  KeywordBankEntity,
  KeywordBankInsert,
  KeywordBankUpdate,
  KeywordBankQuery
} from '../types/KeywordBankTypes';
// SeRankingError will be created inline to avoid import issues

// Validation result types
export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// Zod schemas for API validation
const SeRankingKeywordDataSchema = z.object({
  is_data_found: z.boolean(),
  keyword: z.string().min(1).max(500),
  volume: z.number().int().min(0).nullable(),
  cpc: z.number().min(0).nullable(),
  competition: z.number().min(0).max(1).nullable(),
  difficulty: z.number().int().min(0).max(100).nullable(),
  history_trend: z.record(z.string(), z.number()).nullable()
});

const SeRankingApiResponseSchema = z.array(SeRankingKeywordDataSchema);

const KeywordExportRequestSchema = z.object({
  keywords: z.array(z.string().min(1).max(500)).min(1).max(1000),
  source: z.string().regex(/^[a-z]{2}$/i, 'Must be valid country code'),
  sort: z.enum(['cpc', 'volume', 'competition', 'difficulty']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  cols: z.string().optional()
});

const KeywordBankInsertSchema = z.object({
  keyword: z.string().min(1).max(500).transform(s => s.trim().toLowerCase()),
  country_id: z.string().regex(/^[a-z]{2}$/i).transform(s => s.toLowerCase()),
  language_code: z.string().regex(/^[a-z]{2}$/i).transform(s => s.toLowerCase()).default('en'),
  is_data_found: z.boolean().default(false),
  volume: z.number().int().min(0).nullable().optional(),
  cpc: z.number().min(0).nullable().optional(),
  competition: z.number().min(0).max(1).nullable().optional(),
  difficulty: z.number().int().min(0).max(100).nullable().optional(),
  history_trend: z.record(z.string(), z.number()).nullable().optional(),
  keyword_intent: z.string().max(50).nullable().optional()
});

const KeywordBankUpdateSchema = z.object({
  is_data_found: z.boolean().optional(),
  volume: z.number().int().min(0).nullable().optional(),
  cpc: z.number().min(0).nullable().optional(),
  competition: z.number().min(0).max(1).nullable().optional(),
  difficulty: z.number().int().min(0).max(100).nullable().optional(),
  history_trend: z.record(z.string(), z.number()).nullable().optional(),
  keyword_intent: z.string().max(50).nullable().optional(),
  data_updated_at: z.date().optional(),
  updated_at: z.date().optional()
});

const KeywordBankQuerySchema = z.object({
  keyword: z.string().max(500).optional(),
  country_code: z.string().regex(/^[a-z]{2}$/i).transform(s => s.toLowerCase()).optional(),
  language_code: z.string().regex(/^[a-z]{2}$/i).transform(s => s.toLowerCase()).optional(),
  is_data_found: z.boolean().optional(),
  min_volume: z.number().int().min(0).optional(),
  max_volume: z.number().int().min(0).optional(),
  min_difficulty: z.number().int().min(0).max(100).optional(),
  max_difficulty: z.number().int().min(0).max(100).optional(),
  keyword_intent: z.string().max(50).optional(),
  updated_since: z.date().optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
  order_by: z.enum(['keyword', 'volume', 'difficulty', 'cpc', 'competition', 'data_updated_at']).default('data_updated_at'),
  order_direction: z.enum(['asc', 'desc']).default('desc')
});

// Country and language validation
const VALID_COUNTRIES = new Set([
  'us', 'uk', 'ca', 'au', 'de', 'fr', 'es', 'it', 'br', 'mx',
  'jp', 'kr', 'in', 'cn', 'ru', 'nl', 'se', 'no', 'dk', 'fi',
  'pl', 'pt', 'gr', 'tr', 'il', 'sa', 'ae', 'sg', 'my', 'th',
  'id', 'ph', 'vn', 'tw', 'hk', 'nz', 'za', 'ar', 'cl', 'co'
]);

const VALID_LANGUAGES = new Set([
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
  'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'no', 'da', 'fi', 'el',
  'he', 'th', 'vi', 'id', 'ms', 'tl', 'uk', 'cs', 'sk', 'hu'
]);

export class ValidationService {
  /**
   * Validate SeRanking API response
   */
  static validateApiResponse(response: unknown): ValidationResult<SeRankingApiResponse> {
    try {
      const result = SeRankingApiResponseSchema.safeParse(response);
      
      if (!result.success) {
        const errors = this.mapZodErrors(result.error);
        return {
          isValid: false,
          errors,
          warnings: []
        };
      }

      // Additional business logic validation
      const warnings: ValidationWarning[] = [];
      const data = result.data;

      // Check for suspicious data patterns
      data.forEach((item, index) => {
        if (item.is_data_found && item.volume === null) {
          warnings.push({
            field: `items[${index}].volume`,
            message: 'Keyword has data but no volume information',
            code: 'MISSING_VOLUME_DATA',
            value: item.keyword
          });
        }

        if (item.cpc !== null && item.cpc > 100) {
          warnings.push({
            field: `items[${index}].cpc`,
            message: 'CPC value seems unusually high',
            code: 'HIGH_CPC_VALUE',
            value: item.cpc
          });
        }

        if (item.volume !== null && item.volume > 10000000) {
          warnings.push({
            field: `items[${index}].volume`,
            message: 'Search volume seems unusually high',
            code: 'HIGH_VOLUME_VALUE',
            value: item.volume
          });
        }
      });

      return {
        isValid: true,
        data,
        errors: [],
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'response',
          message: 'Failed to parse API response',
          code: 'PARSING_ERROR',
          value: error instanceof Error ? error.message : 'Unknown error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate keyword export request
   */
  static validateKeywordExportRequest(request: unknown): ValidationResult<SeRankingKeywordExportRequest> {
    try {
      const result = KeywordExportRequestSchema.safeParse(request);
      
      if (!result.success) {
        const errors = this.mapZodErrors(result.error);
        return {
          isValid: false,
          errors,
          warnings: []
        };
      }

      const data = result.data;
      const warnings: ValidationWarning[] = [];
      const errors: ValidationError[] = [];

      // Validate country code
      if (!VALID_COUNTRIES.has(data.source.toLowerCase())) {
        errors.push({
          field: 'source',
          message: `Unsupported country code: ${data.source}`,
          code: 'INVALID_COUNTRY_CODE',
          value: data.source
        });
      }

      // Check for duplicate keywords
      const uniqueKeywords = new Set(data.keywords.map(k => k.toLowerCase()));
      if (uniqueKeywords.size < data.keywords.length) {
        warnings.push({
          field: 'keywords',
          message: 'Duplicate keywords found and will be deduplicated',
          code: 'DUPLICATE_KEYWORDS',
          value: data.keywords.length - uniqueKeywords.size
        });
      }

      // Check for very long keywords
      const longKeywords = data.keywords.filter(k => k.length > 100);
      if (longKeywords.length > 0) {
        warnings.push({
          field: 'keywords',
          message: 'Some keywords are very long and may have limited data',
          code: 'LONG_KEYWORDS',
          value: longKeywords.length
        });
      }

      // Validate batch size
      if (data.keywords.length > 500) {
        warnings.push({
          field: 'keywords',
          message: 'Large batch size may impact API performance',
          code: 'LARGE_BATCH_SIZE',
          value: data.keywords.length
        });
      }

      if (errors.length > 0) {
        return {
          isValid: false,
          errors,
          warnings
        };
      }

      return {
        isValid: true,
        data,
        errors: [],
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'request',
          message: 'Failed to parse export request',
          code: 'PARSING_ERROR',
          value: error instanceof Error ? error.message : 'Unknown error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate keyword bank insert data
   */
  static validateKeywordBankInsert(data: unknown): ValidationResult<KeywordBankInsert> {
    try {
      const result = KeywordBankInsertSchema.safeParse(data);
      
      if (!result.success) {
        const errors = this.mapZodErrors(result.error);
        return {
          isValid: false,
          errors,
          warnings: []
        };
      }

      const validatedData = result.data;
      const warnings: ValidationWarning[] = [];
      const errors: ValidationError[] = [];

      // Validate country and language codes
      if (!VALID_COUNTRIES.has(validatedData.country_id)) {
        errors.push({
          field: 'country_id',
          message: `Unsupported country code: ${validatedData.country_id}`,
          code: 'INVALID_COUNTRY_CODE',
          value: validatedData.country_id
        });
      }

      if (!VALID_LANGUAGES.has(validatedData.language_code)) {
        errors.push({
          field: 'language_code',
          message: `Unsupported language code: ${validatedData.language_code}`,
          code: 'INVALID_LANGUAGE_CODE',
          value: validatedData.language_code
        });
      }

      // Business logic validations
      if (validatedData.is_data_found && validatedData.volume === null) {
        warnings.push({
          field: 'volume',
          message: 'Data found but volume is null',
          code: 'MISSING_VOLUME_DATA',
          value: validatedData.keyword
        });
      }

      if (validatedData.competition !== null && (validatedData.cpc === null || validatedData.volume === null)) {
        warnings.push({
          field: 'competition',
          message: 'Competition data present but CPC or volume missing',
          code: 'INCOMPLETE_COMPETITION_DATA',
          value: validatedData.keyword
        });
      }

      if (errors.length > 0) {
        return {
          isValid: false,
          errors,
          warnings
        };
      }

      return {
        isValid: true,
        data: validatedData,
        errors: [],
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'data',
          message: 'Failed to parse insert data',
          code: 'PARSING_ERROR',
          value: error instanceof Error ? error.message : 'Unknown error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate keyword bank update data
   */
  static validateKeywordBankUpdate(data: unknown): ValidationResult<KeywordBankUpdate> {
    try {
      const result = KeywordBankUpdateSchema.safeParse(data);
      
      if (!result.success) {
        const errors = this.mapZodErrors(result.error);
        return {
          isValid: false,
          errors,
          warnings: []
        };
      }

      const validatedData = result.data;
      const warnings: ValidationWarning[] = [];

      // Business logic validations
      if (validatedData.is_data_found === true && validatedData.volume === null) {
        warnings.push({
          field: 'volume',
          message: 'Data marked as found but volume is null',
          code: 'MISSING_VOLUME_DATA',
          value: 'update'
        });
      }

      return {
        isValid: true,
        data: validatedData,
        errors: [],
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'data',
          message: 'Failed to parse update data',
          code: 'PARSING_ERROR',
          value: error instanceof Error ? error.message : 'Unknown error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate keyword bank query parameters
   */
  static validateKeywordBankQuery(query: unknown): ValidationResult<KeywordBankQuery> {
    try {
      const result = KeywordBankQuerySchema.safeParse(query);
      
      if (!result.success) {
        const errors = this.mapZodErrors(result.error);
        return {
          isValid: false,
          errors,
          warnings: []
        };
      }

      const validatedQuery = result.data;
      const warnings: ValidationWarning[] = [];
      const errors: ValidationError[] = [];

      // Validate country and language codes if provided
      if (validatedQuery.country_code && !VALID_COUNTRIES.has(validatedQuery.country_code)) {
        errors.push({
          field: 'country_code',
          message: `Unsupported country code: ${validatedQuery.country_code}`,
          code: 'INVALID_COUNTRY_CODE',
          value: validatedQuery.country_code
        });
      }

      if (validatedQuery.language_code && !VALID_LANGUAGES.has(validatedQuery.language_code)) {
        errors.push({
          field: 'language_code',
          message: `Unsupported language code: ${validatedQuery.language_code}`,
          code: 'INVALID_LANGUAGE_CODE',
          value: validatedQuery.language_code
        });
      }

      // Validate range parameters
      if (validatedQuery.min_volume && validatedQuery.max_volume && 
          validatedQuery.min_volume > validatedQuery.max_volume) {
        errors.push({
          field: 'volume_range',
          message: 'min_volume cannot be greater than max_volume',
          code: 'INVALID_RANGE',
          value: { min: validatedQuery.min_volume, max: validatedQuery.max_volume }
        });
      }

      if (validatedQuery.min_difficulty && validatedQuery.max_difficulty && 
          validatedQuery.min_difficulty > validatedQuery.max_difficulty) {
        errors.push({
          field: 'difficulty_range',
          message: 'min_difficulty cannot be greater than max_difficulty',
          code: 'INVALID_RANGE',
          value: { min: validatedQuery.min_difficulty, max: validatedQuery.max_difficulty }
        });
      }

      // Performance warnings
      if (validatedQuery.limit > 100) {
        warnings.push({
          field: 'limit',
          message: 'Large limit may impact query performance',
          code: 'LARGE_LIMIT',
          value: validatedQuery.limit
        });
      }

      if (validatedQuery.keyword && validatedQuery.keyword.length < 2) {
        warnings.push({
          field: 'keyword',
          message: 'Very short keyword search may return many results',
          code: 'SHORT_KEYWORD_SEARCH',
          value: validatedQuery.keyword
        });
      }

      if (errors.length > 0) {
        return {
          isValid: false,
          errors,
          warnings
        };
      }

      return {
        isValid: true,
        data: validatedQuery,
        errors: [],
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'query',
          message: 'Failed to parse query parameters',
          code: 'PARSING_ERROR',
          value: error instanceof Error ? error.message : 'Unknown error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate array of keywords for batch processing
   */
  static validateKeywordsBatch(keywords: unknown): ValidationResult<string[]> {
    try {
      if (!Array.isArray(keywords)) {
        return {
          isValid: false,
          errors: [{
            field: 'keywords',
            message: 'Keywords must be an array',
            code: 'INVALID_TYPE',
            value: typeof keywords
          }],
          warnings: []
        };
      }

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const validKeywords: string[] = [];

      keywords.forEach((keyword, index) => {
        if (typeof keyword !== 'string') {
          errors.push({
            field: `keywords[${index}]`,
            message: 'Keyword must be a string',
            code: 'INVALID_TYPE',
            value: typeof keyword
          });
          return;
        }

        const trimmed = keyword.trim();
        
        if (trimmed.length === 0) {
          errors.push({
            field: `keywords[${index}]`,
            message: 'Keyword cannot be empty',
            code: 'EMPTY_KEYWORD',
            value: keyword
          });
          return;
        }

        if (trimmed.length > 500) {
          errors.push({
            field: `keywords[${index}]`,
            message: 'Keyword too long (max 500 characters)',
            code: 'KEYWORD_TOO_LONG',
            value: trimmed.length
          });
          return;
        }

        if (trimmed.length > 100) {
          warnings.push({
            field: `keywords[${index}]`,
            message: 'Long keyword may have limited data availability',
            code: 'LONG_KEYWORD',
            value: trimmed.length
          });
        }

        validKeywords.push(trimmed.toLowerCase());
      });

      // Check for duplicates
      const uniqueKeywords = Array.from(new Set(validKeywords));
      if (uniqueKeywords.length < validKeywords.length) {
        warnings.push({
          field: 'keywords',
          message: 'Duplicate keywords found and will be deduplicated',
          code: 'DUPLICATE_KEYWORDS',
          value: validKeywords.length - uniqueKeywords.length
        });
      }

      // Batch size warnings
      if (uniqueKeywords.length > 1000) {
        errors.push({
          field: 'keywords',
          message: 'Too many keywords (max 1000)',
          code: 'BATCH_TOO_LARGE',
          value: uniqueKeywords.length
        });
      } else if (uniqueKeywords.length > 500) {
        warnings.push({
          field: 'keywords',
          message: 'Large batch size may impact performance',
          code: 'LARGE_BATCH_SIZE',
          value: uniqueKeywords.length
        });
      }

      if (errors.length > 0) {
        return {
          isValid: false,
          errors,
          warnings
        };
      }

      return {
        isValid: true,
        data: uniqueKeywords,
        errors: [],
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'keywords',
          message: 'Failed to validate keywords batch',
          code: 'PARSING_ERROR',
          value: error instanceof Error ? error.message : 'Unknown error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate country code
   */
  static validateCountryCode(countryCode: unknown): ValidationResult<string> {
    if (typeof countryCode !== 'string') {
      return {
        isValid: false,
        errors: [{
          field: 'country_code',
          message: 'Country code must be a string',
          code: 'INVALID_TYPE',
          value: typeof countryCode
        }],
        warnings: []
      };
    }

    const normalized = countryCode.toLowerCase().trim();
    
    if (!/^[a-z]{2}$/.test(normalized)) {
      return {
        isValid: false,
        errors: [{
          field: 'country_code',
          message: 'Country code must be 2 letters',
          code: 'INVALID_FORMAT',
          value: countryCode
        }],
        warnings: []
      };
    }

    if (!VALID_COUNTRIES.has(normalized)) {
      return {
        isValid: false,
        errors: [{
          field: 'country_code',
          message: `Unsupported country code: ${countryCode}`,
          code: 'INVALID_COUNTRY_CODE',
          value: countryCode
        }],
        warnings: []
      };
    }

    return {
      isValid: true,
      data: normalized,
      errors: [],
      warnings: []
    };
  }

  /**
   * Validate language code
   */
  static validateLanguageCode(languageCode: unknown): ValidationResult<string> {
    if (typeof languageCode !== 'string') {
      return {
        isValid: false,
        errors: [{
          field: 'language_code',
          message: 'Language code must be a string',
          code: 'INVALID_TYPE',
          value: typeof languageCode
        }],
        warnings: []
      };
    }

    const normalized = languageCode.toLowerCase().trim();
    
    if (!/^[a-z]{2}$/.test(normalized)) {
      return {
        isValid: false,
        errors: [{
          field: 'language_code',
          message: 'Language code must be 2 letters',
          code: 'INVALID_FORMAT',
          value: languageCode
        }],
        warnings: []
      };
    }

    if (!VALID_LANGUAGES.has(normalized)) {
      return {
        isValid: false,
        errors: [{
          field: 'language_code',
          message: `Unsupported language code: ${languageCode}`,
          code: 'INVALID_LANGUAGE_CODE',
          value: languageCode
        }],
        warnings: []
      };
    }

    return {
      isValid: true,
      data: normalized,
      errors: [],
      warnings: []
    };
  }

  /**
   * Create validation error for API
   */
  static createValidationError(
    errors: ValidationError[],
    warnings: ValidationWarning[] = []
  ): Error {
    const error = new Error(
      `Validation failed: ${errors.map(e => e.message).join(', ')}`
    );
    
    // Add custom properties
    (error as any).type = SeRankingErrorType.INVALID_REQUEST_ERROR;
    (error as any).retryable = false;
    (error as any).response = { errors, warnings };
    
    return error;
  }

  /**
   * Map Zod validation errors to our format
   */
  private static mapZodErrors(zodError: z.ZodError): ValidationError[] {
    return zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code.toUpperCase(),
      value: 'input' in err ? err.input : undefined
    }));
  }

  /**
   * Get supported countries list
   */
  static getSupportedCountries(): string[] {
    return Array.from(VALID_COUNTRIES).sort();
  }

  /**
   * Get supported languages list
   */
  static getSupportedLanguages(): string[] {
    return Array.from(VALID_LANGUAGES).sort();
  }

  /**
   * Check if country is supported
   */
  static isCountrySupported(countryCode: string): boolean {
    return VALID_COUNTRIES.has(countryCode.toLowerCase());
  }

  /**
   * Check if language is supported
   */
  static isLanguageSupported(languageCode: string): boolean {
    return VALID_LANGUAGES.has(languageCode.toLowerCase());
  }
}
/**
 * API Error Handler for IndexNow Studio
 * Centralized error handling and transformation
 */

import { NextResponse } from 'next/server';

export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ApiError {
  type: ErrorType;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  statusCode: number;
  metadata?: Record<string, any>;
  requestId?: string;
}

export class ApplicationError extends Error {
  public readonly type: ErrorType;
  public readonly userMessage: string;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly metadata: Record<string, any>;

  constructor(error: Omit<ApiError, 'requestId'>) {
    super(error.message);
    this.name = 'ApplicationError';
    this.type = error.type;
    this.userMessage = error.userMessage;
    this.severity = error.severity;
    this.statusCode = error.statusCode;
    this.metadata = error.metadata || {};
  }
}

// Error mapping configuration
const ERROR_MAPPINGS: Record<ErrorType, { statusCode: number; userMessage: string }> = {
  [ErrorType.VALIDATION]: {
    statusCode: 400,
    userMessage: 'Please check your input and try again.',
  },
  [ErrorType.AUTHENTICATION]: {
    statusCode: 401,
    userMessage: 'Please log in to continue.',
  },
  [ErrorType.AUTHORIZATION]: {
    statusCode: 403,
    userMessage: 'You do not have permission to perform this action.',
  },
  [ErrorType.NOT_FOUND]: {
    statusCode: 404,
    userMessage: 'The requested resource was not found.',
  },
  [ErrorType.DATABASE]: {
    statusCode: 500,
    userMessage: 'A database error occurred. Please try again later.',
  },
  [ErrorType.EXTERNAL_API]: {
    statusCode: 502,
    userMessage: 'An external service is currently unavailable. Please try again later.',
  },
  [ErrorType.BUSINESS_LOGIC]: {
    statusCode: 400,
    userMessage: 'Unable to complete the requested operation.',
  },
  [ErrorType.INTERNAL]: {
    statusCode: 500,
    userMessage: 'An unexpected error occurred. Please try again later.',
  },
  [ErrorType.RATE_LIMIT]: {
    statusCode: 429,
    userMessage: 'Too many requests. Please wait before trying again.',
  },
};

export class ApiErrorHandler {
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createError(
    type: ErrorType,
    message: string,
    metadata?: Record<string, any>,
    customUserMessage?: string
  ): ApplicationError {
    const mapping = ERROR_MAPPINGS[type];
    
    return new ApplicationError({
      type,
      message,
      userMessage: customUserMessage || mapping.userMessage,
      severity: this.getSeverityForType(type),
      statusCode: mapping.statusCode,
      metadata: metadata || {},
    });
  }

  static handleError(error: unknown, requestId?: string): NextResponse {
    const reqId = requestId || this.generateRequestId();

    // Handle ApplicationError
    if (error instanceof ApplicationError) {
      const response = {
        success: false,
        error: error.userMessage,
        code: error.type,
        requestId: reqId,
        details: {
          message: error.message,
          metadata: error.metadata,
          stack: error.stack,
        },
      };

      // Log error for monitoring
      this.logError(error, reqId);

      return NextResponse.json(response, { status: error.statusCode });
    }

    // Handle generic Error
    if (error instanceof Error) {
      const response = {
        success: false,
        error: 'An unexpected error occurred. Please try again later.',
        code: ErrorType.INTERNAL,
        requestId: reqId,
        details: {
          message: error.message,
          stack: error.stack,
        },
      };

      // Log error for monitoring
      this.logError(error, reqId);

      return NextResponse.json(response, { status: 500 });
    }

    // Handle unknown error
    const response = {
      success: false,
      error: 'An unknown error occurred. Please try again later.',
      code: ErrorType.INTERNAL,
      requestId: reqId,
    };

    console.error('[Unknown Error]', { error, requestId: reqId });

    return NextResponse.json(response, { status: 500 });
  }

  private static getSeverityForType(type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.VALIDATION:
      case ErrorType.NOT_FOUND:
        return ErrorSeverity.LOW;
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
      case ErrorType.BUSINESS_LOGIC:
        return ErrorSeverity.MEDIUM;
      case ErrorType.EXTERNAL_API:
      case ErrorType.RATE_LIMIT:
        return ErrorSeverity.HIGH;
      case ErrorType.DATABASE:
      case ErrorType.INTERNAL:
        return ErrorSeverity.CRITICAL;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private static logError(error: Error, requestId: string): void {
    const logData = {
      requestId,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...(error instanceof ApplicationError && {
        type: error.type,
        severity: error.severity,
        metadata: error.metadata,
      }),
    };

    // Always log errors
    console.error('[API Error]', logData);
  }

  // Convenience methods for common errors
  static validationError(message: string, metadata?: Record<string, any>): ApplicationError {
    return this.createError(ErrorType.VALIDATION, message, metadata);
  }

  static authenticationError(message: string = 'Authentication required'): ApplicationError {
    return this.createError(ErrorType.AUTHENTICATION, message);
  }

  static authorizationError(message: string = 'Insufficient permissions'): ApplicationError {
    return this.createError(ErrorType.AUTHORIZATION, message);
  }

  static notFoundError(resource: string = 'Resource'): ApplicationError {
    return this.createError(ErrorType.NOT_FOUND, `${resource} not found`);
  }

  static databaseError(message: string, metadata?: Record<string, any>): ApplicationError {
    return this.createError(ErrorType.DATABASE, message, metadata);
  }

  static externalApiError(service: string, message?: string): ApplicationError {
    return this.createError(
      ErrorType.EXTERNAL_API,
      `${service} service error: ${message || 'Unknown error'}`,
      { service }
    );
  }

  static businessLogicError(message: string, metadata?: Record<string, any>): ApplicationError {
    return this.createError(ErrorType.BUSINESS_LOGIC, message, metadata);
  }
}
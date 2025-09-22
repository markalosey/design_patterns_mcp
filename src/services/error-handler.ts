/**
 * Error Handling Service for Design Patterns MCP Server
 * Provides structured error handling, recovery strategies, and error reporting
 */

import { Logger } from './logger.js';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  CONFIGURATION = 'configuration',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  service: string;
  operation: string;
  userId?: string;
  correlationId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  originalError?: Error;
  stack?: string;
  timestamp: Date;
  retryable: boolean;
  userMessage?: string;
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  execute: (error: ErrorDetails) => Promise<boolean>;
  maxRetries?: number;
  backoffMs?: number;
}

export class ErrorHandler {
  private logger: Logger;
  private recoveryStrategies: Map<string, RecoveryStrategy[]> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeDefaultStrategies();
  }

  /**
   * Handle an error with structured logging and recovery
   */
  async handleError(
    error: Error | any,
    context: ErrorContext,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): Promise<ErrorDetails> {
    const errorDetails = this.createErrorDetails(error, context, severity);

    // Log the error
    this.logError(errorDetails);

    // Attempt recovery if strategies exist
    const recovered = await this.attemptRecovery(errorDetails);

    if (!recovered && errorDetails.severity === ErrorSeverity.CRITICAL) {
      await this.handleCriticalError(errorDetails);
    }

    return errorDetails;
  }

  /**
   * Create structured error details
   */
  private createErrorDetails(
    error: Error | any,
    context: ErrorContext,
    severity: ErrorSeverity
  ): ErrorDetails {
    const category = this.categorizeError(error);
    const code = this.generateErrorCode(error, category);

    return {
      code,
      message: error.message || 'Unknown error occurred',
      category,
      severity,
      context,
      originalError: error instanceof Error ? error : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      retryable: this.isRetryable(error, category),
      userMessage: this.generateUserMessage(error, category)
    };
  }

  /**
   * Categorize error based on type and properties
   */
  private categorizeError(error: Error | any): ErrorCategory {
    if (error.code?.startsWith('SQLITE_') || error.message?.includes('database')) {
      return ErrorCategory.DATABASE;
    }

    if (error.code === 'ECONNREFUSED' || error.message?.includes('network')) {
      return ErrorCategory.NETWORK;
    }

    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      return ErrorCategory.VALIDATION;
    }

    if (error.message?.includes('config') || error.message?.includes('configuration')) {
      return ErrorCategory.CONFIGURATION;
    }

    if (error.message?.includes('business') || error.message?.includes('logic')) {
      return ErrorCategory.BUSINESS_LOGIC;
    }

    if (error.message?.includes('service') || error.message?.includes('external')) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }

    if (error instanceof Error) {
      return ErrorCategory.SYSTEM;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Generate unique error code
   */
  private generateErrorCode(error: Error | any, category: ErrorCategory): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const categoryCode = category.substring(0, 3).toUpperCase();
    return `${categoryCode}-${timestamp}-${random}`;
  }

  /**
   * Determine if error is retryable
   */
  private isRetryable(error: Error | any, category: ErrorCategory): boolean {
    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.EXTERNAL_SERVICE:
        return true;
      case ErrorCategory.DATABASE:
        return error.code !== 'SQLITE_CONSTRAINT';
      case ErrorCategory.SYSTEM:
        return error.code !== 'EACCES' && error.code !== 'EPERM';
      default:
        return false;
    }
  }

  /**
   * Generate user-friendly error message
   */
  private generateUserMessage(error: Error | any, category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.DATABASE:
        return 'A database error occurred. Please try again later.';
      case ErrorCategory.NETWORK:
        return 'Network connection issue. Please check your connection and try again.';
      case ErrorCategory.VALIDATION:
        return 'Invalid input provided. Please check your request and try again.';
      case ErrorCategory.CONFIGURATION:
        return 'System configuration issue. Please contact support.';
      case ErrorCategory.EXTERNAL_SERVICE:
        return 'External service temporarily unavailable. Please try again later.';
      case ErrorCategory.BUSINESS_LOGIC:
        return 'An unexpected error occurred. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }

  /**
   * Log error with appropriate level
   */
  private logError(errorDetails: ErrorDetails): void {
    const logData = {
      code: errorDetails.code,
      category: errorDetails.category,
      severity: errorDetails.severity,
      service: errorDetails.context.service,
      operation: errorDetails.context.operation,
      correlationId: errorDetails.context.correlationId,
      retryable: errorDetails.retryable,
      metadata: errorDetails.context.metadata
    };

    switch (errorDetails.severity) {
      case ErrorSeverity.LOW:
        this.logger.debug(errorDetails.context.service, errorDetails.message, logData, errorDetails.context.correlationId);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(errorDetails.context.service, errorDetails.message, logData, errorDetails.context.correlationId);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(errorDetails.context.service, errorDetails.message, errorDetails.originalError, logData, errorDetails.context.correlationId);
        break;
      case ErrorSeverity.CRITICAL:
        this.logger.fatal(errorDetails.context.service, errorDetails.message, errorDetails.originalError, logData, errorDetails.context.correlationId);
        break;
    }
  }

  /**
   * Attempt error recovery using registered strategies
   */
  private async attemptRecovery(errorDetails: ErrorDetails): Promise<boolean> {
    const strategies = this.recoveryStrategies.get(errorDetails.category) || [];

    for (const strategy of strategies) {
      try {
        this.logger.info(errorDetails.context.service, `Attempting recovery strategy: ${strategy.name}`, {
          errorCode: errorDetails.code,
          strategy: strategy.name
        }, errorDetails.context.correlationId);

        const success = await strategy.execute(errorDetails);

        if (success) {
          this.logger.info(errorDetails.context.service, `Recovery successful: ${strategy.name}`, {
            errorCode: errorDetails.code,
            strategy: strategy.name
          }, errorDetails.context.correlationId);
          return true;
        }
      } catch (recoveryError) {
        this.logger.warn(errorDetails.context.service, `Recovery strategy failed: ${strategy.name}`, {
          errorCode: errorDetails.code,
          strategy: strategy.name,
          recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
        }, errorDetails.context.correlationId);
      }
    }

    return false;
  }

  /**
   * Handle critical errors
   */
  private async handleCriticalError(errorDetails: ErrorDetails): Promise<void> {
    this.logger.fatal(errorDetails.context.service, 'Critical error encountered - system may be unstable', errorDetails.originalError, {
      errorCode: errorDetails.code,
      category: errorDetails.category,
      service: errorDetails.context.service,
      operation: errorDetails.context.operation
    }, errorDetails.context.correlationId);

    // In a production system, you might:
    // - Send alerts to monitoring systems
    // - Trigger circuit breakers
    // - Gracefully shutdown services
    // - Notify administrators
  }

  /**
   * Register recovery strategy for error category
   */
  registerRecoveryStrategy(category: ErrorCategory, strategy: RecoveryStrategy): void {
    if (!this.recoveryStrategies.has(category)) {
      this.recoveryStrategies.set(category, []);
    }

    this.recoveryStrategies.get(category)!.push(strategy);

    this.logger.info('ErrorHandler', `Registered recovery strategy: ${strategy.name} for ${category}`, {
      strategy: strategy.name,
      category,
      description: strategy.description
    });
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultStrategies(): void {
    // Database recovery strategies
    this.registerRecoveryStrategy(ErrorCategory.DATABASE, {
      name: 'database-retry',
      description: 'Retry database operation with exponential backoff',
      execute: async (error) => {
        // Simple retry logic - in production, implement proper backoff
        await new Promise(resolve => setTimeout(resolve, 1000));
        return false; // Let the calling code handle the actual retry
      },
      maxRetries: 3,
      backoffMs: 1000
    });

    // Network recovery strategies
    this.registerRecoveryStrategy(ErrorCategory.NETWORK, {
      name: 'network-retry',
      description: 'Retry network operation',
      execute: async (error) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return false;
      },
      maxRetries: 5,
      backoffMs: 2000
    });

    // External service recovery
    this.registerRecoveryStrategy(ErrorCategory.EXTERNAL_SERVICE, {
      name: 'service-fallback',
      description: 'Use cached data or fallback service',
      execute: async (error) => {
        // Implement fallback logic here
        return false;
      },
      maxRetries: 2,
      backoffMs: 5000
    });
  }

  /**
   * Create error context helper
   */
  createContext(service: string, operation: string, metadata?: Record<string, any>): ErrorContext {
    return {
      service,
      operation,
      correlationId: this.generateCorrelationId(),
      metadata
    };
  }

  /**
   * Generate correlation ID for error tracking
   */
  private generateCorrelationId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get error statistics
   */
  getStats(): { totalErrors: number; errorsByCategory: Record<string, number>; errorsBySeverity: Record<string, number> } {
    // In a production system, you'd track these metrics
    return {
      totalErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {}
    };
  }
}

// Factory function
export function createErrorHandler(logger: Logger): ErrorHandler {
  return new ErrorHandler(logger);
}

// Convenience functions for common error patterns
export function createDatabaseError(error: Error, context: ErrorContext): Promise<ErrorDetails> {
  const handler = new ErrorHandler({} as any); // Would be injected in real usage
  return handler.handleError(error, context, ErrorSeverity.HIGH);
}

export function createValidationError(message: string, context: ErrorContext): Promise<ErrorDetails> {
  const error = new Error(message);
  error.name = 'ValidationError';
  const handler = new ErrorHandler({} as any);
  return handler.handleError(error, context, ErrorSeverity.LOW);
}

export function createSystemError(error: Error, context: ErrorContext): Promise<ErrorDetails> {
  const handler = new ErrorHandler({} as any);
  return handler.handleError(error, context, ErrorSeverity.CRITICAL);
}
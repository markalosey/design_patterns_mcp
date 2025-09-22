/**
 * Performance Monitoring Service for Design Patterns MCP Server
 * Tracks metrics, response times, and system performance
 */

import { Logger } from './logger.js';
import { ErrorHandler } from './error-handler.js';

export interface PerformanceMetrics {
  timestamp: Date;
  service: string;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  uptime: number;
  activeConnections: number;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  topSlowOperations: Array<{ operation: string; avgTime: number; count: number }>;
  recentErrors: Array<{ timestamp: Date; operation: string; error: string }>;
}

export interface PerformanceConfig {
  enabled: boolean;
  metricsInterval: number;
  retentionPeriod: number;
  slowQueryThreshold: number;
  enableSystemMetrics: boolean;
  enableDetailedLogging: boolean;
}

export class PerformanceMonitor {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private activeOperations = new Map<string, { startTime: number; metadata?: Record<string, any> }>();
  private intervalId?: NodeJS.Timeout;

  constructor(logger: Logger, errorHandler: ErrorHandler, config: PerformanceConfig) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.config = config;

    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.metricsInterval);

    this.logger.info('PerformanceMonitor', 'Performance monitoring started', {
      interval: this.config.metricsInterval,
      retentionPeriod: this.config.retentionPeriod
    });
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.logger.info('PerformanceMonitor', 'Performance monitoring stopped');
  }

  /**
   * Start timing an operation
   */
  startOperation(operation: string, service: string, metadata?: Record<string, any>): string {
    const operationId = `${service}-${operation}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      metadata
    });

    if (this.config.enableDetailedLogging) {
      this.logger.debug(service, `Operation started: ${operation}`, { operationId, metadata });
    }

    return operationId;
  }

  /**
   * End timing an operation
   */
  endOperation(operationId: string, success: boolean = true, additionalMetadata?: Record<string, any>): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      this.logger.warn('PerformanceMonitor', 'Attempted to end unknown operation', { operationId });
      return;
    }

    const duration = Date.now() - operation.startTime;
    const [service, operationName] = operationId.split('-', 2);

    const metric: PerformanceMetrics = {
      timestamp: new Date(),
      service,
      operation: operationName,
      duration,
      success,
      metadata: { ...operation.metadata, ...additionalMetadata }
    };

    this.metrics.push(metric);
    this.activeOperations.delete(operationId);

    // Log slow operations
    if (duration > this.config.slowQueryThreshold) {
      this.logger.warn(service, `Slow operation detected: ${operationName}`, {
        operationId,
        duration,
        threshold: this.config.slowQueryThreshold,
        metadata: metric.metadata
      });
    }

    // Log errors
    if (!success) {
      this.logger.error(service, `Operation failed: ${operationName}`, undefined, {
        operationId,
        duration,
        metadata: metric.metadata
      });
    }

    if (this.config.enableDetailedLogging) {
      this.logger.debug(service, `Operation completed: ${operationName}`, {
        operationId,
        duration,
        success,
        metadata: metric.metadata
      });
    }

    // Clean up old metrics
    this.cleanupOldMetrics();
  }

  /**
   * Record a custom metric
   */
  recordMetric(service: string, operation: string, duration: number, success: boolean = true, metadata?: Record<string, any>): void {
    const metric: PerformanceMetrics = {
      timestamp: new Date(),
      service,
      operation,
      duration,
      success,
      metadata
    };

    this.metrics.push(metric);
    this.cleanupOldMetrics();
  }

  /**
   * Get performance statistics
   */
  getStats(timeRangeMs: number = 3600000): PerformanceStats {
    const cutoffTime = Date.now() - timeRangeMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp.getTime() > cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        successRate: 0,
        errorRate: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        topSlowOperations: [],
        recentErrors: []
      };
    }

    const totalRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter(m => m.success).length;
    const successRate = (successfulRequests / totalRequests) * 100;
    const errorRate = 100 - successRate;

    const responseTimes = recentMetrics.map(m => m.duration).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    const p99ResponseTime = responseTimes[p99Index] || 0;

    // Top slow operations
    const operationStats = new Map<string, { totalTime: number; count: number }>();
    recentMetrics.forEach(metric => {
      const key = `${metric.service}-${metric.operation}`;
      const existing = operationStats.get(key) || { totalTime: 0, count: 0 };
      existing.totalTime += metric.duration;
      existing.count += 1;
      operationStats.set(key, existing);
    });

    const topSlowOperations = Array.from(operationStats.entries())
      .map(([key, stats]) => ({
        operation: key,
        avgTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Recent errors
    const recentErrors = recentMetrics
      .filter(m => !m.success)
      .slice(-10)
      .map(m => ({
        timestamp: m.timestamp,
        operation: `${m.service}-${m.operation}`,
        error: m.metadata?.error || 'Unknown error'
      }));

    return {
      totalRequests,
      averageResponseTime,
      successRate,
      errorRate,
      p95ResponseTime,
      p99ResponseTime,
      topSlowOperations,
      recentErrors
    };
  }

  /**
   * Get system metrics
   */
  getSystemStats(): SystemMetrics | null {
    if (!this.config.enableSystemMetrics || this.systemMetrics.length === 0) {
      return null;
    }

    return this.systemMetrics[this.systemMetrics.length - 1];
  }

  /**
   * Get active operations count
   */
  getActiveOperationsCount(): number {
    return this.activeOperations.size;
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    if (!this.config.enableSystemMetrics) {
      return;
    }

    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime(),
        activeConnections: this.activeOperations.size
      };

      this.systemMetrics.push(metrics);

      // Keep only recent system metrics
      const cutoffTime = Date.now() - this.config.retentionPeriod;
      this.systemMetrics = this.systemMetrics.filter(m => m.timestamp.getTime() > cutoffTime);

      if (this.config.enableDetailedLogging) {
        this.logger.debug('PerformanceMonitor', 'System metrics collected', {
          memoryUsage: metrics.memoryUsage.heapUsed,
          uptime: metrics.uptime,
          activeConnections: metrics.activeConnections
        });
      }
    } catch (error) {
      this.logger.error('PerformanceMonitor', 'Failed to collect system metrics', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoffTime);
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): {
    performance: PerformanceMetrics[];
    system: SystemMetrics[];
    stats: PerformanceStats;
  } {
    return {
      performance: [...this.metrics],
      system: [...this.systemMetrics],
      stats: this.getStats()
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = [];
    this.systemMetrics = [];
    this.activeOperations.clear();

    this.logger.info('PerformanceMonitor', 'All metrics reset');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    const oldEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };

    if (oldEnabled !== this.config.enabled) {
      if (this.config.enabled) {
        this.startMonitoring();
      } else {
        this.stopMonitoring();
      }
    }

    this.logger.info('PerformanceMonitor', 'Configuration updated', { config });
  }
}

// Default configuration
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enabled: true,
  metricsInterval: 60000, // 1 minute
  retentionPeriod: 3600000, // 1 hour
  slowQueryThreshold: 1000, // 1 second
  enableSystemMetrics: true,
  enableDetailedLogging: false
};

// Factory function
export function createPerformanceMonitor(
  logger: Logger,
  errorHandler: ErrorHandler,
  config?: Partial<PerformanceConfig>
): PerformanceMonitor {
  const finalConfig = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  return new PerformanceMonitor(logger, errorHandler, finalConfig);
}

// Utility functions for timing operations
export function withPerformanceMonitoring<T>(
  monitor: PerformanceMonitor,
  service: string,
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const operationId = monitor.startOperation(operation, service, metadata);

  return fn()
    .then(result => {
      monitor.endOperation(operationId, true);
      return result;
    })
    .catch(error => {
      monitor.endOperation(operationId, false, { error: error.message });
      throw error;
    });
}

export function createTimer(monitor: PerformanceMonitor, service: string, operation: string, metadata?: Record<string, any>) {
  const operationId = monitor.startOperation(operation, service, metadata);

  return {
    end: (success: boolean = true, additionalMetadata?: Record<string, any>) => {
      monitor.endOperation(operationId, success, additionalMetadata);
    }
  };
}
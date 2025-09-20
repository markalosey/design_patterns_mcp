/**
 * Configuration Management Service for Design Patterns MCP Server
 * Handles runtime configuration, environment variables, and settings persistence
 */

import { Logger } from './logger.js';
import { ErrorHandler } from './error-handler.js';
import fs from 'fs';
import path from 'path';

export interface ServerConfig {
  // Server settings
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';

  // Database settings
  database: {
    filename: string;
    readonly: boolean;
    timeout: number;
    verbose: boolean;
  };

  // Search settings
  search: {
    maxResults: number;
    similarityThreshold: number;
    useSemanticSearch: boolean;
    useKeywordSearch: boolean;
    useHybridSearch: boolean;
    semanticWeight: number;
    keywordWeight: number;
    queryExpansion: boolean;
    reRanking: boolean;
  };

  // Vector settings
  vector: {
    model: string;
    dimensions: number;
    cacheEnabled: boolean;
    maxResults: number;
  };

  // LLM settings
  llm: {
    enabled: boolean;
    provider: 'ollama' | 'openai' | 'anthropic' | 'none';
    model: string;
    apiKey?: string;
    baseUrl?: string;
    timeout: number;
    maxRetries: number;
  };

  // Logging settings
  logging: {
    level: string;
    format: 'json' | 'text';
    enableConsole: boolean;
    enableFile: boolean;
    logFile?: string;
    maxFileSize: number;
    maxFiles: number;
  };

  // Performance settings
  performance: {
    enableMetrics: boolean;
    metricsInterval: number;
    enableProfiling: boolean;
    cacheEnabled: boolean;
    cacheTTL: number;
  };

  // Security settings
  security: {
    enableRateLimiting: boolean;
    maxRequestsPerMinute: number;
    enableInputValidation: boolean;
    enableOutputSanitization: boolean;
  };
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigManager {
  private config: ServerConfig;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private configFile: string;
  private watchers: Map<string, (config: ServerConfig) => void> = new Map();

  constructor(logger: Logger, errorHandler: ErrorHandler, configFile?: string) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.configFile = configFile || './config/design-patterns-mcp.json';

    // Load default configuration
    this.config = this.getDefaultConfig();

    // Load from file if exists
    this.loadFromFile();

    // Override with environment variables
    this.loadFromEnvironment();

    // Validate configuration
    this.validateConfig();
  }

  /**
   * Get current configuration
   */
  getConfig(): ServerConfig {
    return { ...this.config };
  }

  /**
   * Get configuration value by path
   */
  get<T = any>(path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let value: any = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue as T;
      }
    }

    return value as T;
  }

  /**
   * Set configuration value by path
   */
  set(path: string, value: any): void {
    const keys = path.split('.');
    let current: any = this.config;

    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    // Set the value
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;

    // Notify watchers
    this.notifyWatchers(path, value);

    // Save to file
    this.saveToFile();

    this.logger.info('ConfigManager', `Configuration updated: ${path} = ${JSON.stringify(value)}`);
  }

  /**
   * Update multiple configuration values
   */
  update(updates: Partial<ServerConfig>): void {
    this.deepMerge(this.config, updates);

    // Validate updated config
    const validation = this.validateConfig();
    if (!validation.valid) {
      this.logger.warn('ConfigManager', 'Configuration validation failed after update', {
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Notify watchers
    this.notifyWatchers('config', this.config);

    // Save to file
    this.saveToFile();

    this.logger.info('ConfigManager', 'Configuration batch updated', { updates: Object.keys(updates) });
  }

  /**
   * Watch configuration changes
   */
  watch(path: string, callback: (value: any) => void): () => void {
    this.watchers.set(path, callback);

    // Return unsubscribe function
    return () => {
      this.watchers.delete(path);
    };
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = this.getDefaultConfig();
    this.saveToFile();

    this.logger.info('ConfigManager', 'Configuration reset to defaults');
  }

  /**
   * Reload configuration from file
   */
  reload(): void {
    this.loadFromFile();
    this.loadFromEnvironment();
    this.validateConfig();

    this.logger.info('ConfigManager', 'Configuration reloaded from file');
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): ServerConfig {
    return {
      port: 3000,
      host: 'localhost',
      environment: 'development',

      database: {
        filename: './data/design-patterns.db',
        readonly: false,
        timeout: 5000,
        verbose: false
      },

      search: {
        maxResults: 10,
        similarityThreshold: 0.3,
        useSemanticSearch: true,
        useKeywordSearch: true,
        useHybridSearch: true,
        semanticWeight: 0.7,
        keywordWeight: 0.3,
        queryExpansion: true,
        reRanking: true
      },

      vector: {
        model: 'all-MiniLM-L6-v2',
        dimensions: 384,
        cacheEnabled: true,
        maxResults: 10
      },

      llm: {
        enabled: false,
        provider: 'none',
        model: 'gpt-3.5-turbo',
        timeout: 30000,
        maxRetries: 3
      },

      logging: {
        level: 'info',
        format: 'text',
        enableConsole: true,
        enableFile: false,
        logFile: './logs/design-patterns-mcp.log',
        maxFileSize: 10 * 1024 * 1024,
        maxFiles: 5
      },

      performance: {
        enableMetrics: true,
        metricsInterval: 60000,
        enableProfiling: false,
        cacheEnabled: true,
        cacheTTL: 3600000
      },

      security: {
        enableRateLimiting: false,
        maxRequestsPerMinute: 60,
        enableInputValidation: true,
        enableOutputSanitization: true
      }
    };
  }

  /**
   * Load configuration from file
   */
  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.configFile)) {
        const fileContent = fs.readFileSync(this.configFile, 'utf8');
        const fileConfig = JSON.parse(fileContent);

        this.deepMerge(this.config, fileConfig);

        this.logger.info('ConfigManager', 'Configuration loaded from file', { file: this.configFile });
      } else {
        this.logger.info('ConfigManager', 'Configuration file not found, using defaults', { file: this.configFile });
      }
    } catch (error) {
      this.logger.error('ConfigManager', 'Failed to load configuration from file', error instanceof Error ? error : undefined, { file: this.configFile });
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): void {
    // Server settings
    this.config.port = parseInt(process.env.PORT || '') || this.config.port;
    this.config.host = process.env.HOST || this.config.host;
    this.config.environment = (process.env.NODE_ENV as any) || this.config.environment;

    // Database settings
    this.config.database.filename = process.env.DATABASE_FILENAME || this.config.database.filename;
    this.config.database.readonly = process.env.DATABASE_READONLY === 'true' || this.config.database.readonly;
    this.config.database.timeout = parseInt(process.env.DATABASE_TIMEOUT || '') || this.config.database.timeout;
    this.config.database.verbose = process.env.DATABASE_VERBOSE === 'true' || this.config.database.verbose;

    // Search settings
    this.config.search.maxResults = parseInt(process.env.SEARCH_MAX_RESULTS || '') || this.config.search.maxResults;
    this.config.search.similarityThreshold = parseFloat(process.env.SEARCH_SIMILARITY_THRESHOLD || '') || this.config.search.similarityThreshold;
    this.config.search.useSemanticSearch = process.env.SEARCH_USE_SEMANTIC !== 'false' && this.config.search.useSemanticSearch;
    this.config.search.useKeywordSearch = process.env.SEARCH_USE_KEYWORD !== 'false' && this.config.search.useKeywordSearch;
    this.config.search.useHybridSearch = process.env.SEARCH_USE_HYBRID !== 'false' && this.config.search.useHybridSearch;

    // Vector settings
    this.config.vector.model = process.env.VECTOR_MODEL || this.config.vector.model;
    this.config.vector.dimensions = parseInt(process.env.VECTOR_DIMENSIONS || '') || this.config.vector.dimensions;
    this.config.vector.cacheEnabled = process.env.VECTOR_CACHE_ENABLED !== 'false' && this.config.vector.cacheEnabled;

    // LLM settings
    this.config.llm.enabled = process.env.LLM_ENABLED === 'true' || this.config.llm.enabled;
    this.config.llm.provider = (process.env.LLM_PROVIDER as any) || this.config.llm.provider;
    this.config.llm.model = process.env.LLM_MODEL || this.config.llm.model;
    this.config.llm.apiKey = process.env.LLM_API_KEY || this.config.llm.apiKey;
    this.config.llm.baseUrl = process.env.LLM_BASE_URL || this.config.llm.baseUrl;
    this.config.llm.timeout = parseInt(process.env.LLM_TIMEOUT || '') || this.config.llm.timeout;
    this.config.llm.maxRetries = parseInt(process.env.LLM_MAX_RETRIES || '') || this.config.llm.maxRetries;

    // Logging settings
    this.config.logging.level = process.env.LOG_LEVEL || this.config.logging.level;
    this.config.logging.format = (process.env.LOG_FORMAT as any) || this.config.logging.format;
    this.config.logging.enableConsole = process.env.LOG_ENABLE_CONSOLE !== 'false' && this.config.logging.enableConsole;
    this.config.logging.enableFile = process.env.LOG_ENABLE_FILE === 'true' || this.config.logging.enableFile;
    this.config.logging.logFile = process.env.LOG_FILE || this.config.logging.logFile;

    // Performance settings
    this.config.performance.enableMetrics = process.env.PERFORMANCE_ENABLE_METRICS !== 'false' && this.config.performance.enableMetrics;
    this.config.performance.enableProfiling = process.env.PERFORMANCE_ENABLE_PROFILING === 'true' || this.config.performance.enableProfiling;
    this.config.performance.cacheEnabled = process.env.PERFORMANCE_CACHE_ENABLED !== 'false' && this.config.performance.cacheEnabled;

    // Security settings
    this.config.security.enableRateLimiting = process.env.SECURITY_ENABLE_RATE_LIMITING === 'true' || this.config.security.enableRateLimiting;
    this.config.security.enableInputValidation = process.env.SECURITY_ENABLE_INPUT_VALIDATION !== 'false' && this.config.security.enableInputValidation;
    this.config.security.enableOutputSanitization = process.env.SECURITY_ENABLE_OUTPUT_SANITIZATION !== 'false' && this.config.security.enableOutputSanitization;

    this.logger.info('ConfigManager', 'Configuration loaded from environment variables');
  }

  /**
   * Save configuration to file
   */
  private saveToFile(): void {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configFile);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const configJson = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.configFile, configJson);

      this.logger.debug('ConfigManager', 'Configuration saved to file', { file: this.configFile });
    } catch (error) {
      this.logger.error('ConfigManager', 'Failed to save configuration to file', error instanceof Error ? error : undefined, { file: this.configFile });
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate port
    if (this.config.port < 1 || this.config.port > 65535) {
      errors.push('Port must be between 1 and 65535');
    }

    // Validate database settings
    if (!this.config.database.filename) {
      errors.push('Database filename is required');
    }

    // Validate search settings
    if (this.config.search.similarityThreshold < 0 || this.config.search.similarityThreshold > 1) {
      errors.push('Similarity threshold must be between 0 and 1');
    }

    if (this.config.search.semanticWeight + this.config.search.keywordWeight !== 1) {
      warnings.push('Semantic and keyword weights should sum to 1.0');
    }

    // Validate LLM settings
    if (this.config.llm.enabled && !this.config.llm.apiKey && this.config.llm.provider !== 'ollama') {
      errors.push('API key is required when LLM is enabled and not using Ollama');
    }

    // Validate vector settings
    if (this.config.vector.dimensions <= 0) {
      errors.push('Vector dimensions must be positive');
    }

    // Log validation results
    if (errors.length > 0) {
      this.logger.error('ConfigManager', 'Configuration validation failed', undefined, { errors });
    }

    if (warnings.length > 0) {
      this.logger.warn('ConfigManager', 'Configuration validation warnings', { warnings });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Notify watchers of configuration changes
   */
  private notifyWatchers(path: string, value: any): void {
    for (const [watchPath, callback] of this.watchers) {
      if (path.startsWith(watchPath) || watchPath === 'config') {
        try {
          callback(value);
        } catch (error) {
          this.logger.error('ConfigManager', 'Error in configuration watcher', error instanceof Error ? error : undefined, { watchPath });
        }
      }
    }
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * Get configuration statistics
   */
  getStats(): {
    configFile: string;
    watchersCount: number;
    environmentOverrides: string[];
  } {
    const envOverrides = Object.keys(process.env).filter(key => key.startsWith('PORT') ||
      key.startsWith('HOST') ||
      key.startsWith('NODE_ENV') ||
      key.startsWith('DATABASE_') ||
      key.startsWith('SEARCH_') ||
      key.startsWith('VECTOR_') ||
      key.startsWith('LLM_') ||
      key.startsWith('LOG_') ||
      key.startsWith('PERFORMANCE_') ||
      key.startsWith('SECURITY_'));

    return {
      configFile: this.configFile,
      watchersCount: this.watchers.size,
      environmentOverrides: envOverrides
    };
  }
}

// Factory function
export function createConfigManager(logger: Logger, errorHandler: ErrorHandler, configFile?: string): ConfigManager {
  return new ConfigManager(logger, errorHandler, configFile);
}
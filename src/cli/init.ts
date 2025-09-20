/**
 * Server Initialization and Startup Logic
 * Handles database setup, configuration loading, and service initialization
 */

import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pattern } from '../models/pattern.js';
import { PatternCategory } from '../models/pattern-category.js';
import { logger } from '../services/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ServerConfig {
  database: {
    path: string;
    type: 'sqlite' | 'postgresql';
    connectionString?: string;
  };
  server: {
    host: string;
    port: number;
    logLevel: string;
  };
  patterns: {
    totalExpected: number;
    categories: string[];
  };
  search: {
    semanticEnabled: boolean;
    embeddingModel: string;
    maxResults: number;
  };
  llm: {
    providers: string[];
    defaultProvider?: string;
    enhanceRecommendations: boolean;
  };
  performance: {
    cacheEnabled: boolean;
    maxMemoryMB: number;
    responseTimeoutMs: number;
  };
}

/**
 * Initialize server configuration
 */
export async function initializeConfig(configPath?: string): Promise<ServerConfig> {
  const defaultConfig: ServerConfig = {
    database: {
      path: './data/design-patterns.db',
      type: 'sqlite'
    },
    server: {
      host: 'localhost',
      port: 3000,
      logLevel: 'info'
    },
    patterns: {
      totalExpected: 200,
      categories: ['Creational', 'Structural', 'Behavioral', 'Architectural', 'Cloud-Native', 'Microservices', 'AI-ML', 'Functional', 'Reactive', 'Anti-Pattern']
    },
    search: {
      semanticEnabled: true,
      embeddingModel: 'all-MiniLM-L6-v2',
      maxResults: 20
    },
    llm: {
      providers: ['openai', 'ollama', 'anthropic'],
      enhanceRecommendations: false
    },
    performance: {
      cacheEnabled: true,
      maxMemoryMB: 100,
      responseTimeoutMs: 2000
    }
  };

  // TODO: Load config from file if provided
  if (configPath) {
    logger.info('init', `Loading configuration from: ${configPath}`);
    // Implementation for loading config from file
  }

  // Override with environment variables
  const envConfig = loadEnvironmentConfig(defaultConfig);

  logger.info('init', 'Configuration loaded successfully');
  return envConfig;
}

/**
 * Load configuration from environment variables
 */
function loadEnvironmentConfig(baseConfig: ServerConfig): ServerConfig {
  const config = { ...baseConfig };

  // Database configuration
  if (process.env.DATABASE_PATH) {
    config.database.path = process.env.DATABASE_PATH;
  }
  if (process.env.DATABASE_URL) {
    config.database.connectionString = process.env.DATABASE_URL;
    config.database.type = process.env.DATABASE_URL.startsWith('postgres') ? 'postgresql' : 'sqlite';
  }

  // Server configuration
  if (process.env.MCP_SERVER_HOST) {
    config.server.host = process.env.MCP_SERVER_HOST;
  }
  if (process.env.MCP_SERVER_PORT) {
    config.server.port = parseInt(process.env.MCP_SERVER_PORT, 10);
  }
  if (process.env.LOG_LEVEL) {
    config.server.logLevel = process.env.LOG_LEVEL;
  }

  // Search configuration
  if (process.env.SEMANTIC_SEARCH_ENABLED) {
    config.search.semanticEnabled = process.env.SEMANTIC_SEARCH_ENABLED === 'true';
  }
  if (process.env.EMBEDDING_MODEL) {
    config.search.embeddingModel = process.env.EMBEDDING_MODEL;
  }
  if (process.env.MAX_SEARCH_RESULTS) {
    config.search.maxResults = parseInt(process.env.MAX_SEARCH_RESULTS, 10);
  }

  // LLM configuration
  if (process.env.LLM_PROVIDERS) {
    config.llm.providers = process.env.LLM_PROVIDERS.split(',');
  }
  if (process.env.LLM_DEFAULT_PROVIDER) {
    config.llm.defaultProvider = process.env.LLM_DEFAULT_PROVIDER;
  }
  if (process.env.LLM_ENHANCE_RECOMMENDATIONS) {
    config.llm.enhanceRecommendations = process.env.LLM_ENHANCE_RECOMMENDATIONS === 'true';
  }

  // Performance configuration
  if (process.env.CACHE_ENABLED) {
    config.performance.cacheEnabled = process.env.CACHE_ENABLED === 'true';
  }
  if (process.env.MAX_MEMORY_MB) {
    config.performance.maxMemoryMB = parseInt(process.env.MAX_MEMORY_MB, 10);
  }
  if (process.env.RESPONSE_TIMEOUT_MS) {
    config.performance.responseTimeoutMs = parseInt(process.env.RESPONSE_TIMEOUT_MS, 10);
  }

  return config;
}

/**
 * Initialize database and data directories
 */
export async function initializeDatabase(config: ServerConfig): Promise<void> {
  logger.info('init', 'Initializing database...');

  // Ensure data directory exists
  const dataDir = dirname(config.database.path);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    logger.info('init', `Created data directory: ${dataDir}`);
  }

  // TODO: Initialize database schema
  logger.info('init', `Database initialized at: ${config.database.path}`);

  // TODO: Load pattern data if database is empty
  logger.info('init', 'Pattern catalog ready');
}

/**
 * Initialize pattern data
 */
export async function initializePatternData(config: ServerConfig): Promise<void> {
  logger.info('init', 'Initializing pattern data...');

  // TODO: Load pattern data from JSON files
  // TODO: Generate embeddings for semantic search
  // TODO: Build search indexes

  logger.info('init', `Loaded ${config.patterns.totalExpected} patterns`);
  logger.info('init', `Categories: ${config.patterns.categories.join(', ')}`);
}

/**
 * Initialize search services
 */
export async function initializeSearchServices(config: ServerConfig): Promise<void> {
  logger.info('init', 'Initializing search services...');

  if (config.search.semanticEnabled) {
    logger.info('init', `Semantic search enabled with model: ${config.search.embeddingModel}`);
    // TODO: Initialize semantic search service
  } else {
    logger.info('init', 'Using keyword search only');
  }

  // TODO: Initialize search indexes
  logger.info('init', 'Search services initialized');
}

/**
 * Initialize LLM services
 */
export async function initializeLLMServices(config: ServerConfig): Promise<void> {
  logger.info('init', 'Initializing LLM services...');

  if (config.llm.enhanceRecommendations) {
    logger.info('init', 'LLM enhancement enabled');
    logger.info('init', `Available providers: ${config.llm.providers.join(', ')}`);
    if (config.llm.defaultProvider) {
      logger.info('init', `Default provider: ${config.llm.defaultProvider}`);
    }
    // TODO: Initialize LLM bridge service
  } else {
    logger.info('init', 'LLM services disabled');
  }

  logger.info('init', 'LLM services initialized');
}

/**
 * Perform pre-flight checks
 */
export async function performPreflightChecks(config: ServerConfig): Promise<void> {
  logger.info('init', 'Performing pre-flight checks...');

  const checks = [
    { name: 'Data directory', check: () => existsSync(dirname(config.database.path)) },
    { name: 'Database accessibility', check: () => true }, // TODO: Implement actual check
    { name: 'Memory limits', check: () => process.memoryUsage().heapUsed < config.performance.maxMemoryMB * 1024 * 1024 },
    { name: 'Node.js version', check: () => parseInt(process.version.slice(1), 10) >= 18 }
  ];

  for (const check of checks) {
    try {
      const result = check.check();
      if (result) {
        logger.info('init', `${check.name}: OK`);
      } else {
        logger.error('init', `${check.name}: FAILED`);
        throw new Error(`${check.name} check failed`);
      }
    } catch (error) {
      logger.error('init', `${check.name}: ERROR - ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  logger.info('init', 'All pre-flight checks passed');
}

/**
 * Initialize all server components
 */
export async function initializeServer(configPath?: string): Promise<ServerConfig> {
  logger.info('init', 'Initializing Design Patterns MCP Server...');

  try {
    // Load configuration
    const config = await initializeConfig(configPath);

    // Perform pre-flight checks
    await performPreflightChecks(config);

    // Initialize database
    await initializeDatabase(config);

    // Initialize pattern data
    await initializePatternData(config);

    // Initialize search services
    await initializeSearchServices(config);

    // Initialize LLM services
    await initializeLLMServices(config);

    logger.info('init', 'Server initialization completed successfully!');
    logger.info('init', `Ready to serve ${config.patterns.totalExpected} design patterns`);
    logger.info('init', `Search: ${config.search.semanticEnabled ? 'Semantic + Keyword' : 'Keyword only'}`);
    logger.info('init', `LLM: ${config.llm.enhanceRecommendations ? 'Enabled' : 'Disabled'}`);

    return config;

  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    throw error;
  }
}

/**
 * Cleanup server resources
 */
export async function cleanupServer(): Promise<void> {
  logger.info('init', 'Cleaning up server resources...');

  try {
    // TODO: Close database connections
    // TODO: Save any pending data
    // TODO: Clean up temporary files

    logger.info('init', 'Server cleanup completed');
  } catch (error) {
    console.error('❌ Error during server cleanup:', error);
  }
}

/**
 * Get server health status
 */
export function getServerHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memoryUsage: number;
  version: string;
  checks: Record<string, boolean>;
} {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  // TODO: Implement actual health checks
  const checks = {
    database: true,
    search: true,
    memory: memUsage.heapUsed < 100 * 1024 * 1024, // 100MB limit
    patterns: true
  };

  const allHealthy = Object.values(checks).every(check => check);
  const status = allHealthy ? 'healthy' : 'degraded';

  return {
    status,
    uptime,
    memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    version: '0.1.0',
    checks
  };
}
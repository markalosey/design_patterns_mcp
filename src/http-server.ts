#!/usr/bin/env node
/**
 * HTTP Server for Design Patterns MCP
 * Provides both MCP SSE transport and REST API endpoints
 */

import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ReadResourceRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import { fileURLToPath } from 'url';

import { DatabaseManager } from './services/database-manager.js';
import { VectorOperationsService } from './services/vector-operations.js';
import { PatternMatcher } from './services/pattern-matcher.js';
import { SemanticSearchService } from './services/semantic-search.js';
import { LLMBridgeService } from './services/llm-bridge.js';
import { MigrationManager } from './services/migrations.js';
import { PatternSeeder } from './services/pattern-seeder.js';
import { initializeCacheService } from './services/cache.js';
import { logger } from './services/logger.js';
import { parseTags, parseArrayProperty } from './utils/parse-tags.js';

export interface HTTPServerConfig {
  port: number;
  host: string;
  databasePath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableLLM: boolean;
  maxConcurrentRequests: number;
}

class DesignPatternsHTTPServer {
  private app: express.Application;
  private server: any;
  private mcpServer: Server;
  private db: DatabaseManager;
  private vectorOps: VectorOperationsService;
  private patternMatcher: PatternMatcher;
  private semanticSearch: SemanticSearchService;
  private llmBridge: LLMBridgeService | null = null;
  private migrationManager: MigrationManager;
  private patternSeeder: PatternSeeder;
  private config: HTTPServerConfig;

  constructor(config: HTTPServerConfig) {
    this.config = config;
    this.app = express();

    // Initialize database
    this.db = new DatabaseManager({
      filename: config.databasePath,
      options: {
        verbose:
          config.logLevel === 'debug'
            ? (message: string) => logger.debug('database', message)
            : undefined,
      },
    });

    // Initialize cache service
    initializeCacheService({
      maxSize: 1000,
      defaultTTL: 3600000, // 1 hour
      enableMetrics: config.logLevel === 'debug',
    });

    // Initialize services
    this.vectorOps = new VectorOperationsService(this.db, {
      model: 'all-MiniLM-L6-v2',
      dimensions: 384,
      similarityThreshold: 0.3,
      maxResults: 10,
      cacheEnabled: true,
    });

    this.patternMatcher = new PatternMatcher(this.db, this.vectorOps, {
      maxResults: 5,
      minConfidence: 0.3,
      useSemanticSearch: true,
      useKeywordSearch: true,
      useHybridSearch: true,
      semanticWeight: 0.7,
      keywordWeight: 0.3,
    });

    this.semanticSearch = new SemanticSearchService(this.db, this.vectorOps, {
      modelName: 'all-MiniLM-L6-v2',
      maxResults: 50,
      similarityThreshold: 0.3,
      contextWindow: 1000,
      useQueryExpansion: false,
      useReRanking: true,
    });

    if (config.enableLLM) {
      this.llmBridge = new LLMBridgeService(this.db, {
        provider: 'ollama',
        model: 'llama3.2',
        maxTokens: 2000,
        temperature: 0.3,
        timeout: 30000, // 30 seconds
      });
    }

    // Get the directory of the current module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Resolve path relative to project root
    const isCompiled = __dirname.includes('dist');
    const projectRoot = isCompiled
      ? path.resolve(__dirname, '..', '..')
      : path.resolve(__dirname, '..');
    const patternsPath = path.join(projectRoot, 'data', 'patterns');

    this.migrationManager = new MigrationManager(this.db);
    this.patternSeeder = new PatternSeeder(this.db, {
      patternsPath,
      batchSize: 100,
      skipExisting: true,
    });

    // Initialize MCP server
    this.mcpServer = new Server(
      {
        name: 'design-patterns-mcp',
        version: '0.2.1',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupExpress();
    this.setupMCPHandlers();
  }

  private setupExpress(): void {
    // Middleware
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '0.2.1',
        database: {
          path: this.config.databasePath,
          patternCount: this.db.queryOne('SELECT COUNT(*) as count FROM patterns')?.count || 0,
        },
      });
    });

    // REST API endpoints
    this.app.get('/api/tools', async (req, res) => {
      try {
        const response = {
          tools: [
            {
              name: 'find_patterns',
              description: 'Find design patterns matching a problem description using semantic search',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Natural language description of the problem or requirements' },
                  categories: { type: 'array', items: { type: 'string' }, description: 'Optional: Pattern categories to search in' },
                  maxResults: { type: 'number', description: 'Maximum number of recommendations to return', default: 5 },
                  programmingLanguage: { type: 'string', description: 'Target programming language for implementation examples' },
                },
                required: ['query'],
              },
            },
            {
              name: 'search_patterns',
              description: 'Search patterns by keyword or semantic similarity',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query' },
                  searchType: { type: 'string', enum: ['keyword', 'semantic', 'hybrid'], default: 'hybrid' },
                  limit: { type: 'number', default: 10 },
                },
                required: ['query'],
              },
            },
            {
              name: 'get_pattern_details',
              description: 'Get detailed information about a specific pattern',
              inputSchema: {
                type: 'object',
                properties: {
                  patternId: { type: 'string', description: 'Pattern ID to get details for' },
                },
                required: ['patternId'],
              },
            },
            {
              name: 'count_patterns',
              description: 'Get the total number of design patterns in the database',
              inputSchema: {
                type: 'object',
                properties: {
                  includeDetails: { type: 'boolean', description: 'Include breakdown by category', default: false },
                },
              },
            },
          ],
        };
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: 'Failed to list tools' });
      }
    });

    this.app.post('/api/count-patterns', async (req, res) => {
      try {
        const response = await this.handleCountPatterns(req.body);
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: 'Failed to count patterns' });
      }
    });

    this.app.post('/api/find-patterns', async (req, res) => {
      try {
        const response = await this.handleFindPatterns(req.body);
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: 'Failed to find patterns' });
      }
    });

    this.app.post('/api/search-patterns', async (req, res) => {
      try {
        const response = await this.handleSearchPatterns(req.body);
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: 'Failed to search patterns' });
      }
    });

    this.app.post('/api/get-pattern-details', async (req, res) => {
      try {
        const response = await this.handleGetPatternDetails(req.body);
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get pattern details' });
      }
    });

    // MCP SSE endpoint
    this.app.get('/mcp', async (req, res) => {
      const transport = new SSEServerTransport('/mcp', res);
      await this.mcpServer.connect(transport);
    });
  }

  private setupMCPHandlers(): void {
    // List available tools
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'find_patterns',
            description:
              'Find design patterns matching a problem description using semantic search',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language description of the problem or requirements',
                },
                categories: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional: Pattern categories to search in',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of recommendations to return',
                  default: 5,
                },
                programmingLanguage: {
                  type: 'string',
                  description: 'Target programming language for implementation examples',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'search_patterns',
            description: 'Search patterns by keyword or semantic similarity',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
                searchType: {
                  type: 'string',
                  enum: ['keyword', 'semantic', 'hybrid'],
                  default: 'hybrid',
                },
                limit: {
                  type: 'number',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_pattern_details',
            description: 'Get detailed information about a specific pattern',
            inputSchema: {
              type: 'object',
              properties: {
                patternId: {
                  type: 'string',
                  description: 'Pattern ID to get details for',
                },
              },
              required: ['patternId'],
            },
          },
          {
            name: 'count_patterns',
            description: 'Get the total number of design patterns in the database',
            inputSchema: {
              type: 'object',
              properties: {
                includeDetails: {
                  type: 'boolean',
                  description: 'Include breakdown by category',
                  default: false,
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'find_patterns':
          return await this.handleFindPatterns(args);
        case 'search_patterns':
          return await this.handleSearchPatterns(args);
        case 'get_pattern_details':
          return await this.handleGetPatternDetails(args);
        case 'count_patterns':
          return await this.handleCountPatterns(args);
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });

    // List available resources
    this.mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'patterns',
            name: 'Design Patterns',
            description: 'Complete catalog of design patterns',
            mimeType: 'application/json',
          },
          {
            uri: 'categories',
            name: 'Pattern Categories',
            description: 'All available pattern categories',
            mimeType: 'application/json',
          },
          {
            uri: 'server_info',
            name: 'Server Information',
            description: 'Server status and configuration',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Handle resource reads
    this.mcpServer.setRequestHandler(ReadResourceRequestSchema, async request => {
      const { uri } = request.params;

      switch (uri) {
        case 'patterns':
          return await this.handleReadPatterns();
        case 'categories':
          return await this.handleReadCategories();
        case 'server_info':
          return await this.handleReadServerInfo();
        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
      }
    });

    // Error handling
    this.mcpServer.onerror = error => {
      logger.error(
        'mcp-server',
        'Server error',
        error instanceof Error ? error : new Error(String(error))
      );
    };
  }

  // Tool handlers (same as stdio version)
  private async handleFindPatterns(args: any): Promise<any> {
    const request = {
      id: crypto.randomUUID(),
      query: args.query,
      categories: args.categories || [],
      maxResults: args.maxResults || 5,
      programmingLanguage: args.programmingLanguage,
    };

    const recommendations = await this.patternMatcher.findMatchingPatterns(request);

    return {
      content: [
        {
          type: 'text',
          text:
            `Found ${recommendations.length} pattern recommendations:\n\n` +
            recommendations
              .map(
                (rec, index) =>
                  `${index + 1}. **${rec.pattern.name}** (${rec.pattern.category})\n` +
                  `   Confidence: ${(rec.confidence * 100).toFixed(1)}%\n` +
                  `   Rationale: ${rec.justification.primaryReason}\n` +
                  `   Benefits: ${rec.justification.benefits.join(', ')}\n`
              )
              .join('\n'),
        },
      ],
    };
  }

  private async handleSearchPatterns(args: any): Promise<any> {
    const query = {
      text: args.query,
      filters: args.filters || {},
      options: {
        limit: args.limit || 10,
        includeMetadata: true,
      },
    };

    const results = await this.semanticSearch.search(query);

    return {
      content: [
        {
          type: 'text',
          text:
            `Search results for "${args.query}":\n\n` +
            results
              .map(
                (result, index) =>
                  `${index + 1}. **${result.pattern.name}** (${result.pattern.category})\n` +
                  `   Score: ${(result.score * 100).toFixed(1)}%\n` +
                  `   Description: ${result.pattern.description}\n`
              )
              .join('\n'),
        },
      ],
    };
  }

  private async handleGetPatternDetails(args: any): Promise<any> {
    const pattern = this.db.queryOne(
      `
      SELECT id, name, category, description, when_to_use, benefits,
             drawbacks, use_cases, complexity, tags, examples, created_at
      FROM patterns WHERE id = ?
    `,
      [args.patternId]
    );

    if (!pattern) {
      // Try to find similar patterns using semantic search
      const similarPatterns = await this.semanticSearch.search({
        text: args.patternId,
        options: {
          limit: 3,
          includeMetadata: true,
        },
      });

      if (similarPatterns.length > 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Pattern "${args.patternId}" not found. Here are similar patterns:\n\n${similarPatterns
                .map(
                  (p, i) =>
                    `${i + 1}. **${p.pattern.name}** (${p.pattern.category})\n   ${p.pattern.description}\n   Score: ${(p.score * 100).toFixed(1)}%`
                )
                .join('\n\n')}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Pattern "${args.patternId}" not found and no similar patterns were found.`,
            },
          ],
        };
      }
    }

    const implementations = this.db.query(
      `
      SELECT language, code, explanation FROM pattern_implementations
      WHERE pattern_id = ? LIMIT 3
    `,
      [args.patternId]
    );

    // Parse code examples if available
    let examplesText = '';
    if (pattern.examples) {
      try {
        const examples = JSON.parse(pattern.examples);
        const exampleKeys = Object.keys(examples);
        
        if (exampleKeys.length > 0) {
          examplesText = '\n\n**Code Examples:**\n';
          exampleKeys.forEach(lang => {
            const example = examples[lang];
            examplesText += `\n### ${lang.charAt(0).toUpperCase() + lang.slice(1)}\n`;
            if (example.description) {
              examplesText += `${example.description}\n\n`;
            }
            examplesText += `\`\`\`${lang}\n${example.code}\n\`\`\`\n`;
          });
        }
      } catch (e) {
        // If parsing fails, skip examples
      }
    }

    return {
      content: [
        {
          type: 'text',
          text:
            `# ${pattern.name} (${pattern.category})\n\n` +
            `**Description:** ${pattern.description}\n\n` +
            `**When to Use:** ${parseArrayProperty(pattern.when_to_use).join(', ')}\n\n` +
            `**Benefits:** ${parseArrayProperty(pattern.benefits).join(', ')}\n\n` +
            `**Drawbacks:** ${parseArrayProperty(pattern.drawbacks).join(', ')}\n\n` +
            `**Use Cases:** ${parseArrayProperty(pattern.use_cases).join(', ')}\n\n` +
            `**Complexity:** ${pattern.complexity}\n\n` +
            `**Tags:** ${parseTags(pattern.tags).join(', ')}\n` +
            examplesText +
            (implementations.length > 0
              ? `\n\n**Implementations:**\n` +
                implementations
                  .map(
                    impl =>
                      `\n### ${impl.language}\n\`\`\`${impl.language.toLowerCase()}\n${impl.code}\n\`\`\`\n${impl.explanation}`
                  )
                  .join('\n')
              : ''),
        },
      ],
    };
  }

  private async handleCountPatterns(args: any): Promise<any> {
    try {
      const patterns = this.db.query('SELECT id, name, category FROM patterns ORDER BY category');
      const total = patterns.length;

      if (args.includeDetails) {
        // Create category breakdown
        const categoryBreakdown: { [key: string]: number } = {};
        patterns.forEach(pattern => {
          categoryBreakdown[pattern.category] = (categoryBreakdown[pattern.category] || 0) + 1;
        });

        const breakdown = Object.entries(categoryBreakdown)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count);

        return {
          content: [
            {
              type: 'text',
              text:
                `## Total Design Patterns: ${total}\n\n` +
                `### Breakdown by Category:\n` +
                breakdown.map(item => `- **${item.category}**: ${item.count} patterns`).join('\n') +
                '\n\n' +
                `*Total patterns from all sources: ${total}*`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Total design patterns in database: **${total}**`,
            },
          ],
        };
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Pattern count failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Resource handlers (same as stdio version)
  private async handleReadPatterns(): Promise<any> {
    const patterns = this.db.query(
      'SELECT id, name, category, description, complexity, tags FROM patterns ORDER BY name'
    );

    return {
      contents: [
        {
          uri: 'patterns',
          mimeType: 'application/json',
          text: JSON.stringify(patterns, null, 2),
        },
      ],
    };
  }

  private async handleReadCategories(): Promise<any> {
    const categories = this.db.query(`
      SELECT category, COUNT(*) as count 
      FROM patterns 
      GROUP BY category 
      ORDER BY category
    `);

    return {
      contents: [
        {
          uri: 'categories',
          mimeType: 'application/json',
          text: JSON.stringify(categories, null, 2),
        },
      ],
    };
  }

  private async handleReadServerInfo(): Promise<any> {
    const info = {
      name: 'Design Patterns MCP Server',
      version: '0.2.1',
      status: 'running',
      database: {
        path: this.config.databasePath,
        patternCount: this.db.queryOne('SELECT COUNT(*) as count FROM patterns')?.count || 0,
      },
      features: {
        semanticSearch: true,
        llmBridge: this.config.enableLLM,
        caching: true,
      },
      config: {
        logLevel: this.config.logLevel,
        maxConcurrentRequests: this.config.maxConcurrentRequests,
      },
    };

    return {
      contents: [
        {
          uri: 'server_info',
          mimeType: 'application/json',
          text: JSON.stringify(info, null, 2),
        },
      ],
    };
  }

  async initialize(): Promise<void> {
    try {
      logger.info('http-server', 'Initializing Design Patterns HTTP Server', {
        port: this.config.port,
        host: this.config.host,
        databasePath: this.config.databasePath,
        logLevel: this.config.logLevel,
      });

      await this.db.initialize();
      await this.migrationManager.initialize();
      await this.migrationManager.migrate();
      await this.patternSeeder.seedAll();

      // LLMBridge doesn't require initialization
      if (this.llmBridge) {
        logger.info('http-server', 'LLM Bridge configured');
      }

      logger.info('http-server', 'Design Patterns HTTP Server initialized successfully');
    } catch (error) {
      logger.error(
        'http-server',
        'Failed to initialize server',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        logger.info('http-server', `Server started on http://${this.config.host}:${this.config.port}`);
        logger.info('http-server', `MCP endpoint: http://${this.config.host}:${this.config.port}/mcp`);
        logger.info('http-server', `REST API: http://${this.config.host}:${this.config.port}/api`);
        logger.info('http-server', `Health check: http://${this.config.host}:${this.config.port}/health`);
        resolve();
      });

      this.server.on('error', (error: any) => {
        logger.error('http-server', 'Server error', error);
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    try {
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info('http-server', 'Server stopped');
            resolve();
          });
        });
      }
      await this.db.close();
      await this.mcpServer.close();
    } catch (error) {
      logger.error(
        'http-server',
        'Error stopping server',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
}

// Export server creation function
export function createDesignPatternsHTTPServer(config: HTTPServerConfig): DesignPatternsHTTPServer {
  return new DesignPatternsHTTPServer(config);
}

// Main execution when run directly
async function main(): Promise<void> {
  // Get the directory of the current module
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Resolve path relative to project root
  const isCompiled = __dirname.includes('dist');
  const projectRoot = isCompiled
    ? path.resolve(__dirname, '..', '..')
    : path.resolve(__dirname, '..');

  const defaultDbPath = path.join(projectRoot, 'data', 'design-patterns.db');

  const config: HTTPServerConfig = {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || 'localhost',
    databasePath: process.env.DATABASE_PATH || defaultDbPath,
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    enableLLM: process.env.ENABLE_LLM === 'true',
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '10'),
  };

  const server = createDesignPatternsHTTPServer(config);

  try {
    await server.initialize();
    await server.start();
  } catch (error) {
    logger.error(
      'main',
      'Failed to start server',
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info('main', `Received ${signal}, shutting down gracefully`);
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      logger.error(
        'main',
        'Error during shutdown',
        error instanceof Error ? error : new Error(String(error))
      );
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

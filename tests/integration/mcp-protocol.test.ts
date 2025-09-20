import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPToolsHandler } from '../../src/lib/mcp-tools';
import { DatabaseManager } from '../../src/services/database-manager';
import { PatternMatcher } from '../../src/services/pattern-matcher';
import { SemanticSearchService } from '../../src/services/semantic-search';
import { VectorOperationsService } from '../../src/services/vector-operations';
import { logger } from '../../src/services/logger';

describe('MCP Server Protocol', () => {
  let mcpTools: MCPToolsHandler;
  let dbManager: DatabaseManager;

  beforeAll(async () => {
    // Initialize database and services
    dbManager = new DatabaseManager({
      filename: ':memory:',
      options: { readonly: false },
    });
    await dbManager.initialize();

    // Create test tables matching migration schema using direct db.run
    const db = dbManager.getDatabase();
    
    try {
      logger.debug('mcp-protocol-test', 'Dropping existing tables if they exist...');
      try {
        db.run('DROP TABLE IF EXISTS pattern_relationships');
        db.run('DROP TABLE IF EXISTS pattern_implementations');
        db.run('DROP TABLE IF EXISTS pattern_embeddings');
        db.run('DROP TABLE IF EXISTS patterns');
      } catch (e) {
        // Ignore drop errors
      }
      
      logger.debug('mcp-protocol-test', 'Creating patterns table...');
      db.run(`
        CREATE TABLE patterns (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          when_to_use TEXT,
          benefits TEXT,
          drawbacks TEXT,
          use_cases TEXT,
          complexity TEXT NOT NULL,
          tags TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      logger.debug('mcp-protocol-test', 'Creating pattern_embeddings table...');
      db.run(`
        CREATE TABLE pattern_embeddings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern_id TEXT NOT NULL,
          embedding TEXT NOT NULL,
          model TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      logger.debug('mcp-protocol-test', 'Creating pattern_implementations table...');
      db.run(`
        CREATE TABLE pattern_implementations (
          id TEXT PRIMARY KEY,
          pattern_id TEXT NOT NULL,
          language TEXT NOT NULL,
          approach TEXT NOT NULL,
          code TEXT NOT NULL,
          explanation TEXT NOT NULL,
          dependencies TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
        )
      `);
      
      logger.debug('mcp-protocol-test', 'Creating pattern_relationships table...');
      db.run(`
        CREATE TABLE pattern_relationships (
          id TEXT PRIMARY KEY,
          source_pattern_id TEXT NOT NULL,
          target_pattern_id TEXT NOT NULL,
          type TEXT NOT NULL,
          strength REAL DEFAULT 1.0,
          description TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (source_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
          FOREIGN KEY (target_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
        )
      `);

      // Verify table schema
      logger.debug('mcp-protocol-test', 'Checking table schema...');
      const schema = db.exec("PRAGMA table_info(patterns)");
      logger.debug('mcp-protocol-test', `Pattern table schema: ${JSON.stringify(schema)}`);
      
      if (schema.length === 0 || schema[0].values.length === 0) {
        throw new Error('Pattern table was not created properly');
      }

      // Insert test data using raw SQL instead of prepared statement
      logger.debug('mcp-protocol-test', 'Inserting test data...');
      db.run(`INSERT INTO patterns (id, name, category, description, complexity, tags) 
              VALUES ('factory_method', 'Factory Method', 'GoF', 'Create objects without specifying exact classes', 'medium', 'factory,creation,objects')`);
      
    } catch (error) {
      logger.error('mcp-protocol-test', `Failed to set up test database: ${error}`);
      throw error;
    }

    // Initialize services
    const vectorOps = new VectorOperationsService(dbManager, {
      model: 'all-MiniLM-L6-v2',
      dimensions: 384,
      similarityThreshold: 0.7,
      maxResults: 10,
      cacheEnabled: true,
    });

    const semanticSearch = new SemanticSearchService(dbManager, vectorOps, {
      modelName: 'all-MiniLM-L6-v2',
      maxResults: 10,
      similarityThreshold: 0.7,
      contextWindow: 512,
      useQueryExpansion: false,
      useReRanking: false
    });

    const patternMatcher = new PatternMatcher(dbManager, vectorOps, {
      maxResults: 5,
      minConfidence: 0.3,
      useSemanticSearch: true,
      useKeywordSearch: true,
      useHybridSearch: true,
      semanticWeight: 0.7,
      keywordWeight: 0.3,
    });

    // Initialize MCP Tools
    mcpTools = new MCPToolsHandler({
      patternMatcher: {
        findSimilarPatterns: async (request) => {
          return await patternMatcher.findMatchingPatterns(request);
        },
        analyzeCode: async (code, language) => {
          return { language, patterns: [], suggestions: [] };
        }
      },
      semanticSearch: {
        search: async (query, options) => {
          return await semanticSearch.search({ text: query, options });
        }
      },
      databaseManager: {
        searchPatterns: async (query, options) => {
          return dbManager.query('SELECT * FROM patterns WHERE name LIKE ? OR description LIKE ?', [`%${query}%`, `%${query}%`]);
        },
        updatePattern: async (id, updates) => {
          // Implementation for update
        },
        savePattern: async (pattern) => {
          // Implementation for save
        },
        getAllPatterns: async () => {
          return dbManager.query('SELECT * FROM patterns');
        },
        getPatternById: async (id) => {
          const results = dbManager.query('SELECT * FROM patterns WHERE id = ?', [id]);
          return results.length > 0 ? results[0] : null;
        },
        getPatternCategories: async () => {
          return dbManager.query('SELECT DISTINCT category FROM patterns');
        },
        getSupportedLanguages: async () => {
          return [{ name: 'TypeScript' }, { name: 'JavaScript' }, { name: 'Python' }];
        },
        getServerStats: async () => {
          return { patterns: 1, embeddings: 0, uptime: '1m' };
        }
      },
      preferences: new Map(),
    });
  });

  afterAll(async () => {
    if (dbManager) {
      await dbManager.close();
    }
  });

  it('should handle suggest_pattern tool calls', async () => {
    const response = await mcpTools.handleToolCall({
      method: 'tools/call',
      params: {
        name: 'suggest_pattern',
        arguments: {
          query: 'I need to create objects without specifying exact classes',
          programming_language: 'typescript',
          max_results: 3
        }
      }
    });

    expect(response).toHaveProperty('recommendations');
    expect(Array.isArray(response.recommendations)).toBe(true);
    if (response.recommendations.length > 0) {
      expect(response.recommendations[0]).toHaveProperty('pattern');
      expect(response.recommendations[0]).toHaveProperty('score');
    }
  });

  it('should handle search_patterns tool calls', async () => {
    const response = await mcpTools.handleToolCall({
      method: 'tools/call',
      params: {
        name: 'search_patterns',
        arguments: {
          query: 'factory',
          search_type: 'keyword',
          max_results: 5
        }
      }
    });

    expect(response).toHaveProperty('patterns');
    expect(Array.isArray(response.patterns)).toBe(true);
    if (response.patterns.length > 0) {
      expect(response.patterns[0]).toHaveProperty('id');
      expect(response.patterns[0]).toHaveProperty('name');
      expect(response.patterns[0]).toHaveProperty('description');
    }
  });

  it('should handle analyze_code tool calls', async () => {
    const response = await mcpTools.handleToolCall({
      method: 'tools/call',
      params: {
        name: 'analyze_code',
        arguments: {
          code: 'class Logger { private static instance: Logger; private constructor() {} public static getInstance(): Logger { if (!Logger.instance) { Logger.instance = new Logger(); } return Logger.instance; } }',
          language: 'typescript',
          analysis_type: 'identify_patterns'
        }
      }
    });

    expect(response).toHaveProperty('language');
    expect(response.language).toBe('typescript');
    expect(response).toHaveProperty('code_length');
    expect(response).toHaveProperty('analysis_type');
  });

  it('should handle error responses gracefully', async () => {
    try {
      await mcpTools.handleToolCall({
        method: 'tools/call',
        params: {
          name: 'invalid_tool',
          arguments: {}
        }
      });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect((error as Error).message).toContain('Unknown tool');
    }

    try {
      await mcpTools.handleToolCall({
        method: 'tools/call',
        params: {
          name: 'suggest_pattern',
          arguments: {
            // Missing required 'query' field
            programming_language: 'typescript'
          }
        }
      });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect((error as Error).message).toContain('Query must be at least');
    }
  });

  it('should handle get_config tool calls', async () => {
    const response = await mcpTools.handleToolCall({
      method: 'tools/call',
      params: {
        name: 'get_config',
        arguments: {
          category: 'all'
        }
      }
    });

    expect(response).toHaveProperty('configuration');
    expect(response).toHaveProperty('category');
    expect(response).toHaveProperty('timestamp');
  });

  it('should handle count_patterns tool calls', async () => {
    const response = await mcpTools.handleToolCall({
      method: 'tools/call',
      params: {
        name: 'count_patterns',
        arguments: {
          includeDetails: false
        }
      }
    });

    expect(response).toHaveProperty('content');
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content[0]).toHaveProperty('type');
    expect(response.content[0].type).toBe('text');
    expect(response.content[0]).toHaveProperty('text');
    expect(response.content[0].text).toContain('Total design patterns in database:');
    expect(response.content[0].text).toMatch(/\*\*\d+\*\*/); // Should contain pattern count in bold
  });

  it('should handle count_patterns tool calls with details', async () => {
    const response = await mcpTools.handleToolCall({
      method: 'tools/call',
      params: {
        name: 'count_patterns',
        arguments: {
          includeDetails: true
        }
      }
    });

    expect(response).toHaveProperty('content');
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content[0]).toHaveProperty('type');
    expect(response.content[0].type).toBe('text');
    expect(response.content[0]).toHaveProperty('text');
    expect(response.content[0].text).toContain('## Total Design Patterns:');
    expect(response.content[0].text).toContain('### Breakdown by Category:');
    expect(response.content[0].text).toContain('Total patterns from all sources:');
    expect(response.content[0].text).toContain('GoF'); // Should show category breakdown
  });
});
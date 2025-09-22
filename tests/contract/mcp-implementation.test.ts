/**
 * MCP Implementation Tests
 * Tests our MCP tools and resources implementation
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { MCPToolsHandler } from '../../src/lib/mcp-tools.js';
import { MCPResourcesHandler } from '../../src/lib/mcp-resources.js';
import { CallToolRequest, ReadResourceRequest, ListResourcesRequest } from '@modelcontextprotocol/sdk/types.js';

describe('MCP Implementation Tests', () => {
  let toolsHandler: MCPToolsHandler;
  let resourcesHandler: MCPResourcesHandler;

  beforeAll(async () => {
    // Initialize handlers with placeholder services
    const patternMatcher = {
      findSimilarPatterns: async (request: any) => [{
        pattern: {
          id: 'singleton',
          name: 'Singleton',
          category: 'Creational' as any,
          description: 'Ensure a class has only one instance',
          complexity: 'Low',
          tags: ['creational', 'single-instance']
        },
        score: 0.85,
        rank: 1,
        justification: {
          primaryReason: 'Matches requirement for single instance',
          supportingReasons: ['Simple implementation', 'Global access'],
          problemFit: 'Perfect fit for single instance requirement',
          benefits: ['Controlled access', 'Reduced namespace pollution'],
          drawbacks: ['Can make testing difficult']
        },
        implementation: {
          language: 'typescript',
          codeSnippet: 'class Singleton { private static instance: Singleton; ... }',
          explanation: 'Classic Singleton implementation',
          considerations: ['Thread safety', 'Lazy initialization']
        },
        alternatives: [],
        context: {
          projectContext: 'General purpose application',
          teamContext: 'Standard development practices',
          technologyFit: {
            fitScore: 0.9,
            reasons: ['Widely supported', 'Simple to implement'],
            compatibleTech: ['typescript', 'javascript', 'python']
          }
        }
      }],
      analyzeCode: async (code: string, language: string) => ({
        identifiedPatterns: [{
          patternName: 'Singleton',
          confidence: 0.8,
          explanation: 'Code appears to implement singleton pattern'
        }],
        suggestedPatterns: [],
        improvements: ['Consider using dependency injection']
      })
    };

    const semanticSearch = {
      search: async (query: string, options?: any) => [{
        id: 'singleton',
        name: 'Singleton',
        category: 'Creational' as any,
        description: 'Ensure a class has only one instance',
        score: 0.9,
        matchType: 'semantic',
        pattern: {
          id: 'singleton',
          name: 'Singleton',
          category: 'Creational' as any,
          description: 'Ensure a class has only one instance'
        }
      }]
    };

    const databaseManager = {
      searchPatterns: async (query: string, options?: any) => [{
        id: 'factory-method',
        name: 'Factory Method',
        category: 'Creational' as any,
        description: 'Define interface for creating object',
        score: 0.7,
        matchType: 'keyword'
      }],
      updatePattern: async (id: string, updates: any) => {},
      savePattern: async (pattern: any) => {},
      getAllPatterns: async () => [
        {
          id: 'singleton',
          name: 'Singleton',
          category: 'Creational' as any,
          description: 'Ensure a class has only one instance',
          when_to_use: ['Need single instance', 'Global access required'],
          benefits: ['Controlled access', 'Reduced pollution'],
          drawbacks: ['Testing difficulty', 'Tight coupling'],
          use_cases: ['Database connections', 'Configuration'],
          implementations: [{
            language: 'typescript',
            code: 'class Singleton { private static instance: Singleton; ... }',
            explanation: 'TypeScript Singleton implementation'
          }],
          complexity: 'Low',
          popularity: 0.8,
          tags: ['creational', 'single-instance'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      getPatternById: async (id: string) => {
        if (id === 'singleton') {
          return {
            id: 'singleton',
            name: 'Singleton',
          category: 'Creational' as any,
            description: 'Ensure a class has only one instance',
            when_to_use: ['Need single instance', 'Global access required'],
            benefits: ['Controlled access', 'Reduced pollution'],
            drawbacks: ['Testing difficulty', 'Tight coupling'],
            use_cases: ['Database connections', 'Configuration'],
            implementations: [{
              language: 'typescript',
              code: 'class Singleton { private static instance: Singleton; ... }',
              explanation: 'TypeScript Singleton implementation'
            }],
            complexity: 'Low',
            popularity: 0.8,
            tags: ['creational', 'single-instance'],
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
        return null;
      },
      getPatternCategories: async () => [
        {
          id: 1,
          name: 'Creational',
          description: 'Patterns for object creation',
          patternCount: 5,
          typicalUseCases: 'Object instantiation, resource management',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      getSupportedLanguages: async () => [
        {
          language: 'typescript',
          display_name: 'TypeScript',
          implementation_count: 150,
          supported_features: ['classes', 'interfaces', 'generics']
        }
      ],
      getServerStats: async () => ({
        avgResponseTime: 150,
        totalRequests: 42,
        cacheHitRate: 0.85
      })
    };

    toolsHandler = new MCPToolsHandler({
      patternMatcher,
      semanticSearch,
      databaseManager,
      preferences: new Map()
    });

    resourcesHandler = new MCPResourcesHandler({
      databaseManager,
      serverVersion: '0.1.0',
      totalPatterns: 200
    });
  });

  describe('MCP Tools', () => {
    test('suggest_pattern tool returns valid response', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'suggest_pattern',
          arguments: {
            query: 'I need to create different types of database connections based on configuration',
            programming_language: 'typescript',
            max_results: 3,
            include_examples: true
          }
        }
      };

      const response = await toolsHandler.handleToolCall(request);

      expect(response).toHaveProperty('request_id');
      expect(response).toHaveProperty('recommendations');
      expect(response).toHaveProperty('metadata');

      expect(Array.isArray(response.recommendations)).toBe(true);
      expect(response.recommendations.length).toBeGreaterThan(0);

      const recommendation = response.recommendations[0];
      expect(recommendation).toHaveProperty('pattern');
      expect(recommendation).toHaveProperty('score');
      expect(recommendation).toHaveProperty('rank');
      expect(recommendation).toHaveProperty('justification');

      expect(recommendation.pattern).toHaveProperty('id');
      expect(recommendation.pattern).toHaveProperty('name');
      expect(recommendation.pattern).toHaveProperty('category');
    });

    test('search_patterns tool returns valid response', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'search_patterns',
          arguments: {
            query: 'singleton',
            search_type: 'keyword',
            limit: 5
          }
        }
      };

      const response = await toolsHandler.handleToolCall(request);

      expect(response).toHaveProperty('patterns');
      expect(response).toHaveProperty('total_results');
      expect(Array.isArray(response.patterns)).toBe(true);

      const pattern = response.patterns[0];
      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('name');
      expect(pattern).toHaveProperty('score');
    });

    test('analyze_code tool returns valid response', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'analyze_code',
          arguments: {
            code: 'class Singleton { private static instance: Singleton; }',
            language: 'typescript',
            analysis_type: 'identify_patterns'
          }
        }
      };

      const response = await toolsHandler.handleToolCall(request);

      expect(response).toHaveProperty('language');
      expect(response).toHaveProperty('identified_patterns');
      expect(Array.isArray(response.identified_patterns)).toBe(true);
    });
  });

  describe('MCP Resources', () => {
    test('patterns resource returns valid data', async () => {
      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: {
          uri: 'patterns'
        }
      };

      const response = await resourcesHandler.handleResourceRead(request);

      expect(response).toHaveProperty('contents');
      expect(Array.isArray(response.contents)).toBe(true);

      const content = response.contents[0];
      expect(content).toHaveProperty('uri');
      expect(content).toHaveProperty('mimeType');
      expect(content.mimeType).toBe('application/json');

      const patterns = JSON.parse(content.text);
      expect(Array.isArray(patterns)).toBe(true);
    });

    test('pattern/{id} resource returns valid data', async () => {
      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: {
          uri: 'pattern/singleton'
        }
      };

      const response = await resourcesHandler.handleResourceRead(request);

      expect(response).toHaveProperty('contents');
      const content = response.contents[0];
      expect(content.mimeType).toBe('application/json');

      const pattern = JSON.parse(content.text);
      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('name');
      expect(pattern).toHaveProperty('category');
    });

    test('categories resource returns valid data', async () => {
      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: {
          uri: 'categories'
        }
      };

      const response = await resourcesHandler.handleResourceRead(request);

      expect(response).toHaveProperty('contents');
      const content = response.contents[0];
      expect(content.mimeType).toBe('application/json');

      const categories = JSON.parse(content.text);
      expect(Array.isArray(categories)).toBe(true);
    });

    test('server_info resource returns valid data', async () => {
      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: {
          uri: 'server_info'
        }
      };

      const response = await resourcesHandler.handleResourceRead(request);

      expect(response).toHaveProperty('contents');
      const content = response.contents[0];
      expect(content.mimeType).toBe('application/json');

      const serverInfo = JSON.parse(content.text);
      expect(serverInfo).toHaveProperty('server_version');
      expect(serverInfo).toHaveProperty('total_patterns');
    });

    test('resource listing returns available resources', async () => {
      const request: ListResourcesRequest = {
        method: 'resources/list',
        params: {}
      };

      const response = await resourcesHandler.handleResourceList(request);

      expect(response).toHaveProperty('resources');
      expect(Array.isArray(response.resources)).toBe(true);
      expect(response.resources.length).toBeGreaterThan(0);

      const resource = response.resources[0];
      expect(resource).toHaveProperty('uri');
      expect(resource).toHaveProperty('mimeType');
    });
  });
});
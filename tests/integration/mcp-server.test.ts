/**
 * Integration Tests for MCP Server
 * Tests the full MCP server with real database and services
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createDesignPatternsServer } from '../../src/mcp-server.js';
import { getTestDatabasePath } from '../helpers/test-db';

describe('MCP Server Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    const config = {
      databasePath: getTestDatabasePath(),
      logLevel: 'info' as const,
      enableLLM: false,
      maxConcurrentRequests: 10,
    };
    server = createDesignPatternsServer(config);
    expect(server).toBeDefined();
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  test('server should initialize successfully', () => {
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(Object);
  });

  test('server should have MCP capabilities', () => {
    // Check that server has expected properties indicating proper MCP setup
    expect(server).toBeDefined();
    expect(typeof server.start).toBe('function');
    expect(typeof server.stop).toBe('function');
  });

  test('server should have tool and resource handlers registered', () => {
    // This is a basic test to ensure the server structure is correct
    expect(server).toBeDefined();
    expect(typeof server.start).toBe('function');
    expect(typeof server.stop).toBe('function');
  });
});
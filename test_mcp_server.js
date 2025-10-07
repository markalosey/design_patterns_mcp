#!/usr/bin/env node
/**
 * Test script for Design Patterns MCP Server
 * Tests MCP protocol compliance and basic functionality
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPServerTester {
  constructor() {
    this.server = null;
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    };
  }

  async startServer() {
    console.log('🚀 Starting MCP Server...');
    
    return new Promise((resolve, reject) => {
      this.server = spawn('node', ['dist/src/mcp-server.js'], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.server.on('error', (error) => {
        console.error('❌ Server failed to start:', error);
        reject(error);
      });

      this.server.on('spawn', () => {
        console.log('✅ Server started successfully');
        resolve();
      });

      // Handle server output
      this.server.stdout.on('data', (data) => {
        console.log('📤 Server output:', data.toString());
      });

      this.server.stderr.on('data', (data) => {
        console.error('📥 Server error:', data.toString());
      });
    });
  }

  async sendMCPRequest(request) {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        reject(new Error('Server not started'));
        return;
      }

      const requestStr = JSON.stringify(request) + '\n';
      
      this.server.stdin.write(requestStr);
      
      // Set up response handler
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      const onData = (data) => {
        clearTimeout(timeout);
        this.server.stdout.removeListener('data', onData);
        
        try {
          const response = JSON.parse(data.toString().trim());
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      };

      this.server.stdout.on('data', onData);
    });
  }

  async testToolDiscovery() {
    console.log('\n🔍 Testing tool discovery...');
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };

    try {
      const response = await this.sendMCPRequest(request);
      
      if (response.result && response.result.tools) {
        const tools = response.result.tools;
        console.log(`✅ Found ${tools.length} tools:`, tools.map(t => t.name));
        
        this.recordTest('tool_discovery', true, {
          toolsFound: tools.length,
          toolNames: tools.map(t => t.name)
        });
        
        return tools;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Tool discovery failed:', error.message);
      this.recordTest('tool_discovery', false, { error: error.message });
      return [];
    }
  }

  async testCountPatterns() {
    console.log('\n📊 Testing pattern count...');
    
    const request = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'count_patterns',
        arguments: {
          includeDetails: true
        }
      }
    };

    try {
      const response = await this.sendMCPRequest(request);
      
      if (response.result && response.result.content) {
        console.log('✅ Pattern count retrieved successfully');
        console.log('📄 Response:', response.result.content[0].text);
        
        this.recordTest('count_patterns', true, {
          response: response.result.content[0].text
        });
        
        return response.result;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Pattern count failed:', error.message);
      this.recordTest('count_patterns', false, { error: error.message });
      return null;
    }
  }

  async testFindPatterns() {
    console.log('\n🔎 Testing pattern search...');
    
    const request = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'find_patterns',
        arguments: {
          query: 'I need to create complex objects with many optional configurations',
          maxResults: 3
        }
      }
    };

    try {
      const response = await this.sendMCPRequest(request);
      
      if (response.result && response.result.content) {
        console.log('✅ Pattern search completed successfully');
        console.log('📄 Response:', response.result.content[0].text);
        
        this.recordTest('find_patterns', true, {
          query: request.params.arguments.query,
          response: response.result.content[0].text
        });
        
        return response.result;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Pattern search failed:', error.message);
      this.recordTest('find_patterns', false, { error: error.message });
      return null;
    }
  }

  async testSearchPatterns() {
    console.log('\n🔍 Testing keyword search...');
    
    const request = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'search_patterns',
        arguments: {
          query: 'factory',
          searchType: 'hybrid',
          limit: 5
        }
      }
    };

    try {
      const response = await this.sendMCPRequest(request);
      
      if (response.result && response.result.content) {
        console.log('✅ Keyword search completed successfully');
        console.log('📄 Response:', response.result.content[0].text);
        
        this.recordTest('search_patterns', true, {
          query: request.params.arguments.query,
          response: response.result.content[0].text
        });
        
        return response.result;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Keyword search failed:', error.message);
      this.recordTest('search_patterns', false, { error: error.message });
      return null;
    }
  }

  recordTest(name, passed, details = {}) {
    const test = {
      name,
      passed,
      timestamp: new Date().toISOString(),
      details
    };
    
    this.results.tests.push(test);
    this.results.summary.total++;
    
    if (passed) {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
      this.results.summary.errors.push(`${name}: ${details.error || 'Unknown error'}`);
    }
  }

  async runAllTests() {
    console.log('🧪 Starting MCP Server Tests...\n');
    
    try {
      await this.startServer();
      
      // Wait a moment for server to fully initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.testToolDiscovery();
      await this.testCountPatterns();
      await this.testFindPatterns();
      await this.testSearchPatterns();
      
      console.log('\n📊 Test Summary:');
      console.log(`Total Tests: ${this.results.summary.total}`);
      console.log(`Passed: ${this.results.summary.passed}`);
      console.log(`Failed: ${this.results.summary.failed}`);
      
      if (this.results.summary.errors.length > 0) {
        console.log('\n❌ Errors:');
        this.results.summary.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      return this.results;
      
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      this.results.summary.errors.push(`Test suite: ${error.message}`);
      return this.results;
    } finally {
      this.stopServer();
    }
  }

  stopServer() {
    if (this.server) {
      console.log('\n🛑 Stopping server...');
      this.server.kill();
      this.server = null;
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MCPServerTester();
  
  tester.runAllTests()
    .then(results => {
      console.log('\n✅ Test execution completed');
      process.exit(results.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

export default MCPServerTester;

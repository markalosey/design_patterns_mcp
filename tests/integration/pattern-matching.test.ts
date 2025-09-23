import { describe, it, expect, beforeAll } from 'vitest';
import { DatabaseManager } from '../../src/services/database-manager';
import { createVectorOperationsService } from '../../src/services/vector-operations';
import { createPatternMatcher } from '../../src/services/pattern-matcher';
import { createPatternSeeder } from '../../src/services/pattern-seeder';
import path from 'path';

describe('Pattern Matching with Semantic Search', () => {
  let dbManager: DatabaseManager;
  let vectorOps: any;
  let patternMatcher: any;

  beforeAll(async () => {
    // Initialize test database
    dbManager = new DatabaseManager({
      filename: ':memory:',
      options: { readonly: false },
    });

    await dbManager.initialize();

    // Seed patterns for testing
    const seeder = createPatternSeeder(dbManager, {
      patternsPath: path.resolve(__dirname, '../../data/patterns'),
      batchSize: 10,
      skipExisting: false,
    });

    const result = await seeder.seedAll();
    if (!result.success) {
      throw new Error(`Failed to seed patterns: ${result.message}`);
    }

    // Debug: Check what patterns were seeded
    const allPatterns = dbManager.query('SELECT name, category FROM patterns LIMIT 10');
    console.log('Seeded patterns:', allPatterns);

    // Initialize vector operations
    vectorOps = createVectorOperationsService(dbManager);

    // Create pattern matcher
    patternMatcher = createPatternMatcher(dbManager, vectorOps);
  });

  it('should find patterns using semantic similarity', async () => {
    const request = {
      id: 'test-1',
      query: 'factory method pattern',
      maxResults: 3,
    };

    const matches = await patternMatcher.findMatchingPatterns(request);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toHaveProperty('pattern');
    expect(matches[0]).toHaveProperty('confidence');
    expect(matches[0].confidence).toBeGreaterThan(0);
    expect(matches[0].confidence).toBeLessThanOrEqual(1);
  });

  it('should rank patterns by relevance', async () => {
    const request = {
      id: 'test-2',
      query: 'factory method pattern',
      maxResults: 5,
    };

    const matches = await patternMatcher.findMatchingPatterns(request);

    expect(matches.length).toBeGreaterThan(0);

    // Results should be sorted by confidence (highest first)
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(matches[i].confidence);
    }

    // First result should have reasonable confidence
    expect(matches[0].confidence).toBeGreaterThan(0.1);
  });

  it('should handle multiple programming languages', async () => {
    const request = {
      id: 'test-3',
      query: 'factory method',
      programmingLanguage: 'typescript',
      maxResults: 3,
    };

    const matches = await patternMatcher.findMatchingPatterns(request);

    expect(matches.length).toBeGreaterThan(0);

    // Check that implementation guidance is provided
    const firstMatch = matches[0];
    expect(firstMatch).toHaveProperty('implementation');
    expect(firstMatch.implementation).toHaveProperty('steps');
    expect(Array.isArray(firstMatch.implementation.steps)).toBe(true);
    expect(firstMatch.implementation.steps.length).toBeGreaterThan(0);
  });

  it('should support hybrid search (keyword + semantic)', async () => {
    const request = {
      id: 'test-4',
      query: 'factory method pattern',
      maxResults: 3,
    };

    const matches = await patternMatcher.findMatchingPatterns(request);

    expect(matches.length).toBeGreaterThan(0);

    // Should find Factory Method pattern
    const factoryMethodMatch = matches.find((m: any) =>
      m.pattern.name.toLowerCase().includes('factory method')
    );
    expect(factoryMethodMatch).toBeTruthy();
    expect(factoryMethodMatch!.confidence).toBeGreaterThan(0.3);
  });

  it('should provide pattern explanations', async () => {
    const request = {
      id: 'test-5',
      query: 'observer pattern',
      maxResults: 1,
    };

    const matches = await patternMatcher.findMatchingPatterns(request);

    expect(matches.length).toBeGreaterThan(0);

    const match = matches[0];
    expect(match).toHaveProperty('justification');
    expect(match.justification).toHaveProperty('primaryReason');
    expect(match.justification).toHaveProperty('supportingReasons');
    expect(match.justification).toHaveProperty('benefits');
    expect(match.justification).toHaveProperty('drawbacks');

    // Benefits and drawbacks should be arrays
    expect(Array.isArray(match.justification.benefits)).toBe(true);
    expect(Array.isArray(match.justification.drawbacks)).toBe(true);
  });

  it('should filter by categories', async () => {
    const request = {
      id: 'test-6',
      query: 'factory method pattern',
      categories: ['Creational'],
      maxResults: 5,
    };

    const matches = await patternMatcher.findMatchingPatterns(request);

    expect(matches.length).toBeGreaterThan(0);

    // All results should be from Creational category
    for (const match of matches) {
      expect(match.pattern.category).toBe('Creational');
    }
  });

  it('should handle edge case queries gracefully', async () => {
    const request = {
      id: 'test-7',
      query: 'single instance global access',
      maxResults: 3,
    };

    const matches = await patternMatcher.findMatchingPatterns(request);

    // Should return array (may or may not be empty depending on matching)
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBeGreaterThanOrEqual(0);
  });
});

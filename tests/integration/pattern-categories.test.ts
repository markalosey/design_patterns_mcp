import { describe, it, expect, beforeAll } from 'vitest';
import { DatabaseManager } from '../../src/services/database-manager';
import { createPatternSeeder } from '../../src/services/pattern-seeder';
import path from 'path';

describe('Pattern Category Filtering', () => {
  let dbManager: DatabaseManager;

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
  });

  it('should filter patterns by GoF category', () => {
    const gofPatterns = dbManager.query('SELECT * FROM patterns WHERE category = ?', [
      'Creational',
    ]);

    // GoF patterns should include Singleton, Factory, Observer, etc.
    expect(gofPatterns.length).toBeGreaterThan(5);
  });

  it('should filter patterns by Architectural category', () => {
    const architecturalPatterns = dbManager.query('SELECT * FROM patterns WHERE category = ?', [
      'Architectural',
    ]);

    // Should include Clean Architecture, Hexagonal, Onion, etc.
    expect(architecturalPatterns.length).toBeGreaterThan(3);
  });

  it('should filter patterns by Cloud-Native category', () => {
    const cloudPatterns = dbManager.query('SELECT * FROM patterns WHERE category = ?', [
      'Cloud-Native',
    ]);

    // Should include Circuit Breaker, Service Mesh, etc.
    expect(cloudPatterns.length).toBeGreaterThan(3);
  });

  it('should filter patterns by AI/ML category', () => {
    const aiPatterns = dbManager.query('SELECT * FROM patterns WHERE category = ?', ['AI/ML']);

    // Should include RAG, Agentic patterns, etc.
    expect(aiPatterns.length).toBeGreaterThan(2);
  });

  it('should return all categories', () => {
    const categories = dbManager.query<{ category: string }>(
      'SELECT DISTINCT category FROM patterns ORDER BY category'
    );

    const allCategories = categories.map(c => c.category);

    expect(allCategories).toContain('Creational');
    expect(allCategories).toContain('Architectural');
    expect(allCategories).toContain('Cloud-Native');
    expect(allCategories).toContain('AI/ML');
    expect(allCategories.length).toBeGreaterThan(5);
  });
});

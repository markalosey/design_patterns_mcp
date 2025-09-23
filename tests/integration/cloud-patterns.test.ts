import { describe, it, expect, beforeAll } from 'vitest';
import { DatabaseManager } from '../../src/services/database-manager';
import { createPatternSeeder } from '../../src/services/pattern-seeder';
import path from 'path';

describe('Cloud-Native Patterns', () => {
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

  it('should recommend Circuit Breaker for fault tolerance', () => {
    const circuitBreaker = dbManager.queryOne(
      'SELECT * FROM patterns WHERE name = ? AND category = ?',
      ['Circuit Breaker', 'Cloud-Native']
    );

    expect(circuitBreaker).toBeTruthy();
    expect(circuitBreaker!.name).toBe('Circuit Breaker');
    expect(circuitBreaker!.category).toBe('Cloud-Native');
  });

  it('should recommend Retry Pattern for fault tolerance', () => {
    const retryPattern = dbManager.queryOne(
      'SELECT * FROM patterns WHERE name = ? AND category = ?',
      ['Retry Pattern', 'Cloud-Native']
    );

    expect(retryPattern).toBeTruthy();
    expect(retryPattern!.name).toBe('Retry Pattern');
    expect(retryPattern!.category).toBe('Cloud-Native');
  });

  it('should recommend Bulkhead Pattern for resource isolation', () => {
    const bulkhead = dbManager.queryOne('SELECT * FROM patterns WHERE name = ? AND category = ?', [
      'Bulkhead Pattern',
      'Cloud-Native',
    ]);

    expect(bulkhead).toBeTruthy();
    expect(bulkhead!.name).toBe('Bulkhead Pattern');
    expect(bulkhead!.category).toBe('Cloud-Native');
  });

  it('should recommend Timeout Pattern for resource protection', () => {
    const timeout = dbManager.queryOne('SELECT * FROM patterns WHERE name = ? AND category = ?', [
      'Timeout Pattern',
      'Cloud-Native',
    ]);

    expect(timeout).toBeTruthy();
    expect(timeout!.name).toBe('Timeout Pattern');
    expect(timeout!.category).toBe('Cloud-Native');
  });

  it('should include Kubernetes patterns', () => {
    const cloudPatterns = dbManager.query('SELECT * FROM patterns WHERE category = ?', [
      'Cloud-Native',
    ]);

    expect(cloudPatterns.length).toBeGreaterThan(5);
  });
});

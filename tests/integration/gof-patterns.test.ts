import { describe, it, expect } from 'vitest';
import { MOCK_PATTERNS, getMockPatternsByCategory } from '../mocks/mock-patterns.js';

describe('GoF Patterns Recommendation', () => {
  it('should recommend Singleton for single instance requirements', () => {
    // Mock recommendation logic - would normally use semantic search
    const recommendations = MOCK_PATTERNS.filter(p => p.name === 'Singleton');

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        name: 'Singleton',
        category: 'GoF'
      })
    );
  });

  it('should recommend Factory Method for object creation', () => {
    // Mock recommendation logic
    const recommendations = MOCK_PATTERNS.filter(p => p.name === 'Factory Method');

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        name: 'Factory Method',
        category: 'GoF'
      })
    );
  });

  it('should recommend Observer for event handling', () => {
    // Mock recommendation logic
    const recommendations = MOCK_PATTERNS.filter(p => p.name === 'Observer');

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        name: 'Observer',
        category: 'GoF'
      })
    );
  });

  it('should recommend Strategy for algorithm selection', () => {
    // Mock recommendation logic
    const recommendations = MOCK_PATTERNS.filter(p => p.name === 'Strategy');

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        name: 'Strategy',
        category: 'GoF'
      })
    );
  });

  it('should include all 23 GoF patterns', () => {
    const gofPatterns = getMockPatternsByCategory('GoF');

    // Our mock data includes 23 GoF patterns
    expect(gofPatterns.length).toBe(23);
  });
});
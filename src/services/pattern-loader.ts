/**
 * Pattern Loader Service
 * Loads design patterns from JSON files and stores them in the database
 */
import fs from 'fs';
import path from 'path';
import { getPatternStorageService, Pattern, PatternImplementation } from './pattern-storage.js';
import { logger } from './logger.js';

interface PatternData {
  id: string;
  name: string;
  category: string;
  description: string;
  whenToUse?: string[];
  when_to_use?: string[]; // Support snake_case variant
  benefits?: string[];
  drawbacks?: string[];
  useCases?: string[];
  use_cases?: string[]; // Support snake_case variant
  implementations?: Array<{
    language: string;
    code: string;
    explanation: string;
  }>;
  relatedPatterns?: Array<{
    patternId: string;
    type: string;
    description: string;
  }>;
  complexity: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface PatternFile {
  patterns: PatternData[];
}

export class PatternLoaderService {
  private patternStorage = getPatternStorageService();
  private loadedPatterns = new Set<string>();

  /**
   * Load patterns from a JSON file
   */
  async loadPatternsFromFile(filePath: string): Promise<void> {
    try {
      logger.info('pattern-loader', `Loading patterns from: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.warn(`Pattern file not found: ${filePath}`);
        return;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const patternFile: PatternFile = JSON.parse(fileContent);

      const patterns: Pattern[] = [];
      const implementations: PatternImplementation[] = [];

      for (const patternData of patternFile.patterns) {
        // Skip if already loaded
        if (this.loadedPatterns.has(patternData.id)) {
          continue;
        }

        // Convert pattern data to database format
        const pattern: Pattern = {
          id: patternData.id,
          name: patternData.name,
          category: patternData.category,
          description: patternData.description,
          when_to_use: (patternData.whenToUse || patternData.when_to_use || []).join('\n'),
          benefits: (patternData.benefits || []).join('\n'),
          drawbacks: (patternData.drawbacks || []).join('\n'),
          use_cases: (patternData.useCases || patternData.use_cases || []).join('\n'),
          complexity: patternData.complexity,
          tags: patternData.tags?.join(',') || '',
        };

        patterns.push(pattern);

        // Convert implementations
        if (patternData.implementations) {
          for (const impl of patternData.implementations) {
            const implementation: PatternImplementation = {
              id: `${patternData.id}-${impl.language}`,
              pattern_id: patternData.id,
              language: impl.language,
              approach: 'standard',
              code: impl.code,
              explanation: impl.explanation,
            };
            implementations.push(implementation);
          }
        }

        this.loadedPatterns.add(patternData.id);
      }

      // Store patterns in database
      if (patterns.length > 0) {
        await this.patternStorage.storePatterns(patterns);
        logger.info('pattern-loader', `Stored ${patterns.length} patterns from ${filePath}`);
      }

      // Store implementations
      if (implementations.length > 0) {
        for (const impl of implementations) {
          await this.patternStorage.storePatternImplementation(impl);
        }
        logger.info('pattern-loader', `Stored ${implementations.length} implementations from ${filePath}`);
      }
    } catch (error) {
      console.error(`Error loading patterns from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Load all pattern categories
   */
  async loadAllPatternCategories(): Promise<void> {
    const patternFiles = [
      'ai-patterns.json',
      'anti-patterns.json',
      'architectural-patterns.json',
      'cloud-patterns.json',
      'concurrency-patterns.json',
      'data-access-patterns.json',
      'ddd-patterns.json',
      'enterprise-patterns.json',
      'functional-patterns.json',
      'game-patterns.json',
      'gof-patterns.json',
      'integration-patterns.json',
      'iot-patterns.json',
      'microservices-patterns.json',
      'mobile-patterns.json',
      'performance-patterns.json',
      'reactive-patterns.json',
      'security-patterns.json',
      'testing-patterns.json',
    ];

    logger.info('pattern-loader', 'Loading all pattern categories...');

    for (const fileName of patternFiles) {
      const filePath = path.join(process.cwd(), 'src', 'data', 'patterns', fileName);
      await this.loadPatternsFromFile(filePath);
    }

    logger.info('pattern-loader', 'All pattern categories loaded successfully');
  }

  /**
   * Load GoF patterns (already implemented)
   */
  async loadGofPatterns(): Promise<void> {
    const filePath = path.join(process.cwd(), 'src', 'data', 'patterns', 'gof-patterns.json');
    await this.loadPatternsFromFile(filePath);
  }

  /**
   * Get loading statistics
   */
  getLoadingStats(): { loadedPatterns: number; categories: string[] } {
    return {
      loadedPatterns: this.loadedPatterns.size,
      categories: Array.from(this.loadedPatterns)
        .map(id => {
          // Extract category from pattern ID (simplified)
          if (id.includes('clean') || id.includes('hexagonal') || id.includes('onion')) {
            return 'Architectural';
          }
          if (id.includes('reflection') || id.includes('rag') || id.includes('tool')) {
            return 'AI/ML';
          }
          if (id.includes('circuit') || id.includes('service') || id.includes('bulkhead')) {
            return 'Cloud-Native';
          }
          return 'Other';
        })
        .filter((value, index, self) => self.indexOf(value) === index),
    };
  }

  /**
   * Reset loading state (for testing)
   */
  reset(): void {
    this.loadedPatterns.clear();
  }
}

// Singleton instance
let patternLoaderService: PatternLoaderService | null = null;

export function getPatternLoaderService(): PatternLoaderService {
  if (!patternLoaderService) {
    patternLoaderService = new PatternLoaderService();
  }
  return patternLoaderService;
}

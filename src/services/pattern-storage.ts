/**
 * Pattern Storage Service
 * Handles database operations for design patterns
 */
import { getDatabaseManager } from './database-manager.js';

export interface Pattern {
  id: string;
  name: string;
  category: string;
  description: string;
  when_to_use?: string;
  benefits?: string;
  drawbacks?: string;
  use_cases?: string;
  complexity: string;
  tags?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PatternImplementation {
  id: string;
  pattern_id: string;
  language: string;
  approach: string;
  code: string;
  explanation: string;
  dependencies?: string;
  created_at?: string;
}

export interface PatternEmbedding {
  pattern_id: string;
  embedding: number[];
  model: string;
  created_at?: string;
}

export class PatternStorageService {
  private db = getDatabaseManager();

  /**
   * Store a pattern in the database
   */
  async storePattern(pattern: Pattern): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO patterns
      (id, name, category, description, when_to_use, benefits, drawbacks, use_cases, complexity, tags, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const params = [
      pattern.id,
      pattern.name,
      pattern.category,
      pattern.description,
      pattern.when_to_use || '',
      pattern.benefits || '',
      pattern.drawbacks || '',
      pattern.use_cases || '',
      pattern.complexity,
      pattern.tags || '',
    ];

    this.db.execute(sql, params);
  }

  /**
   * Store multiple patterns in batch
   */
  async storePatterns(patterns: Pattern[]): Promise<void> {
    this.db.transaction(() => {
      for (const pattern of patterns) {
        this.storePattern(pattern);
      }
    });
  }

  /**
   * Get pattern by ID
   */
  async getPattern(id: string): Promise<Pattern | null> {
    const sql = 'SELECT * FROM patterns WHERE id = ?';
    return this.db.queryOne<Pattern>(sql, [id]);
  }

  /**
   * Get all patterns
   */
  async getAllPatterns(): Promise<Pattern[]> {
    const sql = 'SELECT * FROM patterns ORDER BY category, name';
    return this.db.query<Pattern>(sql);
  }

  /**
   * Get patterns by category
   */
  async getPatternsByCategory(category: string): Promise<Pattern[]> {
    const sql = 'SELECT * FROM patterns WHERE category = ? ORDER BY name';
    return this.db.query<Pattern>(sql, [category]);
  }

  /**
   * Search patterns by name or description
   */
  async searchPatterns(query: string): Promise<Pattern[]> {
    const searchTerm = `%${query}%`;
    const sql = `
      SELECT * FROM patterns
      WHERE name LIKE ? OR description LIKE ? OR tags LIKE ?
      ORDER BY name
    `;
    return this.db.query<Pattern>(sql, [searchTerm, searchTerm, searchTerm]);
  }

  /**
   * Get pattern categories
   */
  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    const sql = `
      SELECT category, COUNT(*) as count
      FROM patterns
      GROUP BY category
      ORDER BY category
    `;
    return this.db.query(sql);
  }

  /**
   * Store pattern implementation
   */
  async storePatternImplementation(impl: PatternImplementation): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO pattern_implementations
      (id, pattern_id, language, approach, code, explanation, dependencies)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      impl.id,
      impl.pattern_id,
      impl.language,
      impl.approach,
      impl.code,
      impl.explanation,
      impl.dependencies || '',
    ];

    this.db.execute(sql, params);
  }

  /**
   * Get implementations for a pattern
   */
  async getPatternImplementations(patternId: string): Promise<PatternImplementation[]> {
    const sql =
      'SELECT * FROM pattern_implementations WHERE pattern_id = ? ORDER BY language, approach';
    return this.db.query<PatternImplementation>(sql, [patternId]);
  }

  /**
   * Store pattern embedding for vector search
   */
  async storePatternEmbedding(embedding: PatternEmbedding): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO pattern_embeddings
      (pattern_id, embedding, model)
      VALUES (?, ?, ?)
    `;

    // Convert embedding array to format expected by sqlite-vec
    const embeddingStr = JSON.stringify(embedding.embedding);

    this.db.execute(sql, [embedding.pattern_id, embeddingStr, embedding.model]);
  }

  /**
   * Get pattern embedding
   */
  async getPatternEmbedding(patternId: string): Promise<PatternEmbedding | null> {
    const sql = 'SELECT * FROM pattern_embeddings WHERE pattern_id = ?';
    const result = this.db.queryOne(sql, [patternId]);

    if (result) {
      return {
        ...result,
        embedding: JSON.parse(result.embedding),
      };
    }

    return null;
  }

  /**
   * Find similar patterns using vector search
   */
  async findSimilarPatterns(
    queryEmbedding: number[],
    limit: number = 10
  ): Promise<Array<{ pattern: Pattern; score: number }>> {
    // This would use sqlite-vec's vector search capabilities
    // For now, we'll implement a basic similarity search
    const sql = `
      SELECT p.*, pe.embedding
      FROM patterns p
      LEFT JOIN pattern_embeddings pe ON p.id = pe.pattern_id
      ORDER BY p.name
      LIMIT ?
    `;

    const patterns = this.db.query(sql, [limit * 2]); // Get more than needed for filtering

    // Calculate cosine similarity (simplified implementation)
    const results = patterns.map((pattern: any) => {
      let score = 0;

      if (pattern.embedding) {
        const storedEmbedding = JSON.parse(pattern.embedding);
        score = this.cosineSimilarity(queryEmbedding, storedEmbedding);
      }

      return {
        pattern: {
          id: pattern.id,
          name: pattern.name,
          category: pattern.category,
          description: pattern.description,
          when_to_use: pattern.when_to_use,
          benefits: pattern.benefits,
          drawbacks: pattern.drawbacks,
          use_cases: pattern.use_cases,
          complexity: pattern.complexity,
          tags: pattern.tags,
          created_at: pattern.created_at,
          updated_at: pattern.updated_at,
        },
        score,
      };
    });

    // Sort by score and return top results
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get pattern statistics
   */
  async getPatternStats(): Promise<{
    totalPatterns: number;
    categories: number;
    implementations: number;
    embeddings: number;
  }> {
    const totalPatterns =
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM patterns')?.count || 0;
    const categories =
      this.db.queryOne<{ count: number }>('SELECT COUNT(DISTINCT category) as count FROM patterns')
        ?.count || 0;
    const implementations =
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM pattern_implementations')
        ?.count || 0;
    const embeddings =
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM pattern_embeddings')
        ?.count || 0;

    return {
      totalPatterns,
      categories,
      implementations,
      embeddings,
    };
  }

  /**
   * Clear all pattern data (for testing/reset)
   */
  async clearAllData(): Promise<void> {
    this.db.transaction(() => {
      this.db.execute('DELETE FROM pattern_embeddings');
      this.db.execute('DELETE FROM pattern_implementations');
      this.db.execute('DELETE FROM patterns');
    });
  }
}

// Singleton instance
let patternStorageService: PatternStorageService | null = null;

export function getPatternStorageService(): PatternStorageService {
  if (!patternStorageService) {
    patternStorageService = new PatternStorageService();
  }
  return patternStorageService;
}

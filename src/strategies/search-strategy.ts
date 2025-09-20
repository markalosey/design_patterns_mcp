/**
 * Search Strategy Pattern
 * Defines different search algorithms that can be used interchangeably
 */

import type { Pattern } from '../models/pattern.js';
import type { PatternRepository, SearchResult, SearchFilters } from '../repositories/interfaces.js';
import type { VectorOperationsService } from '../services/vector-operations.js';
import type { SemanticSearchService } from '../services/semantic-search.js';

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  threshold?: number;
}

export interface SearchStrategy {
  search(options: SearchOptions): Promise<SearchResult[]>;
  getName(): string;
}

/**
 * Keyword-based search strategy
 * Uses traditional text matching and SQL LIKE queries
 */
export class KeywordSearchStrategy implements SearchStrategy {
  constructor(private repository: PatternRepository) {}

  async search(options: SearchOptions): Promise<SearchResult[]> {
    return this.repository.search(options.query, {
      ...options.filters,
      limit: options.limit || 10
    });
  }

  getName(): string {
    return 'keyword';
  }
}

/**
 * Semantic search strategy
 * Uses vector embeddings and similarity search
 */
export class SemanticSearchStrategy implements SearchStrategy {
  constructor(
    private semanticSearch: SemanticSearchService,
    private repository: PatternRepository
  ) {}

  async search(options: SearchOptions): Promise<SearchResult[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.semanticSearch.generateEmbedding(options.query);
    
    // Find similar patterns using vector search
    const similarPatterns = await this.semanticSearch.searchSimilar(
      queryEmbedding,
      options.limit || 10,
      options.threshold || 0.3
    );

    // Fetch full pattern details
    const results: SearchResult[] = [];
    for (const { id, score } of similarPatterns) {
      const pattern = await this.repository.findById(id);
      if (pattern) {
        results.push({
          pattern,
          score,
          highlights: [`Semantic similarity: ${(score * 100).toFixed(1)}%`]
        });
      }
    }

    // Apply additional filters if needed
    return this.applyFilters(results, options.filters);
  }

  getName(): string {
    return 'semantic';
  }

  private applyFilters(results: SearchResult[], filters?: SearchFilters): SearchResult[] {
    if (!filters) return results;

    return results.filter(result => {
      if (filters.category && result.pattern.category !== filters.category) {
        return false;
      }

      if (filters.tags && filters.tags.length > 0) {
        const patternTags = result.pattern.tags || [];
        const hasAllTags = filters.tags.every(tag => 
          patternTags.some(pt => pt.toLowerCase() === tag.toLowerCase())
        );
        if (!hasAllTags) return false;
      }

      if (filters.complexity) {
        const complexity = result.pattern.metadata?.complexity;
        if (complexity !== filters.complexity) return false;
      }

      return true;
    });
  }
}

/**
 * Hybrid search strategy
 * Combines keyword and semantic search with configurable weights
 */
export class HybridSearchStrategy implements SearchStrategy {
  constructor(
    private keywordStrategy: KeywordSearchStrategy,
    private semanticStrategy: SemanticSearchStrategy,
    private keywordWeight: number = 0.4,
    private semanticWeight: number = 0.6
  ) {}

  async search(options: SearchOptions): Promise<SearchResult[]> {
    // Execute both searches in parallel
    const [keywordResults, semanticResults] = await Promise.all([
      this.keywordStrategy.search(options),
      this.semanticStrategy.search(options)
    ]);

    // Combine and rank results
    return this.combineResults(keywordResults, semanticResults);
  }

  getName(): string {
    return 'hybrid';
  }

  private combineResults(
    keywordResults: SearchResult[],
    semanticResults: SearchResult[]
  ): SearchResult[] {
    const combinedMap = new Map<string, SearchResult>();

    // Add keyword results with weighted scores
    for (const result of keywordResults) {
      const id = result.pattern.id;
      combinedMap.set(id, {
        ...result,
        score: result.score * this.keywordWeight,
        highlights: [...(result.highlights || []), 'Source: Keyword search']
      });
    }

    // Add or merge semantic results
    for (const result of semanticResults) {
      const id = result.pattern.id;
      const existing = combinedMap.get(id);
      
      if (existing) {
        // Merge scores and highlights
        combinedMap.set(id, {
          ...existing,
          score: existing.score + (result.score * this.semanticWeight),
          highlights: [
            ...(existing.highlights || []),
            ...(result.highlights || []).filter(h => h.startsWith('Semantic'))
          ]
        });
      } else {
        // Add new result
        combinedMap.set(id, {
          ...result,
          score: result.score * this.semanticWeight,
          highlights: [...(result.highlights || []), 'Source: Semantic search']
        });
      }
    }

    // Sort by combined score
    return Array.from(combinedMap.values())
      .sort((a, b) => b.score - a.score);
  }
}

/**
 * Contextual search strategy
 * Takes into account user preferences and history
 */
export class ContextualSearchStrategy implements SearchStrategy {
  constructor(
    private baseStrategy: SearchStrategy,
    private userContext?: {
      previousSearches?: string[];
      preferredCategories?: string[];
      preferredLanguages?: string[];
    }
  ) {}

  async search(options: SearchOptions): Promise<SearchResult[]> {
    // Enhance query with context
    const enhancedOptions = this.enhanceWithContext(options);
    
    // Execute base search
    const results = await this.baseStrategy.search(enhancedOptions);
    
    // Boost results based on context
    return this.boostByContext(results);
  }

  getName(): string {
    return `contextual-${this.baseStrategy.getName()}`;
  }

  private enhanceWithContext(options: SearchOptions): SearchOptions {
    const enhanced = { ...options };

    // Add preferred categories to filters if not already specified
    if (this.userContext?.preferredCategories && !options.filters?.category) {
      enhanced.filters = {
        ...enhanced.filters,
        // This could be enhanced to support multiple categories
      };
    }

    return enhanced;
  }

  private boostByContext(results: SearchResult[]): SearchResult[] {
    if (!this.userContext) return results;

    return results.map(result => {
      let boost = 0;

      // Boost for preferred categories
      if (this.userContext?.preferredCategories?.includes(result.pattern.category)) {
        boost += 0.1;
      }

      // Boost for patterns related to previous searches
      // This could be more sophisticated with actual relevance calculation
      
      return {
        ...result,
        score: Math.min(1, result.score + boost)
      };
    }).sort((a, b) => b.score - a.score);
  }
}
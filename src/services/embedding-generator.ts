/**
 * Embedding Generator Service with Design Patterns
 * Generates vector embeddings for text using various models and strategies
 */
import { EmbeddingServiceAdapter } from '../adapters/embedding-service-adapter.js';
import { structuredLogger } from '../utils/logger.js';

export interface EmbeddingConfig {
  model: 'all-MiniLM-L6-v2' | 'all-MiniLM-L12-v2' | 'all-mpnet-base-v2';
  dimensions: number;
  normalize: boolean;
  strategy?: 'transformers' | 'ollama' | 'simple-hash';
  useCache?: boolean;
  batchSize?: number;
}

export class EmbeddingGeneratorService {
  private config: EmbeddingConfig;
  private embeddingAdapter: EmbeddingServiceAdapter;

  constructor(config: EmbeddingConfig) {
    this.config = {
      useCache: true,
      batchSize: 10,
      strategy: 'transformers',
      ...config,
    };
    
    // Initialize adapter with strategy pattern
    this.embeddingAdapter = new EmbeddingServiceAdapter({
      cacheEnabled: this.config.useCache,
      cacheTTL: 3600000, // 1 hour
      batchSize: this.config.batchSize,
      retryAttempts: 3,
      retryDelay: 1000,
    });
  }

  /**
   * Generate embedding for text using strategy pattern
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Initialize adapter if needed
      if (!(await this.embeddingAdapter.isReady())) {
        await this.embeddingAdapter.initialize();
      }

      // Generate embedding using the appropriate strategy
      const embedding = await this.embeddingAdapter.generateEmbedding(text);
      
      structuredLogger.debug('embedding-generator', 'Generated embedding', {
        textLength: text.length,
        embeddingDimensions: embedding.length,
        strategy: this.embeddingAdapter.getStrategyInfo()?.name
      });

      return embedding;
    } catch (error) {
      structuredLogger.error('embedding-generator', 'Failed to generate embedding', error as Error);
      
      // Fallback to simple hash-based embedding if all strategies fail
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Generate embeddings for multiple texts using batch processing
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // Initialize adapter if needed
      if (!(await this.embeddingAdapter.isReady())) {
        await this.embeddingAdapter.initialize();
      }

      // Use batch processing for efficiency
      const embeddings = await this.embeddingAdapter.generateEmbeddings(texts);
      
      structuredLogger.debug('embedding-generator', 'Generated batch embeddings', {
        batchSize: texts.length,
        strategy: this.embeddingAdapter.getStrategyInfo()?.name
      });

      return embeddings;
    } catch (error) {
      structuredLogger.error('embedding-generator', 'Failed to generate batch embeddings', error as Error);
      
      // Fallback to individual processing with simple hash
      return Promise.all(texts.map(text => this.generateFallbackEmbedding(text)));
    }
  }

  /**
   * Fallback embedding generation using simple hash (legacy behavior)
   */
  private generateFallbackEmbedding(text: string): number[] {
    const normalizedText = text.toLowerCase().trim();
    const hash = this.simpleHash(normalizedText);

    // Generate pseudo-random but deterministic embedding based on text hash
    const embedding: number[] = [];
    for (let i = 0; i < this.config.dimensions; i++) {
      // Use hash + position to create varied but deterministic values
      const value = Math.sin(hash + i * 0.1) * Math.cos(hash * 0.01 + i);
      embedding.push(value);
    }

    // Normalize if requested
    if (this.config.normalize) {
      return this.normalizeVector(embedding);
    }

    return embedding;
  }

  /**
   * Simple hash function for deterministic embeddings
   */
  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

    if (magnitude === 0) {
      return vector;
    }

    return vector.map(val => val / magnitude);
  }

  /**
   * Get model information
   */
  getModelInfo(): { name: string; dimensions: number; description: string } {
    const modelInfo = {
      'all-MiniLM-L6-v2': {
        name: 'all-MiniLM-L6-v2',
        dimensions: 384,
        description: 'Sentence-BERT model optimized for semantic similarity',
      },
      'all-MiniLM-L12-v2': {
        name: 'all-MiniLM-L12-v2',
        dimensions: 384,
        description: 'Larger Sentence-BERT model with better semantic understanding',
      },
      'all-mpnet-base-v2': {
        name: 'all-mpnet-base-v2',
        dimensions: 768,
        description: 'High-quality sentence embeddings for semantic search',
      },
    };

    return modelInfo[this.config.model];
  }

  /**
   * Calculate similarity between two texts (for testing)
   */
  async calculateTextSimilarity(text1: string, text2: string): Promise<number> {
    const [emb1, emb2] = await this.generateEmbeddings([text1, text2]);
    return this.cosineSimilarity(emb1, emb2);
  }

  /**
   * Cosine similarity calculation
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }
}

// Default configurations
export const DEFAULT_EMBEDDING_CONFIGS = {
  'all-MiniLM-L6-v2': {
    model: 'all-MiniLM-L6-v2' as const,
    dimensions: 384,
    normalize: true,
  },
  'all-MiniLM-L12-v2': {
    model: 'all-MiniLM-L12-v2' as const,
    dimensions: 384,
    normalize: true,
  },
  'all-mpnet-base-v2': {
    model: 'all-mpnet-base-v2' as const,
    dimensions: 768,
    normalize: true,
  },
};

// Factory function
export function createEmbeddingGeneratorService(
  config?: Partial<EmbeddingConfig>
): EmbeddingGeneratorService {
  const defaultConfig = DEFAULT_EMBEDDING_CONFIGS['all-MiniLM-L6-v2'];
  const finalConfig = { ...defaultConfig, ...config };
  return new EmbeddingGeneratorService(finalConfig);
}

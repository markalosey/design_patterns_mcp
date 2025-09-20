/**
 * PatternCategory Model Interface
 * Represents the hierarchical categorization of patterns
 */

export interface PatternCategory {
  /** Unique category identifier */
  id: number;

  /** Category name (e.g., "GoF-Creational", "Cloud-Native") */
  name: string;

  /** Parent category for subcategories */
  parentCategory?: string;

  /** Category description and characteristics */
  description: string;

  /** Number of patterns in this category */
  patternCount: number;

  /** Common scenarios for patterns in this category */
  typicalUseCases: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last modification timestamp */
  updatedAt: Date;
}

/**
 * Predefined pattern categories from the guide
 */
export const PATTERN_CATEGORIES = {
  GOF_CREATIONAL: 'Creational',
  GOF_STRUCTURAL: 'Structural',
  GOF_BEHAVIORAL: 'Behavioral',
  ARCHITECTURAL: 'Architectural',
  CLOUD_NATIVE: 'Cloud-Native',
  MICROSERVICES: 'Microservices',
  AI_ML: 'AI-ML',
  FUNCTIONAL: 'Functional',
  REACTIVE: 'Reactive',
  ANTI_PATTERN: 'Anti-Pattern'
} as const;

/**
 * Category creation input
 */
export interface CreatePatternCategoryInput {
  name: string;
  parentCategory?: string;
  description: string;
  typicalUseCases: string;
}

/**
 * Category update input
 */
export interface UpdatePatternCategoryInput extends Partial<CreatePatternCategoryInput> {
  id: number;
}

/**
 * Category statistics
 */
export interface CategoryStats {
  category: PatternCategory;
  totalPatterns: number;
  patternsByComplexity: {
    Low: number;
    Medium: number;
    High: number;
  };
  averagePopularity?: number;
}
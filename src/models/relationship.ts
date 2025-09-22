/**
 * PatternRelationship Model Interface
 * Represents relationships between patterns
 */

export type RelationshipType =
  | 'complementary'
  | 'alternative'
  | 'prerequisite'
  | 'follows'
  | 'conflicts'
  | 'extends'
  | 'implements'
  | 'related';

export interface Relationship {
  /** Type of relationship */
  type: RelationshipType;
  /** Related pattern ID */
  patternId: string;
  /** Description of the relationship */
  description: string;
  /** Strength of relationship (0.0-1.0) */
  strength?: number;
  /** Creation timestamp */
  createdAt?: Date;
}

export interface PatternRelationship {
  /** Type of relationship */
  type: RelationshipType;

  /** Related pattern ID */
  patternId: string;

  /** Description of the relationship */
  description: string;

  /** Strength of relationship (0.0-1.0) */
  strength?: number;

  /** Creation timestamp */
  createdAt?: Date;
}

/**
 * Relationship creation input
 */
export interface CreatePatternRelationshipInput {
  fromPatternId: string;
  toPatternId: string;
  type: RelationshipType;
  description: string;
  strength?: number;
}

/**
 * Relationship update input
 */
export interface UpdatePatternRelationshipInput extends Partial<CreatePatternRelationshipInput> {
  id: number;
}

/**
 * Relationship with full pattern details
 */
export interface RelationshipWithPatterns extends PatternRelationship {
  fromPattern: {
    id: string;
    name: string;
    category: string;
  };
  toPattern: {
    id: string;
    name: string;
    category: string;
  };
}

/**
 * Relationship graph node
 */
export interface RelationshipNode {
  patternId: string;
  patternName: string;
  category: string;
  relationships: PatternRelationship[];
  centrality?: number;
}

/**
 * Relationship graph
 */
export interface RelationshipGraph {
  nodes: RelationshipNode[];
  edges: Array<{
    from: string;
    to: string;
    type: RelationshipType;
    strength: number;
  }>;
}

/**
 * Relationship analysis result
 */
export interface RelationshipAnalysis {
  patternId: string;
  complementaryPatterns: PatternRelationship[];
  alternativePatterns: PatternRelationship[];
  prerequisitePatterns: PatternRelationship[];
  conflictingPatterns: PatternRelationship[];
  centralityScore: number;
  clusterId?: string;
}

/**
 * Relationship validation result
 */
export interface RelationshipValidation {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  bidirectionalCheck: boolean;
}
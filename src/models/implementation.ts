/**
 * PatternImplementation Model Interface
 * Language-specific implementations and examples for patterns
 */

export type ImplementationComplexity = 'Low' | 'Medium' | 'High';

export type ProgrammingLanguage =
  | 'TypeScript'
  | 'JavaScript'
  | 'Python'
  | 'Java'
  | 'C#'
  | 'Go'
  | 'Rust'
  | 'C++'
  | 'PHP'
  | 'Ruby'
  | 'Swift'
  | 'Kotlin';

export interface Implementation {
  /** Unique implementation ID */
  id: number;
  /** References parent pattern */
  patternId: string;
  /** Target programming language */
  programmingLanguage: ProgrammingLanguage;
  /** Complete, runnable code example */
  codeExample: string;
  /** Step-by-step implementation explanation */
  explanation: string;
  /** Language-specific best practices */
  bestPractices?: string;
  /** What to avoid in this language */
  commonMistakes?: string;
  /** Relevant frameworks/libraries */
  frameworks?: string[];
  /** Implementation complexity level */
  complexity: ImplementationComplexity;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
}

export interface PatternImplementation {
  /** Unique implementation ID */
  id: number;

  /** References parent pattern */
  patternId: string;

  /** Target programming language */
  programmingLanguage: ProgrammingLanguage;

  /** Complete, runnable code example */
  codeExample: string;

  /** Step-by-step implementation explanation */
  explanation: string;

  /** Language-specific best practices */
  bestPractices?: string;

  /** What to avoid in this language */
  commonMistakes?: string;

  /** Relevant frameworks/libraries */
  frameworks?: string[];

  /** Implementation complexity level */
  complexity: ImplementationComplexity;

  /** Creation timestamp */
  createdAt: Date;

  /** Last modification timestamp */
  updatedAt: Date;
}

/**
 * Implementation creation input
 */
export interface CreatePatternImplementationInput {
  patternId: string;
  programmingLanguage: ProgrammingLanguage;
  codeExample: string;
  explanation: string;
  bestPractices?: string;
  commonMistakes?: string;
  frameworks?: string[];
  complexity: ImplementationComplexity;
}

/**
 * Implementation update input
 */
export interface UpdatePatternImplementationInput extends Partial<CreatePatternImplementationInput> {
  id: number;
}

/**
 * Implementation with pattern context
 */
export interface ImplementationWithPattern extends PatternImplementation {
  pattern: {
    id: string;
    name: string;
    category: string;
    description: string;
  };
}

/**
 * Implementation search filters
 */
export interface ImplementationFilters {
  programmingLanguage?: ProgrammingLanguage;
  complexity?: ImplementationComplexity;
  frameworks?: string[];
  patternId?: string;
}

/**
 * Implementation validation result
 */
export interface ImplementationValidation {
  isValid: boolean;
  syntaxErrors: string[];
  bestPracticeViolations: string[];
  securityIssues: string[];
  suggestions: string[];
}

/**
 * Code execution result (for testing implementations)
 */
export interface CodeExecutionResult {
  success: boolean;
  output?: string;
  errors?: string[];
  executionTime: number;
  memoryUsage?: number;
}

/**
 * Implementation statistics
 */
export interface ImplementationStats {
  totalImplementations: number;
  languagesSupported: ProgrammingLanguage[];
  complexityDistribution: Record<ImplementationComplexity, number>;
  mostPopularFrameworks: Array<{
    framework: string;
    count: number;
  }>;
}
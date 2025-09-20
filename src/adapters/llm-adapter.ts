/**
 * LLM Adapter Interface
 * Defines a common interface for different LLM providers using the Adapter Pattern
 */

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  systemPrompt?: string;
}

export interface CodeAnalysis {
  patterns: Array<{
    name: string;
    confidence: number;
    location?: string;
    description?: string;
  }>;
  suggestions: Array<{
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }>;
  summary: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage?: {
    totalTokens: number;
  };
}

/**
 * Common interface for all LLM adapters
 */
export interface LLMAdapter {
  generateCompletion(prompt: string, options?: CompletionOptions): Promise<LLMResponse>;
  analyzeCode(code: string, language: string): Promise<CodeAnalysis>;
  generateEmbedding?(text: string): Promise<EmbeddingResponse>;
  isAvailable(): Promise<boolean>;
  getModelInfo(): { provider: string; model: string; capabilities: string[] };
}
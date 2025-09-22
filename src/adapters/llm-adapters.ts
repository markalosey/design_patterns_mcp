/**
 * Concrete LLM Adapter Implementations
 * Adapters for OpenAI, Anthropic, and Ollama following the Adapter Pattern
 */

import type { 
  LLMAdapter, 
  LLMResponse, 
  CompletionOptions, 
  CodeAnalysis,
  EmbeddingResponse 
} from './llm-adapter.js';
import { logger } from '../services/logger.js';

/**
 * OpenAI Adapter Implementation
 */
export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenAIAdapter implements LLMAdapter {
  private config: Required<OpenAIConfig>;

  constructor(config: OpenAIConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'gpt-3.5-turbo',
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000
    };
  }

  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: options?.temperature || this.config.temperature,
          max_tokens: options?.maxTokens || this.config.maxTokens,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          stop: options?.stopSequences
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        },
        finishReason: data.choices[0].finish_reason
      };
    } catch (error) {
      logger.error('OpenAIAdapter', 'Completion error', error as Error, { error });
      throw error;
    }
  }

  async analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
    const prompt = `Analyze the following ${language} code and identify design patterns, potential improvements, and issues:

\`\`\`${language}
${code}
\`\`\`

Provide your analysis in JSON format with the following structure:
{
  "patterns": [{ "name": "pattern name", "confidence": 0.0-1.0, "location": "where found", "description": "brief description" }],
  "suggestions": [{ "type": "improvement|warning|error", "message": "description", "severity": "info|warning|error" }],
  "summary": "brief overall summary"
}`;

    const response = await this.generateCompletion(prompt, {
      temperature: 0.3,
      systemPrompt: 'You are a code analysis expert. Respond only with valid JSON.'
    });

    try {
      return JSON.parse(response.content);
    } catch {
      // Fallback if JSON parsing fails
      return {
        patterns: [],
        suggestions: [{ type: 'error', message: 'Failed to parse analysis', severity: 'error' }],
        summary: response.content
      };
    }
  }

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI Embedding API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      embedding: data.data[0].embedding,
      model: data.model,
      usage: {
        totalTokens: data.usage.total_tokens
      }
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getModelInfo() {
    return {
      provider: 'openai',
      model: this.config.model,
      capabilities: ['completion', 'code-analysis', 'embeddings']
    };
  }
}

/**
 * Anthropic Claude Adapter Implementation
 */
export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AnthropicAdapter implements LLMAdapter {
  private config: Required<AnthropicConfig>;

  constructor(config: AnthropicConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'claude-3-haiku-20240307',
      baseUrl: config.baseUrl || 'https://api.anthropic.com/v1',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000
    };
  }

  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: options?.maxTokens || this.config.maxTokens,
          temperature: options?.temperature || this.config.temperature,
          ...(options?.systemPrompt && { system: options.systemPrompt }),
          ...(options?.stopSequences && { stop_sequences: options.stopSequences })
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.content[0].text,
        model: data.model,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        },
        finishReason: data.stop_reason
      };
    } catch (error) {
      logger.error('AnthropicAdapter', 'Completion error', error as Error, { error });
      throw error;
    }
  }

  async analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
    const prompt = `Analyze this ${language} code for design patterns and improvements. Respond with JSON only:

\`\`\`${language}
${code}
\`\`\`

Format:
{
  "patterns": [{"name": "string", "confidence": number, "location": "string", "description": "string"}],
  "suggestions": [{"type": "string", "message": "string", "severity": "string"}],
  "summary": "string"
}`;

    const response = await this.generateCompletion(prompt, {
      temperature: 0.2,
      systemPrompt: 'You are a code analysis expert. Respond only with valid JSON, no explanations.'
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        patterns: [],
        suggestions: [{ type: 'error', message: 'Failed to parse analysis', severity: 'error' }],
        summary: response.content
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    // Anthropic doesn't have a simple health check endpoint
    // We could try a minimal completion request
    return true;
  }

  getModelInfo() {
    return {
      provider: 'anthropic',
      model: this.config.model,
      capabilities: ['completion', 'code-analysis']
    };
  }
}

/**
 * Ollama Local LLM Adapter Implementation
 */
export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class OllamaAdapter implements LLMAdapter {
  private config: Required<OllamaConfig>;

  constructor(config: OllamaConfig) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      model: config.model || 'llama2',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000
    };
  }

  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: options?.systemPrompt ? `${options.systemPrompt}\n\n${prompt}` : prompt,
          options: {
            temperature: options?.temperature || this.config.temperature,
            num_predict: options?.maxTokens || this.config.maxTokens,
            stop: options?.stopSequences
          },
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.response,
        model: this.config.model,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        finishReason: data.done ? 'stop' : 'length'
      };
    } catch (error) {
      logger.error('OllamaAdapter', 'Completion error', error as Error, { error });
      throw error;
    }
  }

  async analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
    const prompt = `Analyze this ${language} code and identify design patterns. Output JSON only:

Code:
${code}

JSON format required:
{
  "patterns": [{"name": "", "confidence": 0.0, "location": "", "description": ""}],
  "suggestions": [{"type": "", "message": "", "severity": ""}],
  "summary": ""
}`;

    const response = await this.generateCompletion(prompt, {
      temperature: 0.2
    });

    // Ollama responses might need more parsing
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback
      }
    }

    return {
      patterns: [],
      suggestions: [],
      summary: 'Analysis completed'
    };
  }

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama Embedding API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      embedding: data.embedding,
      model: this.config.model,
      usage: {
        totalTokens: 0 // Ollama doesn't provide token count for embeddings
      }
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  getModelInfo() {
    return {
      provider: 'ollama',
      model: this.config.model,
      capabilities: ['completion', 'code-analysis', 'embeddings']
    };
  }
}

/**
 * Null adapter for when no LLM is configured
 */
export class NullLLMAdapter implements LLMAdapter {
  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<LLMResponse> {
    return {
      content: '',
      model: 'none',
      finishReason: 'disabled'
    };
  }

  async analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
    return {
      patterns: [],
      suggestions: [],
      summary: 'LLM analysis disabled'
    };
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }

  getModelInfo() {
    return {
      provider: 'none',
      model: 'none',
      capabilities: []
    };
  }
}